"""Recover only existing private preview servers; no create, pull, delete or credential rotation."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import socket
import sys
import tomllib
import urllib.request

import guest_preview_recovery_inventory as snapshot

ROLES = {'meilisearch': 'meilisearch', 'postgres-preview': 'postgres',
         'redis-preview': 'redis', 'nats-preview': 'nats'}
INDEXES = {'logs_staging', 'security_logs_staging', 'logs_production', 'security_logs_production'}


def read(path):
    return json.loads(snapshot.regular(path))


def original(root, digest):
    raw = snapshot.regular(root / 'server-bootstrap.json')
    if hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError('release-manifest-mismatch')
    manifest = json.loads(raw)
    for name, checksum in manifest['files'].items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('release-path')
        if not name.startswith('servers/') and hashlib.sha256(snapshot.regular(root / name)).hexdigest() != checksum:
            raise ValueError('original-public-file-drift')
    sys.path.insert(0, str(root / 'scripts/infrastructure'))
    servers = importlib.import_module('guest_preview_servers')
    receiver = importlib.import_module('preview_server_secrets')
    bundle = importlib.import_module('preview_server_bundle')
    preflight = read(root / 'preflight-result.json')
    loaded = preflight.get('loaded', {})
    if preflight.get('status') != 'ready' or set(loaded) != set(ROLES.values()):
        raise ValueError('original-load-receipt')
    for role, value in loaded.items():
        if value.get('roundtripVerified') is not True or value.get('configDigest') != manifest['configDigests'][role]:
            raise ValueError('original-image-identity')
    models = bundle.projection(read(root / 'models.json'), loaded, manifest['runId'])
    for project, model in models.items():
        if read(root / (project + '-servers.json')) != model:
            raise ValueError('original-compose-drift')
    return servers, receiver, manifest, loaded, models


def validate_state(current, previous, models, loaded, *, running=False):
    if (previous.get('status') != 'inventoried' or previous.get('coldRecoveryCandidate') is not True
            or current['bootId'] != previous.get('bootId') or current['runIsTmpfs'] is not True):
        raise ValueError('inspection-boot-or-scope')
    current_services = {item['service']: item for item in current['containers']}
    previous_services = {item['service']: item for item in previous['containers']}
    if set(current_services) != set(ROLES) or set(previous_services) != set(ROLES):
        raise ValueError('server-set')
    if any(current_services[name]['id'] != previous_services[name]['id'] for name in current_services):
        raise ValueError('server-stopped-identity')
    validate_contract(current, models, loaded, running=running)


def validate_contract(current, models, loaded, *, running=False):
    current_services = {item['service']: item for item in current['containers']}
    if set(current_services) != set(ROLES):
        raise ValueError('server-set')
    expected_volumes = {}
    for model in models.values():
        for key, volume in model['volumes'].items():
            expected_volumes[volume['name']] = (model['name'], key)
        for name, spec in model['services'].items():
            item = current_services[name]
            if (item['image'] != loaded[ROLES[name]]['imageId']
                    or item['running'] is not running or item['status'] not in (('running',) if running else ('exited', 'created'))):
                raise ValueError('server-stopped-identity')
            expected = set()
            for mount in spec['volumes']:
                source = model['volumes'][mount['source']]['name'] if mount['type'] == 'volume' else mount['source']
                expected.add((mount['type'], source, mount['target'], not mount.get('read_only', False)))
            actual = {(m['Type'], m['Name'] if m['Type'] == 'volume' else m['Source'], m['Destination'], m['RW']) for m in item['mounts']}
            if actual != expected or len(actual) != len(item['mounts']):
                raise ValueError('server-mount-drift')
            if set(item['networks']) != {model['networks'][key]['name'] for key in spec['networks']}:
                raise ValueError('server-network-drift')
    if len(current['volumes']) != len(expected_volumes) or {v['name'] for v in current['volumes']} != set(expected_volumes):
        raise ValueError('persistent-volume-set')
    for volume in current['volumes']:
        project, key = expected_volumes[volume['name']]
        labels = volume['labels']
        if (volume['driver'] != 'local' or labels.get('com.docker.compose.project') != project
                or labels.get('com.docker.compose.volume') != key
                or labels.get('mercurion.bootstrap.run') != current['runId']):
            raise ValueError('persistent-volume-ownership')


def markers(paths):
    # Refuse to boot an empty existing volume and accidentally initialize a new DB.
    pg = paths['mercurion_preview_postgres']
    redis = paths['mercurion_preview_redis'] / 'appendonlydir'
    meili = paths['mercurion_shared_meili'] / 'data.ms'
    required = [pg, pg / 'PG_VERSION', pg / 'global/pg_control', redis,
                redis / 'appendonly.aof.manifest', meili]
    if any(p.is_symlink() or not p.exists() or p.resolve() != p for p in required):
        raise ValueError('persistent-data-marker-missing')
    if ((pg / 'PG_VERSION').read_text(encoding='ascii').strip() != '16'
            or not (pg / 'global/pg_control').is_file() or (pg / 'global/pg_control').stat().st_size == 0
            or not (redis / 'appendonly.aof.manifest').is_file() or (redis / 'appendonly.aof.manifest').stat().st_size == 0
            or not meili.is_dir() or not any(meili.iterdir())):
        raise ValueError('persistent-data-marker-missing')
    return True


def registered_applications(current):
    path = snapshot.BASE / ('server-' + current['runId']) / 'application-members.json'
    if not os.path.lexists(path):
        return []
    record = read(path)
    roles = {'nginx-edge': 'mercurion-shared', 'web-node-preview': 'mercurion-preview',
             'web-ng-preview': 'mercurion-preview', 'tox21-preview': 'mercurion-preview'}
    if (record.get('schemaVersion') != 1 or record.get('serverRunId') != current['runId']
            or not re.fullmatch('[a-f0-9]{32}', record.get('appRunId', ''))
            or len(record.get('members', [])) != 4 or {m.get('service') for m in record['members']} != set(roles)
            or len({m.get('id') for m in record['members']}) != 4):
        raise ValueError('registered-application-scope')
    manifest = snapshot.BASE / ('application-' + record['appRunId']) / 'application-bootstrap.json'
    if hashlib.sha256(snapshot.regular(manifest)).hexdigest() != record.get('appManifestSha256'):
        raise ValueError('registered-application-manifest')
    servers_running = all(item['running'] is True for item in current['containers'])
    for member in record['members']:
        if not re.fullmatch('[a-f0-9]{64}', member.get('id', '')) or member.get('project') != roles[member['service']]:
            raise ValueError('registered-application-identity')
        actual = json.loads(snapshot.docker('inspect', '--format', snapshot.CONTAINER_FORMAT, member['id']))
        labels = actual['Config']['Labels']
        host = actual['HostConfig']
        if (actual['Id'] != member['id'] or actual['Image'] != member.get('image')
                or labels.get('com.docker.compose.service') != member['service']
                or labels.get('com.docker.compose.project') != member['project']
                or labels.get('mercurion.application.run') != record['appRunId']
                or host.get('Privileged') or host.get('PortBindings') or host.get('ReadonlyRootfs') is not True
                or (not servers_running and actual['State']['Running'])):
            raise ValueError('registered-application-drift')
    return record['members']


def resources(current, models):
    applications = registered_applications(current)
    expected_ids = {item['id'] for item in current['containers']} | {item['id'] for item in applications}
    for model in models.values():
        actual = set(snapshot.docker('ps', '-aq', '--no-trunc', '--filter', 'label=com.docker.compose.project=' + model['name']).split())
        wanted = {item['id'] for item in current['containers'] if snapshot.EXPECTED[item['service']] == model['name']}
        wanted |= {item['id'] for item in applications if item['project'] == model['name']}
        if actual != wanted or not actual <= expected_ids:
            raise ValueError('unexpected-compose-members')
        for network in model['networks'].values():
            fmt = '{"Internal":{{json .Internal}},"EnableIPv6":{{json .EnableIPv6}},"run":{{json (index .Labels "mercurion.bootstrap.run")}}}'
            value = json.loads(snapshot.docker('network', 'inspect', '--format', fmt, network['name']))
            if (value['Internal'] is not True or value['EnableIPv6'] is not False
                    or value.get('run') != current['runId']):
                raise ValueError('private-network-contract')
    docker_root = Path(snapshot.docker('info', '--format', '{{.DockerRootDir}}').strip())
    paths = {}
    for volume in current['volumes']:
        fmt = '{"Mountpoint":{{json .Mountpoint}},"Options":{{json .Options}}}'
        value = json.loads(snapshot.docker('volume', 'inspect', '--format', fmt, volume['name']))
        path = Path(value['Mountpoint'])
        if value['Options'] or path != docker_root / 'volumes' / volume['name'] / '_data':
            raise ValueError('local-volume-path')
        paths[volume['name']] = path
    markers(paths)


def meili_indexes(address, path):
    master = tomllib.loads(path.read_text(encoding='utf-8'))['master_key']
    request = urllib.request.Request('http://' + address + ':7700/indexes?limit=100',
                                    headers={'Authorization': 'Bearer ' + master})
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=5) as response:
        value = json.load(response)
    found = {item['uid'] for item in value['results'] if item.get('primaryKey') == 'id'}
    if not INDEXES <= found:
        raise ValueError('persisted-log-indexes-missing')
    return True


def authenticated_nats(address, path):
    users = json.loads(path.read_text(encoding='utf-8'))['authorization']['users']
    for user in users:
        with socket.create_connection((address, 4222), timeout=5) as connection:
            connection.settimeout(5)
            stream = connection.makefile('rb')
            if not stream.readline(16384).startswith(b'INFO '):
                raise ValueError('nats-protocol')
            connect = json.dumps({'user': user['user'], 'pass': user['password'], 'verbose': True}).encode()
            connection.sendall(b'CONNECT ' + connect + b'\r\nPING\r\n')
            for _ in range(8):
                line = stream.readline(16384)
                if line == b'PONG\r\n':
                    break
                if not line or line.startswith(b'-ERR'):
                    raise ValueError('nats-authentication')
            else:
                raise ValueError('nats-protocol')
    return True


def prepare(root, manifest, digest, inspection, attempt, report, receiver, models, loaded):
    previous = read(root / ('recovery-inventory-' + inspection + '.json'))
    current = snapshot.inventory(manifest['runId'], digest)
    current['runId'] = manifest['runId']
    validate_state(current, previous, models, loaded)
    if current['secretRunPresent']:
        raise ValueError('secret-run-already-present')
    resources(current, models)
    receiver.guard(True)
    marker = root / ('recovery-reserved-' + current['bootId'] + '.json')
    with marker.open('x', encoding='utf-8') as stream:
        json.dump(dict(attemptId=attempt, inspectionId=inspection), stream)
    receiver.prepare(manifest['runId'], os.environ['SUDO_USER'])
    report.update(status='prepared', bootId=current['bootId'], inspectionId=inspection,
                  originalState=previous, checks=dict(originalResources=True, persistenceMarkers=True, tmpfs=True))


def activate(root, manifest, digest, attempt, report, servers, receiver, models, loaded):
    prepared = read(root / ('recovery-' + attempt + '-prepare.json'))
    if prepared.get('status') != 'prepared' or prepared.get('attemptId') != attempt:
        raise ValueError('successful-recovery-prepare-required')
    marker = read(root / ('recovery-reserved-' + prepared['bootId'] + '.json'))
    if marker.get('attemptId') != attempt:
        raise ValueError('recovery-reservation')
    current = snapshot.inventory(manifest['runId'], digest)
    current['runId'] = manifest['runId']
    validate_state(current, prepared['originalState'], models, loaded)
    resources(current, models)
    receiver.apply(manifest['runId'])
    report['phase'] = 'starting-original-servers'
    identifiers = {}
    for item in current['containers']:
        snapshot.docker('start', item['id'])
        report['servicesStarted'] = True
        identifiers[ROLES[item['service']]] = item['id']
    verify_services(current, manifest, report, servers, receiver)


def verify_services(current, manifest, report, servers, receiver):
    receiver.inspect(manifest['runId'])
    identifiers = {ROLES[item['service']]: item['id'] for item in current['containers']}
    addresses = {}
    for role, identifier in identifiers.items():
        networks = json.loads(snapshot.docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', identifier))
        if len(networks) != 1:
            raise ValueError('server-network-count')
        value = next(iter(networks.values()))
        address = ipaddress.ip_address(value['IPAddress'])
        if address.version != 4 or not address.is_private or value.get('GlobalIPv6Address'):
            raise ValueError('server-network-family')
        addresses[role] = str(address)
    report['phase'] = 'readiness-and-persistence'
    active = receiver.BASE / manifest['runId'] / 'active'
    report['checks'] = {}
    probes = [
        ('postgresRoleAndVector', lambda: servers.postgres_check(identifiers['postgres']), 'postgres'),
        ('redisAuthAndKeyevents', lambda: servers.redis_check(identifiers['redis']), 'redis'),
        ('natsAuthRequired', lambda: servers.nats_check(addresses['nats']), 'nats'),
        ('natsConsumerCredentials', lambda: authenticated_nats(addresses['nats'], active / 'nats/server.json'), 'nats'),
        ('meilisearchHealthAndAdminAuth', lambda: servers.meili_check(addresses['meilisearch']), 'meilisearch'),
        ('persistedLogIndexes', lambda: meili_indexes(addresses['meilisearch'], active / 'meilisearch/server.toml'), 'meilisearch')]
    for name, check, role in probes:
        report['activeCheck'] = name
        def diagnosed():
            try:
                return check()
            except Exception as error:
                report['probeErrorType'] = type(error).__name__
                if isinstance(error, ValueError) and re.fullmatch('[a-z-]+', str(error)):
                    report['probeErrorCode'] = str(error)
                if isinstance(error, urllib.error.HTTPError):
                    report['probeHttpStatus'] = error.code
                raise
        try:
            report['checks'][name] = servers.retry(diagnosed, identifiers[role])
            if report['checks'][name] is not True:
                raise ValueError('readiness-check-invalid-result')
            for key in ('probeErrorType', 'probeErrorCode', 'probeHttpStatus'):
                report.pop(key, None)
        except Exception:
            report['checks'][name] = False
            report['failedCheck'] = name
            raise
    report.pop('activeCheck', None)
    report.update(status='passed', phase='finished', meilisearchAddress=addresses['meilisearch'],
                  originalContainers=sorted(identifiers.values()), originalVolumes=sorted(v['name'] for v in current['volumes']))



def verify_existing(root, manifest, digest, attempt, report, servers, receiver, models, loaded):
    prepared = read(root / ('recovery-' + attempt + '-prepare.json'))
    previous = read(root / ('recovery-' + attempt + '-activate.json'))
    if (prepared.get('status') != 'prepared' or prepared.get('attemptId') != attempt
            or previous.get('status') not in ('failed', 'passed') or previous.get('attemptId') != attempt
            or previous.get('servicesStarted') is not True):
        raise ValueError('existing-started-recovery-required')
    current = snapshot.inventory(manifest['runId'], digest)
    current['runId'] = manifest['runId']
    validate_state(current, prepared['originalState'], models, loaded, running=True)
    resources(current, models)
    verify_services(current, manifest, report, servers, receiver)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('prepare', 'receive', 'activate', 'verify'))
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--inspection-id', required=True)
    parser.add_argument('--attempt-id', required=True)
    parser.add_argument('--verification-id')
    args = parser.parse_args()
    if args.phase == 'verify' and not re.fullmatch('[a-f0-9]{32}', args.verification_id or ''):
        raise SystemExit('Invalid verification identifier')
    if not all(re.fullmatch('[a-f0-9]{32}', value) for value in (args.run_id, args.inspection_id, args.attempt_id)):
        raise SystemExit('Invalid recovery identifiers')
    if not re.fullmatch('[a-f0-9]{64}', args.manifest_sha256):
        raise SystemExit('Invalid release hash')
    root = snapshot.BASE / ('server-' + args.run_id)
    servers, receiver, manifest, loaded, models = original(root, args.manifest_sha256)
    receiver.guard(args.phase != 'receive')
    if args.phase == 'receive':
        prepared = read(root / ('recovery-' + args.attempt_id + '-prepare.json'))
        if prepared.get('status') != 'prepared' or prepared.get('inspectionId') != args.inspection_id:
            raise SystemExit('Recovery prepare missing')
        print(json.dumps(receiver.receive(args.run_id, sys.stdin.buffer)))
        return 0
    suffix = args.phase + ('-' + args.verification_id if args.phase == 'verify' else '')
    path = root / ('recovery-' + args.attempt_id + '-' + suffix + '.json')
    if path.exists():
        raise SystemExit('Recovery receipt already exists; no automatic retry')
    report = dict(schemaVersion=1, runId=args.run_id, attemptId=args.attempt_id,
        observedAtUtc=datetime.now(timezone.utc).isoformat(), status='failed', phase=args.phase,
        servicesStarted=False, applicationServicesStarted=False, publishedPorts=False, isolationAccepted=False)
    if args.phase == 'verify':
        report.update(verificationId=args.verification_id, serverMutationsPerformed=False)
    try:
        if args.phase == 'prepare':
            prepare(root, manifest, args.manifest_sha256, args.inspection_id, args.attempt_id, report, receiver, models, loaded)
        elif args.phase == 'verify':
            verify_existing(root, manifest, args.manifest_sha256, args.attempt_id, report, servers, receiver, models, loaded)
        else:
            activate(root, manifest, args.manifest_sha256, args.attempt_id, report, servers, receiver, models, loaded)
    except Exception as error:
        report['errorType'] = type(error).__name__
        if isinstance(error, ValueError) and re.fullmatch('[a-z-]+', str(error)):
            report['code'] = str(error)
    if args.phase in ('activate', 'verify'):
        try:
            running = snapshot.docker('ps', '-q', '--no-trunc', '--filter', 'label=mercurion.bootstrap.run=' + args.run_id).split()
            if args.phase == 'activate':
                report['servicesStarted'] = bool(running)
            report['servicesRunning'] = len(running) == 4
            report['runningContainers'] = running
            if report['status'] == 'passed' and set(running) != set(report.get('originalContainers', [])):
                report.update(status='failed', code='server-ended-after-readiness')
        except Exception:
            report['resourceReadback'] = 'unavailable'
            if report['status'] == 'passed':
                report.update(status='failed', code='final-resource-readback-unavailable')
    with path.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
    path.chmod(0o644)
    print(json.dumps({key: report[key] for key in ('runId', 'attemptId', 'status', 'phase', 'servicesStarted')}))
    return 0 if report['status'] in ('prepared', 'passed') else 1


if __name__ == '__main__':
    raise SystemExit(main())
