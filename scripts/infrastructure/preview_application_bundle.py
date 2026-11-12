"""Verified application-only bundle linked to the existing preview servers. Public files only."""
import argparse
import copy
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import uuid

import preview_server_bundle as servers
import preview_compose

ROOT = Path(__file__).resolve().parents[2]
APPS = {'shared': {'nginx-edge': 'edge'}, 'preview': {
    'web-node-preview': 'web-node', 'web-ng-preview': 'web-ng', 'tox21-preview': 'tox21'}}
HELPERS = {'scripts/coordinate-delivery.py'} | {'scripts/infrastructure/' + name for name in (
    'preview_application_bundle.py', 'guest_preview_applications.py', 'preview_application_secrets.py',
    'preview_application_rpc.py', 'secret_delivery.py', 'preview_compose.py',
    'preview_server_bundle.py', 'preview_server_secrets.py', 'guest_preview_servers.py',
    'prepare_tox21_transport.py', 'guest_artifact_preflight.py', 'run_tox21_vm_pilot.py',
    'guest_preview_recovery_inventory.py', 'guest_preview_cold_recovery.py')}
OPS = {'deployment/local-vm/operational/' + name for name in
       ('nginx.conf', 'initialize-empty-schema.cjs', 'Tox21Security.Dockerfile')}
PUBLIC = HELPERS | OPS | {'models.json', 'deployment/deployment-schema.json'}


def expected_files():
    return PUBLIC | {f'components/{role}/{name}' for role in ('web-ng', 'web-node', 'tox21') for name in servers.APP_FILES} | {
        'servers/edge/' + name for name in servers.SERVER_FILES}


def identities(root, revision):
    result = {}
    for role in ('web-ng', 'web-node', 'tox21'):
        value = servers.delivery.component(root / 'components' / role, role, revision, root)
        if value['target'] != 'staging' or value['security_eligible'] is not True:
            raise ValueError('verified-staging-component-required')
        _, image = servers.delivery.archive_config(root / 'components' / role / 'image.tar')
        config = image.get('config', {})
        expected_user = {'web-ng':'10101:10101','web-node':'10001:10001','tox21':'10021:10021'}[role]
        if (image.get('os'), image.get('architecture')) != ('linux', 'amd64') or config.get('User') != expected_user or config.get('Labels', {}).get('org.mercurion.environment') != 'staging':
            raise ValueError('application-platform-user-environment')
        result[role] = value['config_digest']
    directory = root / 'servers/edge'
    record = servers.transport.read(directory / 'server.json')
    if (record.get('role') != 'edge' or record.get('revision') != revision or record.get('securityEligible') is not True
            or record.get('archiveLoadVerified') is not True or set(record.get('files', {})) != servers.SERVER_FILES - {'server.json'}):
        raise ValueError('verified-edge-required')
    for name, digest in record['files'].items():
        if servers.delivery.checksum(servers.transport.regular(directory / name)) != digest:
            raise ValueError('edge-evidence-checksum')
    digest, image = servers.delivery.archive_config(directory / 'image.tar')
    labels = image.get('config', {}).get('Labels', {})
    if (digest != record['configDigest'] or image.get('os') != 'linux' or image.get('architecture') != 'amd64'
            or image['config'].get('User') != '10101:10101' or labels.get('org.mercurion.runtime.role') != 'edge'
            or labels.get('org.opencontainers.image.revision') != revision
            or not servers.delivery.security_summary(servers.transport.read(directory / 'vulnerabilities.json'), digest)['eligible']):
        raise ValueError('edge-provenance-or-scan')
    result['edge'] = digest
    return result


