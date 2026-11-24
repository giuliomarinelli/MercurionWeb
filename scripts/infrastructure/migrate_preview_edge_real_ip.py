"""Apply the reviewed preview ingress change and roll back on failed checks."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request


PROJECT = 'mercurion-shared'
EDGE = PROJECT + '-nginx-edge-1'
TUNNEL = PROJECT + '-cloudflared-1'
INGRESS_NETWORK = 'mercurion_edge'
UPSTREAM_NETWORK = 'mercurion_stg_web'
RELEASE = Path('/opt/mercurion/releases/preview-edge-real-ip-20261124-v1')
CANDIDATE_FILES = {'edge.compose.json', 'cloudflared-edge.compose.yaml', 'nginx.conf'}
SERVICES = ['nginx-edge', 'cloudflared']


def docker(*args, capture=True):
    command = ['docker', *map(str, args)]
    environment = {**os.environ, 'COMPOSE_DISABLE_ENV_FILE': 'true'}
    if capture:
        return subprocess.check_output(command, text=True, timeout=150, env=environment)
    subprocess.run(command, check=True, timeout=150, env=environment)


def inspect(name, template):
    return docker('inspect', '--format', template, name).strip()


def container_network(name, network):
    networks = json.loads(inspect(name, '{{json .NetworkSettings.Networks}}'))
    return networks[network]


def compose(files, *args, capture=True):
    options = ['compose', '--project-name', PROJECT]
    for file in files:
        options.extend(['-f', file])
    return docker(*options, *args, capture=capture)


def read_base_files():
    label = '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
    edge_files = inspect(EDGE, label).split(',')
    tunnel_files = inspect(TUNNEL, label).split(',')
    base = sorted([edge_files, tunnel_files], key=len)[-1]
    for files in (edge_files, tunnel_files):
        if [file for file in base if file in files] != files:
            raise RuntimeError('Compose attivi divergenti. Nessuna modifica eseguita.')
    if not all(Path(file).is_absolute() and Path(file).is_file() for file in base):
        raise RuntimeError('File Compose attivi mancanti.')
    return base


def capture_state():
    members = json.loads(docker('network', 'inspect', INGRESS_NETWORK, '--format', '{{json .Containers}}'))
    observed = {item['Name']: item['IPv4Address'] for item in members.values()}
    ipam = json.loads(docker('network', 'inspect', INGRESS_NETWORK, '--format', '{{json .IPAM.Config}}'))
    if observed != {EDGE: '172.21.0.2/16', TUNNEL: '172.21.0.3/16'} or ipam != [
        {'Subnet': '172.21.0.0/16', 'Gateway': '172.21.0.1'}
    ]:
        raise RuntimeError('La rete ingress non coincide con quella verificata.')
    for name in (EDGE, TUNNEL):
        if inspect(name, '{{.State.Running}}') != 'true':
            raise RuntimeError(f'Il container {name} non è in esecuzione.')
    return container_network(EDGE, UPSTREAM_NETWORK)


def load_models(base, stage):
    old = json.loads(compose(base, 'config', '--format', 'json'))
    new = json.loads(compose([*base, stage / 'edge.compose.json', stage / 'cloudflared-edge.compose.yaml'],
                             'config', '--format', 'json'))
    for model in (old, new):
        if model['name'] != PROJECT or set(model['services']) != set(SERVICES):
            raise RuntimeError('Il modello Compose deve contenere soltanto nginx-edge e cloudflared.')
        for service, container in zip(SERVICES, (EDGE, TUNNEL)):
            image = model['services'][service]['image']
            if docker('image', 'inspect', image, '--format', '{{.Id}}').strip() != inspect(container, '{{.Image}}'):
                raise RuntimeError(f'Il modello cambierebbe l’immagine attiva di {service}.')
    edge_network = new['networks']['edge']
    tunnel_service = new['services']['cloudflared']
    if (edge_network['name'] != INGRESS_NETWORK or edge_network.get('internal') is not True
            or edge_network['ipam']['config'] != [
                {'subnet': '172.21.0.0/16', 'gateway': '172.21.0.1', 'ip_range': '172.21.1.0/24'}
            ] or tunnel_service['networks']['tunnel-edge']['ipv4_address'] != '172.21.0.3'
            or new['networks']['stg-web'] != old['networks']['stg-web']):
        raise RuntimeError('Il modello candidato non corrisponde alla migrazione dell’ingress.')
    return old, new


def package(stage):
    checksums = dict(line.split(maxsplit=1)[::-1] for line in (stage / 'SHA256SUMS').read_text().splitlines())
    if set(checksums) != CANDIDATE_FILES:
        raise RuntimeError('Manifesto SHA256 inatteso.')
    content = {name: (stage / name).read_bytes() for name in CANDIDATE_FILES}
    for name, data in content.items():
        if hashlib.sha256(data).hexdigest() != checksums[name]:
            raise RuntimeError(f'Checksum non valido per {name}.')
    return content


def save_model(name, model, *, edge_only=False):
    if edge_only:
        edge = model['services']['nginx-edge']
        model = {'name': PROJECT, 'services': {'nginx-edge': edge},
                 'networks': {key: model['networks'][key] for key in edge['networks']}}
    path = RELEASE / name
    path.write_text(json.dumps(model, indent=2) + '\n', encoding='utf-8')
    return path


def verify_upstreams(expected):
    current = container_network(EDGE, UPSTREAM_NETWORK)
    if any(current[field] != expected[field] for field in ('NetworkID', 'IPAddress')):
        raise RuntimeError('L’indirizzo di nginx sulla rete di Nest è cambiato.')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for path in ('/health', '/'):
        request = urllib.request.Request('http://' + current['IPAddress'] + path,
                                         headers={'Host': 'preview.mercurion.app'})
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError(f'Il controllo nginx {path} non ha risposto HTTP 200.')


def restart(edge_model, full_model, expected):
    containers = set(docker('ps', '-a', '--format', '{{.Names}}').splitlines())
    for name in (TUNNEL, EDGE):
        if name in containers:
            if inspect(name, '{{.State.Running}}') == 'true':
                docker('stop', name, capture=False)
            docker('rm', name, capture=False)
    found = docker('network', 'ls', '--format', '{{.Name}}').splitlines()
    if INGRESS_NETWORK in found:
        docker('network', 'rm', INGRESS_NETWORK, capture=False)
    start = ('up', '-d', '--no-deps', '--pull', 'never', '--wait', '--wait-timeout', '45')
    # Bring up the owner of the network before the service that references it as external.
    compose([edge_model], *start, 'nginx-edge', capture=False)
    verify_upstreams(expected)
    compose([full_model], *start, 'cloudflared', capture=False)


def verify_tunnel():
    endpoint = container_network(TUNNEL, INGRESS_NETWORK)
    if endpoint['IPAddress'] != '172.21.0.3' or endpoint['IPAMConfig']['IPv4Address'] != '172.21.0.3':
        raise RuntimeError('Docker non ha assegnato l’indirizzo statico previsto a cloudflared.')
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        logs = subprocess.run(['docker', 'logs', '--tail', '80', TUNNEL], check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=5).stdout
        if 'Registered tunnel connection' in logs:
            return
        time.sleep(2)
    raise RuntimeError('Connessione del tunnel non osservata entro 45 secondi.')


def migrate(stage):
    content = package(stage)
    upstream = capture_state()
    verify_upstreams(upstream)
    old, new = load_models(read_base_files(), stage)
    # An existing release directory contains the evidence and models from a previous attempt.
    RELEASE.mkdir(mode=0o755)
    for name, data in content.items():
        (RELEASE / name).write_bytes(data)
    old_full = save_model('rollback.compose.json', old)
    old_edge = save_model('rollback-edge.compose.json', old, edge_only=True)
    new_full = save_model('active.compose.json', new)
    new_edge = save_model('active-edge.compose.json', new, edge_only=True)
    edge_image = new['services']['nginx-edge']['image']
    docker('run', '--rm', '--pull', 'never', '--network', 'none', '--user', '10101:10101',
           '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777',
           '--mount', f'type=bind,src={RELEASE / "nginx.conf"},dst=/etc/nginx/nginx.conf,readonly',
           '--entrypoint', 'nginx', edge_image, '-t', capture=False)
    print('Controlli preliminari completati. Migrazione di nginx e cloudflared.', flush=True)
    try:
        restart(new_edge, new_full, upstream)
        verify_tunnel()
    except (OSError, RuntimeError, KeyError, subprocess.SubprocessError) as error:
        print(f'Migrazione interrotta. Ripristino ingress. Motivo: {error}', flush=True)
        restart(old_edge, old_full, upstream)
        print('Configurazione precedente riavviata e upstream verificati.', flush=True)
        return 1
    print('Rete persistente, IP statico, upstream HTTP 200 e registrazione tunnel verificati.', flush=True)
    return 0


if __name__ == '__main__':
    try:
        sys.exit(migrate(Path(sys.argv[1]).resolve()))
    except (OSError, ValueError, RuntimeError, KeyError, subprocess.SubprocessError) as error:
        print(f'Procedura interrotta: {error}', file=sys.stderr)
        sys.exit(1)
