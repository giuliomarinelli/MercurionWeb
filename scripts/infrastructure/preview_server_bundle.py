"""Public, server-only transport bundle. Never reads the operator configuration."""
import argparse
import copy
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import uuid

import prepare_tox21_transport as transport
import preview_compose
import run_tox21_vm_pilot as pilot

ROOT = Path(__file__).resolve().parents[2]
delivery = transport.delivery
SERVER_FILES = {'image.tar', 'sbom.cdx.json', 'vulnerabilities.json', 'policy-result.json', 'server.json'}
BROKER_FILES = {'image.tar', 'sbom.cdx.json', 'vulnerabilities.json', 'policy-result.json', 'broker.json'}
APP_FILES = set(transport.FILES)
OPS = {f'deployment/local-vm/operational/{name}' for name in
       ('shared/compose.yaml', 'preview/compose.yaml', 'nginx.conf', 'postgres-init.sh', 'initialize-empty-schema.cjs')}
SCRIPTS = {'scripts/coordinate-delivery.py'} | {'scripts/infrastructure/' + name for name in (
    'secret_delivery.py', 'preview_server_secrets.py', 'preview_server_bundle.py', 'guest_preview_servers.py',
    'prepare_tox21_transport.py', 'guest_artifact_preflight.py', 'run_tox21_vm_pilot.py', 'preview_compose.py')}
PUBLIC_FILES = OPS | SCRIPTS | {'deployment/deployment-schema.json', 'models.json'}
SELECTED = {'shared': {'meilisearch': 'meilisearch'},
            'preview': {'postgres-preview': 'postgres', 'redis-preview': 'redis', 'nats-preview': 'nats'}}


def expected_files():
    return PUBLIC_FILES | {f'servers/{role}/{name}' for role in ('postgres', 'redis', 'meilisearch') for name in SERVER_FILES} | {
        f'servers/nats/{name}' for name in BROKER_FILES}


def server_identities(root, revision):
    result = {}
    for role, user in [('postgres', '70:70'), ('redis', '999:1000'), ('meilisearch', '10001:10001')]:
        directory = root / 'servers' / role
        record = transport.read(directory / 'server.json')
        if (record.get('schemaVersion') != 1 or record.get('role') != role or record.get('revision') != revision
                or record.get('securityEligible') is not True or record.get('archiveLoadVerified') is not True
                or set(record.get('files', {})) != SERVER_FILES - {'server.json'}):
            raise ValueError('server-identity')
        for name, digest in record['files'].items():
            if delivery.checksum(transport.regular(directory / name)) != digest:
                raise ValueError('server-checksum')
        digest, image = delivery.archive_config(directory / 'image.tar')
        labels = image['config'].get('Labels', {})
        if ((image.get('os'), image.get('architecture')) != ('linux', 'amd64') or image['config'].get('User') != user
                or labels.get('org.opencontainers.image.source') != 'https://github.com/giuliomarinelli/MercurionWeb'
                or labels.get('org.opencontainers.image.revision') != revision
                or labels.get('org.mercurion.runtime.role') != role or digest != record['configDigest']
                or not delivery.security_summary(transport.read(directory / 'vulnerabilities.json'), digest)['eligible']):
            raise ValueError('server-provenance-or-scan')
        sbom = transport.read(directory / 'sbom.cdx.json')
        if sbom.get('bomFormat') != 'CycloneDX' or not sbom.get('components'):
            raise ValueError('server-sbom')
        result[role] = digest
    broker = pilot.broker(root / 'servers/nats')
    record = transport.read(root / 'servers/nats/broker.json')
    if (record.get('securityEligible') is not True or record.get('configDigest') != broker['configDigest']
            or set(record.get('files', {})) != BROKER_FILES - {'broker.json'}):
        raise ValueError('broker-identity')
    for name, digest in record['files'].items():
        if delivery.checksum(transport.regular(root / 'servers/nats' / name)) != digest:
            raise ValueError('broker-checksum')
    result['nats'] = broker['configDigest']
    return result


def verify(root):
    value = transport.read(root / 'server-bootstrap.json')
    if (value.get('schemaVersion') != 1 or value.get('scope') != 'preview-servers-only'
            or not re.fullmatch('[a-f0-9]{32}', value.get('runId', ''))
            or not re.fullmatch('[a-f0-9]{40}', value.get('releaseRevision', ''))
            or not re.fullmatch('[a-f0-9]{40}', value.get('toolRevision', ''))
            or set(value.get('files', {})) != expected_files()):
        raise ValueError('bundle-scope')
    for name, digest in value['files'].items():
        if delivery.checksum(transport.regular(root / name)) != digest:
            raise ValueError('bundle-checksum')
    if server_identities(root, value['releaseRevision']) != value.get('configDigests'):
        raise ValueError('bundle-images')
    preview_compose.validate(transport.read(root / 'models.json'))
    return value


