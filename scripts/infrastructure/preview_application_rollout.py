"""Explicit application-only delivery: prepare, plan, deploy, or rollback.

No database schema change, secret delivery, server upgrade, port publishing or
image deletion. Reuses coordinate-delivery.py security/identity validation.
"""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time
import uuid

from restore_preview_secrets import profile, SSH_OPTIONS

ROLES = {'web-node': 'web-node-preview', 'web-ng': 'web-ng-preview', 'tox21': 'tox21-preview'}
EVIDENCE = ('component.json', 'image.tar', 'sbom.cdx.json', 'vulnerabilities.json',
            'policy-result.json', 'load.log', 'runtime-audit.json')


def coordinator():
    location = Path(__file__).with_name('coordinate-delivery.py')
    if not location.exists():
        location = Path(__file__).parents[1] / 'coordinate-delivery.py'
    spec = importlib.util.spec_from_file_location('rollout_delivery', location)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, location


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write_new(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)


def prepare(settings_path, inputs, revision, output):
    settings = profile(settings_path)
    selected = {role: path.resolve() for role, path in inputs.items() if path}
    if not selected:
        raise ValueError('select-at-least-one-application')
    delivery, source = coordinator()
    # Validate originals before copying or transferring anything.
    for role, directory in selected.items():
        value = read(directory/'component.json')
        if value.get('target') != 'staging':
            raise ValueError('staging-artifacts-required')
        if not delivery.component(directory, role, revision, directory.parent)['security_eligible']:
            raise ValueError('strict-security-policy-rejected')
    if any(output.resolve() == path or path in output.resolve().parents for path in selected.values()):
        raise ValueError('output-must-not-be-inside-input')
    output.mkdir()  # Exclusive; never overwrite an older delivery.
    write_new(output/'profile.json', settings)
    for role, directory in selected.items():
        destination = output/role
        destination.mkdir()
        for name in EVIDENCE:
            shutil.copyfile(directory/name, destination/name)
    for origin, name in ((Path(__file__), 'preview_application_rollout.py'),
                         (Path(__file__).with_name('restore_preview_secrets.py'), 'restore_preview_secrets.py'),
                         (source, 'coordinate-delivery.py')):
        shutil.copyfile(origin, output/name)
    files = {str(path.relative_to(output)).replace('\\', '/'): delivery.checksum(path)
             for path in output.rglob('*') if path.is_file()}
    manifest = dict(schemaVersion=1, runId=uuid.uuid4().hex, webRevision=revision,
                    roles=sorted(selected), files=files)
    write_new(output/'rollout.json', manifest)
    return validate(output)


def validate(root):
    manifest = read(root/'rollout.json')
    if (manifest.get('schemaVersion') != 1 or not re.fullmatch('[a-f0-9]{32}', manifest.get('runId', ''))
            or not re.fullmatch('[a-f0-9]{40}', manifest.get('webRevision', ''))):
        raise ValueError('rollout-manifest-identity')
    roles = manifest.get('roles')
    if not isinstance(roles, list) or not roles or len(set(roles)) != len(roles) or set(roles)-ROLES.keys():
        raise ValueError('application-roles-only')
    expected = {'profile.json', 'preview_application_rollout.py', 'restore_preview_secrets.py', 'coordinate-delivery.py'}
    expected |= {role+'/'+name for role in roles for name in EVIDENCE}
    if set(manifest.get('files', {})) != expected:
        raise ValueError('rollout-file-allowlist')
    # Check checksums before importing any bundled helper.
    import hashlib
    for name, wanted in manifest['files'].items():
        path = root/name
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
            raise ValueError('symlink-forbidden')
        digest = hashlib.sha256()
        with path.open('rb') as stream:
            for block in iter(lambda: stream.read(1024*1024), b''):
                digest.update(block)
        if digest.hexdigest() != wanted:
            raise ValueError('rollout-checksum')
    delivery, _ = coordinator()
    for role in roles:
        record = delivery.component(root/role, role, manifest['webRevision'], root)
        if record['target'] != 'staging' or not record['security_eligible']:
            raise ValueError('strict-security-policy-rejected')
    profile(root/'profile.json')
    return manifest


def docker(*args, timeout=180):
    environment = {key: value for key, value in os.environ.items() if not key.startswith('DOCKER_')}
    result = subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args],
                            env=environment, text=True, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('docker-operation-failed')  # No inspect/env/log contents in public errors.
    return result.stdout.strip()


