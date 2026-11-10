"""VM-039: local staging worker, real RPC/bootstrap lifecycle, synthetic tmpfs secrets."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import uuid

# VM-041 patched broker; requires the pinned local build or an explicit scanned ID.
NATS_IMAGE = 'sha256:ca1d4783151aab46ae6b4e0d62d9bab3614fffc8b2dc1e557bac27b4490163df'
LABEL = 'mercurion.vm039-run'
DOCKER_PREFIX = ['docker', '--context', 'desktop-linux']
INIT = '''
import json,os,pathlib,sys
root=pathlib.Path('/private')
for name,value in json.load(sys.stdin).items():
    path=root/name
    path.parent.mkdir(mode=0o700,exist_ok=True)
    with path.open('x') as stream: json.dump(value,stream)
    path.chmod(0o400)
print(json.dumps({'ready':True}))
'''
FILE_STATE = '''
import hashlib,json,pathlib
p=pathlib.Path('/private/worker/values.json');s=p.stat()
print(json.dumps({'digest':hashlib.sha256(p.read_bytes()).hexdigest(),
 'uid':s.st_uid,'gid':s.st_gid,'mode':s.st_mode&0o777,'inode':s.st_ino}))
'''
PROBE = '''
import asyncio,json,sys
from config import get_config
from secret_bootstrap import load_secret_file_environment
from nats.aio.client import Client
from nats.errors import AuthorizationError,Error

async def quiet(_error): pass

async def probe():
    load_secret_file_environment()
    config=get_config(); auth=config.nats_connect_credentials()
    assert config.py_env=='staging'
    client=Client()
    await client.connect(config.nats_url,**auth,allow_reconnect=False,connect_timeout=2,error_cb=quiet)
    try:
        async def request(subject,payload):
            reply=await client.request('staging.'+subject,json.dumps(payload).encode(),timeout=3)
            return json.loads(reply.data)
        result=await request('inference.tox21.smiles',{'data':{'smiles':'CCO'}})
        assert set(result)=={'SR-ATAD5','NR-AhR','SR-MMP','SR-p53'}
        for value in result.values():
            assert set(value)=={'probability','threshold','is_positive'}
            assert 0<=value['probability']<=1 and 0<=value['threshold']<=1
            assert value['is_positive'] is (value['probability']>value['threshold'])
        result=await request('rdkit_api.get_molecule_properties',{'smiles':'CCO'})
        assert abs(result['data']['mwFreebase']-46.069)<.01
        assert await request('rdkit_api.to_canonical_smiles',{'smiles':'OCC'})=={'data':'CCO'}
        assert await request('rdkit_api.are_same_structure',{'a':'CCO','b':'OCC'})=={'data':True}
        result=await request('pcp_api.get_iupac_name_from_smiles',{})
        assert result['error'].startswith('Invalid request:')
        assert await request('rdkit_api.to_canonical_smiles',{'smiles':'not-a-smiles'})=={'error':'Invalid SMILES'}
    finally:
        await client.close()
    denied=[]
    for case,credentials in [('missing',{}),('wrong-password',{**auth,'password':'synthetic-invalid'}),
                             ('unknown-user',{**auth,'user':'synthetic-unregistered'})]:
        client=Client()
        try:
            await asyncio.wait_for(client.connect(config.nats_url,**credentials,allow_reconnect=False,
                                                  connect_timeout=1,error_cb=quiet),timeout=4)
        except Error as error:
            assert isinstance(error,AuthorizationError) or str(error)=="nats: 'Authorization Violation'"
            denied.append(case)
        else:
            raise AssertionError('unauthorized-requester-admitted')
        finally:
            await client.close()
    print(json.dumps({'subjects':5,'inference':'real','rdkit':'real','pubchem':'validation-only',
                      'invalidSmiles':'passed','explicitBrokerDenials':denied}))

try:
    asyncio.run(probe())
except Exception as error:
    print(json.dumps({'errorType':type(error).__name__}),file=sys.stderr)
    sys.exit(1)
'''


def docker(*args, data=None, timeout=40, check=True):
    environment = {key: value for key, value in os.environ.items() if not key.startswith('DOCKER_')}
    result = subprocess.run([*DOCKER_PREFIX, *args], input=data,
                            capture_output=True, text=True, timeout=timeout, env=environment)
    if check and result.returncode:
        raise RuntimeError('docker-operation-failed')
    return result


def value(*args):
    return docker(*args).stdout.strip()


def inspect(container):
    return json.loads(value('inspect', container))[0]


def validate_probe(result):
    expected = {'subjects': 5, 'inference': 'real', 'rdkit': 'real',
                'pubchem': 'validation-only', 'invalidSmiles': 'passed',
                'explicitBrokerDenials': ['missing', 'wrong-password', 'unknown-user']}
    if result != expected:
        raise ValueError('incomplete-probe-evidence')
    return result


def check_worker(container, image_id):
    state = inspect(container)
    assert state['Image'] == image_id
    assert state['Config']['User'] == '10021:10021'
    assert state['Config']['Cmd'] == ['python', '-m', 'bootstrap_secrets']
    assert state['HostConfig']['ReadonlyRootfs']
    assert not state['HostConfig']['PortBindings']
    names = {entry.split('=', 1)[0] for entry in state['Config']['Env']}
    assert not names.intersection({'NATS_USERNAME', 'NATS_PASSWORD', 'GLOBAL_SKIP_AUTH_FLAG'})
    assert not any(name.startswith('AUTH_') for name in names)
    mounts = state['Mounts']
    assert not any(mount['Destination'].startswith('/app') for mount in mounts)
    credential = [mount for mount in mounts if mount['Destination'] == '/run/mercurion']
    assert len(credential) == 1 and not credential[0]['RW']
    return state['State']['StartedAt']


def wait_probe(worker, requester):
    deadline = time.monotonic() + 45
    while True:
        if not inspect(worker)['State']['Running']:
            raise RuntimeError('worker-ended-before-readiness')
        result = docker('exec', '-i', requester, 'python', '-B', '-', data=PROBE, check=False, timeout=25)
        if result.returncode == 0:
            return validate_probe(json.loads(result.stdout))
        # Retry only subscription readiness. Assertion/authentication errors fail immediately.
        try:
            error = json.loads(result.stderr.strip().splitlines()[-1])['errorType']
        except (ValueError, KeyError, IndexError):
            raise RuntimeError('invalid-probe-result') from None
        if error not in ('NoRespondersError', 'TimeoutError') or time.monotonic() >= deadline:
            raise RuntimeError('worker-probe-failed-' + error)
        time.sleep(.25)


def main():
    global DOCKER_PREFIX, NATS_IMAGE, LABEL
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--report', required=True, type=Path)
    parser.add_argument('--local-unix', action='store_true', help='Guest pilot on the local Unix socket only')
    parser.add_argument('--broker-image', help='Already loaded and separately scanned broker image ID')
    args = parser.parse_args()
    if args.report.exists():
        raise ValueError('report-exists')
    DOCKER_PREFIX = (['docker', '--host', 'unix:///var/run/docker.sock'] if args.local_unix
                     else ['docker', '--context', 'desktop-linux'])
    if not args.local_unix:
        endpoint = json.loads(value('context', 'inspect', 'desktop-linux'))[0]['Endpoints']['docker']['Host']
        if not endpoint.startswith(('unix://', 'npipe://')):
            raise ValueError('local-docker-required')
    if args.broker_image:
        import re
        if not re.fullmatch('sha256:[0-9a-f]{64}', args.broker_image):
            raise ValueError('immutable-broker-image-required')
        NATS_IMAGE = args.broker_image
    LABEL = 'mercurion.vm041-run' if args.local_unix else 'mercurion.vm039-run'
    image = json.loads(value('image', 'inspect', args.image))[0]
    labels = image['Config']['Labels']
    assert image['Os'] == 'linux' and image['Architecture'] == 'amd64'
    assert labels['org.opencontainers.image.revision'] == args.revision
    assert labels['org.opencontainers.image.version'] == args.version
    assert labels['org.mercurion.environment'] == 'staging'
    value('image', 'inspect', NATS_IMAGE)
    image_id = image['Id']
    run_id = uuid.uuid4().hex
    prefix = ('vm041-' if args.local_unix else 'vm039-') + run_id
    volume, network = prefix + '-secrets', prefix + '-network'
    checks = []
    result = dict(schemaVersion=1, runId=run_id, status='failed', imageId=image_id,
                  revision=args.revision, version=args.version, environment='preview',
                  syntheticOnly=True, vmDeployment=False, isolationAccepted=False,
                  executionHost='guest' if args.local_unix else 'desktop',
                  realServicesStarted=False,
                  checks=checks, cleanupErrors=[])
    phase = 'prepare'
    passwords = [secrets.token_hex(24), secrets.token_hex(24)]
    try:
        value('volume', 'create', '--driver', 'local', '--opt', 'type=tmpfs', '--opt', 'device=tmpfs',
              '--opt', 'o=size=8m,mode=0700,uid=10021,gid=10021', '--label', LABEL + '=' + run_id, volume)
        value('network', 'create', '--internal', '--label', LABEL + '=' + run_id, network)
        common = ['--pull', 'never', '--label', LABEL + '=' + run_id, '--read-only', '--cap-drop', 'ALL',
                  '--security-opt', 'no-new-privileges:true', '--user', '10021:10021', '--pids-limit', '128',
                  '--memory', '1g', '--cpus', '1', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777']
        keeper = value('run', '-d', '--name', prefix + '-keeper', '--network', 'none', *common,
                       '--mount', f'type=volume,src={volume},dst=/private', '--entrypoint', 'python',
                       image_id, '-B', '-c', 'import time; time.sleep(600)')
        users = ['synthetic-worker-' + run_id, 'synthetic-requester-' + run_id]
        payload = {'broker/server.json': {'port': 4222, 'authorization': {'users': [
            {'user': user, 'password': password} for user, password in zip(users, passwords)]}}}
        for role, user, password in zip(('worker', 'requester'), users, passwords):
            payload[role + '/values.json'] = {'schemaVersion': 1, 'environment': 'staging',
                'variables': {'NATS_USERNAME': user, 'NATS_PASSWORD': password}}
        assert json.loads(docker('exec', '-i', keeper, 'python', '-B', '-c', INIT,
                                 data=json.dumps(payload)).stdout) == {'ready': True}
        initial_file = json.loads(value('exec', keeper, 'python', '-B', '-c', FILE_STATE))
        assert (initial_file['uid'], initial_file['gid'], initial_file['mode']) == (10021, 10021, 0o400)
        value('run', '-d', '--name', prefix + '-broker', '--network', network, '--network-alias', 'nats',
              *common, '--mount', f'type=volume,src={volume},dst=/run/nats,volume-subpath=broker,readonly',
              NATS_IMAGE, '--config', '/run/nats/server.json')
        result['realServicesStarted'] = True
        env = ['--env', 'NATS_URL=nats://nats:4222', '--env', 'MERCURION_BOOTSTRAP_FILE=/run/mercurion/values.json']
        requester = value('run', '-d', '--name', prefix + '-requester', '--network', network, *common, *env,
            '--mount', f'type=volume,src={volume},dst=/run/mercurion,volume-subpath=requester,readonly',
            '--entrypoint', 'python', image_id, '-B', '-c', 'import time; time.sleep(600)')

        def create_worker(name):
            return value('run', '-d', '--name', name, '--network', network, *common, *env,
                '--mount', f'type=volume,src={volume},dst=/run/mercurion,volume-subpath=worker,readonly',
                image_id, 'python', '-m', 'bootstrap_secrets')

        worker = create_worker(prefix + '-worker')
        phase = 'initial'
        checks.append({'case': phase, 'containerId': worker, 'probe': wait_probe(worker, requester)})
        started = check_worker(worker, image_id)
        phase = 'restart'
        value('stop', '--time', '15', worker)
        assert inspect(worker)['State']['ExitCode'] == 0
        value('start', worker)
        checks.append({'case': phase, 'containerId': worker, 'probe': wait_probe(worker, requester)})
        assert check_worker(worker, image_id) != started
        value('stop', '--time', '15', worker)
        assert inspect(worker)['State']['ExitCode'] == 0
        value('rm', worker)
        phase = 'recreate'
        previous = worker
        worker = create_worker(prefix + '-recreated')
        assert worker != previous
        checks.append({'case': phase, 'containerId': worker, 'probe': wait_probe(worker, requester)})
        check_worker(worker, image_id)
        assert json.loads(value('exec', keeper, 'python', '-B', '-c', FILE_STATE)) == initial_file
        value('stop', '--time', '15', worker)
        assert inspect(worker)['State']['ExitCode'] == 0
        for container in value('ps', '-aq', '--filter', f'label={LABEL}={run_id}').split():
            captured = docker('logs', container)
            logs = captured.stdout + captured.stderr
            assert not any(password in logs for password in passwords), 'credential-log-leak'
        result.update(status='passed', activeFileUnchanged=True, gracefulStops=3,
                      secretStorage='tmpfs', hostPorts='none', sourceOverlay=False)
    except Exception as error:
        result.update(phase=phase, errorType=type(error).__name__)
    finally:
        for kind, listing, removal in (
            ('container', ['ps', '-aq'], ['rm', '--force']),
            ('network', ['network', 'ls', '-q'], ['network', 'rm']),
            ('volume', ['volume', 'ls', '-q'], ['volume', 'rm']),
        ):
            select = [*listing, '--filter', f'label={LABEL}={run_id}']
            try:
                for identifier in value(*select).split():
                    if docker(*removal, identifier, check=False).returncode:
                        result['cleanupErrors'].append(kind + '-remove')
                if value(*select):
                    result['cleanupErrors'].append(kind + '-remaining')
            except Exception:
                result['cleanupErrors'].append(kind + '-cleanup-unverifiable')
        if result['cleanupErrors']:
            result['status'] = 'failed'
        args.report.parent.mkdir(parents=True, exist_ok=True)
        with args.report.open('x', encoding='utf-8') as stream:
            json.dump(result, stream, indent=2)
    print(json.dumps({'status': result['status'], 'runId': run_id, 'checks': len(checks),
                      'cleanupErrors': result['cleanupErrors'], 'reportPath': str(args.report)}))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
