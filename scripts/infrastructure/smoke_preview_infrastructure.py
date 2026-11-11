"""Synthetic infrastructure bootstrap smoke; only owned temporary Docker resources."""
import argparse
import json
from pathlib import Path
import secrets
import subprocess
import time
import uuid

HELPER = 'sha256:e816fb97709fb05db82ecacaef69cb7c1e23389474d7cc7a7688d47d37a283d4'
LABEL = 'mercurion.preview-infrastructure-qa'
INIT = '''import json,pathlib,sys
p=pathlib.Path('/private');(p/'data').mkdir(mode=0o700)
for name,value in json.load(sys.stdin).items():
 f=p/name;f.write_text(value);f.chmod(0o400)
print('PREPARED')'''
MEILI_PROBE = '''import json,pathlib,tomllib,urllib.request,urllib.error
cfg=tomllib.loads(pathlib.Path('/private/server.toml').read_text());master=cfg['master_key']
base='http://meilisearch:7700'
def call(path,method='GET',body=None,key=master):
 r=urllib.request.Request(base+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
 with urllib.request.urlopen(r,timeout=3) as response:return json.load(response)
assert call('/health')['status']=='available'
try:call('/keys',key='synthetic-invalid')
except urllib.error.HTTPError as e:assert e.code in (401,403)
else:raise AssertionError('unauthenticated admin access')
result=call('/keys','POST',{'description':'synthetic preview search','actions':['search'],'indexes':['qa_molecules'],'expiresAt':None})
try:call('/keys',key=result['key'])
except urllib.error.HTTPError as e:assert e.code in (401,403)
else:raise AssertionError('search key can administer keys')
print(json.dumps({'health':True,'masterRequired':True,'restrictedKey':True}))'''


def docker(*args, data=None, check=True):
    result = subprocess.run(['docker', '--context', 'desktop-linux', *args],
                            input=data, text=True, capture_output=True, timeout=75)
    if check and result.returncode:
        raise RuntimeError('docker-' + args[0] + ': ' + result.stderr.strip()[:1200])
    return result


def value(*args):
    return docker(*args).stdout.strip()


