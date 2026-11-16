"""SSH forced command for a dedicated delivery key; no shell, SFTP or forwarding."""
import os
from pathlib import Path
import re
import hashlib
import sys
import tarfile


def upload(run_id, digest):
    root = Path.home()/('preview-rollout-'+run_id)
    root.mkdir(mode=0o700)
    names = set()
    total = 0
    with tarfile.open(fileobj=sys.stdin.buffer, mode='r|') as archive:
        for member in archive:
            name = member.name
            if (not member.isfile() or not re.fullmatch(r'(web-node/|web-ng/|tox21/)?[A-Za-z0-9_.-]+', name)
                    or name in names or member.size > 4*1024**3):
                raise ValueError('invalid-upload-member')
            total += member.size
            if total > 8*1024**3 or len(names) >= 40:
                raise ValueError('upload-size-limit')
            names.add(name)
            path = root/name
            path.parent.mkdir(exist_ok=True)
            with path.open('xb') as output, archive.extractfile(member) as source:
                while block := source.read(1024*1024):
                    output.write(block)
    if hashlib.sha256((root/'rollout.json').read_bytes()).hexdigest() != digest:
        raise ValueError('uploaded-manifest-digest')
    print('UPLOAD_READY')


def main():
    command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    match = re.fullmatch(r'(upload|deploy) ([a-f0-9]{32}) ([a-f0-9]{64})', command)
    if not match:
        raise SystemExit('Only bounded upload and preview deployment are permitted')
    action, run_id, digest = match.groups()
    if action == 'upload':
        upload(run_id, digest)
        return
    broker = str(Path(__file__).with_name('preview_deploy_broker.py'))
    os.execv('/usr/bin/sudo', ['sudo', '-n', '--', '/usr/bin/python3', '-I', '-B', broker, run_id, digest])


if __name__ == '__main__':
    main()
