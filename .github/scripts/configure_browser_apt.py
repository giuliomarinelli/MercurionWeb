"""Use direct signed Ubuntu archives on disposable Ubuntu 24.04 Actions runners."""
import argparse
import json
import os
from pathlib import Path
import re
import sys

ARCHIVE = 'https://archive.ubuntu.com/ubuntu/'
SECURITY = 'https://security.ubuntu.com/ubuntu/'
MIRROR = 'https://mirrors.mit.edu/ubuntu/'
ARCHIVE_LIST = 'mirror+file:/etc/apt/mercurion-archive-mirrors.txt'
SECURITY_LIST = 'mirror+file:/etc/apt/mercurion-security-mirrors.txt'
KNOWN = {ARCHIVE_LIST, SECURITY_LIST, 'mirror+file:/etc/apt/apt-mirrors.txt', 'http://azure.archive.ubuntu.com/ubuntu',
         'http://azure.archive.ubuntu.com/ubuntu/', ARCHIVE, SECURITY}
NETWORK = '''Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::Retries "1";
APT::Update::Error-Mode "any";
'''


def rewrite(text):
    parts = re.split(r'(\n[ \t]*\n)', text)
    found = 0
    for index, stanza in enumerate(parts):
        uri = re.search(r'^URIs:[ \t]*(.+)$', stanza, re.M)
        if uri is None or not (set(uri[1].split()) & KNOWN):
            continue
        if not set(uri[1].split()) <= KNOWN:
            raise ValueError('Mixed unknown Ubuntu mirrors; refusing to rewrite')
        suites = re.search(r'^Suites:[ \t]*(.+)$', stanza, re.M)
        signed = re.search(r'^Signed-By:[ \t]*(.+)$', stanza, re.M)
        if (suites is None or not set(suites[1].split()) <= {'noble', 'noble-updates', 'noble-backports', 'noble-security'}
                or signed is None or signed[1].strip() != '/usr/share/keyrings/ubuntu-archive-keyring.gpg'):
            raise ValueError('Unexpected Ubuntu suite or signing key')
        target = SECURITY_LIST if set(suites[1].split()) == {'noble-security'} else ARCHIVE_LIST
        parts[index] = stanza[:uri.start()] + 'URIs: ' + target + stanza[uri.end():]
        found += 1
    if not found:
        raise ValueError('No recognized Ubuntu deb822 sources found')
    return ''.join(parts)


def configure(root):
    source = root / 'etc/apt/sources.list.d/ubuntu.sources'
    settings = root / 'etc/apt/apt.conf.d/99-mercurion-browser-network'
    if source.is_symlink() or not source.is_file() or settings.is_symlink():
        raise ValueError('Unexpected APT configuration paths')
    original = source.read_text(encoding='utf-8')
    revised = rewrite(original)
    # APT's mirror transport handles unavailable hosts. A separate DNS gate
    # would abort before APT can use the independent, official MIT mirror.
    lists = {
        root / 'etc/apt/mercurion-archive-mirrors.txt': (MIRROR, ARCHIVE),
        root / 'etc/apt/mercurion-security-mirrors.txt': (MIRROR, SECURITY),
    }
    if any(path.is_symlink() or (path.exists() and not path.is_file()) for path in lists):
        raise ValueError('Unexpected mirror list paths')
    for path, mirrors in lists.items():
        path.write_text(''.join(f'{url}\tpriority:{index}\n' for index, url in enumerate(mirrors, 1)), encoding='utf-8')
    source.write_text(revised, encoding='utf-8')
    settings.write_text(NETWORK, encoding='utf-8')
    return dict(status='configured', mirrors=[MIRROR, ARCHIVE, SECURITY], signedByUnchanged=True,
                aptErrorsFatal=True, acquireTimeoutSeconds=20, acquireRetries=1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', required=True)
    parser.parse_args()
    if (sys.platform != 'linux' or getattr(os, 'geteuid', lambda: -1)() != 0
            or os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_OS') != 'Linux'):
        raise SystemExit('Apply only as root on an Ubuntu 24.04 GitHub Actions runner')
    release = dict(line.split('=', 1) for line in Path('/etc/os-release').read_text().splitlines() if '=' in line)
    if release.get('ID', '').strip('"') != 'ubuntu' or release.get('VERSION_ID', '').strip('"') != '24.04':
        raise SystemExit('Ubuntu 24.04 runner required')
    print(json.dumps(configure(Path('/'))))
