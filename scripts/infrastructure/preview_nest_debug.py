"""Temporary Nest inspector, run on the VM as root. No database operations."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess

SERVICE = 'web-node-preview'
PROJECT = 'mercurion-preview'


def docker(*args):
    return subprocess.check_output(['docker', *args], stderr=subprocess.DEVNULL)


def current():
    ids = docker('ps', '-q', '--filter', 'label=com.docker.compose.project='+PROJECT,
                 '--filter', 'label=com.docker.compose.service='+SERVICE).decode().split()
    if len(ids) != 1:
        raise ValueError('expected-one-running-preview-backend')
    return json.loads(docker('inspect', ids[0]))[0]


def override(image, command, debugging):
    value = dict(image=image, pull_policy='never', command=command)
    if debugging:
        value['ports'] = ['127.0.0.1:19229:9229']
    return dict(services={SERVICE: value})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('enable', 'disable', 'status'))
    parser.add_argument('--directory', type=Path, required=True,
                        help='New directory for enable; same directory for disable/status')
    args = parser.parse_args()
    try:
        if os.geteuid() != 0:
            raise ValueError('run-with-sudo')
        obj = current()
        if args.mode == 'status':
            print(json.dumps(dict(command=obj['Config']['Cmd'],
                                  bindings=obj['HostConfig']['PortBindings'])))
            return 0
        root = args.directory.absolute()
        if args.mode == 'enable':
            command = obj['Config']['Cmd']
            if command != ['node', 'dist/src/bootstrap-secrets.cli.js']:
                raise ValueError('unexpected-entrypoint-command-review-required')
            if obj['HostConfig']['PortBindings']:
                raise ValueError('unexpected-existing-port-bindings')
            files = obj['Config']['Labels']['com.docker.compose.project.config_files'].split(',')
            if any(not Path(path).is_file() for path in files):
                raise ValueError('compose-file-missing')
            with socket.socket() as listener:
                listener.bind(('127.0.0.1', 19229))
            root.mkdir(mode=0o700)  # Exclusive, preserves earlier attempts.
            state = dict(image=obj['Image'], command=command, files=files)
            (root/'original.json').write_text(json.dumps(state))
            model = override(state['image'], ['node', '--inspect=0.0.0.0:9229', *command[1:]], True)
        else:
            info = root.lstat()
            if root.is_symlink() or info.st_uid != 0 or info.st_mode & 0o077:
                raise ValueError('debug-directory-owner-or-permissions')
            state = json.loads((root/'original.json').read_text())
            # Refuse to replace an application that was delivered while debugging.
            if obj['Image'] != state['image']:
                raise ValueError('image-changed-since-debug-enable')
            model = override(state['image'], state['command'], False)
        output = root/(args.mode+'.json')
        with output.open('x') as stream:
            json.dump(model, stream, indent=2)
        compose = ['compose', '-p', PROJECT, '--env-file', '/dev/null']
        for path in state['files']:
            compose += ['-f', path]
        compose += ['-f', str(output)]
        docker(*compose, 'config', '--quiet')
        docker(*compose, 'up', '-d', '--no-deps', '--pull', 'never', '--wait',
               '--wait-timeout', '120', SERVICE)
        after = current()
        if after['Image'] != state['image'] or after['Config']['Cmd'] != model['services'][SERVICE]['command']:
            raise ValueError('debug-readback-mismatch')
        bindings = after['HostConfig']['PortBindings'] or {}
        if args.mode == 'enable':
            if bindings != {'9229/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '19229'}]}:
                raise ValueError('debug-loopback-binding-mismatch')
        elif bindings:
            raise ValueError('debug-port-still-published')
        print(json.dumps(dict(status=args.mode+'d', imageUnchanged=True,
                              directory=str(root), databaseChanged=False)))
    except Exception as error:
        print(json.dumps(dict(status='failed', reason=str(error) if isinstance(error, ValueError)
                              else type(error).__name__, detail='Preserve the directory; inspect container state before retry.')))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
