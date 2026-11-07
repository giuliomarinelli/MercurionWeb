"""Validate local component archives and record a coordinated candidate, never deploy."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tarfile
from collections import Counter


def checksum(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def archive_config(path):
    with tarfile.open(path) as archive:
        entries = json.load(archive.extractfile('manifest.json'))
        if len(entries) != 1 or entries[0].get('RepoTags'):
            raise ValueError('Expected a single untagged component archive')
        member = archive.getmember(entries[0]['Config'])
        if not member.isfile() or member.size > 1024 * 1024:
            raise ValueError('Invalid image config')
        raw = archive.extractfile(member).read()
        return 'sha256:' + hashlib.sha256(raw).hexdigest(), json.loads(raw)


def security_summary(scan, config_digest):
    if scan.get('SchemaVersion') != 2 or scan.get('Metadata', {}).get('ImageID') != config_digest or not scan.get('Results'):
        raise ValueError('Security report does not describe this archive')
    findings = [finding for result in scan['Results'] for finding in result.get('Vulnerabilities', [])]
    if any(finding.get('Severity') not in ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] for finding in findings):
        raise ValueError('Malformed finding severity')
    return {'eligible': not any(f['Severity'] == 'CRITICAL' for f in findings),
            'counts': dict(Counter(f['Severity'] for f in findings)),
            'os': scan.get('Metadata', {}).get('OS')}


def component(directory, role, web_revision, bundle):
    directory = directory.resolve()
    relative = directory.relative_to(bundle.resolve())
    value = json.loads((directory / 'component.json').read_text(encoding='utf-8'))
    expected_source = 'https://github.com/giuliomarinelli/' + ('MercurionTox21' if role == 'tox21' else 'MercurionWeb')
    if (value.get('schema_version') != 1 or value.get('component') != role or
            value.get('source') != expected_source or not re.fullmatch('[0-9a-f]{40}', value.get('revision', '')) or
            value.get('archive_load_verified') is not True):
        raise ValueError('Invalid component identity or unverified transport: ' + role)
    if role != 'tox21' and value['revision'] != web_revision:
        raise ValueError('Web image revision differs from coordinated source')
    if value.get('target') not in ['test', 'staging', 'production'] or not isinstance(value.get('version'), str) or not value['version'].strip():
        raise ValueError('Invalid target or version')
    if role == 'tox21':
        model = value.get('model')
        if (not isinstance(model, dict) or not model.get('model_version') or
                not re.fullmatch('[0-9a-f]{40}', model.get('export_revision', '')) or
                any(not re.fullmatch('[0-9a-f]{64}', model.get('files', {}).get(name, '')) for name in ['weights.pt', 'thresholds.json'])):
            raise ValueError('Missing model export identity or checksums')
    if not re.fullmatch('sha256:[0-9a-f]{64}', value.get('config_digest', '')):
        raise ValueError('Missing portable image config digest')
    required = {'image.tar', 'sbom.cdx.json', 'vulnerabilities.json', 'policy-result.json', 'load.log', 'runtime-audit.json'}
    if set(value.get('files', {})) != required:
        raise ValueError('Incomplete component evidence')
    for name, digest in value['files'].items():
        path = directory / name
        if path.is_symlink() or checksum(path) != digest:
            raise ValueError('Component evidence checksum mismatch: ' + name)
    digest, config = archive_config(directory / 'image.tar')
    if digest != value['config_digest']:
        raise ValueError('Archive config digest differs from manifest')
    for field, expected in [('source', expected_source), ('revision', value['revision']), ('version', value['version'])]:
        if config['config']['Labels'].get('org.opencontainers.image.' + field) != expected:
            raise ValueError('Archive label differs from component identity')
    scan = json.loads((directory / 'vulnerabilities.json').read_text())
    sbom = json.loads((directory / 'sbom.cdx.json').read_text())
    if sbom.get('bomFormat') != 'CycloneDX' or not isinstance(sbom.get('components'), list) or not sbom['components']:
        raise ValueError('Missing or malformed image SBOM')
    eligible = security_summary(scan, value['config_digest'])['eligible']
    summary = json.loads((directory / 'policy-result.json').read_text())
    if value.get('security_eligible') is not eligible or summary.get('eligible') is not eligible:
        raise ValueError('Security eligibility contradicts underlying findings')
    return {'record': str(relative / 'component.json').replace('\\', '/'),
            'record_sha256': checksum(directory / 'component.json'), 'revision': value['revision'],
            'version': value['version'], 'target': value['target'], 'config_digest': value['config_digest'],
            'archive_sha256': value['files']['image.tar'], 'security_eligible': eligible,
            'model': value.get('model')}


def coordinate(web_revision, inputs, output):
    if not re.fullmatch('[0-9a-f]{40}', web_revision):
        raise ValueError('Full MercurionWeb source SHA required')
    components = {}
    for role in ['web-ng', 'web-node', 'tox21']:
        components[role] = component(inputs[role], role, web_revision, output.parent) if inputs.get(role) else None
    targets = {value['target'] for value in components.values() if value}
    if len(targets) > 1:
        raise ValueError('Cannot coordinate different runtime targets')
    missing = [role for role, value in components.items() if value is None]
    blocked = [role for role, value in components.items() if value and not value['security_eligible']]
    manifest = {'schema_version': 1, 'channel': 'local-docker-archives',
                'status': 'candidate', 'web_revision': web_revision,
                'components': components, 'missing_components': missing, 'blocked_components': blocked,
                'eligible_for_integrated_acceptance': not (missing or blocked), 'deployed': False}
    with output.open('x', encoding='utf-8') as stream:
        json.dump(manifest, stream, indent=2)
        stream.write('\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web-revision', required=True)
    parser.add_argument('--tox21', type=Path)
    parser.add_argument('--web-ng', type=Path)
    parser.add_argument('--web-node', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = coordinate(args.web_revision, {'tox21': args.tox21, 'web-ng': args.web_ng, 'web-node': args.web_node}, args.output)
    print(json.dumps(result))
    raise SystemExit(0 if result['eligible_for_integrated_acceptance'] else 2)