def wait(server, command):
    deadline = time.monotonic() + 65
    while True:
        state = json.loads(value('inspect', '--format', '{{json .State}}', server))
        if not state['Running']:
            raise RuntimeError('server-ended-before-readiness')
        result = command()
        if result.returncode == 0:
            return result.stdout.strip()
        if time.monotonic() >= deadline:
            raise RuntimeError('server-readiness-timeout')
        time.sleep(.4)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for role in ('postgres', 'redis', 'meilisearch'):
        parser.add_argument('--' + role, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    if args.report.exists():
        raise ValueError('Report exists')
    images = {role: getattr(args, role) for role in ('postgres', 'redis', 'meilisearch')}
    for reference in (*images.values(), HELPER):
        value('image', 'inspect', reference)
    run = uuid.uuid4().hex
    network = 'preview-qa-' + run
    label = LABEL + '=' + run
    passwords = {role: secrets.token_hex(32) for role in images}
    result = {'schemaVersion': 1, 'runId': run, 'status': 'failed', 'checks': {},
              'cleanupErrors': [], 'syntheticOnly': True, 'isolationAccepted': False}
    common = ['--pull', 'never', '--read-only', '--cap-drop', 'ALL',
              '--security-opt', 'no-new-privileges:true', '--label', label,
              '--memory', '512m', '--cpus', '1', '--pids-limit', '128',
              '--tmpfs', '/tmp:rw,size=32m,mode=1777']
    try:
        value('network', 'create', '--internal', '--ipv6=false', '--label', label, network)
        for role, user, group in [('postgres', 70, 70), ('redis', 999, 1000), ('meilisearch', 10001, 10001)]:
            result['phase'] = role
            volume = network + '-' + role
            value('volume', 'create', '--driver', 'local', '--opt', 'type=tmpfs', '--opt', 'device=tmpfs',
                  '--opt', f'o=size=512m,mode=0700,uid={user},gid={group}', '--label', label, volume)
            keeper = value('run', '-d', '--name', volume + '-keeper', '--network', network,
                *common, '--user', f'{user}:{group}', '--mount', f'type=volume,src={volume},dst=/private',
                '--entrypoint', 'python', HELPER, '-B', '-c', 'import time;time.sleep(600)')
            password = passwords[role]
            documents = {'password': password}
            if role == 'redis':
                documents['server.conf'] = 'bind 0.0.0.0\nprotected-mode yes\ndir /data\nappendonly yes\nnotify-keyspace-events Exg\nrequirepass ' + json.dumps(password) + '\n'
            if role == 'meilisearch':
                documents['server.toml'] = 'env="production"\nhttp_addr="0.0.0.0:7700"\ndb_path="/meili_data/data.ms"\nno_analytics=true\nmax_indexing_memory="64Mb"\nmax_indexing_threads=1\nmaster_key=' + json.dumps(password) + '\n'
            docker('exec', '-i', keeper, 'python', '-B', '-c', INIT, data=json.dumps(documents))
            mounts = ['--mount', f'type=volume,src={volume},dst=/run/mercurion,readonly']
            server_args = []
            if role == 'postgres':
                mounts += ['--mount', f'type=volume,src={volume},dst=/var/lib/postgresql/data,volume-subpath=data',
                           '--tmpfs', '/var/run/postgresql:rw,size=16m,uid=70,gid=70,mode=3775']
                server_args = ['--env', 'POSTGRES_PASSWORD_FILE=/run/mercurion/password']
                command = []
            elif role == 'redis':
                mounts += ['--mount', f'type=volume,src={volume},dst=/data,volume-subpath=data']
                command = ['redis-server', '/run/mercurion/server.conf']
            else:
                mounts += ['--mount', f'type=volume,src={volume},dst=/meili_data,volume-subpath=data']
                command = ['--config-file-path', '/run/mercurion/server.toml']
            server = value('run', '-d', '--name', volume + '-server', '--network', network,
                '--network-alias', role, *common, *mounts, *server_args, images[role], *command)
            if role == 'postgres':
                # Upstream entrypoint uses a Unix-only temporary server during init.
                # Require TCP readiness so that server cannot satisfy this probe.
                wait(server, lambda: docker('exec', server, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', check=False))
                sql = "CREATE EXTENSION vector; SELECT '[1,2,3]'::vector <-> '[1,2,3]'::vector; CREATE TABLE qa_marker(id int); INSERT INTO qa_marker VALUES(1);"
                answer = docker('exec', '-i', server, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-At', data=sql).stdout
                if '0' not in answer.splitlines():
                    raise ValueError('vector-result-invalid')
                value('stop', '--time', '15', server)
                value('start', server)
                wait(server, lambda: docker('exec', server, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', check=False))
                if value('exec', server, 'psql', '-X', '-U', 'postgres', '-Atc', 'SELECT count(*) FROM qa_marker') != '1':
                    raise ValueError('database-restart-persistence-failed')
                result['checks'][role] = {'vector': True, 'restartPersistence': True}
            elif role == 'redis':
                probe = 'export REDISCLI_AUTH="$(cat /run/mercurion/password)"; exec redis-cli PING'
                wait(server, lambda: docker('exec', server, 'sh', '-c', probe, check=False))
                flags = value('exec', server, 'sh', '-c', 'export REDISCLI_AUTH="$(cat /run/mercurion/password)"; redis-cli --raw CONFIG GET notify-keyspace-events')
                if not all(flag in flags.splitlines()[-1] for flag in 'Exg'):
                    raise ValueError('redis-required-capability-missing')
                if 'NOAUTH' not in value('exec', server, 'redis-cli', 'PING'):
                    raise ValueError('redis-anonymous-access')
                result['checks'][role] = {'keyeventsExg': True, 'authRequired': True}
            else:
                answer = wait(server, lambda: docker('exec', '-i', keeper, 'python', '-B', '-', data=MEILI_PROBE, check=False))
                result['checks'][role] = json.loads(answer)
            for owner in (keeper, server):
                info = json.loads(value('inspect', owner))[0]
                if info['HostConfig']['PortBindings'] or not info['HostConfig']['ReadonlyRootfs']:
                    raise ValueError('runtime-isolation-contract')
            print(json.dumps({'role': role, 'status': 'passed'}), flush=True)
        result['status'] = 'passed'
    except Exception as error:
        result['errorType'] = type(error).__name__
        diagnostic = str(error)
        for secret in passwords.values():
            diagnostic = diagnostic.replace(secret, '<redacted>')
        result['errorDetail'] = diagnostic
    finally:
        for kind, listing, removal in [('containers', ['ps', '-aq'], ['rm', '--force']),
                ('network', ['network', 'ls', '-q'], ['network', 'rm']),
                ('volumes', ['volume', 'ls', '-q'], ['volume', 'rm'])]:
            try:
                for identifier in value(*listing, '--filter', 'label=' + label).split():
                    if docker(*removal, identifier, check=False).returncode:
                        result['cleanupErrors'].append(kind)
                if value(*listing, '--filter', 'label=' + label):
                    result['cleanupErrors'].append(kind + '-remaining')
            except Exception:
                result['cleanupErrors'].append(kind + '-unverifiable')
        if result['cleanupErrors']:
            result['status'] = 'failed'
        with args.report.open('x', encoding='utf-8') as stream:
            json.dump(result, stream, indent=2)
    print(json.dumps({'runId': run, 'status': result['status'], 'checks': result['checks'], 'cleanupErrors': result['cleanupErrors']}))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
