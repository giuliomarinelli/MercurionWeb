"""Cold private preview QA with synthetic values and uniquely owned data/resources."""
import argparse
import json
import inspect
from pathlib import Path
import tempfile
import time
import uuid

import preview_compose
import preview_credentials
import preview_server_bundle
import guest_preview_servers
from smoke_preview_infrastructure import docker, value, HELPER

LABEL = 'mercurion.preview-stack-qa'
INIT_FILES = '''import json,pathlib,sys
p=pathlib.Path('/private')
for name,value in json.load(sys.stdin).items():
 f=p/name;f.write_text(value);f.chmod(0o400)
print('PREPARED')'''
MEILI_INIT = '''import json,sys,time,urllib.request,urllib.error
master=json.load(sys.stdin)['master'];base='http://meilisearch:7700'
def call(path,method='GET',data=None):
 r=urllib.request.Request(base+path,method=method,data=None if data is None else json.dumps(data).encode(),headers={'Authorization':'Bearer '+master,'Content-Type':'application/json'})
 with urllib.request.urlopen(r,timeout=3) as response:return json.load(response)
for index in ['molecule_previews_chembl_36','molecule_details_chembl_36','logs_staging','security_logs_staging','logs_production','security_logs_production']:
 task=call('/indexes','POST',{'uid':index,'primaryKey':'id'})
 for n in range(100):
  status=call('/tasks/'+str(task['taskUid']))['status']
  if status=='succeeded':break
  if status=='failed':raise RuntimeError('index task failed')
  time.sleep(.05)
 else:raise RuntimeError('index task timed out')
keys={}
for role,actions,indexes in [('searchKey',['search','documents.get'],['molecule_previews_chembl_36','molecule_details_chembl_36']),('logKey',['documents.add'],['logs_staging','security_logs_staging'])]:
 keys[role]=call('/keys','POST',{'description':'synthetic QA '+role,'actions':actions,'indexes':indexes,'expiresAt':None})['key']
print(json.dumps(keys))'''


