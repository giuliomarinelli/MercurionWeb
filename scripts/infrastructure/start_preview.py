"""Owner-operated cold start: existing containers only, no compose reconciliation."""
import argparse
import json
import os
from pathlib import Path
import re

from restore_preview_secrets import profile, restore, ssh


def startup_profile(path):
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    if set(value) != {'schemaVersion', 'servers', 'cloudflaredContainer'} or value['schemaVersion'] != 1:
        raise ValueError('startup-profile-fields')
    if set(value['servers']) != {'postgres-preview', 'redis-preview', 'nats-preview', 'meilisearch'}:
        raise ValueError('startup-server-allowlist')
    for name in [*value['servers'].values(), value['cloudflaredContainer']]:
        if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]+', name):
            raise ValueError('startup-name')
    return value


GUEST = r'''
import json,subprocess,sys,time,urllib.request
action,raw=sys.argv[1:]; spec=json.loads(raw)
def docker(*args):
 return subprocess.check_output(['docker',*args],stderr=subprocess.DEVNULL)
def item(name): return json.loads(docker('inspect',name))[0]
def select(project,service):
 ids=docker('ps','-aq','--filter','label=com.docker.compose.project='+project,
            '--filter','label=com.docker.compose.service='+service).decode().split()
 if len(ids)!=1: raise ValueError('expected-one-existing-container:'+service)
 return ids[0]
ids={service:select(project,service) for service,project in spec['servers'].items()}
ids.update({service:select(spec['applications'],service) for service in
            ('tox21-preview','web-node-preview','web-ng-preview')})
ids.update(edge=spec['edge'],cloudflared=spec['cloudflared'])
for name,cid in ids.items():
 obj=item(cid)
 if obj['State']['Status'] not in ('running','exited','created'):
  raise ValueError('unexpected-container-state:'+name)
if action=='preflight':
 print(json.dumps(dict(status='existing-containers-confirmed',count=len(ids))));sys.exit()
groups={'edge':['edge'],'servers':list(spec['servers']),
        'applications':['tox21-preview','web-node-preview','web-ng-preview'],'cloudflared':['cloudflared']}
for name in groups[action]:
 if not item(ids[name])['State']['Running']: docker('start',ids[name])
 deadline=time.monotonic()+120
 while True:
  state=item(ids[name])['State']; health=state.get('Health',{}).get('Status')
  if state['Running'] and health in (None,'healthy'):break
  if state['Status'] in ('dead','exited') or time.monotonic()>deadline:
   raise ValueError('container-not-ready:'+name)
  time.sleep(2)
if action=='applications':
 address=item(ids['edge'])['NetworkSettings']['Networks'][spec['edgeNetwork']]['IPAddress']
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 for path in ('/health','/'):
  deadline=time.monotonic()+120
  while True:
   try:
    request=urllib.request.Request('http://'+address+path,headers={'Host':'preview.mercurion.app'})
    with opener.open(request,timeout=5) as response: assert response.status==200
    break
   except Exception:
    if time.monotonic()>deadline:raise ValueError('edge-readiness-failed') from None
    time.sleep(2)
print(json.dumps(dict(status='ready',phase=action,containersRecreated=False)))
'''


def start(settings, startup, configuration, token):
    # Validate owner input before starting even the edge. No values are printed.
    from preview_application_bootstrap import load_configuration
    load_configuration(configuration)
    if not re.fullmatch(rb'[A-Za-z0-9=_+/-]{16,16384}', token.read_bytes().strip()):
        raise ValueError('cloudflare-token-file-invalid')
    spec = dict(servers=startup['servers'], applications=settings['applicationProject'],
                edge=settings['edgeContainer'], edgeNetwork=settings['edgeNetwork'],
                cloudflared=startup['cloudflaredContainer'])
    for phase in ('preflight', 'edge', 'secrets', 'servers', 'applications', 'cloudflared'):
        print('Phase: '+phase, flush=True)
        if phase == 'secrets':
            restore(settings, configuration, token)
        else:
            ssh(settings['sshHost'], GUEST, [phase, json.dumps(spec)], sudo=True, timeout=600)
    return dict(status='started', existingContainersOnly=True, volumesReplaced=False,
                resourceLimitsChanged=False, valuesPrinted=False,
                cloudflareConnectionVerified=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=Path, required=True)
    parser.add_argument('--startup-profile', type=Path, required=True)
    parser.add_argument('--configuration', type=Path)
    parser.add_argument('--cloudflare-token-file', type=Path)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    try:
        settings, startup = profile(args.profile), startup_profile(args.startup_profile)
        if not args.execute:
            print(json.dumps(dict(status='plan', existingContainersOnly=True,
                                  privateFilesRead=False, servicesStarted=False)))
        else:
            if os.name != 'nt' or not args.configuration or not args.cloudflare_token_file:
                raise ValueError('windows-and-explicit-private-paths-required')
            print(json.dumps(start(settings, startup, args.configuration, args.cloudflare_token_file)))
    except Exception:
        print(json.dumps(dict(status='failed', detail='Inspect the last phase; previously started services remain running. No automatic retry or cleanup.')))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
