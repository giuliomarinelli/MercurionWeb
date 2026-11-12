"""Non-mutating validation of the real preview projection against canonical roles."""
import argparse
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
FILES = {name: ROOT / f'deployment/local-vm/operational/{name}/compose.yaml'
         for name in ('shared', 'preview')}
IMAGES = ('WEB_NG_IMAGE', 'WEB_NODE_IMAGE', 'TOX21_IMAGE', 'NATS_IMAGE',
          'POSTGRES_IMAGE', 'REDIS_IMAGE', 'MEILISEARCH_IMAGE', 'EDGE_IMAGE')
ROLES = {'web-ng-preview': ('web-ng', '10101:10101', {'web'}),
         'web-node-preview': ('web-node', '10001:10001', {'web', 'data', 'bus', 'search', 'egress'}),
         'postgres-preview': ('postgres', '70:70', {'data'}),
         'redis-preview': ('redis', '999:1000', {'data'}),
         'nats-preview': ('nats', '10021:10021', {'bus'}),
         'tox21-preview': ('tox21', '10021:10021', {'bus', 'egress'}),
         'meilisearch': ('meilisearch', '10001:10001', {'stg-search'}),
         'nginx-edge': ('nginx', '10101:10101', {'edge', 'stg-web'})}


def render():
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(('DOCKER_', 'COMPOSE_')) and key not in IMAGES
                   and key not in ('BOOTSTRAP_ROOT', 'RELEASE_ROOT')}
    environment['COMPOSE_DISABLE_ENV_FILE'] = 'true'
    with tempfile.TemporaryDirectory(prefix='mercurion-preview-config-') as directory:
        source = Path(directory) / 'images.env'
        source.write_text('\n'.join(name + '=sha256:' + 'a' * 64 for name in IMAGES)
                          + '\nBOOTSTRAP_ROOT=/run/mercurion-preview/qa\nRELEASE_ROOT=/opt/mercurion/qa\n', encoding='utf-8')
        prefix = ['docker', '--context', 'desktop-linux'] if os.name == 'nt' else ['docker']
        return {name: json.loads(subprocess.check_output([
            *prefix, 'compose', '--env-file', str(source),
            '-f', str(path), 'config', '--no-path-resolution', '--format', 'json'],
            encoding='utf-8', timeout=30, env=environment)) for name, path in FILES.items()}


def validate_nginx(text):
    active = '\n'.join(line.split('#', 1)[0] for line in text.splitlines())
    if (re.search(r'\bssl(?:_|\s)|https://|\bmaintenance|letsencrypt|configmap', active, re.I)
            or any(statement.split()[0] != '80' for statement in re.findall(r'\blisten\s+([^;]+);', active))
            or not re.search(r'\blisten\s+80(?:\s|;)', active)):
        raise ValueError('VM Nginx requires HTTP port 80, no TLS/certificates or maintenance mode')
    return True


def validate(models):
    validate_nginx((ROOT / 'deployment/local-vm/operational/nginx.conf').read_text(encoding='utf-8'))
    schema = json.loads((ROOT / 'deployment/deployment-schema.json').read_text(encoding='utf-8'))
    if set(models) != {'shared', 'preview'}:
        raise ValueError('Expected independent shared/preview projects')
    found = {}
    for project, model in models.items():
        if model.get('name') != 'mercurion-' + project:
            raise ValueError('Unexpected project identity')
        for name, service in model['services'].items():
            if name in found or name not in ROLES:
                raise ValueError('Unexpected or duplicate service role')
            found[name] = service
            role, user, networks = ROLES[name]
            if role not in schema['services'] or set(service.get('networks', {})) != networks:
                raise ValueError('Service topology differs from canonical roles')
            if (not re.fullmatch('sha256:[a-f0-9]{64}', service.get('image', ''))
                    or service.get('pull_policy') != 'never' or service.get('user') != user
                    or service.get('read_only') is not True
                    or service.get('cap_drop') != ['ALL']
                    or 'no-new-privileges:true' not in service.get('security_opt', [])
                    or service.get('ports') or service.get('build') or service.get('privileged')
                    or service.get('network_mode') or service.get('pid') or service.get('devices')):
                raise ValueError('Unsafe runtime privileges, image identity or publishing')
            environment = service.get('environment', {})
            if any(not mount.startswith('/') for mount in service.get('tmpfs', [])):
                raise ValueError('Invalid tmpfs mount syntax')
            allowed = {'APP_ENV', 'NODE_ENV', 'MERCURION_BOOTSTRAP_FILE'} if role == 'web-node' else set()
            if role == 'postgres':
                allowed = {'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PASSWORD_FILE'}
            if role == 'tox21':
                allowed = {'PY_ENV', 'NATS_URL', 'MERCURION_BOOTSTRAP_FILE', 'JWT_PUBLIC_KEY_PATH'}
            if set(environment) - allowed or service.get('env_file'):
                raise ValueError('Credentials or unexpected inputs in Docker environment')
            for mount in service.get('volumes', []):
                if mount.get('type') == 'bind' and (mount.get('read_only') is not True
                        or mount.get('bind', {}).get('create_host_path') is not False
                        or 'docker.sock' in mount.get('source', '')):
                    raise ValueError('Writable or implicitly created source mount')
        for name, network in model.get('networks', {}).items():
            if network.get('external'):
                if network.get('name') not in {'mercurion_stg_web', 'mercurion_stg_search'}:
                    raise ValueError('Unexpected external network')
                continue
            if (network.get('enable_ipv4') is not True or network.get('enable_ipv6') is not False
                    or network.get('driver') != 'bridge'
                    or network.get('internal', False) is not (name != 'egress')):
                raise ValueError('Unexpected network family or egress')
    if set(found) != set(ROLES):
        raise ValueError('Incomplete preview stack')
    node = found['web-node-preview']
    if (node['environment'].get('APP_ENV') != 'staging'
            or node['command'] != ['node', 'dist/src/bootstrap-secrets.cli.js']):
        raise ValueError('Nest must use staging file bootstrap')
    if found['tox21-preview']['environment'].get('PY_ENV') != 'staging':
        raise ValueError('Tox21 target differs from preview')
    source = node['volumes'][0]['source'].replace('\\', '/')
    if not source.endswith('/web-node/values.json'):
        raise ValueError('Nest must mount only its application document, never the Meilisearch server key')
    return {'projects': 2, 'services': len(found), 'publishedPorts': 0, 'staticOnly': True}


def negative_guards(models):
    mutations = [lambda x: x['preview']['services']['web-node-preview'].update(ports=[{'target':8098,'published':'8098'}]),
                 lambda x: x['preview']['services']['web-node-preview']['environment'].update(MEILISEARCH_MASTER_KEY='synthetic-master'),
                 lambda x: x['preview']['services']['web-node-preview']['volumes'][0].update(source='/run/mercurion/meilisearch/server.toml'),
                 lambda x: x['shared']['networks']['stg-web'].update(enable_ipv6=True),
                 lambda x: x['preview']['services']['postgres-preview'].update(user='0:0'),
                 lambda x: x['preview']['services']['web-ng-preview'].update(image='nginx:latest')]
    for mutate in mutations:
        altered = copy.deepcopy(models)
        mutate(altered)
        try:
            validate(altered)
        except ValueError:
            continue
        raise ValueError('Unsafe operational mutation admitted')
    return len(mutations)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    models = render()
    result = validate(models)
    result['negativeGuards'] = negative_guards(models)
    print(json.dumps(result))