def compose(path, *args, check=True):
    result = docker('compose', '-f', str(path), *args, check=check)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--servers-only', action='store_true')
    parser.add_argument('--image-suffix')
    parser.add_argument('--image-manifest', type=Path)
    args = parser.parse_args()
    if args.report.exists():
        raise ValueError('Report exists')
    run = uuid.uuid4().hex
    label = LABEL + '=' + run
    models = preview_compose.render()
    preview_compose.validate(models)
    images = {'web-ng': 'mercurion-vm042-web-ng:qa', 'web-node': 'mercurion-vm042-web-node:qa',
              'postgres': 'mercurion-vm042-postgres:patched', 'redis': 'mercurion-vm042-redis:candidate',
              'meilisearch': 'mercurion-vm042-meilisearch:candidate',
              'nginx': 'mercurion-vm042-edge:candidate',
              'nats': 'mercurion-nats:2.15.2-crypto.1', 'tox21': HELPER}
    if args.image_manifest:
        import re
        supplied = json.loads(args.image_manifest.read_text(encoding='utf-8'))
        if set(supplied) != set(images) or not all(re.fullmatch('sha256:[a-f0-9]{64}', ref) for ref in supplied.values()):
            raise ValueError('Explicit immutable images required for every QA role')
        images = supplied
    images = {role: json.loads(value('image', 'inspect', reference))[0]['Id'] for role, reference in images.items()}
    if args.image_suffix:
        for role in ('postgres', 'redis', 'meilisearch', 'nginx', 'web-node', 'web-ng'):
            tag = 'mercurion-vm042-' + ('edge' if role == 'nginx' else role) + ':' + args.image_suffix
            images[role] = json.loads(value('image', 'inspect', tag))[0]['Id']
    if args.servers_only:
        if not args.image_suffix:
            raise ValueError('Server QA requires an explicit verified image suffix')
        models = preview_server_bundle.projection(models,
            {role: {'imageId': images[role]} for role in ('postgres', 'redis', 'meilisearch', 'nats')}, run)
    configuration = preview_credentials.template('https://preview.mercurion.app', preview_credentials.rsa_pairs())
    configuration['providers'] = {name: 'synthetic-qa' for name in preview_credentials.PROVIDERS}
    configuration['providers'].update(EMAIL_SMTP_HOST='127.0.0.1', EMAIL_SMTP_PORT='1025',
        EMAIL_SMTP_SECURE='false', EMAIL_USERNAME='qa@example.invalid', EMAIL_DEFAULT_FROM='qa@example.invalid',
        TWILIO_ACCOUNT_SID='AC' + 'a' * 32, TWILIO_FROM='+15005550006', ORCID_ISSUER='https://orcid.org')
    documents = preview_credentials.server_documents(configuration)
    documents['web-node'] = (10001, 10001, {})
    if args.servers_only:
        documents = {role: documents[role] for role in ('postgres', 'redis', 'meilisearch', 'nats')}
    credential_volumes = {}
    keepers = {}
    result = {'schemaVersion': 1, 'runId': run, 'status': 'failed', 'checks': {},
              'cleanupErrors': [], 'syntheticOnly': True, 'vmDeployment': False}
    common_network = 'preview-qa-helper-' + run
    paths = {}
    try:
        value('network', 'create', '--internal', '--ipv6=false', '--label', label, common_network)
        for role, (uid, gid, files) in documents.items():
            name = 'preview-qa-' + run + '-' + role
            credential_volumes[role] = name
            value('volume', 'create', '--driver', 'local', '--opt', 'type=tmpfs', '--opt', 'device=tmpfs',
                  '--opt', f'o=size=8m,mode=0700,uid={uid},gid={gid}', '--label', label, name)
            keeper = value('run', '-d', '--name', name + '-keeper', '--network', common_network,
                '--label', label, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
                '--user', f'{uid}:{gid}', '--memory', '128m', '--pids-limit', '32',
                '--mount', f'type=volume,src={name},dst=/private', '--entrypoint', 'python', HELPER,
                '-B', '-c', 'import time;time.sleep(900)')
            keepers[role] = keeper
            if files:
                docker('exec', '-i', keeper, 'python', '-B', '-c', INIT_FILES, data=json.dumps(files))
        with tempfile.TemporaryDirectory(prefix='mercurion-preview-stack-qa-') as directory:
            for project, model in models.items():
                model['name'] = 'qa-' + project + '-' + run
                for network in model['networks'].values():
                    network['name'] = 'qa-' + run + '-' + network['name']
                    if not network.get('external'):
                        network.setdefault('labels', {})[LABEL] = run
                for volume in model.get('volumes', {}).values():
                    volume['name'] = 'qa-' + run + '-' + volume['name']
                    volume.setdefault('labels', {})[LABEL] = run
                for name, service in model['services'].items():
                    role = preview_compose.ROLES[name][0]
                    service['image'] = images[role]
                    service.setdefault('labels', {})[LABEL] = run
                    public_mounts = []
                    private_mount = False
                    secret_role = 'web-node' if role == 'web-node' else role
                    for mount in service.get('volumes', []):
                        if mount.get('type') != 'bind':
                            public_mounts.append(mount)
                        elif '/run/mercurion-preview/' in mount['source'].replace('\\', '/'):
                            private_mount = True
                        else:
                            relative = 'deployment/local-vm/operational/' + mount['source'].split('/deployment/local-vm/operational/', 1)[-1]
                            mount['source'] = str(preview_compose.ROOT / relative)
                            public_mounts.append(mount)
                    if private_mount:
                        key = 'qa-credentials-' + secret_role
                        model.setdefault('volumes', {})[key] = {'external': True, 'name': credential_volumes[secret_role]}
                        public_mounts.append({'type': 'volume', 'source': key, 'target': '/run/mercurion', 'read_only': True})
                    service['volumes'] = public_mounts
                paths[project] = Path(directory) / (project + '.json')
                paths[project].write_text(json.dumps(model), encoding='utf-8')
            result['phase'] = 'infrastructure'
            compose(paths['shared'], 'up', '-d')
            services = ['postgres-preview', 'redis-preview', 'nats-preview']
            if not args.servers_only:
                services.append('tox21-preview')
            compose(paths['preview'], 'up', '-d', *services)
            postgres = compose(paths['preview'], 'ps', '-q', 'postgres-preview').stdout.strip()
            deadline = time.monotonic() + 60
            while docker('exec', postgres, 'pg_isready', '-h', '127.0.0.1', '-U', 'mercurion_preview', '-d', 'mercurion_preview', check=False).returncode:
                if time.monotonic() > deadline:
                    raise ValueError('Database readiness timeout')
                time.sleep(.5)
            if args.servers_only:
                def desktop(*arguments, **kwargs):
                    try:
                        return value(*arguments)
                    except RuntimeError:
                        raise ValueError('qa-docker-operation') from None
                guest_preview_servers.docker = desktop
                redis = compose(paths['preview'], 'ps', '-q', 'redis-preview').stdout.strip()
                checks = dict(postgresRoleAndVector=guest_preview_servers.retry(lambda: guest_preview_servers.postgres_check(postgres)),
                              redisAuthAndKeyevents=guest_preview_servers.retry(lambda: guest_preview_servers.redis_check(redis)))
                for role, function, alias, project, key in [
                        ('meilisearch', guest_preview_servers.meili_check, 'meilisearch', 'shared', 'stg-search'),
                        ('nats', guest_preview_servers.nats_check, 'nats-preview', 'preview', 'bus')]:
                    value('network', 'connect', models[project]['networks'][key]['name'], keepers[role])
                    code = 'import json,socket,urllib.request,urllib.error\n' + inspect.getsource(function)
                    code += '\nassert ' + function.__name__ + '(' + repr(alias) + ')\nprint("SERVER_CHECK_OK")'
                    def probe():
                        answer = docker('exec', keepers[role], 'python', '-B', '-c', code, check=False)
                        if answer.returncode or answer.stdout.strip() != 'SERVER_CHECK_OK':
                            raise ValueError('server-probe-not-ready')
                        return True
                    checks[role] = guest_preview_servers.retry(probe)
                result.update(status='passed', phase='server-readiness', checks=checks)
            else:
                search_network = models['shared']['networks']['stg-search']['name']
                value('network', 'connect', search_network, keepers['meilisearch'])
                master = configuration['meilisearchServer']['masterKey']
                deadline = time.monotonic() + 60
                while True:
                    response = docker('exec', '-i', keepers['meilisearch'], 'python', '-B', '-c', MEILI_INIT,
                                     data=json.dumps({'master': master}), check=False)
                    if response.returncode == 0:
                        configuration['meilisearchClients'] = json.loads(response.stdout)
                        break
                    if time.monotonic() > deadline:
                        raise ValueError('Meilisearch setup timeout')
                    time.sleep(.5)
                edge = compose(paths['shared'], 'ps', '-q', 'nginx-edge').stdout.strip()
                edge_info = json.loads(value('inspect', edge))[0]
                web_network = models['shared']['networks']['stg-web']['name']
                edge_ip = edge_info['NetworkSettings']['Networks'][web_network]['IPAddress']
                document = preview_credentials.application_document(configuration, [edge_ip + '/32'])
                docker('exec', '-i', keepers['web-node'], 'python', '-B', '-c', INIT_FILES,
                       data=json.dumps({'values.json': json.dumps(document)}))
                result['phase'] = 'empty-database-schema'
                schema = compose(paths['preview'], 'run', '--rm', '--no-deps', '--entrypoint', 'node',
                    '-v', str(preview_compose.ROOT / 'deployment/local-vm/operational/initialize-empty-schema.cjs') + ':/qa/schema.cjs:ro',
                    'web-node-preview', '/qa/schema.cjs', check=False)
                result['schemaExitCode'] = schema.returncode
                if schema.returncode:
                    raise ValueError('Empty schema initialization failed')
                result['checks']['emptySchema'] = True
                verified = compose(paths['preview'], 'run', '--rm', '--no-deps', '--entrypoint', 'node',
                    '-v', str(preview_compose.ROOT / 'deployment/local-vm/operational/initialize-empty-schema.cjs') + ':/qa/schema.cjs:ro',
                    'web-node-preview', '/qa/schema.cjs', '--verify-existing', check=False)
                if verified.returncode:
                    result['schemaComparison'] = {'status':'unavailable'}
                    for line in (verified.stdout + '\n' + verified.stderr).splitlines():
                        try:
                            diagnostic = json.loads(line)
                            if diagnostic.get('code') == 'EMPTY_PREVIEW_SCHEMA_INITIALIZATION_FAILED':
                                result['schemaComparison'] = diagnostic
                        except (ValueError, AttributeError):
                            pass
                    raise ValueError('Existing schema compatibility check failed')
                result['checks']['existingSchemaCompatible'] = True
                # The compatibility path must reject actual drift, without fixing it.
                query = "ALTER TABLE user_notifications ALTER COLUMN payload SET DEFAULT '[]'::jsonb"
                value('exec', postgres, 'psql', '-U', 'postgres', '-d', 'mercurion_preview', '-c', query)
                mismatch = compose(paths['preview'], 'run', '--rm', '--no-deps', '--entrypoint', 'node',
                    '-v', str(preview_compose.ROOT / 'deployment/local-vm/operational/initialize-empty-schema.cjs') + ':/qa/schema.cjs:ro',
                    'web-node-preview', '/qa/schema.cjs', '--verify-existing', check=False)
                if mismatch.returncode == 0:
                    raise ValueError('Schema drift was accepted')
                actual = value('exec', postgres, 'psql', '-U', 'postgres', '-d', 'mercurion_preview', '-At', '-c',
                    "SELECT pg_get_expr(d.adbin,d.adrelid) FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum WHERE c.relname='user_notifications' AND a.attname='payload'")
                if actual != "'[]'::jsonb":
                    raise ValueError('Read-only schema check mutated default')
                value('exec', postgres, 'psql', '-U', 'postgres', '-d', 'mercurion_preview', '-c',
                    "ALTER TABLE user_notifications ALTER COLUMN payload SET DEFAULT '{}'::jsonb")
                result['checks']['schemaDriftRejectedWithoutMutation'] = True
                tox21 = compose(paths['preview'], 'ps', '-q', 'tox21-preview').stdout.strip()
                rpc = (preview_compose.ROOT / 'scripts/infrastructure/preview_application_rpc.py').read_text(encoding='utf-8')
                deadline = time.monotonic() + 45
                while True:
                    answer = docker('exec', tox21, 'python', '-B', '-c', rpc, check=False)
                    if answer.returncode == 0 and json.loads(answer.stdout)['subjects'] == 5:
                        break
                    if time.monotonic() > deadline:
                        raise ValueError('Real application RPC failed')
                    time.sleep(.5)
                result['checks']['realTox21Rpc'] = True
                result['phase'] = 'application-health'
                compose(paths['preview'], 'up', '-d', 'web-node-preview', 'web-ng-preview')
                deadline = time.monotonic() + 90
                while True:
                    probe = docker('exec', edge, 'wget', '-q', '-O', '-', '--header=Host: preview.mercurion.app', 'http://127.0.0.1/health', check=False)
                    if probe.returncode == 0:
                        break
                    if time.monotonic() > deadline:
                        raise ValueError('Application health timeout')
                    time.sleep(.5)
                html = value('exec', edge, 'wget', '-q', '-O', '-', '--header=Host: preview.mercurion.app', 'http://127.0.0.1/')
                if '<html' not in html.lower():
                    raise ValueError('SPA not served')
                backend = compose(paths['preview'], 'ps', '-q', 'web-node-preview').stdout.strip()
                crypto = value('exec', backend, 'node', '-e', '''
    require('./dist/src/bootstrap/secret-file-environment.js').loadSecretFileEnvironment();
    const {SecurityService}=require('./dist/src/app_modules/auth/services/security.service.js');
    const service=Object.create(SecurityService.prototype);service.AES_secret=process.env.APP_AES_SECRET;
    const marker='synthetic-preview-crypto';
    if(service.decrypt_AES256_GCM(service.encrypt_AES256_GCM(marker))!==marker)throw Error('AES roundtrip');
    console.log('AES_ROUNDTRIP_OK');''')
                if crypto != 'AES_ROUNDTRIP_OK':
                    raise ValueError('Application AES roundtrip failed')
                result['checks'].update(backendHealthThroughEdge=True, frontendThroughEdge=True)
                result['checks']['applicationAesRoundtrip'] = True
                result['status'] = 'passed'
    except Exception as error:
        result['errorType'] = type(error).__name__
        # Fixed phase/reason only: no provider values, SQL, payload or unredacted logs.
        result['reason'] = str(error) if isinstance(error, ValueError) else 'Docker operation failed'
        if isinstance(error, RuntimeError):
            # This executable creates its own synthetic configuration; it never reads
            # an owner's configuration. Still remove its generated values from diagnostics.
            detail = str(error)
            def redact(item):
                nonlocal detail
                if isinstance(item, dict):
                    for entry in item.values():
                        redact(entry)
                elif isinstance(item, str) and len(item) >= 8:
                    detail = detail.replace(item, '[redacted]')
            redact(configuration)
            result['diagnostic'] = detail
        logs = {}
        for identifier in value('ps', '-aq', '--filter', 'label=' + label).split():
            state = json.loads(value('inspect', '--format', '{{json .State}}', identifier))
            if state['Running']:
                continue
            entry = docker('logs', '--tail', '35', identifier, check=False)
            logs[value('inspect', '--format', '{{.Name}}', identifier)] = (entry.stdout + entry.stderr)[-5000:]
        serialized = json.dumps(logs)
        def redact_logs(item):
            nonlocal serialized
            if isinstance(item, dict):
                for entry in item.values():
                    redact_logs(entry)
            elif isinstance(item, str) and len(item) >= 8:
                serialized = serialized.replace(json.dumps(item)[1:-1], '[redacted]')
        redact_logs(configuration)
        result['endedContainers'] = json.loads(serialized)
    finally:
        for category, listing, removal in [('containers', ['ps', '-aq'], ['rm', '--force']),
                ('networks', ['network', 'ls', '-q'], ['network', 'rm']),
                ('volumes', ['volume', 'ls', '-q'], ['volume', 'rm'])]:
            try:
                for identifier in value(*listing, '--filter', 'label=' + label).split():
                    if docker(*removal, identifier, check=False).returncode:
                        result['cleanupErrors'].append(category)
                if value(*listing, '--filter', 'label=' + label):
                    result['cleanupErrors'].append(category + '-remaining')
            except Exception:
                result['cleanupErrors'].append(category + '-unverifiable')
        if result['cleanupErrors']:
            result['status'] = 'failed'
        with args.report.open('x', encoding='utf-8') as stream:
            json.dump(result, stream, indent=2)
    print(json.dumps(result))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
