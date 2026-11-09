"""Explicitly authorized fixture lifecycle: exact bundle, collision checks, owned cleanup."""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import uuid

from run_vm_topology import IMAGE, Runner, load_matrix

ROOT = Path(__file__).resolve().parents[2]
PROJECTS = ('shared', 'preview', 'production')
LABEL = 'mercurion.fixture.run'
FILES = (
    'deployment/local-vm/shared/compose.yaml', 'deployment/local-vm/preview/compose.yaml',
    'deployment/local-vm/production/compose.yaml', 'deployment/local-vm/validation.env.example',
    'deployment/local-vm/fixtures/topology_fixture.py', 'deployment/local-vm/connectivity.json',
    'scripts/infrastructure/run_vm_topology.py', 'scripts/infrastructure/run_vm_fixture_lifecycle.py',
)


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute_cli(prefix, args, timeout=30):
    environment = {key:value for key,value in os.environ.items()
                   if key not in ('DOCKER_HOST','DOCKER_CONTEXT') and not key.startswith('COMPOSE_')}
    environment['COMPOSE_DISABLE_ENV_FILE'] = 'true'
    return subprocess.run([*prefix,*args], check=True, capture_output=True, text=True,
                          timeout=timeout, env=environment).stdout.strip()


def local_docker(*args, timeout=30):
    return execute_cli(['docker','--host','unix:///var/run/docker.sock'], args, timeout)


def desktop_docker(*args, timeout=30):
    return execute_cli(['docker','--context','desktop-linux'], args, timeout)


def compose_args(root, project, override=False):
    base = root/'deployment/local-vm'
    args = ['compose','--env-file',str(base/'validation.env.example'),
            '--profile','topology-fixture','--profile','admin-fixture',
            '-f',str(base/project/'compose.yaml')]
    if override:
        args += ['-f',str(root/('run-'+project+'.json'))]
    return args


def canonical_model(model, root):
    result = copy.deepcopy(model)
    expected = (root/'deployment/local-vm/fixtures/topology_fixture.py').resolve()
    for service in result['services'].values():
        for volume in service.get('volumes',[]):
            if volume['type'] == 'bind':
                if Path(volume['source']).resolve() != expected:
                    raise ValueError('Unexpected fixture bind source')
                volume['source'] = '$TRACKED_FIXTURE'
    return result


