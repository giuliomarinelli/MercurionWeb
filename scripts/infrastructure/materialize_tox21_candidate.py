"""Copy an exact Git revision's allowlisted build/tool files; never read local dotenv/keys."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess


def allowed_file(name):
    path = PurePosixPath(name)
    if not path.parts or path.is_absolute() or '..' in path.parts or any(token in name.lower() for token in ('.env', '.pem', '.key')):
        return False
    fixed = {'Dockerfile', '.dockerignore', 'requirements.txt', 'docs/container-policy.json',
             'main.py', 'config.py', 'runtime.py', 'secret_bootstrap.py', 'bootstrap_secrets.py'}
    return (name in fixed or
            (path.parts[0] in {'api', 'schemas', 'mercurion', 'scripts', 'tests'} and path.suffix == '.py') or
            (name.startswith('tests/fixtures/') and path.suffix == '.json') or
            (name.startswith('requirements/') and name.endswith('-linux-cpu.lock')))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', args.revision):
        raise ValueError('full-commit-sha-required')
    source = args.source.resolve()
    def git(*command):
        return subprocess.check_output(['git', '-C', str(source), *command], timeout=30)
    if git('rev-parse', args.revision + '^{commit}').decode().strip() != args.revision:
        raise ValueError('commit-mismatch')
    selected = []
    for record in git('ls-tree', '-rz', '--name-only', args.revision).split(b'\0'):
        if record and allowed_file(record.decode('utf-8')):
            selected.append(record.decode('utf-8'))
    target = args.output.resolve()
    required = {'Dockerfile', '.dockerignore', 'main.py', 'bootstrap_secrets.py',
                'docs/container-policy.json', 'requirements/runtime-linux-cpu.lock',
                'requirements/build-linux-cpu.lock'}
    if not required.issubset(selected):
        raise ValueError('incomplete-tox21-source')
    manifest_path = target.parent / (target.name + '-manifest.json')
    if manifest_path.exists():
        raise ValueError('manifest-exists')
    target.mkdir(parents=True, exist_ok=False)
    manifest = {}
    for name in selected:
        entry = git('ls-tree', args.revision, '--', name).decode().split()[0]
        if entry not in ('100644', '100755'):
            raise ValueError('non-regular-git-file')
        data = git('show', args.revision + ':' + name)
        path = target.joinpath(*PurePosixPath(name).parts)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        manifest[name] = hashlib.sha256(data).hexdigest()
    with manifest_path.open('x', encoding='utf-8') as stream:
        json.dump({'revision': args.revision, 'source': 'https://github.com/giuliomarinelli/MercurionTox21',
                   'files': manifest}, stream, indent=2)
    print(json.dumps({'revision': args.revision, 'directory': str(target), 'files': len(manifest)}))


if __name__ == '__main__':
    main()