def projection(models, loaded, identifier):
    preview_compose.validate(models)
    if not re.fullmatch('[a-f0-9]{32}', identifier) or set(loaded) != {'web-ng', 'web-node', 'tox21', 'edge'}:
        raise ValueError('application-projection-identity')
    result = copy.deepcopy(models)
    release = PurePosixPath('/opt/mercurion/releases') / ('application-' + identifier)
    private = PurePosixPath('/run/mercurion-applications') / identifier / 'active'
    for project, roles in APPS.items():
        model = result[project]
        model['services'] = {name: model['services'][name] for name in roles}
        used = set()
        for name, role in roles.items():
            spec = model['services'][name]
            image = loaded[role]['imageId']
            if not re.fullmatch('sha256:[a-f0-9]{64}', image):
                raise ValueError('immutable-application-image-required')
            spec['image'] = image
            spec.setdefault('labels', {})['mercurion.application.run'] = identifier
            used.update(spec['networks'])
            for mount in spec.get('volumes', []):
                if role == 'edge':
                    mount['source'] = str(release / 'deployment/local-vm/operational/nginx.conf')
                else:
                    mount['source'] = str(private / role / PurePosixPath(mount['target']).name)
        model['networks'] = {name: value for name, value in model['networks'].items() if name in used}
        model['volumes'] = {}
        for name, value in model['networks'].items():
            if project == 'preview' and name in ('data', 'bus', 'search', 'web'):
                model['networks'][name] = dict(name=value['name'], external=True)
            else:
                value.setdefault('labels', {})['mercurion.application.run'] = identifier
    return result


def verify(root):
    manifest = servers.transport.read(root / 'application-bootstrap.json')
    if (manifest.get('schemaVersion') != 1 or manifest.get('scope') != 'preview-applications-only'
            or not re.fullmatch('[a-f0-9]{32}', manifest.get('runId', ''))
            or not re.fullmatch('[a-f0-9]{32}', manifest.get('serverRunId', ''))
            or not re.fullmatch('[a-f0-9]{64}', manifest.get('serverManifestSha256', ''))
            or not re.fullmatch('[a-f0-9]{40}', manifest.get('releaseRevision', ''))
            or not re.fullmatch('[a-f0-9]{40}', manifest.get('toolRevision', ''))
            or set(manifest.get('files', {})) != expected_files()):
        raise ValueError('application-bundle-scope')
    for name, digest in manifest['files'].items():
        if servers.delivery.checksum(servers.transport.regular(root / name)) != digest:
            raise ValueError('application-bundle-checksum')
    if identities(root, manifest['releaseRevision']) != manifest.get('configDigests'):
        raise ValueError('application-image-identity')
    preview_compose.validate(servers.transport.read(root / 'models.json'))
    return manifest


def prepare(exports, server_bundle, output, revision):
    previous = servers.verify(server_bundle)
    if revision != previous['releaseRevision']:
        raise ValueError('application-and-server-source-mismatch')
    identities(exports, revision)
    tool = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    output.mkdir(parents=True, exist_ok=False)
    for role in ('web-ng', 'web-node', 'tox21'):
        for name in servers.APP_FILES:
            target = output / 'components' / role / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(exports / 'components' / role / name, target)
    for name in servers.SERVER_FILES:
        target = output / 'servers/edge' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(exports / 'servers/edge' / name, target)
    for name in HELPERS | OPS | {'deployment/deployment-schema.json'}:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(subprocess.check_output(['git', 'show', tool + ':' + name], cwd=ROOT))
    models = preview_compose.render()
    servers.transport.write(output / 'models.json', models)
    manifest = dict(schemaVersion=1, scope='preview-applications-only', runId=uuid.uuid4().hex,
        serverRunId=previous['runId'], serverManifestSha256=servers.delivery.checksum(server_bundle / 'server-bootstrap.json'),
        releaseRevision=revision, toolRevision=tool, configDigests=identities(output, revision),
        files={name: servers.delivery.checksum(output / name) for name in expected_files()},
        publicAcceptance=False, isolationAccepted=False)
    servers.transport.write(output / 'application-bootstrap.json', manifest)
    return verify(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('prepare', 'verify'))
    parser.add_argument('--root', type=Path)
    parser.add_argument('--exports', type=Path)
    parser.add_argument('--servers', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--revision')
    args = parser.parse_args()
    value = prepare(args.exports, args.servers, args.output, args.revision) if args.phase == 'prepare' else verify(args.root)
    print(json.dumps(dict(status='application-bundle-verified', runId=value['runId'], imageCount=4)))
