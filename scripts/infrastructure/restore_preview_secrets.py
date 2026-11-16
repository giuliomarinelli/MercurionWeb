"""Windows owner command: restore existing tmpfs secrets, never start or recreate services.

Plan is the default and reads only the PUBLIC profile. With --execute the private
configuration and Cloudflare token are read locally and sent only over SSH stdin.
Existing active documents are checked and skipped, never overwritten/rotated.
"""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import subprocess

SSH_OPTIONS = ['-o', 'StrictHostKeyChecking=yes', '-o', 'ClearAllForwardings=yes',
               '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15']


def profile(path):
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    required = {'schemaVersion', 'sshHost', 'serverRunId', 'applicationRunId',
                'serverRelease', 'applicationRelease', 'applicationCompose',
                'applicationProject', 'edgeContainer', 'edgeNetwork'}
    if set(value) != required or value['schemaVersion'] != 1:
        raise ValueError('public-profile-fields')
    for name in ('serverRunId', 'applicationRunId'):
        if not re.fullmatch('[a-f0-9]{32}', value[name]):
            raise ValueError('public-profile-run-id')
    for name in ('sshHost', 'applicationProject', 'edgeContainer', 'edgeNetwork'):
        if not re.fullmatch('[A-Za-z0-9_.@-]+', value[name]) or value[name].startswith('-'):
            raise ValueError('public-profile-name')
    for name in ('serverRelease', 'applicationRelease', 'applicationCompose'):
        path = PurePosixPath(value[name])
        if not path.is_absolute() or '..' in path.parts or not str(path).startswith('/opt/mercurion/releases/'):
            raise ValueError('public-profile-release-path')
    return value


def ssh(host, script, args=(), *, sudo=False, data=None, timeout=180):
    if sudo and data is not None:
        raise ValueError('sudo-and-secret-stdin-must-be-separate')
    command = shlex.join((['sudo', '--'] if sudo else []) + ['python3', '-B', '-c', script, *args])
    result = subprocess.run(['ssh', '-t' if sudo else '-T', *SSH_OPTIONS, host, command],
                            input=data, stdout=None if sudo else subprocess.PIPE, timeout=timeout)
    if result.returncode:
        raise RuntimeError('ssh-step-failed')
    return result.stdout


# Public guest operations. Import the existing installed receiver; do not rebuild
# server configuration formats, assign new identities, or initialize a database.
PREPARE = '''
import importlib,json,os,pathlib,sys,subprocess
kind,release,rid,edge,network=sys.argv[1:]
sys.path.insert(0,release+'/scripts/infrastructure')
m=importlib.import_module('preview_server_secrets' if kind=='servers' else 'preview_application_secrets')
root=m.BASE/rid
if os.path.lexists(root/'active'):
 m.inspect(rid); print(json.dumps(dict(component=kind,status='already-active')))
elif os.path.lexists(root):
 raise SystemExit('Incomplete secret directory: inspect before retry; no files removed')
else:
 if kind=='applications':
  import ipaddress
  item=json.loads(subprocess.check_output(['docker','inspect',edge]))[0]
  address=item['NetworkSettings']['Networks'][network]['IPAddress']
  ipaddress.IPv4Address(address)
 m.prepare(rid,os.environ['SUDO_USER']); print(json.dumps(dict(component=kind,status='prepared')))
 if kind=='applications':
  (root/'edge-address').write_text(address); (root/'edge-address').chmod(0o444)
'''
STATUS = '''
import importlib,json,sys
kind,release,rid=sys.argv[1:]
sys.path.insert(0,release+'/scripts/infrastructure')
m=importlib.import_module('preview_server_secrets' if kind=='servers' else 'preview_application_secrets')
if (m.BASE/rid/'active').exists():
 m.inspect(rid); status='already-active'
else: status='prepared'
value=dict(status=status)
if status=='prepared' and kind=='applications': value['edgeAddress']=(m.BASE/rid/'edge-address').read_text()
print(json.dumps(value))
'''
RECEIVE = '''
import importlib,sys
kind,release,rid=sys.argv[1:]
sys.path.insert(0,release+'/scripts/infrastructure')
m=importlib.import_module('preview_server_secrets' if kind=='servers' else 'preview_application_secrets')
m.receive(rid,sys.stdin.buffer)
'''
APPLY = '''
import importlib,json,sys
kind,release,rid=sys.argv[1:]
sys.path.insert(0,release+'/scripts/infrastructure')
m=importlib.import_module('preview_server_secrets' if kind=='servers' else 'preview_application_secrets')
m.apply(rid); m.inspect(rid)
print(json.dumps(dict(component=kind,status='restored',servicesStarted=False)))
'''
CF_PREPARE = '''
import os,pathlib,pwd,stat
base=pathlib.Path('/run/mercurion-cloudflared'); base.mkdir(mode=0o711,exist_ok=True)
info=base.lstat(); assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and stat.S_IMODE(info.st_mode)==0o711
token=base/'token'
if os.path.lexists(token):
 info=token.lstat(); assert stat.S_ISREG(info.st_mode) and info.st_uid==65532 and stat.S_IMODE(info.st_mode)==0o400 and info.st_size>0
 print('CLOUDFLARE_ALREADY_ACTIVE')
else:
 owner=pwd.getpwnam(os.environ['SUDO_USER']); inbox=base/'inbox'
 inbox.mkdir(mode=0o700); os.chown(inbox,owner.pw_uid,owner.pw_gid)
 print('CLOUDFLARE_PREPARED')
'''
CF_STATUS = '''
import pathlib
print('active' if pathlib.Path('/run/mercurion-cloudflared/token').exists() else 'prepared')
'''
CF_RECEIVE = '''
import os,pathlib,sys
raw=sys.stdin.buffer.read(16385)
assert 0<len(raw)<=16384 and all(chr(c).isalnum() and c<128 or c in b'=_-+/' for c in raw)
path=pathlib.Path('/run/mercurion-cloudflared/inbox/token')
fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'wb') as stream: stream.write(raw)
'''
CF_APPLY = '''
import os,pathlib,stat,pwd
base=pathlib.Path('/run/mercurion-cloudflared'); source=base/'inbox/token'
os.chown(base/'inbox',0,0); os.chmod(base/'inbox',0o500)
info=source.lstat(); owner=pwd.getpwnam(os.environ['SUDO_USER'])
assert stat.S_ISREG(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o600 and info.st_nlink==1
assert not os.path.lexists(base/'token')
os.chown(source,65532,65532); os.chmod(source,0o400); os.rename(source,base/'token')
(base/'inbox').rmdir(); print('CLOUDFLARE_RESTORED')
'''


