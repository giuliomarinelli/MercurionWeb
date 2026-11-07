"""H-02 IPv6: probe one Windows link-local canary, without root or network changes."""
import argparse
from datetime import datetime, timezone
import ipaddress
import json
from pathlib import Path
import re
import subprocess

from network_canary import probe


def now():
    return datetime.now(timezone.utc).isoformat()


def ip_read(*args):
    return json.loads(subprocess.run(['ip', '-j', *args], check=True, capture_output=True,
                                     text=True, timeout=8).stdout)


def select_interface(routes, addresses):
    names = {route['dev'] for route in routes if 'dev' in route}
    if len(names) != 1:
        raise ValueError('Default-route interface is not unique')
    name = names.pop()
    if not re.fullmatch('[a-zA-Z0-9_.:-]{1,32}', name):
        raise ValueError('Invalid interface name')
    candidates = [adapter for adapter in addresses if adapter['ifname'] == name and 'UP' in adapter.get('flags', [])]
    locals_ = [info['local'] for adapter in candidates for info in adapter.get('addr_info', [])
               if info.get('family') == 'inet6' and info.get('scope') == 'link'
               and not info.get('tentative') and not info.get('dadfailed')
               and not {'tentative', 'dadfailed'}.intersection(info.get('flags', []))
               and ipaddress.ip_address(info['local']).is_link_local]
    if not locals_:
        raise ValueError('No usable IPv6 link-local address on the uplink')
    return name, locals_


def validate(config):
    for field in ('runId', 'nonce'):
        if not re.fullmatch('[a-f0-9]{32}', config[field]):
            raise ValueError('Invalid run marker')
    address = ipaddress.ip_address(config['address'])
    if address.version != 6 or not address.is_link_local or '%' in config['address']:
        raise ValueError('Use a bare IPv6 link-local address; scope is selected on the guest')
    if not 1024 <= config['port'] <= 65535:
        raise ValueError('Invalid canary port')
    if datetime.fromisoformat(config['expiresAtUtc']) <= datetime.now(timezone.utc):
        raise ValueError('Expired canary window')


def run(config, read=ip_read, connect=probe):
    report = dict(schemaVersion=1, runId=config['runId'], startedAtUtc=now(),
                  scope='H-02 guest-to-Windows IPv6 link-local TCP only', isolationAccepted=False, status='invalid')
    try:
        validate(config)
        name, locals_ = select_interface(read('-4', 'route', 'show', 'default'), read('-6', 'address', 'show'))
        report.update(guestInterface=name, guestLinkLocalAddresses=locals_)
        route = read('-6', 'route', 'get', config['address'], 'oif', name)
        if len(route) != 1 or route[0].get('dev') != name or route[0].get('type') in ('unreachable', 'blackhole', 'prohibit'):
            raise ValueError('No usable route to the canary on the selected interface')
        report['route'] = route
        report['probe'] = connect(config['address'] + '%' + name, config['port'], config['nonce'])
        report['probeCompletedAtUtc'] = now()
        result = report['probe']
        if result['outcome'] == 'not-reachable' and result.get('errorType') in ('TimeoutError', 'ConnectionRefusedError'):
            report['status'] = 'observed-path-not-reachable'
        else:
            report['status'] = 'review-required'
    except Exception as error:
        report['errorType'] = type(error).__name__
    report['finishedAtUtc'] = now()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    args = parser.parse_args()
    if 'ID=ubuntu' not in Path('/etc/os-release').read_text():
        parser.error('Run on the identified Ubuntu guest')
    config = json.loads(args.config.read_text(encoding='utf-8-sig'))
    report = run(config)
    args.config.with_name('guest-ipv6-probe.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('INF_VM_02_H02_IPV6_RESULT ' + json.dumps(report), flush=True)
    return 0 if report['status'] == 'observed-path-not-reachable' else 2


if __name__ == '__main__':
    raise SystemExit(main())
