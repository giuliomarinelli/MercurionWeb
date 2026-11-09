"""Windows host orchestration pilot: synthetic Tox21 credentials only, opt-in SSH."""
import argparse
from dataclasses import dataclass, field
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import uuid

ALIAS = 'mercurion-server'
CODE_LIMIT = 128 * 1024
COMMON = ['-o', 'StrictHostKeyChecking=yes', '-o', 'ClearAllForwardings=yes',
          '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2']

# These scripts contain only transport logic and metadata. Payloads travel on stdin.
STAGE = r'''
import hashlib,json,os,pathlib,re,stat,sys
rid,digest=sys.argv[1:]
assert re.fullmatch('[0-9a-f]{32}',rid) and re.fullmatch('[0-9a-f]{64}',digest)
assert os.geteuid()!=0
data=sys.stdin.buffer.read(131073)
assert 0<len(data)<=131072 and hashlib.sha256(data).hexdigest()==digest
base=pathlib.Path.home()/'.mercurion-infra'
try: base.mkdir(mode=0o700)
except FileExistsError: pass
info=base.lstat()
assert stat.S_ISDIR(info.st_mode) and info.st_uid==os.geteuid() and stat.S_IMODE(info.st_mode)==0o700
run=base/('delivery-'+rid)
run.mkdir(mode=0o700)
fd=os.open(run/'secret_delivery.py',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'wb') as stream: stream.write(data)
print(json.dumps(dict(schemaVersion=1,runId=rid,phase='staged')))
'''

LOAD = r'''
import hashlib,os,pathlib,pwd,re,stat,sys
rid,digest,phase,environment=sys.argv[1:]
assert re.fullmatch('[0-9a-f]{32}',rid) and re.fullmatch('[0-9a-f]{64}',digest)
assert phase in ('prepare','receive','apply','inspect') and environment in ('preview','production')
privileged=phase in ('prepare','apply')
assert (os.geteuid()==0)==privileged
owner=pwd.getpwnam(os.environ['SUDO_USER']) if privileged else pwd.getpwuid(os.geteuid())
assert owner.pw_uid>0
base=pathlib.Path(owner.pw_dir)/'.mercurion-infra'
run=base/('delivery-'+rid)
for path in (base,run):
    info=path.lstat()
    assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
fd=os.open(run/'secret_delivery.py',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as stream:
    info=os.fstat(stream.fileno())
    assert stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o600
    data=stream.read(131073)
assert 0<len(data)<=131072 and hashlib.sha256(data).hexdigest()==digest
sys.argv=['secret_delivery.py',phase,'--run-id',rid]
if phase=='prepare': sys.argv+=['--environment',environment,'--owner',owner.pw_name]
# Execute the exact bytes just hashed, never reopen a mutable script after verification.
exec(compile(data,'<verified-secret-delivery>','exec'),{'__name__':'__main__'})
'''

CLEANUP = r'''
import json,os,pathlib,re,stat,sys
rid=sys.argv[1]
assert re.fullmatch('[0-9a-f]{32}',rid) and os.geteuid()!=0
base=pathlib.Path.home()/'.mercurion-infra'
run=base/('delivery-'+rid)
for path in (base,run):
    info=path.lstat()
    assert stat.S_ISDIR(info.st_mode) and info.st_uid==os.geteuid() and stat.S_IMODE(info.st_mode)==0o700
(run/'secret_delivery.py').unlink()
run.rmdir()
print(json.dumps(dict(schemaVersion=1,runId=rid,phase='code-removed')))
'''


@dataclass
class Step:
    phase: str
    command: str
    interactive: bool = False
    data: bytes | None = field(default=None, repr=False)


@dataclass
class Plan:
    run_id: str
    environment: str
    helper_sha256: str
    steps: list[Step] = field(repr=False)


def remote(script, *arguments, sudo=False):
    parts = (['sudo', '--'] if sudo else []) + ['python3', '-I', '-c', script, *arguments]
    return shlex.join(parts)