def restore(settings, configuration, token_path):
    # Never called by --plan, tests use synthetic data and an injected SSH stub.
    import preview_application_bootstrap as applications
    from preview_server_bootstrap import payload as server_payload
    document = applications.load_configuration(configuration)
    token = token_path.read_bytes().strip()
    if not re.fullmatch(rb'[A-Za-z0-9=_+/-]{16,16384}', token):
        raise ValueError('cloudflare-token-file-invalid')
    servers = server_payload(document, settings['serverRunId'])
    for kind, prefix in (('servers', 'server'), ('applications', 'application')):
        args = [kind, settings[prefix+'Release'], settings[prefix+'RunId']]
        print('Phase: '+kind+'-prepare', flush=True)
        ssh(settings['sshHost'], PREPARE, [*args, settings['edgeContainer'], settings['edgeNetwork']], sudo=True)
        state = json.loads(ssh(settings['sshHost'], STATUS, args))
        if state['status'] == 'already-active':
            continue
        data = servers if kind == 'servers' else applications.payload(
            document, settings['applicationRunId'], state['edgeAddress'])
        ssh(settings['sshHost'], RECEIVE, args, data=data)
        ssh(settings['sshHost'], APPLY, args, sudo=True)
    ssh(settings['sshHost'], CF_PREPARE, sudo=True)
    if ssh(settings['sshHost'], CF_STATUS).strip() != b'active':
        ssh(settings['sshHost'], CF_RECEIVE, data=token)
        ssh(settings['sshHost'], CF_APPLY, sudo=True)
    return dict(status='secrets-ready', servicesStarted=False, existingSecretsReplaced=False, valuesPrinted=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=Path, required=True)
    parser.add_argument('--configuration', type=Path)
    parser.add_argument('--cloudflare-token-file', type=Path)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    try:
        settings = profile(args.profile)
        if not args.execute:
            print(json.dumps(dict(status='plan', sshHost=settings['sshHost'],
                components=['servers', 'applications', 'cloudflare'], privateFilesRead=False, servicesStarted=False)))
            return
        if os.name != 'nt' or not all((args.configuration, args.cloudflare_token_file)):
            raise ValueError('windows-and-explicit-private-paths-required')
        print(json.dumps(restore(settings, args.configuration, args.cloudflare_token_file)))
    except Exception:
        print(json.dumps(dict(status='failed', detail='Review the last phase. No retry, cleanup or secret values printed.')))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
