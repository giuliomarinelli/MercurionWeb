"""First private application bootstrap over existing verified servers. No publishing or data reset."""
import argparse
from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import sys
import shutil

import preview_application_bundle as bundle
import preview_application_secrets as receiver
import guest_preview_recovery_inventory as snapshot
import guest_preview_cold_recovery as cold
from run_tox21_vm_pilot import load_archive


def docker(*args, timeout=180):
    import subprocess
    env = {name: value for name, value in os.environ.items() if not name.startswith(('DOCKER_', 'COMPOSE_'))}
    env['COMPOSE_DISABLE_ENV_FILE'] = 'true'
    result = subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args], env=env,
                            capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise ValueError('application-docker-operation')
    return result.stdout.strip()


def address(identifier, network):
    networks = json.loads(docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', identifier))
    if network not in networks:
        raise ValueError('missing-edge-network')
    value = networks[network]
    ip = ipaddress.ip_address(value['IPAddress'])
    if ip.version != 4 or not ip.is_private or value.get('GlobalIPv6Address'):
        raise ValueError('application-network-family')
    return str(ip)


def find(model, path, service):
    identifier = docker('compose', '--env-file', '/dev/null', '-f', str(path), 'ps', '-aq', service)
    if not identifier:
        raise ValueError('application-container-missing')
    actual = json.loads(docker('inspect', '--format', snapshot.CONTAINER_FORMAT, identifier))
    labels = actual['Config']['Labels']
    wanted = model['services'][service]
    if (actual['Image'] != wanted['image'] or labels.get('com.docker.compose.project') != model['name']
            or labels.get('com.docker.compose.service') != service
            or labels.get('mercurion.application.run') != wanted['labels']['mercurion.application.run']
            or actual['HostConfig'].get('PortBindings') or actual['HostConfig'].get('Privileged')
            or actual['HostConfig'].get('ReadonlyRootfs') is not True):
        raise ValueError('application-container-contract')
    return actual['Id']


def prepare(root, manifest, report):
    receiver.guard(True)
    expected = snapshot.BASE / ('application-' + manifest['runId'])
    if root != expected:
        raise ValueError('application-protected-root')
    server_root = snapshot.BASE / ('server-' + manifest['serverRunId'])
    servers, server_receiver, server_manifest, loaded, models = cold.original(server_root, manifest['serverManifestSha256'])
    current = snapshot.inventory(manifest['serverRunId'], manifest['serverManifestSha256'])
    current['runId'] = manifest['serverRunId']
    original = cold.read(server_root / 'bootstrap-result.json')
    if os.path.lexists(server_root / 'application-members.json'):
        raise ValueError('applications-already-installed-not-a-recovery-command')
    # Use the original metadata identities, with the current verified boot as the
    # reference for this first application install; no server state is fabricated.
    if not all(item['running'] is True for item in current['containers']):
        raise ValueError('recover-servers-before-applications')
    for item in current['containers']:
        if not any(item['id'].startswith(value) for value in original['ownedContainers']):
            raise ValueError('original-server-identity')
    cold.validate_contract(current, models, loaded, running=True)
    cold.resources(current, models)
    checks = {}
    cold.verify_services(current, server_manifest, checks, servers, server_receiver)
    report['serverChecks'] = checks['checks']
    if os.path.lexists(receiver.BASE / manifest['runId']):
        raise ValueError('application-secret-run-exists')
    planned = bundle.projection(bundle.servers.transport.read(root / 'models.json'),
        {role: {'imageId': digest} for role, digest in manifest['configDigests'].items()}, manifest['runId'])
    for model in planned.values():
        for name in model['services']:
            existing = docker('ps', '-aq', '--filter', 'label=com.docker.compose.project=' + model['name'],
                             '--filter', 'label=com.docker.compose.service=' + name)
            if existing:
                raise ValueError('application-service-collision')
        for network in model['networks'].values():
            if not network.get('external') and docker('network', 'ls', '-q', '--filter', 'name=^' + network['name'] + '$'):
                raise ValueError('application-network-collision')
    if docker('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
        raise ValueError('application-platform')
    archives = sum((root / ('servers/edge' if role == 'edge' else 'components/' + role) / 'image.tar').stat().st_size for role in manifest['configDigests'])
    if shutil.disk_usage(root).free < 2 * archives + 1024 ** 3:
        raise ValueError('application-space')
    root.joinpath('readback').mkdir()
    report['loaded'] = {}
    for role, digest in manifest['configDigests'].items():
        report['phase'] = 'loading-' + role
        directory = root / ('servers/edge' if role == 'edge' else 'components/' + role)
        report['loaded'][role] = load_archive(directory / 'image.tar', digest, root / 'readback' / (role + '.tar'), execute=docker)
    models = bundle.projection(bundle.servers.transport.read(root / 'models.json'), report['loaded'], manifest['runId'])
    for project, model in models.items():
        bundle.servers.transport.write(root / (project + '-applications.json'), model)
    edge_path = root / 'shared-applications.json'
    docker('compose', '--env-file', '/dev/null', '-f', str(edge_path), 'up', '-d', '--no-deps', '--no-recreate', '--pull', 'never', 'nginx-edge')
    edge = find(models['shared'], edge_path, 'nginx-edge')
    report.update(servicesStarted=True, edgeId=edge, edgeAddress=address(edge, 'mercurion_stg_web'))
    receiver.prepare(manifest['runId'], os.environ['SUDO_USER'])
    report.update(status='ready', phase='application-inbox-ready', readyForSecretDelivery=True)


def activate(root, manifest, report):
    receiver.guard(True)
    prepared = cold.read(root / 'preflight-result.json')
    if prepared.get('status') != 'ready' or prepared.get('runId') != manifest['runId']:
        raise ValueError('application-preflight-required')
    models = bundle.projection(bundle.servers.transport.read(root / 'models.json'), prepared['loaded'], manifest['runId'])
    for project, model in models.items():
        if cold.read(root / (project + '-applications.json')) != model:
            raise ValueError('application-compose-drift')
    edge = prepared['edgeId']
    if address(edge, 'mercurion_stg_web') != prepared['edgeAddress']:
        raise ValueError('edge-peer-changed')
    receiver.apply(manifest['runId'])
    private = receiver.BASE / manifest['runId'] / 'active'
    node = json.loads((private / 'web-node/values.json').read_text(encoding='utf-8'))
    if json.loads(node['variables']['APP_TRUSTED_PROXY_CIDRS']) != [prepared['edgeAddress'] + '/32']:
        raise ValueError('untrusted-edge-peer')
    preview = root / 'preview-applications.json'
    server_root = snapshot.BASE / ('server-' + manifest['serverRunId'])
    # SQL sent here is fixed metadata-only; password stays in the original server file.
    postgres = next(item['id'] for item in snapshot.inventory(manifest['serverRunId'], manifest['serverManifestSha256'])['containers']
                    if item['service'] == 'postgres-preview')
    command = 'export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec psql -h 127.0.0.1 -U mercurion_preview -d mercurion_preview -At -c "$1"'
    count = docker('exec', postgres, 'sh', '-c', command, 'probe', "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
    if not count.isdigit():
        raise ValueError('database-table-count')
    report['phase'] = 'schema'
    mode = ['--verify-existing'] if int(count) else []
    output = docker('compose', '--env-file', '/dev/null', '-f', str(preview), 'run', '--rm', '--no-deps', '-T',
        '--entrypoint', 'node', '--volume', str(root / 'deployment/local-vm/operational/initialize-empty-schema.cjs') + ':/qa/schema.cjs:ro',
        'web-node-preview', '/qa/schema.cjs', *mode)
    schema = json.loads(output.splitlines()[-1])
    if schema.get('status') != ('compatible' if mode else 'initialized'):
        raise ValueError('application-schema-not-ready')
    report['schema'] = schema
    report['phase'] = 'starting-applications'
    docker('compose', '--env-file', '/dev/null', '-f', str(preview), 'up', '-d', '--no-deps', '--no-recreate', '--pull', 'never',
           'tox21-preview', 'web-node-preview', 'web-ng-preview')
    report['servicesStarted'] = True
    identifiers = {'edge': edge}
    members = []
    for project, names in bundle.APPS.items():
        for name, role in names.items():
            identifier = find(models[project], root / (project + '-applications.json'), name)
            identifiers[role] = identifier
            members.append(dict(service=name, project=models[project]['name'], id=identifier,
                                image=models[project]['services'][name]['image']))
    report['members'] = members
    check_readiness(root, manifest, identifiers, report)
    register_members(root, manifest, members)
    report.update(status='passed', phase='finished', edgeAddress=prepared['edgeAddress'], edgeId=edge, members=members)


def frontend_body(body):
    # This is an HTTP transport smoke check, not Angular DOM/browser acceptance.
    # Do not assume a framework selector: Mercurion currently uses m-root.
    if '<html' not in body.lower():
        raise ValueError('application-spa-body')
    return True


def check_readiness(root, manifest, identifiers, report):
    server_root = snapshot.BASE / ('server-' + manifest['serverRunId'])
    server_helpers, _, _, _, _ = cold.original(server_root, manifest['serverManifestSha256'])
    edge = identifiers['edge']
    report['phase'] = 'application-readiness'
    report['checks'] = {}
    def health():
        body = docker('exec', edge, 'wget', '-q', '-O', '-', '--header=Host: preview.mercurion.app', 'http://127.0.0.1/health')
        if not isinstance(json.loads(body), dict):
            raise ValueError('application-health-body')
        return True
    def frontend():
        body = docker('exec', edge, 'wget', '-q', '-O', '-', '--header=Host: preview.mercurion.app', 'http://127.0.0.1/')
        return frontend_body(body)
    def rpc():
        script = (root / 'scripts/infrastructure/preview_application_rpc.py').read_text(encoding='utf-8')
        answer = json.loads(docker('exec', identifiers['tox21'], 'python', '-B', '-c', script).splitlines()[-1])
        if answer.get('subjects') != 5 or answer.get('inference') != 'real':
            raise ValueError('application-rpc-check')
        return True
    for name, check, container in [('backendHealthThroughEdge', health, identifiers['web-node']),
                                  ('frontendThroughEdge', frontend, identifiers['web-ng']),
                                  ('tox21RealRpc', rpc, identifiers['tox21'])]:
        report['activeCheck'] = name
        report['checks'][name] = server_helpers.retry(check, container)
    if any(docker('inspect', '--format', '{{.State.Running}}', identifier) != 'true' for identifier in identifiers.values()):
        raise ValueError('application-ended-after-readiness')
    report.pop('activeCheck', None)


def register_members(root, manifest, members):
    server_root = snapshot.BASE / ('server-' + manifest['serverRunId'])
    record = dict(schemaVersion=1, serverRunId=manifest['serverRunId'], appRunId=manifest['runId'],
        appManifestSha256=hashlib.sha256((root / 'application-bootstrap.json').read_bytes()).hexdigest(), members=members)
    path = server_root / 'application-members.json'
    if os.path.lexists(path):
        if cold.read(path) != record:
            raise ValueError('application-registration-drift')
        return
    with path.open('x', encoding='utf-8') as stream:
        json.dump(record, stream)


def verify_existing(root, manifest, report):
    """Check the already-started original IDs; never apply secrets/schema or up."""
    receiver.guard(True)
    if root != snapshot.BASE / ('application-' + manifest['runId']):
        raise ValueError('application-protected-root')
    prepared = cold.read(root / 'preflight-result.json')
    previous = cold.read(root / 'bootstrap-result.json')
    if (prepared.get('runId') != manifest['runId'] or prepared.get('status') != 'ready'
            or previous.get('runId') != manifest['runId'] or previous.get('servicesStarted') is not True
            or previous.get('phase') not in ('application-readiness', 'finished')
            or previous.get('schema', {}).get('status') not in ('initialized', 'compatible')):
        raise ValueError('existing-started-application-receipt-required')
    models = bundle.projection(bundle.servers.transport.read(root / 'models.json'), prepared['loaded'], manifest['runId'])
    old_members = {item['service']: item for item in previous['members']}
    if len(previous['members']) != 4 or set(old_members) != {name for names in bundle.APPS.values() for name in names}:
        raise ValueError('previous-application-members')
    identifiers, members = {}, []
    for project, names in bundle.APPS.items():
        if cold.read(root / (project + '-applications.json')) != models[project]:
            raise ValueError('application-compose-drift')
        for name, role in names.items():
            identifier = find(models[project], root / (project + '-applications.json'), name)
            member = dict(service=name, project=models[project]['name'], id=identifier,
                          image=models[project]['services'][name]['image'])
            if member != old_members[name] or docker('inspect', '--format', '{{.State.Running}}', identifier) != 'true':
                raise ValueError('original-running-application-required')
            identifiers[role] = identifier
            members.append(member)
    edge = identifiers['edge']
    if edge != prepared['edgeId'] or address(edge, 'mercurion_stg_web') != prepared['edgeAddress']:
        raise ValueError('edge-peer-changed')
    receiver.inspect(manifest['runId'])  # File metadata only; no private host configuration.
    report.update(members=members, schema=previous['schema'])
    check_readiness(root, manifest, identifiers, report)
    register_members(root, manifest, members)
    report.update(status='passed', phase='finished', edgeAddress=prepared['edgeAddress'], edgeId=edge)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('preflight', 'activate'))
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    output = args.root / ('preflight-result.json' if args.phase == 'preflight' else 'bootstrap-result.json')
    if output.exists():
        raise SystemExit('Application receipt already exists; no automatic retry')
    report = dict(schemaVersion=1, runId=None, status='failed', phase=args.phase,
        observedAtUtc=datetime.now(timezone.utc).isoformat(), servicesStarted=False,
        publishedPorts=False, publicAcceptance=False, isolationAccepted=False)
    try:
        manifest = bundle.verify(args.root)
        report['runId'] = manifest['runId']
        (prepare if args.phase == 'preflight' else activate)(args.root, manifest, report)
    except Exception as error:
        report['errorType'] = type(error).__name__
        if isinstance(error, ValueError) and __import__('re').fullmatch('[a-z-]+', str(error)):
            report['code'] = str(error)
    if report['runId']:
        try:
            report['runningApplicationContainers'] = docker('ps', '-q', '--no-trunc', '--filter', 'label=mercurion.application.run=' + report['runId']).split()
        except Exception:
            report['resourceReadback'] = 'unavailable'
    with output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
    output.chmod(0o644)
    print(json.dumps({name: report[name] for name in ('runId', 'status', 'phase', 'servicesStarted', 'publishedPorts')}))
    raise SystemExit(0 if report['status'] in ('ready', 'passed') else 1)
