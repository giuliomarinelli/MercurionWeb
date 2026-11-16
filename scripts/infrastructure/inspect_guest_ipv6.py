"""Read-only IPv6 readiness inventory; no probes, sysctl writes or daemon changes."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import socket
import subprocess


def collect():
    sections = {}

    def read(name, command, transform=lambda value: value, structured=True):
        try:
            result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=10)
            value = json.loads(result.stdout) if structured else result.stdout.strip()
            sections[name] = dict(status='observed', data=transform(value))
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            sections[name] = dict(status='unavailable', errorType=type(error).__name__)

    read('addresses', ['ip','-j','-6','address','show'], lambda values: [
        dict(interface=item['ifname'], addresses=[
            {key:address[key] for key in ('local','prefixlen','scope') if key in address}
            for address in item.get('addr_info', [])]) for item in values])
    read('routes', ['ip','-j','-6','route','show','table','all'])
    for key in ('all.forwarding','all.disable_ipv6','default.disable_ipv6','eth0.disable_ipv6'):
        read(key, ['sysctl','-n','net.ipv6.conf.'+key], structured=False)
    prefix = ['docker','--host','unix:///var/run/docker.sock']
    read('networkIds', prefix+['network','ls','--format','{{.ID}}'],
         lambda text: text.splitlines(), structured=False)
    if sections['networkIds']['status'] == 'observed':
        for identifier in sections['networkIds']['data']:
            if not re.fullmatch('[a-f0-9]{12,64}', identifier):
                sections['networkIdentifier'] = dict(status='unavailable', errorType='InvalidNetworkId')
                break
            read('network-'+identifier, prefix+['network','inspect',identifier], lambda values: [
                dict(name=item['Name'], driver=item['Driver'], enableIPv6=item['EnableIPv6'],
                     internal=item['Internal'], ipam=item.get('IPAM',{}).get('Config',[]))
                for item in values])
    return dict(schemaVersion=1, observedAtUtc=datetime.now(timezone.utc).isoformat(),
                scope='Guest IPv6 configuration inventory only; no traffic acceptance',
                hostname=socket.gethostname(), sections=sections,
                incomplete=any(item['status'] != 'observed' for item in sections.values()),
                isolationAccepted=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if (os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'mercurion-server' or
            not re.search(r'^ID=[\"\x27]?ubuntu[\"\x27]?$', Path('/etc/os-release').read_text(), re.MULTILINE)):
        raise RuntimeError('Run via sudo on the identified mercurion-server Ubuntu guest')
    report = collect()
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
    os.chown(args.output, int(os.environ['SUDO_UID']), int(os.environ['SUDO_GID']))
    print(json.dumps(dict(incomplete=report['incomplete'], isolationAccepted=False)), flush=True)
    return 2 if report['incomplete'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