def compose(settings, override, *args):
    return docker('compose', '--env-file', '/dev/null', '-p', settings['applicationProject'],
                  '-f', settings['applicationCompose'], '-f', str(override), *args)


def current_images(settings, roles):
    result = {}
    for role in roles:
        ids = docker('ps', '-aq', '--filter', 'label=com.docker.compose.project='+settings['applicationProject'],
                     '--filter', 'label=com.docker.compose.service='+ROLES[role]).splitlines()
        if len(ids) != 1:
            raise ValueError('expected-one-existing-application-container')
        item = json.loads(docker('inspect', ids[0]))[0]
        if item['State']['Status'] != 'running':
            raise ValueError('existing-application-not-running')
        result[role] = item['Image']
    return result


def overlay(images):
    return {'services': {ROLES[role]: {'image': image, 'pull_policy': 'never'} for role, image in images.items()}}


def load_image(root, role):
    delivery, _ = coordinator()
    expected = read(root/role/'component.json')['config_digest']
    message = docker('load', '--input', str(root/role/'image.tar'))
    identifiers = re.findall(r'Loaded image ID: (sha256:[0-9a-f]{64})', message)
    if len(identifiers) != 1:
        raise ValueError('untagged-loaded-image-required')
    identifier = identifiers[0]
    # Docker classic and containerd may use different runnable IDs. A save/load
    # roundtrip checks the actual config bytes rather than equating those IDs.
    exported = root/(role+'-loaded.tar')
    docker('save', '--output', str(exported), identifier)
    digest, _ = delivery.archive_config(exported)
    if digest != expected:
        raise ValueError('loaded-image-config-mismatch')
    exported.unlink()
    return identifier


def readiness(settings, expected):
    # Stable running is only a process check. Real application health goes
    # through Nginx, using the already-authorized hostname.
    for _ in range(30):
        try:
            if current_images(settings, expected) == expected:
                edge = json.loads(docker('inspect', settings['edgeContainer']))[0]
                address = edge['NetworkSettings']['Networks'][settings['edgeNetwork']]['IPAddress']
                import urllib.request
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                for path in ('/health', '/'):
                    request = urllib.request.Request('http://'+address+path, headers={'Host': 'preview.mercurion.app'})
                    with opener.open(request, timeout=5) as response:
                        if response.status != 200:
                            raise RuntimeError('edge-probe-failed')
                return
        except (RuntimeError, ValueError, OSError):
            pass
        time.sleep(2)
    raise RuntimeError('application-readiness-failed')


def guest(root, rollback=False):
    if os.name != 'posix' or os.geteuid() != 0:
        raise ValueError('guest-root-required')
    manifest = validate(root)
    settings = profile(root/'profile.json')
    base = read(Path(settings['applicationCompose']))
    if base.get('name') != settings['applicationProject']:
        raise ValueError('compose-project-mismatch')
    if not set(ROLES[role] for role in manifest['roles']) <= base.get('services', {}).keys():
        raise ValueError('existing-compose-services-required')
    state_path = root/'rollout-state.json'
    if rollback:
        state = read(state_path)
        if state['status'] not in ('passed', 'failed'):
            raise ValueError('unfinished-rollout-review-required')
        print('Phase: rollback-applications', flush=True)
        compose(settings, root/'previous-images.json', 'up', '-d', '--no-deps', '--pull', 'never',
                *(ROLES[role] for role in manifest['roles']))
        readiness(settings, state['previousImages'])
        state['status'] = 'rolled-back'
    else:
        if state_path.exists():
            raise ValueError('rollout-already-attempted-use-status-or-rollback')
        print('Phase: inspect-existing-applications', flush=True)
        previous = current_images(settings, manifest['roles'])
        images = {}
        for role in manifest['roles']:
            print('Phase: load-verified-'+role, flush=True)
            images[role] = load_image(root, role)
        write_new(root/'previous-images.json', overlay(previous))
        write_new(root/'new-images.json', overlay(images))
        compose(settings, root/'new-images.json', 'config', '--quiet')
        state = dict(runId=manifest['runId'], status='running', phase='replace-applications',
                     previousImages=previous, newImages=images)
        write_new(state_path, state)
        try:
            print('Phase: replace-selected-applications', flush=True)
            compose(settings, root/'new-images.json', 'up', '-d', '--no-deps', '--pull', 'never',
                    *(ROLES[role] for role in manifest['roles']))
            state['phase'] = 'readiness'
            state_path.write_text(json.dumps(state, indent=2))
            print('Phase: edge-readiness', flush=True)
            readiness(settings, images)
            state['status'] = 'passed'
        except Exception:
            state['status'] = 'failed'
            # Explicit rollback command, no silent rollback/retry or DB changes.
            state_path.write_text(json.dumps(state, indent=2))
            raise
    state['phase'] = 'finished'
    state['finishedAtUtc'] = datetime.now(timezone.utc).isoformat()
    state_path.write_text(json.dumps(state, indent=2))
    print(json.dumps(dict(runId=manifest['runId'], status=state['status'],
                         reportPath=str(state_path), databaseModified=False)))


