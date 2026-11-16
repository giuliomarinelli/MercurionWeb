"""Materialize the pinned, public PostgreSQL 16.16 build inputs; no Docker/VM operations."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
RECIPES = ROOT/'deployment/local-vm/coordinated'


def prepare(output):
    output.mkdir(parents=True, exist_ok=False)
    sources = json.loads((RECIPES/'postgres-sources.json').read_text(encoding='utf-8'))
    hashes = {}
    for filename, record in sources.items():
        if Path(filename).name != filename or not record['url'].startswith('https://'):
            raise ValueError('Invalid pinned public input')
        with urllib.request.urlopen(record['url'], timeout=120) as response:
            data = response.read(40*1024*1024+1)
        if len(data) > 40*1024*1024 or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Public source checksum mismatch: '+filename)
        with (output/filename).open('xb') as stream:
            stream.write(data)
        hashes[filename] = record['sha256']
    for filename in ('postgres.Dockerfile', 'postgres-upstream.LICENSE', 'postgres-sources.json'):
        shutil.copyfile(RECIPES/filename, output/filename)
        hashes[filename] = hashlib.sha256((output/filename).read_bytes()).hexdigest()
    result = dict(status='prepared', engineVersion='16.16', sourceOnly=True,
                  servicesChanged=False, files=hashes)
    (output/'build-inputs.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.output.resolve())))