def prepare(candidate, output):
    value = transport.read(candidate / 'preview-candidate.json')
    expected = {f'components/{role}/{name}' for role in ('web-ng', 'web-node', 'tox21') for name in APP_FILES}
    expected |= {f'servers/{role}/{name}' for role in ('postgres', 'redis', 'meilisearch', 'edge') for name in SERVER_FILES}
    expected |= {f'servers/nats/{name}' for name in BROKER_FILES} | OPS | {
        'coordinated.json', 'deployment/local-vm/runtime/Dockerfile', 'deployment/local-vm/pilot/nats.Dockerfile'}
    if (value.get('ciVerification') != 'passed' or value.get('strictScansPassed') is not True
            or value.get('origin') != 'https://preview.mercurion.app' or set(value.get('files', {})) != expected):
        raise ValueError('candidate-scope-or-ci')
    for name, digest in value['files'].items():
        if delivery.checksum(transport.regular(candidate / name)) != digest:
            raise ValueError('candidate-checksum')
    identities = server_identities(candidate, value['webRevision'])
    for name in OPS:
        if (ROOT / name).read_bytes().replace(b'\r\n', b'\n') != (candidate / name).read_bytes():
            raise ValueError('operational-source-drift')
    models = preview_compose.render()
    preview_compose.validate(models)
    output.mkdir(parents=True, exist_ok=False)
    for role in ('postgres', 'redis', 'meilisearch', 'nats'):
        for name in BROKER_FILES if role == 'nats' else SERVER_FILES:
            destination = output / 'servers' / role / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(candidate / 'servers' / role / name, destination)
    tool_revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    for name in SCRIPTS | OPS | {'deployment/deployment-schema.json'}:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(subprocess.check_output(['git', 'show', tool_revision + ':' + name], cwd=ROOT))
    transport.write(output / 'models.json', models)
    manifest = dict(schemaVersion=1, scope='preview-servers-only', runId=uuid.uuid4().hex,
        releaseRevision=value['webRevision'], toolRevision=tool_revision, configDigests=identities,
        files={name: delivery.checksum(output / name) for name in expected_files()},
        publishedPorts=False, applicationServicesStarted=False, isolationAccepted=False)
    transport.write(output / 'server-bootstrap.json', manifest)
    return verify(output)


def projection(models, loaded, identifier):
    preview_compose.validate(models)
    if not re.fullmatch('[a-f0-9]{32}', identifier) or set(loaded) != {'postgres', 'redis', 'nats', 'meilisearch'}:
        raise ValueError('projection-identity')
    root = PurePosixPath('/opt/mercurion/releases') / ('server-' + identifier)
    secret_root = PurePosixPath('/run/mercurion-preview') / identifier / 'active'
    result = copy.deepcopy(models)
    for project, roles in SELECTED.items():
        model = result[project]
        model['services'] = {name: model['services'][name] for name in roles}
        networks, volumes = set(), set()
        for name, role in roles.items():
            service = model['services'][name]
            image = loaded[role]['imageId']
            if not re.fullmatch('sha256:[a-f0-9]{64}', image):
                raise ValueError('projection-image')
            service['image'] = image
            service.setdefault('labels', {})['mercurion.bootstrap.run'] = identifier
            networks.update(service['networks'])
            for mount in service.get('volumes', []):
                if mount['type'] == 'volume':
                    volumes.add(mount['source'])
                elif mount['target'].startswith('/docker-entrypoint-initdb.d/'):
                    mount['source'] = str(root / 'deployment/local-vm/operational/postgres-init.sh')
                else:
                    suffix = {'postgres': '', 'redis': 'server.conf', 'nats': 'server.json', 'meilisearch': 'server.toml'}[role]
                    mount['source'] = str(secret_root / role / suffix)
        model['networks'] = {name: model['networks'][name] for name in networks}
        model['volumes'] = {name: model.get('volumes', {})[name] for name in volumes}
        for resource in (*model['networks'].values(), *model['volumes'].values()):
            resource.setdefault('labels', {})['mercurion.bootstrap.run'] = identifier
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'verify'))
    parser.add_argument('--root', type=Path)
    parser.add_argument('--candidate', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    answer = prepare(args.candidate, args.output) if args.command == 'prepare' else verify(args.root)
    print(json.dumps(dict(status='server-bundle-verified', runId=answer['runId'], configDigests=answer['configDigests'])))