def build_plan(environment='preview', helper=None):
    if environment not in ('preview', 'production'):
        raise ValueError('environment')
    source = helper if helper is not None else Path(__file__).with_name('secret_delivery.py').read_bytes()
    if not 0 < len(source) <= CODE_LIMIT:
        raise ValueError('helper-size')
    identifier = uuid.uuid4().hex
    digest = hashlib.sha256(source).hexdigest()
    payload = json.dumps(dict(schemaVersion=1, runId=identifier, environment=environment,
        consumer='tox21', variables=dict(NATS_USERNAME='synthetic-tox21-' + identifier,
        NATS_PASSWORD='synthetic-only-' + uuid.uuid4().hex)), separators=(',', ':')).encode('utf-8')
    steps = [Step('staged', remote(STAGE, identifier, digest), data=source)]
    for phase in ('prepare', 'receive', 'apply', 'inspect'):
        interactive = phase in ('prepare', 'apply')
        steps.append(Step({'prepare': 'prepared', 'receive': 'received', 'apply': 'applied',
                           'inspect': 'active'}[phase],
                          remote(LOAD, identifier, digest, phase, environment, sudo=interactive),
                          interactive=interactive, data=payload if phase == 'receive' else None))
    steps.append(Step('code-removed', remote(CLEANUP, identifier)))
    return Plan(identifier, environment, digest, steps)


def ssh_arguments(step):
    if step.interactive and step.data is not None:
        raise ValueError('interactive-input')
    return ['ssh.exe', '-t' if step.interactive else '-T', *COMMON, ALIAS, step.command]


def transport(step):
    arguments = ssh_arguments(step)
    # stderr stays on the operator console: SSH key passphrases are never captured.
    # Interactive sudo also inherits stdin/stdout; it never shares payload stdin.
    result = subprocess.run(arguments, input=step.data, stdout=None if step.interactive else subprocess.PIPE,
                            stdin=subprocess.DEVNULL if not step.interactive and step.data is None else None,
                            stderr=None, timeout=300, check=False)
    return result.returncode, result.stdout


def execute(plan, invoke=transport, progress=None):
    completed = []
    for step in plan.steps:
        if progress is not None:
            progress(step.phase)
        code, output = invoke(step)
        if code != 0:
            raise ValueError('phase-failed:' + step.phase)
        if not step.interactive:
            if output is None or len(output) > 4096:
                raise ValueError('receipt:' + step.phase)
            try:
                doc = json.loads(output)
            except (ValueError, UnicodeError):
                raise ValueError('receipt:' + step.phase) from None
            if (not isinstance(doc, dict) or type(doc.get('schemaVersion')) is not int
                    or doc['schemaVersion'] != 1 or doc.get('runId') != plan.run_id
                    or doc.get('phase') != step.phase):
                raise ValueError('receipt:' + step.phase)
            expected = {'schemaVersion', 'runId', 'phase'}
            if step.phase in ('received', 'active'):
                expected |= {'consumer', 'servicesStarted', 'isolationAccepted'}
            if set(doc) != expected:
                raise ValueError('receipt:' + step.phase)
            if step.phase in ('received', 'active') and (
                    doc.get('consumer') != 'tox21' or doc.get('servicesStarted') is not False
                    or doc.get('isolationAccepted') is not False):
                raise ValueError('receipt:' + step.phase)
        completed.append(step.phase)
    return dict(schemaVersion=1, runId=plan.run_id, environment=plan.environment,
                consumer='tox21', helperSha256=plan.helper_sha256, phases=completed,
                syntheticOnly=True, servicesStarted=False, isolationAccepted=False)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--environment', choices=('preview', 'production'), default='preview')
    parser.add_argument('--execute', action='store_true', help='Explicit operator-only VM synthetic trial')
    args = parser.parse_args(argv)
    try:
        plan = build_plan(args.environment)
        if not args.execute:
            print(json.dumps(dict(runId=plan.run_id, environment=plan.environment,
                                  helperSha256=plan.helper_sha256, phases=[s.phase for s in plan.steps],
                                  syntheticOnly=True, executionRequested=False)))
            return 0
        if os.name != 'nt':
            raise ValueError('windows-host-required')
        # Print only phase metadata. Never persist terminal streams or payloads.
        print('Consegna sintetica: passphrase SSH e sudo solo nel terminale.', flush=True)
        print(json.dumps(dict(runId=plan.run_id, environment=plan.environment)), flush=True)
        result = execute(plan, progress=lambda phase: print('Fase: ' + phase, flush=True))
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError):
        print(json.dumps(dict(code='SYNTHETIC_DELIVERY_FAILED',
                              detail='Review the last phase; no automatic retry or secret cleanup')),
              file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
