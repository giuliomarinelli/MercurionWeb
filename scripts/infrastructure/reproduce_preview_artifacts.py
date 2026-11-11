"""Repository-owned equivalents of the VM-042 public preparation recipes; no secrets or SSH."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess

import export_preview_service as servers
import preview_server_bundle as bundle

ROOT = Path(__file__).resolve().parents[2]
delivery = bundle.delivery


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], timeout=60)


def revision(value):
    if not re.fullmatch('[a-f0-9]{40}', value) or git('rev-parse', value + '^{commit}').decode().strip() != value:
        raise ValueError('Full existing commit SHA required')


def web_file(name):
    path = PurePosixPath(name)
    return (not path.is_absolute() and '..' not in path.parts and '\\' not in name
        and path.suffix.lower() not in ('.pem', '.key', '.p12', '.pfx')
        and not any(part.lower() == '.env' or part.lower().startswith('.env.') for part in path.parts)
        and (name.startswith(('MercurionWebNg/', 'MercurionWebNode/', 'packages/', 'scripts/'))
             or name in ('package.json', 'package-lock.json', '.dockerignore')))


def materialize(value, output):
    revision(value)
    manifest_path = output.with_name(output.name + '-manifest.json')
    if manifest_path.exists():
        raise ValueError('Source manifest already exists')
    records = []
    for entry in git('ls-tree', '-rz', value).split(b'\0'):
        if not entry:
            continue
        meta, name = entry.split(b'\t', 1)
        name = name.decode('utf-8')
        if web_file(name):
            mode, kind, oid = meta.decode().split()
            if mode not in ('100644', '100755') or kind != 'blob':
                raise ValueError('Nonregular source')
            records.append((name, oid))
    required = {'package.json', 'package-lock.json', '.dockerignore', 'MercurionWebNg/Dockerfile', 'MercurionWebNode/Dockerfile'}
    if not required <= {name for name, _ in records}:
        raise ValueError('Incomplete Web source')
    output.mkdir(parents=True, exist_ok=False)
    files = {}
    process = subprocess.Popen(['git', '-C', str(ROOT), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for name, oid in records:
            process.stdin.write((oid + '\n').encode()); process.stdin.flush()
            reported, kind, size = process.stdout.readline().decode().split()
            data = process.stdout.read(int(size))
            if reported != oid or kind != 'blob' or len(data) != int(size) or process.stdout.read(1) != b'\n':
                raise ValueError('Git blob mismatch')
            target = output / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            files[name] = delivery.checksum(target)
    finally:
        process.stdin.close()
        process.wait(timeout=15)
        process.stdout.close()
    bundle.transport.write(manifest_path, dict(revision=value, worktreeOverlay=False, files=files))
    return dict(status='materialized', revision=value, source=str(output), files=len(files))


def broker_export(image, output, cache):
    output.mkdir(parents=True, exist_ok=False)
    image_id = subprocess.check_output(['docker', '--context', 'desktop-linux', 'image', 'inspect', image,
        '--format', '{{.Id}}'], text=True, timeout=30).strip()
    subprocess.run(['docker', '--context', 'desktop-linux', 'save', '--output', str(output / 'image.tar'), image_id], check=True, timeout=180)
    database = servers.web.scan_archive(output, cache, ('docker', '--context', 'desktop-linux'))
    identity = bundle.pilot.broker(output)  # Patched upstream provenance, gobinary, SBOM and zero findings.
    digest = identity['configDigest']
    policy = delivery.security_summary(bundle.transport.read(output / 'vulnerabilities.json'), digest)
    bundle.transport.write(output / 'policy-result.json', policy)
    bundle.transport.write(output / 'broker.json', dict(role='nats', configDigest=digest, version=identity['version'],
        securityEligible=True, scannerDatabase=database,
        files={name: delivery.checksum(output / name) for name in bundle.BROKER_FILES - {'broker.json'}}))
    return dict(status='broker-exported', configDigest=digest, securityEligible=True)


def ci(repo, run, sha, full_web=False):
    value = json.loads(subprocess.check_output(['gh', 'run', 'view', str(run), '--repo', repo,
        '--json', 'headSha,status,conclusion,jobs,url'], encoding='utf-8', timeout=60))
    if value.get('headSha') != sha or value.get('status') != 'completed' or value.get('conclusion') != 'success':
        raise ValueError('Exact-SHA successful CI required')
    jobs = {job['name']: job['conclusion'] for job in value.get('jobs', [])}
    if jobs.get('Required gate') != 'success':
        raise ValueError('Successful exact-SHA Required gate required')
    if full_web:
        required = {'Required gate', 'Prerequisites (windows-latest)', 'Prerequisites (ubuntu-latest)',
            'Strict dependency vulnerability policy', 'Angular unit tests', 'Nest unit tests', 'Nest E2E tests',
            'Build artifacts', 'Critical browser journeys', 'Supply-chain policy and attestation'}
        required |= {'Container ' + component + '-' + target for component in ('angular', 'nest') for target in ('test', 'staging', 'production')}
        required |= {'Preview server ' + role for role in servers.USERS}
        if any(jobs.get(name) != 'success' for name in required):
            raise ValueError('Full Web CI and all server/container gates required')
    return value['url']


def assemble(args):
    revision(args.revision)
    inputs = {'web-ng': args.web / 'web-ng', 'web-node': args.web / 'web-node', 'tox21': args.tox21}
    components = {role: delivery.component(path, role, args.revision, path.parent) for role, path in inputs.items()}
    if any(item['target'] != 'staging' or not item['security_eligible'] for item in components.values()):
        raise ValueError('Only verified staging components allowed')
    web_ci = ci('giuliomarinelli/MercurionWeb', args.web_ci, args.revision, full_web=True)
    tox_ci = ci('giuliomarinelli/MercurionTox21', args.tox21_ci, components['tox21']['revision'])
    sources = {}
    for role in servers.USERS:
        path = args.servers / role
        record = bundle.transport.read(path / 'server.json')
        if (record.get('revision') != args.revision or record.get('role') != role
                or record.get('securityEligible') is not True or record.get('archiveLoadVerified') is not True
                or set(record.get('files', {})) != bundle.SERVER_FILES - {'server.json'}):
            raise ValueError('Server export scope or identity')
        for name, checksum in record['files'].items():
            if delivery.checksum(bundle.transport.regular(path / name)) != checksum:
                raise ValueError('Server export checksum')
        digest, config = delivery.archive_config(path / 'image.tar')
        servers.identity({'Os': config['os'], 'Architecture': config['architecture'], 'Config': config['config']}, role, args.revision)
        if digest != record['configDigest'] or not delivery.security_summary(bundle.transport.read(path / 'vulnerabilities.json'), digest)['eligible']:
            raise ValueError('Server scan or archive identity')
        sbom = bundle.transport.read(path / 'sbom.cdx.json')
        if sbom.get('bomFormat') != 'CycloneDX' or not sbom.get('components'):
            raise ValueError('Server SBOM required')
        sources[role] = path
    broker = bundle.pilot.broker(args.broker)
    record = bundle.transport.read(args.broker / 'broker.json')
    if (record.get('configDigest') != broker['configDigest'] or record.get('securityEligible') is not True
            or set(record.get('files', {})) != bundle.BROKER_FILES - {'broker.json'}):
        raise ValueError('Broker export scope')
    for name, checksum in record['files'].items():
        if delivery.checksum(bundle.transport.regular(args.broker / name)) != checksum:
            raise ValueError('Broker export checksum')
    if args.check_only:
        return dict(status='inputs-verified', imageCount=8, webCi=web_ci, tox21Ci=tox_ci)
    args.output.mkdir(parents=True, exist_ok=False)
    for role, source in inputs.items():
        target = args.output / 'components' / role
        target.mkdir(parents=True)
        for name in bundle.APP_FILES:
            shutil.copyfile(bundle.transport.regular(source / name), target / name)
    for role, source in {**sources, 'nats': args.broker}.items():
        target = args.output / 'servers' / role
        target.mkdir(parents=True)
        for name in bundle.BROKER_FILES if role == 'nats' else bundle.SERVER_FILES:
            shutil.copyfile(bundle.transport.regular(source / name), target / name)
    coordinated = delivery.coordinate(args.revision, {role: args.output / 'components' / role for role in inputs}, args.output / 'coordinated.json')
    if not coordinated['eligible_for_integrated_acceptance']:
        raise ValueError('Application coordination failed')
    for name in bundle.OPS | {'deployment/local-vm/runtime/Dockerfile', 'deployment/local-vm/pilot/nats.Dockerfile'}:
        target = args.output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(git('show', args.revision + ':' + name))
    bundle.transport.write(args.output / 'preview-candidate.json', dict(schemaVersion=1, status='candidate',
        webRevision=args.revision, origin='https://preview.mercurion.app', imageCount=8,
        createdAtUtc=datetime.now(timezone.utc).isoformat(), ciVerification='passed', ciRun=args.web_ci,
        ciUrl=web_ci, tox21CiUrl=tox_ci, strictScansPassed=True, applicationCoordinated=True,
        servicesStarted=False, publicAcceptance=False, isolationAccepted=False,
        files={str(p.relative_to(args.output)).replace('\\', '/'): delivery.checksum(p) for p in args.output.rglob('*') if p.is_file()}))
    return dict(status='candidate-prepared', imageCount=8, path=str(args.output))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    material = commands.add_parser('materialize-web')
    material.add_argument('--revision', required=True)
    material.add_argument('--output', required=True, type=Path)
    broker = commands.add_parser('export-broker')
    for name in ('output', 'cache'):
        broker.add_argument('--' + name, type=Path, required=True)
    broker.add_argument('--image', required=True)
    prepare = commands.add_parser('assemble')
    prepare.add_argument('--revision', required=True)
    for name in ('web', 'tox21', 'servers', 'broker', 'output'):
        prepare.add_argument('--' + name, type=Path, required=True)
    for name in ('web-ci', 'tox21-ci'):
        prepare.add_argument('--' + name, type=int, required=True)
    prepare.add_argument('--check-only', action='store_true', help='Verify inputs and CI; do not assemble or deploy')
    args = parser.parse_args()
    result = (materialize(args.revision, args.output) if args.command == 'materialize-web' else
              broker_export(args.image, args.output, args.cache) if args.command == 'export-broker' else assemble(args))
    print(json.dumps(result))
