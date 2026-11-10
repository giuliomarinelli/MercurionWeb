"""Package an existing verified Tox21 staging export; never build or deploy."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import shutil
import uuid

import guest_artifact_preflight as guest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('delivery', ROOT / 'scripts/coordinate-delivery.py')
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)
FILES = ('component.json', 'image.tar', 'sbom.cdx.json', 'vulnerabilities.json',
         'policy-result.json', 'load.log', 'runtime-audit.json')


def regular(path):
    if any(parent.is_symlink() for parent in (path, *path.parents)) or not path.is_file():
        raise ValueError('Expected a regular file without symbolic links: ' + path.name)
    return path


def read(path):
    return json.loads(regular(path).read_text(encoding='utf-8'))


def verify_component(directory, bundle):
    for name in FILES:
        regular(directory / name)
    value = delivery.component(directory, 'tox21', '0' * 40, bundle)
    audit = read(directory / 'runtime-audit.json')
    scan = read(directory / 'vulnerabilities.json')
    _, config = delivery.archive_config(directory / 'image.tar')
    if (value['target'] != 'staging' or value['security_eligible'] is not True
            or config.get('os') != 'linux' or config.get('architecture') != 'amd64'
            or scan.get('Metadata', {}).get('OS', {}).get('Family') != 'wolfi'
            or not any(item.get('Class') == 'os-pkgs' and item.get('Type') == 'wolfi'
                       for item in scan['Results'])
            or any(audit.get(key) is not True for key in
                   ('readonly', 'training_absent', 'repeatable_inference'))
            or audit.get('build', {}).get('revision') != value['revision']
            or type(audit.get('size_bytes')) is not int or audit['size_bytes'] <= 0):
        raise ValueError('Staging runtime and complete strict scan evidence required')
    return value, audit


def prepare(candidate, output, web_revision):
    if not re.fullmatch('[0-9a-f]{40}', web_revision):
        raise ValueError('Full Web tooling revision required')
    summary = read(candidate / 'candidate-summary.json')
    value, audit = verify_component(candidate / 'export', candidate)
    if (summary.get('status') != 'candidate-ready' or summary.get('environment') != 'preview'
            or summary.get('revision') != value['revision']
            or summary.get('configDigest') != value['config_digest']
            or summary.get('archiveSha256') != value['archive_sha256']
            or summary.get('securityEligible') is not True
            or summary.get('cleanupVerified') is not True):
        raise ValueError('Candidate identity or completed lifecycle evidence differs')
    # Allowlist only; never recursively copy source, credentials or training data.
    output.mkdir(parents=True, exist_ok=False)
    destination = output / 'components/tox21'
    destination.mkdir(parents=True)
    for name in FILES:
        shutil.copyfile(regular(candidate / 'export' / name), destination / name)
    shutil.copyfile(regular(candidate / 'candidate-summary.json'), output / 'candidate-summary.json')
    coordinated = delivery.coordinate(web_revision, {'tox21': destination}, output / 'coordinated.json')
    _, copied_audit = verify_component(destination, output)
    if copied_audit != audit:
        raise ValueError('Runtime audit changed during copy')
    preflight = output / 'preflight'
    preflight.mkdir()
    helper = Path(__file__).with_name('guest_artifact_preflight.py')
    shutil.copyfile(regular(helper), preflight / helper.name)
    archive_bytes = (destination / 'image.tar').stat().st_size
    request = {'schemaVersion': 1, 'runId': uuid.uuid4().hex, 'environment': 'preview',
               'component': 'tox21', 'revision': value['revision'],
               'configDigest': value['config_digest'], 'archiveSha256': value['archive_sha256'],
               'archiveBytes': archive_bytes, 'runtimeBytes': audit['size_bytes'],
               'helperSha256': delivery.checksum(preflight / helper.name)}
    write(preflight / 'request.json', request)
    manifest = {'schemaVersion': 1, 'scope': 'tox21-staging-transport-only',
                'request': request, 'missingComponents': coordinated['missing_components'],
                'integratedAcceptance': False, 'imageTransferred': False,
                'servicesStarted': False, 'isolationAccepted': False,
                'files': {str(path.relative_to(output)).replace('\\', '/'):
                          {'sha256': delivery.checksum(path), 'bytes': path.stat().st_size}
                          for path in sorted(output.rglob('*')) if path.is_file()}}
    write(output / 'transport.json', manifest)
    return validate(output)


def write(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def validate(bundle):
    manifest = read(bundle / 'transport.json')
    expected = {'components/tox21/' + name for name in FILES} | {
        'candidate-summary.json', 'coordinated.json', 'preflight/request.json',
        'preflight/guest_artifact_preflight.py'}
    if (manifest.get('schemaVersion') != 1 or set(manifest.get('files', {})) != expected
            or manifest.get('scope') != 'tox21-staging-transport-only'
            or manifest.get('integratedAcceptance') is not False
            or manifest.get('missingComponents') != ['web-ng', 'web-node']):
        raise ValueError('Unexpected transport scope or incomplete manifest')
    actual = {str(path.relative_to(bundle)).replace('\\', '/') for path in bundle.rglob('*') if path.is_file()}
    if actual != expected | {'transport.json'} or any(path.is_symlink() for path in bundle.rglob('*')):
        raise ValueError('Unexpected bundle contents')
    for name, record in manifest['files'].items():
        path = regular(bundle / name)
        if delivery.checksum(path) != record['sha256'] or path.stat().st_size != record['bytes']:
            raise ValueError('Transport checksum or size mismatch: ' + name)
    value, audit = verify_component(bundle / 'components/tox21', bundle)
    request = read(bundle / 'preflight/request.json')
    guest.validate_request(request, delivery.checksum(bundle / 'preflight/guest_artifact_preflight.py'))
    coordinated = read(bundle / 'coordinated.json')
    if (request != manifest['request'] or request['revision'] != value['revision']
            or request['configDigest'] != value['config_digest']
            or request['archiveSha256'] != value['archive_sha256']
            or request['archiveBytes'] != (bundle / 'components/tox21/image.tar').stat().st_size
            or request['runtimeBytes'] != audit['size_bytes']
            or request['helperSha256'] != delivery.checksum(bundle / 'preflight/guest_artifact_preflight.py')
            or coordinated.get('eligible_for_integrated_acceptance') is not False
            or coordinated.get('missing_components') != ['web-ng', 'web-node']
            or coordinated.get('components', {}).get('tox21') != value):
        raise ValueError('Transport identity differs from component evidence')
    return {'status': 'transport-verified', 'runId': request['runId'],
            'bundlePath': str(bundle.resolve()), 'archiveBytes': request['archiveBytes'],
            'configDigest': request['configDigest'], 'missingComponents': ['web-ng', 'web-node'],
            'integratedAcceptance': False, 'isolationAccepted': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('prepare')
    create.add_argument('--candidate', type=Path, required=True)
    create.add_argument('--output', type=Path, required=True)
    create.add_argument('--web-revision', required=True)
    check = sub.add_parser('validate')
    check.add_argument('--bundle', type=Path, required=True)
    args = parser.parse_args()
    result = (prepare(args.candidate, args.output, args.web_revision)
              if args.command == 'prepare' else validate(args.bundle))
    print(json.dumps(result))