def prepare(destination):
    if destination.resolve().is_relative_to(ROOT):
        raise ValueError('Prepare outside the repository')
    subprocess.run(['node',str(ROOT/'scripts/check-local-vm-compose.mjs'),'--self-test'],check=True)
    destination.mkdir(parents=True, exist_ok=False)
    for relative in FILES:
        target = destination/relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT/relative, target)
    expected = {project:canonical_model(json.loads(desktop_docker(
        *compose_args(destination,project),'config','--format','json')),destination) for project in PROJECTS}
    (destination/'expected-models.json').write_text(json.dumps(expected,indent=2),encoding='utf-8')
    files = {relative:digest(destination/relative) for relative in (*FILES,'expected-models.json')}
    if any(digest(ROOT/relative) != files[relative] for relative in FILES):
        raise ValueError('Source changed while preparing the bundle')
    manifest = dict(schemaVersion=1, runId=uuid.uuid4().hex,
                    scope='Synthetic topology fixtures only', files=files)
    (destination/'bundle-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    return manifest


class Lifecycle:
    def __init__(self, root, invoke=local_docker):
        self.root, self.invoke = root.resolve(), invoke
        self.manifest = json.loads((self.root/'bundle-manifest.json').read_text())
        self.run_id = self.manifest['runId']
        if not re.fullmatch('[a-f0-9]{32}',self.run_id):
            raise ValueError('Invalid lifecycle run identifier')
        self.expected = json.loads((self.root/'expected-models.json').read_text())
        self.cleanup_errors = []

    def preflight(self):
        files = self.manifest['files']
        if self.manifest['schemaVersion'] != 1 or set(files) != {*FILES,'expected-models.json'}:
            raise ValueError('Unexpected bundle file set')
        for relative, expected_hash in files.items():
            path = self.root/relative
            if path.is_symlink() or not path.resolve().is_relative_to(self.root) or digest(path) != expected_hash:
                raise ValueError('Bundle integrity mismatch: '+relative)
        load_matrix(self.root/'deployment/local-vm')
        if self.invoke('version','--format','{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
            raise ValueError('Expected local linux/amd64 daemon')
        try:
            image = json.loads(self.invoke('image','inspect',IMAGE))[0]
        except subprocess.CalledProcessError as error:
            raise ValueError('Local fixture image reference not inspectable; no pull attempted: '+IMAGE) from error
        if (image['Id'], image['Os'], image['Architecture']) != (IMAGE.split('@')[1], 'linux','amd64'):
            raise ValueError('Exact local fixture image required; no pull attempted')
        models = {project:canonical_model(json.loads(self.invoke(
            *compose_args(self.root,project),'config','--format','json')),self.root) for project in PROJECTS}
        if models != self.expected:
            different = [project for project in PROJECTS if models[project] != self.expected[project]]
            raise ValueError('Rendered Compose differs from validated host bundle: '+','.join(different))
        self.network_names = {network['name'] for model in models.values()
                              for network in model['networks'].values() if not network.get('external')}
        self.volume_names = {volume['name'] for model in models.values() for volume in model.get('volumes',{}).values()}
        services = sum(len(model['services']) for model in models.values())
        if len(self.network_names) != 13 or len(self.volume_names) != 7 or services != 16:
            raise ValueError('Unexpected fixture resource counts')
        container_names = {f'mercurion-{project}-{name}-1' for project,model in models.items() for name in model['services']}
        collisions = dict(networks=sorted(self.network_names & set(self.invoke('network','ls','--format','{{.Name}}').splitlines())),
                          volumes=sorted(self.volume_names & set(self.invoke('volume','ls','--format','{{.Name}}').splitlines())),
                          containers=sorted(container_names & set(self.invoke('ps','-a','--format','{{.Names}}').splitlines())))
        for project in PROJECTS:
            if self.invoke('ps','-a','--filter',f'label=com.docker.compose.project=mercurion-{project}','--format','{{.ID}}'):
                collisions['containers'].append('existing Compose project mercurion-'+project)
        if any(collisions.values()):
            raise ValueError('Existing fixture names/projects/resources; no mutation allowed: '+json.dumps(collisions))
        return dict(imageId=image['Id'],collisions=collisions,services=services,networks=13,volumes=7)

    def overrides(self):
        for project,model in self.expected.items():
            value = dict(services={name:dict(labels={LABEL:self.run_id}) for name in model['services']},
                         networks={name:dict(labels={LABEL:self.run_id}) for name,network in model['networks'].items()
                                   if not network.get('external')},
                         volumes={name:dict(labels={LABEL:self.run_id}) for name in model.get('volumes',{})})
            with (self.root/('run-'+project+'.json')).open('x',encoding='utf-8') as stream:
                json.dump(value,stream)

    def labelled(self, kind):
        query = ('ps','-a','--no-trunc') if kind == 'container' else (kind,'ls')
        if kind == 'network':
            query += ('--no-trunc',)
        field = '{{.Name}}' if kind == 'volume' else '{{.ID}}'
        return self.invoke(*query,'--filter',f'label={LABEL}={self.run_id}','--format',field).splitlines()

    def cleanup(self):
        removed = dict(container=[], network=[], volume=[])
        for kind in removed:
            try:
                identifiers = self.labelled(kind)
            except Exception as error:
                self.cleanup_errors.append(dict(kind=kind, phase='discovery',errorType=type(error).__name__))
                continue
            for identifier in identifiers:
                try:
                    if kind == 'volume':
                        if identifier not in self.volume_names:
                            raise ValueError('Unexpected volume name')
                    elif not re.fullmatch('[a-f0-9]{64}',identifier):
                        raise ValueError('Unexpected resource identifier')
                    label_field = '.Config.Labels' if kind == 'container' else '.Labels'
                    template = '{{index '+label_field+' "'+LABEL+'"}}'
                    command = ('inspect',) if kind == 'container' else (kind,'inspect')
                    if self.invoke(*command,'--format',template,identifier) != self.run_id:
                        raise ValueError('Resource ownership mismatch; preserved')
                    command = ('rm','--force') if kind == 'container' else (kind,'rm')
                    self.invoke(*command,identifier)
                    removed[kind].append(identifier)
                except Exception as error:
                    self.cleanup_errors.append(dict(kind=kind,id=identifier,errorType=type(error).__name__))
            try:
                if self.labelled(kind):
                    raise RuntimeError('Owned resources remain')
            except Exception as error:
                self.cleanup_errors.append(dict(kind=kind,phase='readback',errorType=type(error).__name__))
        return removed

    def run(self, checkpoint=lambda report:None):
        report = dict(schemaVersion=1, runId=self.run_id, startedAtUtc=now(),
                      scope='Synthetic fixture lifecycle and IPv4 TCP/DNS matrix only',
                      status='invalid',phase='preflight',mutationsAttempted=False,
                      cleanupErrors=self.cleanup_errors,isolationAccepted=False)
        try:
            report['preflight'] = self.preflight()
            self.overrides()
            with (self.root/'execution-started.json').open('x') as stream:
                json.dump(dict(runId=self.run_id),stream)
            checkpoint(report)
            for project in PROJECTS:
                report.update(phase='starting-'+project,mutationsAttempted=True)
                checkpoint(report)
                self.invoke(*compose_args(self.root,project,override=True),
                            'up','--detach','--pull','never','--no-build',timeout=90)
            report['phase'] = 'matrix'
            checkpoint(report)
            def matrix_checkpoint(value):
                report['matrix'] = value
                checkpoint(report)
            report['matrix'] = Runner(self.invoke,base=self.root/'deployment/local-vm').run(
                load_matrix(self.root/'deployment/local-vm'),checkpoint=matrix_checkpoint)
            report['status'] = report['matrix']['status']
        except (Exception,KeyboardInterrupt) as error:
            report['errorType'] = type(error).__name__
            report['errorDetail'] = str(error)[:600] if isinstance(error,ValueError) else 'Review the last phase and owned-resource report'
        finally:
            report['phaseBeforeCleanup'] = report['phase']
            if report['mutationsAttempted']:
                report['phase'] = 'cleanup'
                try:
                    checkpoint(report)
                except Exception as error:
                    self.cleanup_errors.append(dict(phase='checkpoint-before-cleanup',errorType=type(error).__name__))
                report['removed'] = self.cleanup()
            if self.cleanup_errors:
                report['status'] = 'invalid'
            report.update(phase='finished',finishedAtUtc=now())
            try:
                checkpoint(report)
            except Exception as error:
                self.cleanup_errors.append(dict(phase='final-checkpoint',errorType=type(error).__name__))
                report['status'] = 'invalid'
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=('prepare','execute'))
    parser.add_argument('--directory',type=Path)
    parser.add_argument('--report',type=Path)
    args = parser.parse_args()
    if args.command == 'prepare':
        if not args.directory:
            parser.error('New bundle directory required')
        manifest = prepare(args.directory)
        print(json.dumps(dict(runId=manifest['runId'],directory=str(args.directory))))
        return 0
    if (os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'mercurion-server' or
            'ID=ubuntu' not in Path('/etc/os-release').read_text()):
        parser.error('Execute via sudo on the identified Ubuntu guest only')
    if not args.report or args.report.resolve().is_relative_to(ROOT):
        parser.error('New report outside the bundle required')
    lifecycle = Lifecycle(ROOT)
    with args.report.open('x',encoding='utf-8') as output:
        os.chmod(args.report,0o600)
        os.chown(args.report,int(os.environ['SUDO_UID']),int(os.environ['SUDO_GID']))
        last_progress = None
        def checkpoint(report):
            nonlocal last_progress
            output.seek(0)
            json.dump(report,output,indent=2)
            output.truncate()
            output.flush()
            os.fsync(output.fileno())
            progress = (report['phase'],len(report.get('matrix',{}).get('cases',[])))
            if progress != last_progress:
                print(json.dumps(dict(phase=progress[0],casesCompleted=progress[1])),flush=True)
                last_progress = progress
        report = lifecycle.run(checkpoint)
    print(json.dumps(dict(runId=report['runId'],status=report['status'],
                          caseCount=len(report.get('matrix',{}).get('cases',[])),
                          cleanupErrors=len(report['cleanupErrors']),isolationAccepted=False)),flush=True)
    return 0 if report['status'] == 'passed' else 2


if __name__ == '__main__':
    raise SystemExit(main())
