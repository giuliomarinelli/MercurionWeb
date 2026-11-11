"""First private preview server bootstrap. No publishing, application startup or data reset."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import socket
import stat
import subprocess
import time
import urllib.error
import urllib.request

import preview_server_bundle as bundle
import preview_server_secrets as secrets
from run_tox21_vm_pilot import load_archive


def docker(*args, timeout=120):
    environment = {name: value for name, value in os.environ.items() if not name.startswith(('DOCKER_', 'COMPOSE_'))}
    environment['COMPOSE_DISABLE_ENV_FILE'] = 'true'
    answer = subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args], env=environment,
                            capture_output=True, text=True, timeout=timeout)
    if answer.returncode:
        raise ValueError('docker-operation-failed')  # Never echo service configuration/errors.
    return answer.stdout.strip()


def collisions(models):
    for model in models.values():
        if docker('ps', '-aq', '--filter', 'label=com.docker.compose.project=' + model['name']):
            raise ValueError('existing-compose-project')
    for kind in ('networks', 'volumes'):
        command = 'network' if kind == 'networks' else 'volume'
        existing = set(docker(command, 'ls', '--format', '{{.Name}}').splitlines())
        names = {item['name'] for model in models.values() for item in model.get(kind, {}).values()}
        if names & existing:
            raise ValueError('existing-' + command)


def guard(root, manifest):
    secrets.guard(True)
    expected = Path('/opt/mercurion/releases') / ('server-' + manifest['runId'])
    if root != expected:
        raise ValueError('protected-release-path')
    for path in (root, *root.parents):
        meta = path.lstat()
        if not stat.S_ISDIR(meta.st_mode) or meta.st_uid != 0 or meta.st_mode & 0o022:
            raise ValueError('protected-release-owner')


def fake_loaded(manifest):
    return {role: {'imageId': digest} for role, digest in manifest['configDigests'].items()}


def preflight(root, manifest, report):
    guard(root, manifest)
    addresses = json.loads(subprocess.check_output(['ip', '-j', '-4', 'address', 'show', 'dev', 'eth0'], text=True))
    routes = json.loads(subprocess.check_output(['ip', '-j', '-4', 'route', 'show', 'default'], text=True))
    if (not any(a.get('local') == '10.203.240.10' and a.get('prefixlen') == 24 for i in addresses for a in i['addr_info'])
            or not any(route.get('gateway') == '10.203.240.1' and route.get('dev') == 'eth0' for route in routes)):
        raise ValueError('static-network-baseline')
    if docker('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
        raise ValueError('docker-platform')
    docker('compose', 'version', '--short')
    models = bundle.projection(bundle.transport.read(root / 'models.json'), fake_loaded(manifest), manifest['runId'])
    collisions(models)
    archive_bytes = sum((root / 'servers' / role / 'image.tar').stat().st_size for role in manifest['configDigests'])
    if shutil.disk_usage(root).free < archive_bytes * 2 + 1024 ** 3:
        raise ValueError('insufficient-space')
    if os.path.lexists(secrets.BASE / manifest['runId']):
        raise ValueError('existing-secret-run')
    (root / 'readback').mkdir()
    report['checks'] = dict(staticNetwork=True, localDocker=True, compose=True, noCollisions=True, space=True)
    report['loaded'] = {}
    for role, digest in manifest['configDigests'].items():
        report['phase'] = 'loading-' + role
        report['loaded'][role] = load_archive(root / 'servers' / role / 'image.tar', digest,
            root / 'readback' / (role + '.tar'), execute=docker)
    secrets.prepare(manifest['runId'], os.environ['SUDO_USER'])
    report.update(status='ready', phase='preflight-finished', readyForSecretDelivery=True, secretInboxPrepared=True)


def retry(check, container=None):
    deadline = time.monotonic() + 75
    while True:
        if container and docker('inspect', '--format', '{{.State.Running}}', container) != 'true':
            raise ValueError('server-ended-before-readiness')
        try:
            return check()
        except (ValueError, OSError, urllib.error.URLError):
            if time.monotonic() >= deadline:
                raise ValueError('server-readiness-timeout') from None
            time.sleep(.5)


def meili_check(address):
    with urllib.request.urlopen('http://' + address + ':7700/health', timeout=3) as response:
        if json.load(response).get('status') != 'available':
            raise ValueError('meili-health')
    try:
        urllib.request.urlopen('http://' + address + ':7700/keys', timeout=3).close()
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            return True
        raise ValueError('meili-auth-status') from None
    raise ValueError('meili-admin-not-protected')


def nats_check(address):
    with socket.create_connection((address, 4222), timeout=3) as connection:
        connection.settimeout(3)
        stream = connection.makefile('rb')
        info = stream.readline(16384)
        if not info.startswith(b'INFO ') or json.loads(info[5:]).get('auth_required') is not True:
            raise ValueError('nats-auth-not-required')
        connection.sendall(b'CONNECT {"verbose":true}\r\nPING\r\n')
        response = stream.readline(16384)
        if b'Authorization Violation' not in response:
            raise ValueError('nats-anonymous-not-rejected')
    return True


def postgres_check(identifier):
    query = "SELECT current_user,rolsuper,extversion FROM pg_roles,pg_extension WHERE rolname=current_user AND extname='vector'"
    command = 'export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec psql -h 127.0.0.1 -U mercurion_preview -d mercurion_preview -At -c "$1"'
    answer = docker('exec', identifier, 'sh', '-c', command, 'probe', query)
    if answer != 'mercurion_preview|f|0.8.7':
        raise ValueError('postgres-role-or-vector')
    return True


def redis_check(identifier):
    if 'NOAUTH' not in docker('exec', identifier, 'redis-cli', 'PING'):
        raise ValueError('redis-anonymous-not-rejected')
    command = r'''export REDISCLI_AUTH="$(sed -n 's/^requirepass "\(.*\)"$/\1/p' /run/mercurion/server.conf)"; exec redis-cli --raw CONFIG GET notify-keyspace-events'''
    answer = docker('exec', identifier, 'sh', '-c', command).splitlines()
    if len(answer) != 2 or not set('Exg') <= set(answer[1]):
        raise ValueError('redis-keyevents')
    return True


def activate(root, manifest, report):
    guard(root, manifest)
    preflight_report = bundle.transport.read(root / 'preflight-result.json')
    if (preflight_report.get('status') != 'ready' or preflight_report.get('runId') != manifest['runId']
            or set(preflight_report.get('loaded', {})) != set(manifest['configDigests'])):
        raise ValueError('successful-preflight-required')
    for role, image in preflight_report['loaded'].items():
        if image.get('configDigest') != manifest['configDigests'][role] or image.get('roundtripVerified') is not True:
            raise ValueError('loaded-image-identity')
    models = bundle.projection(bundle.transport.read(root / 'models.json'), preflight_report['loaded'], manifest['runId'])
    collisions(models)  # Check again after operator prompts, before reserving activation.
    with (root / 'activation-reserved.json').open('x') as stream:
        json.dump(dict(runId=manifest['runId']), stream)
    report['phase'] = 'applying-server-secrets'
    secrets.apply(manifest['runId'])
    report['secretFilesReady'] = True
    report['loaded'] = preflight_report['loaded']
    identifiers, addresses = {}, {}
    for project, model in models.items():
        path = root / (project + '-servers.json')
        bundle.transport.write(path, model)
        report['phase'] = 'starting-' + project
        docker('compose', '--env-file', '/dev/null', '-f', str(path), 'up', '-d')
        report['servicesStarted'] = True
        for name, role in bundle.SELECTED[project].items():
            identifier = docker('compose', '--env-file', '/dev/null', '-f', str(path), 'ps', '-aq', name)
            if not identifier:
                raise ValueError('missing-created-server')
            identifiers[role] = identifier
            host = json.loads(docker('inspect', '--format', '{{json .HostConfig}}', identifier))
            if host.get('PortBindings') or host.get('ReadonlyRootfs') is not True or host.get('Privileged'):
                raise ValueError('server-runtime-contract')
            networks = json.loads(docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', identifier))
            if len(networks) != 1:
                raise ValueError('server-network-count')
            network = next(iter(networks.values()))
            if network.get('GlobalIPv6Address') or not network.get('IPAddress'):
                raise ValueError('server-network-family')
            addresses[role] = network['IPAddress']
        for network in model['networks'].values():
            actual = json.loads(docker('network', 'inspect', '--format', '{{json .}}', network['name']))
            if actual.get('Internal') is not True or actual.get('EnableIPv6') is not False:
                raise ValueError('private-ipv4-network-contract')
    report['phase'] = 'server-readiness'
    report['checks'] = dict(postgresRoleAndVector=retry(lambda: postgres_check(identifiers['postgres']), identifiers['postgres']),
        redisAuthAndKeyevents=retry(lambda: redis_check(identifiers['redis']), identifiers['redis']),
        natsAuthRequired=retry(lambda: nats_check(addresses['nats']), identifiers['nats']),
        meilisearchHealthAndAdminAuth=retry(lambda: meili_check(addresses['meilisearch']), identifiers['meilisearch']))
    report.update(status='passed', phase='finished', meilisearchAddress=addresses['meilisearch'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('preflight', 'activate'))
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    output = args.root / ('preflight-result.json' if args.phase == 'preflight' else 'bootstrap-result.json')
    if output.exists():
        raise SystemExit('Report exists; no automatic retry')
    report = dict(schemaVersion=1, status='failed', phase=args.phase, runId=None,
        observedAtUtc=datetime.now(timezone.utc).isoformat(), servicesStarted=False,
        publishedPorts=False, applicationServicesStarted=False, isolationAccepted=False)
    try:
        manifest = bundle.verify(args.root)
        report['runId'] = manifest['runId']
        (preflight if args.phase == 'preflight' else activate)(args.root, manifest, report)
    except Exception as error:
        report['errorType'] = type(error).__name__  # No Docker logs, configuration or credential bodies.
    finally:
        if args.phase == 'activate' and report['runId']:
            try:
                report['ownedContainers'] = docker('ps', '-aq', '--filter', 'label=mercurion.bootstrap.run=' + report['runId']).splitlines()
                report['servicesStarted'] = bool(report['ownedContainers'])
            except Exception:
                report['resourceReadback'] = 'unavailable'
        with output.open('x') as stream:
            json.dump(report, stream, indent=2)
        output.chmod(0o644)
    print(json.dumps({name: report[name] for name in ('runId', 'status', 'phase', 'servicesStarted', 'publishedPorts', 'isolationAccepted')}))
    raise SystemExit(0 if report['status'] in ('ready', 'passed') else 1)
