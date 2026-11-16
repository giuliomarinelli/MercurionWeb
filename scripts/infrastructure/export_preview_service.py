"""Immutable preview server export: source identity, SBOM, strict scan and load check."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('web_export', ROOT / 'scripts/export-web-container.py')
web = importlib.util.module_from_spec(spec)
spec.loader.exec_module(web)
USERS = {'postgres': '70:70', 'redis': '999:1000', 'meilisearch': '10001:10001', 'edge': '10101:10101'}


def identity(image, role, revision):
    if role not in USERS or not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('Full recipe revision and known server role required')
    config = image.get('Config', {})
    labels = config.get('Labels', {})
    if ((image.get('Os'), image.get('Architecture')) != ('linux', 'amd64')
            or config.get('User') != USERS[role]
            or labels.get('org.opencontainers.image.source') != 'https://github.com/giuliomarinelli/MercurionWeb'
            or labels.get('org.opencontainers.image.revision') != revision
            or labels.get('org.mercurion.runtime.role') != role):
        raise ValueError('Server runtime or source identity mismatch')


def export(args):
    def command(*arguments):
        return subprocess.check_output(['docker', '--context', args.context, *arguments],
                                       encoding='utf-8', timeout=1200).strip()
    policy = json.loads((ROOT / 'docs/supply-chain-policy.json').read_text())
    if (policy.get('version') != 2 or policy.get('exceptions') != [] or
            policy['vulnerabilities']['blockingSeverities'] != ['info', 'low', 'moderate', 'high', 'critical']):
        raise ValueError('Strict vulnerability policy required')
    image = json.loads(command('image', 'inspect', args.image))[0]
    identity(image, args.role, args.revision)
    args.output.mkdir(parents=True, exist_ok=False)
    args.cache.mkdir(parents=True, exist_ok=True)
    command('save', '--output', str(args.output / 'image.tar'), image['Id'])
    digest, config = web.delivery.archive_config(args.output / 'image.tar')
    database = web.scan_archive(args.output, args.cache, ('docker', '--context', args.context))
    sbom = json.loads((args.output / 'sbom.cdx.json').read_text())
    if sbom.get('bomFormat') != 'CycloneDX' or not sbom.get('components'):
        raise ValueError('Missing SBOM inventory')
    summary = web.delivery.security_summary(json.loads((args.output / 'vulnerabilities.json').read_text()), digest)
    (args.output / 'policy-result.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    loaded = command('load', '--input', str(args.output / 'image.tar'))
    identifiers = re.findall(r'Loaded image ID: (sha256:[a-f0-9]{64})', loaded)
    if len(identifiers) != 1:
        raise ValueError('Ambiguous archive load')
    restored = json.loads(command('image', 'inspect', identifiers[0]))[0]
    identity(restored, args.role, args.revision)
    if restored['RootFS']['Layers'] != config['rootfs']['diff_ids']:
        raise ValueError('Archive load changed layer identity')
    record = {'schemaVersion': 1, 'role': args.role, 'revision': args.revision,
              'exportedAtUtc': datetime.now(timezone.utc).isoformat(), 'configDigest': digest,
              'imageId': image['Id'], 'loadedImageId': identifiers[0], 'archiveLoadVerified': True,
              'securityEligible': summary['eligible'], 'scanner': web.SCANNER,
              'scannerDatabase': database,
              'files': {name: web.delivery.checksum(args.output / name) for name in
                        ('image.tar', 'sbom.cdx.json', 'vulnerabilities.json', 'policy-result.json')}}
    (args.output / 'server.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    print(json.dumps({'role': args.role, 'configDigest': digest,
                      'securityEligible': summary['eligible'], 'archiveLoadVerified': True}))
    return 0 if summary['eligible'] else 2


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--role', choices=USERS, required=True)
    parser.add_argument('--image', required=True)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--context', default='desktop-linux')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    raise SystemExit(export(parser.parse_args()))