# The root loader first checks the host-pinned manifest and every listed byte,
# copies a public bundle into a root-owned release, then executes that copy.
INSTALL = '''
import hashlib,json,os,pathlib,re,shutil,sys
rid,digest=sys.argv[1:]; assert re.fullmatch('[a-f0-9]{32}',rid)
import pwd
source=pathlib.Path(pwd.getpwnam(os.environ['SUDO_USER']).pw_dir)/('preview-rollout-'+rid)
raw=(source/'rollout.json').read_bytes(); assert hashlib.sha256(raw).hexdigest()==digest
value=json.loads(raw); assert value['runId']==rid
target=pathlib.Path('/opt/mercurion/releases')/('rollout-'+rid)
target.mkdir(mode=0o755)
for name,wanted in value['files'].items():
 assert re.fullmatch(r'(web-node/|web-ng/|tox21/)?[A-Za-z0-9_.-]+',name)
 path=source/name; assert not path.is_symlink() and not path.parent.is_symlink()
 dest=target/name; dest.parent.mkdir(exist_ok=True)
 shutil.copyfile(path,dest); dest.chmod(0o644)
 assert hashlib.sha256(dest.read_bytes()).hexdigest()==wanted
(target/'rollout.json').write_bytes(raw)
import subprocess
raise SystemExit(subprocess.call(['python3','-B',str(target/'preview_application_rollout.py'),'guest','--bundle',str(target)]))
'''


def remote_execute(root, rollback=False):
    value = validate(root)
    settings = profile(root/'profile.json')
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    identifier = value['runId']
    if rollback:
        command = shlex.join(['sudo', 'python3', '-B', '/opt/mercurion/releases/rollout-'+identifier+
                              '/preview_application_rollout.py', 'guest', '--bundle',
                              '/opt/mercurion/releases/rollout-'+identifier, '--rollback'])
    else:
        if subprocess.run(['scp', *SSH_OPTIONS, '-r', str(root), settings['sshHost']+':preview-rollout-'+identifier], timeout=1800).returncode:
            raise RuntimeError('transfer-failed')
        import hashlib
        digest = hashlib.sha256((root/'rollout.json').read_bytes()).hexdigest()
        command = shlex.join(['sudo', 'python3', '-B', '-c', INSTALL, identifier, digest])
    if subprocess.run(['ssh', '-t', *SSH_OPTIONS, settings['sshHost'], command], timeout=900).returncode:
        raise RuntimeError('rollout-failed-report-retained')
    result = root/('rollback-result.json' if rollback else 'rollout-result.json')
    if result.exists():
        raise ValueError('local-report-exists-download-manually')
    if subprocess.run(['scp', *SSH_OPTIONS, settings['sshHost']+':/opt/mercurion/releases/rollout-'+identifier+
                       '/rollout-state.json', str(result)], timeout=120).returncode:
        raise RuntimeError('report-download-failed-do-not-redeploy')
    print(json.dumps(dict(status=read(result)['status'], reportPath=str(result))))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'plan', 'deploy', 'rollback', 'guest'])
    parser.add_argument('--profile', type=Path)
    parser.add_argument('--web-revision')
    for role in ROLES:
        parser.add_argument('--'+role, type=Path)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--rollback', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'prepare':
            value = prepare(args.profile, {role: getattr(args, role.replace('-', '_')) for role in ROLES},
                            args.web_revision, args.bundle)
            print(json.dumps(dict(status='prepared', runId=value['runId'], roles=value['roles'])))
        elif args.command == 'guest':
            guest(args.bundle, args.rollback)
        elif args.command in ('deploy', 'rollback') and args.execute:
            remote_execute(args.bundle, args.command == 'rollback')
        else:
            value = validate(args.bundle)
            print(json.dumps(dict(status='plan', runId=value['runId'], roles=value['roles'],
                                  databaseModified=False, servicesChanged=False)))
    except Exception as error:
        print(json.dumps(dict(status='failed', errorType=type(error).__name__,
                             detail='No automatic retry or cleanup. Preserve bundle and rollout-state.json.')))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
