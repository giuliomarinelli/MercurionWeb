"""Build-independent Web staging/production audit, untagged export and security evidence."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time

spec = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('coordinate-delivery.py'))
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)
SCANNER = 'aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb'


def run(*args):
    return subprocess.check_output(list(args), encoding='utf-8', timeout=1200).strip()


def scan_archive(root, cache, docker_prefix=('docker',)):
    # Trivy's download-db-only also honors NextUpdate on an existing cache.
    # A fresh, owned subdirectory forces current DB acquisition for each export.
    cache.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='release-scan-', dir=cache.resolve()) as temporary:
        scan_cache = Path(temporary).resolve()
        if scan_cache.parent != cache.resolve():
            raise ValueError('Unexpected scan cache path')
        mounts = ['--mount', f'type=bind,src={root.resolve()},dst=/evidence',
                  '--mount', f'type=bind,src={scan_cache},dst=/cache']
        user = ['--user', f'{os.getuid()}:{os.getgid()}'] if os.name == 'posix' else []
        refreshed = subprocess.run([*docker_prefix, 'run', '--rm', *user, *mounts, SCANNER, 'image',
                                    '--download-db-only', '--cache-dir', '/cache'],
                                   capture_output=True, encoding='utf-8', timeout=1200)
        (root / 'database-refresh.log').write_text(refreshed.stdout + refreshed.stderr, encoding='utf-8')
        refreshed.check_returncode()
        for filename, flags in [('sbom.cdx.json', ['--format', 'cyclonedx']),
                                ('vulnerabilities.json', ['--scanners', 'vuln', '--ignorefile', '/dev/null', '--format', 'json'])]:
            result = subprocess.run([*docker_prefix, 'run', '--rm', *user, *mounts, SCANNER, 'image', '--quiet', '--input',
                                     '/evidence/image.tar', '--cache-dir', '/cache', '--output', '/evidence/' + filename, *flags],
                                    capture_output=True, encoding='utf-8', timeout=1200)
            (root / (filename + '.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
            result.check_returncode()
        return json.loads((scan_cache / 'db/metadata.json').read_text())


def validate_identity(image, role, revision, version, target='production'):
    expected = {'org.opencontainers.image.source': 'https://github.com/giuliomarinelli/MercurionWeb',
                'org.opencontainers.image.revision': revision, 'org.opencontainers.image.version': version}
    if target not in ('staging', 'production') or not re.fullmatch('[0-9a-f]{40}', revision) or not version:
        raise ValueError('Full source revision and version required')
    config = image['Config']
    if (image['Os'], image['Architecture']) != ('linux', 'amd64'):
        raise ValueError('Only the verified Linux amd64 target is supported')
    if any(config.get('Labels', {}).get(key) != value for key, value in expected.items()):
        raise ValueError('Image labels differ from requested identity')
    user, port = ('10101:10101', '3497/tcp') if role == 'web-ng' else ('10001:10001', '8098/tcp')
    if config.get('User') != user or port not in config.get('ExposedPorts', {}) or not config.get('Cmd'):
        raise ValueError('Unexpected standalone runtime configuration')
    marker = config.get('Labels', {}).get('org.mercurion.environment')
    if marker != target and not (target == 'production' and marker is None):
        raise ValueError('Image environment label differs from requested target')
    if role == 'web-node' and 'APP_ENV=' + target not in config.get('Env', []):
        raise ValueError('Backend image must use the requested runtime target')
    return expected


def runtime_audit(image_id, role, revision, version):
    restricted = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                  '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m']
    if role == 'web-node':
        code = r'''
const fs=require('node:fs');
for(const file of ['dist/src/main.js','dist/src/bootstrap-secrets.cli.js','dist/src/schema.graphql','assets-root/og/mercurion-og.png',
 'dist/src/app_modules/notification/email-templates/confirmation.hbs',
 'packages/rest-contracts/dist/index.js','packages/socket-contracts/cjs/index.js']){
 if(!fs.existsSync(file))throw Error('Missing runtime file: '+file);
}
for(const name of ['argon2','fastify','graphql','pg','typeorm','jose'])require(name);
for(const name of ['typescript','jest','@angular/core','@nestjs/cli']){
 if(fs.existsSync('node_modules/'+name))throw Error('Development package retained: '+name);
}
const identity=require('./dist/src/generated/build-identity.js').buildIdentity;
for(const file of ['/usr/local/lib/node_modules/npm','/usr/local/bin/npm','/usr/local/bin/npx',
 '/usr/local/bin/yarn','/usr/local/bin/yarnpkg',...fs.readdirSync('/opt').filter(name=>name.startsWith('yarn-')).map(name=>'/opt/'+name)]){
 if(fs.lstatSync(file,{throwIfNoEntry:false}))throw Error('Package manager retained: '+file);
}
console.log(JSON.stringify({identity,requiredModules:6,packageManagersAbsent:true,bootstrapStarted:false}));
'''
        result = json.loads(run(*restricted, '--entrypoint', 'node', image_id, '-e', code))
        if result['identity'] != {'revision': revision, 'version': version}:
            raise ValueError('Compiled backend identity differs from labels')
        return result
    # No host ports: HTTP is confined to the owned container's loopback interface.
    container = run('docker', 'run', '-d', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                    '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', image_id)
    try:
        deadline = time.monotonic() + 25
        while True:
            result = subprocess.run(['docker', 'exec', container, 'wget', '-q', '-O', '-', 'http://127.0.0.1:3497/'],
                                    capture_output=True, encoding='utf-8', timeout=5)
            if result.returncode == 0 and '<html' in result.stdout.lower():
                break
            if time.monotonic() > deadline:
                raise ValueError('Frontend index did not become ready: ' + run('docker', 'logs', container))
            time.sleep(0.5)
        bundle = run('docker', 'exec', container, 'sh', '-c', 'grep -l ' + revision + ' /usr/share/nginx/html/*.js | xargs cat')
        pattern = r'version:[\"\x27]' + re.escape(version) + r'[\"\x27],revision:[\"\x27]' + revision + r'[\"\x27]'
        if not re.search(pattern, bundle):
            raise ValueError('Compiled frontend identity differs from labels')
        return {'loopbackIndex': True, 'compiledRevision': revision, 'compiledVersion': version,
                'hostPorts': False, 'browserAcceptance': False}
    finally:
        run('docker', 'stop', '--time', '5', container)
        run('docker', 'rm', container)


def export(args):
    root = args.output.resolve()
    root.mkdir(parents=True, exist_ok=False)
    policy_path = Path(__file__).resolve().parents[1] / 'docs/supply-chain-policy.json'
    policy = json.loads(policy_path.read_text())
    if (policy.get('version') != 2 or policy['vulnerabilities']['blockingSeverities'] != ['info', 'low', 'moderate', 'high', 'critical']
            or policy.get('exceptions') != []):
        raise ValueError('Exporter requires strict vulnerability policy without exceptions')
    image = json.loads(run('docker', 'image', 'inspect', args.image))[0]
    validate_identity(image, args.component, args.revision, args.version, args.target)
    audit = runtime_audit(image['Id'], args.component, args.revision, args.version)
    (root / 'runtime-audit.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf-8')
    run('docker', 'save', '--output', str(root / 'image.tar'), image['Id'])
    digest, config = delivery.archive_config(root / 'image.tar')
    database = scan_archive(root, args.cache)
    sbom = json.loads((root / 'sbom.cdx.json').read_text())
    if sbom.get('bomFormat') != 'CycloneDX' or not sbom.get('components'):
        raise ValueError('Missing image SBOM')
    summary = delivery.security_summary(json.loads((root / 'vulnerabilities.json').read_text()), digest)
    (root / 'policy-result.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    loaded = run('docker', 'load', '--input', str(root / 'image.tar'))
    (root / 'load.log').write_text(loaded + '\n', encoding='utf-8')
    ids = re.findall(r'Loaded image ID: (sha256:[0-9a-f]{64})', loaded)
    if len(ids) != 1:
        raise ValueError('Cannot identify loaded archive')
    restored = json.loads(run('docker', 'image', 'inspect', ids[0]))[0]
    if restored['Config']['Labels'] != config['config']['Labels'] or restored['RootFS']['Layers'] != config['rootfs']['diff_ids']:
        raise ValueError('Loaded image differs from exported archive')
    files = {name: delivery.checksum(root / name) for name in ['image.tar','runtime-audit.json','sbom.cdx.json',
             'vulnerabilities.json','policy-result.json','load.log']}
    record = {'schema_version': 1, 'component': args.component, 'status': 'candidate',
              'exported_at': datetime.now(timezone.utc).isoformat(), 'source': image['Config']['Labels']['org.opencontainers.image.source'],
              'revision': args.revision, 'version': args.version, 'target': args.target,
              'docker_image_id': image['Id'], 'config_digest': digest, 'archive_load_verified': True,
              'loaded_image_id': ids[0], 'security_eligible': summary['eligible'], 'files': files,
              'scanner': SCANNER, 'scanner_database': database, 'policy_sha256': delivery.checksum(policy_path), 'model': None}
    (root / 'component.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'component': args.component, 'config_digest': digest,
                      'eligible': summary['eligible'], 'counts': summary['counts']}))
    return 0 if summary['eligible'] else 2


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--component', required=True, choices=['web-ng','web-node'])
    parser.add_argument('--revision', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--target', choices=['staging', 'production'], default='production')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--cache', required=True, type=Path)
    raise SystemExit(export(parser.parse_args()))
