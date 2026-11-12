"""Verify an existing application run using a pinned public helper; never bootstrap again."""
import hashlib
import json
import os
from pathlib import Path
import uuid

from synthetic_secret_delivery import Step, STAGE, CLEANUP, remote, transport

STAGE_HELPER = STAGE.replace('delivery-', 'application-verify-').replace('secret_delivery.py', 'helper.py')
REMOVE_HELPER = CLEANUP.replace('delivery-', 'application-verify-').replace('secret_delivery.py', 'helper.py')
LOAD = r'''
import hashlib,json,os,pathlib,pwd,re,stat,sys,types
verification,checksum,rid,digest=sys.argv[1:]
assert os.geteuid()==0
assert all(re.fullmatch('[a-f0-9]{32}',v) for v in (verification,rid))
assert all(re.fullmatch('[a-f0-9]{64}',v) for v in (checksum,digest))
owner=pwd.getpwnam(os.environ['SUDO_USER']);assert owner.pw_uid>0
base=pathlib.Path(owner.pw_dir)/'.mercurion-infra'
stage=base/('application-verify-'+verification)
for path in (base,stage):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
fd=os.open(stage/'helper.py',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as stream:
 info=os.fstat(stream.fileno());assert stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o600
 source=stream.read(131073)
assert len(source)<=131072 and hashlib.sha256(source).hexdigest()==checksum
root=pathlib.Path('/opt/mercurion/releases')/('application-'+rid)
for path in (root,*root.parents):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
raw=(root/'application-bootstrap.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==digest
manifest=json.loads(raw);assert manifest['runId']==rid
for name,wanted in manifest['files'].items():
 path=pathlib.PurePosixPath(name);assert not path.is_absolute() and '..' not in path.parts
 if name.startswith(('servers/','components/')):continue
 target=root/name
 for parent in (target.parent,*target.parent.parents):
  info=parent.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
 info=target.lstat();assert stat.S_ISREG(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
 assert hashlib.sha256(target.read_bytes()).hexdigest()==wanted
output=root/('application-verification-'+verification+'.json')
assert not output.exists()
sys.path.insert(0,str(root/'scripts/infrastructure'))
module=types.ModuleType('verified_preview_applications')
module.__file__=str(root/'scripts/infrastructure/guest_preview_applications.py')
exec(compile(source,'<verified-application-checks>','exec'),module.__dict__)
report=dict(schemaVersion=1,runId=rid,verificationId=verification,status='failed',phase='verify-existing',
 helperSha256=checksum,
 servicesStarted=False,containerMutationsPerformed=False,databaseMutationsPerformed=False,
 secretsDelivered=False,privateConfigurationRead=False,publishedPorts=False,publicAcceptance=False,isolationAccepted=False)
try:
 manifest=module.bundle.verify(root)
 module.verify_existing(root,manifest,report)
except Exception as error:
 report['errorType']=type(error).__name__
 if isinstance(error,ValueError) and re.fullmatch('[a-z-]+',str(error)):report['code']=str(error)
with output.open('x',encoding='utf-8') as stream:json.dump(report,stream,indent=2)
output.chmod(0o644)
print(json.dumps({name:report[name] for name in ('runId','verificationId','status','phase','servicesStarted')}))
raise SystemExit(0 if report['status']=='passed' else 1)
'''


def eligible(root, manifest):
    previous = json.loads((root / 'receipts/bootstrap-result.json').read_text(encoding='utf-8'))
    if (previous.get('runId') != manifest['runId'] or previous.get('servicesStarted') is not True
            or previous.get('phase') not in ('application-readiness', 'finished')
            or previous.get('schema', {}).get('status') not in ('initialized', 'compatible')):
        raise ValueError('existing-started-application-receipt-required')
    return previous


def execute(root, manifest):
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    eligible(root, manifest)
    from preview_application_bootstrap import fetch
    identifier = uuid.uuid4().hex
    source = Path(__file__).with_name('guest_preview_applications.py').read_bytes()
    if len(source) > 131072:
        raise ValueError('verification-helper-size')
    checksum = hashlib.sha256(source).hexdigest()
    digest = hashlib.sha256((root / 'application-bootstrap.json').read_bytes()).hexdigest()
    print(json.dumps(dict(runId=manifest['runId'], verificationId=identifier,
        privateConfigurationRead=False, servicesStarted=False)), flush=True)
    code, output = transport(Step('helper-staged', remote(STAGE_HELPER, identifier, checksum), data=source))
    if code or json.loads(output).get('runId') != identifier:
        raise ValueError('verification-helper-staging-failed')
    code, _ = transport(Step('verify-existing', remote(LOAD, identifier, checksum, manifest['runId'], digest, sudo=True), interactive=True))
    result, path = fetch(root, manifest['runId'], 'application-verification-' + identifier + '.json')
    if (code or result.get('status') != 'passed' or result.get('verificationId') != identifier
            or result.get('servicesStarted') is not False or result.get('containerMutationsPerformed') is not False
            or set(result.get('checks', {})) != {'backendHealthThroughEdge','frontendThroughEdge','tox21RealRpc'}
            or not all(value is True for value in result['checks'].values())):
        raise ValueError('application-verification-incomplete-review-report')
    code, output = transport(Step('helper-removed', remote(REMOVE_HELPER, identifier)))
    if code or json.loads(output).get('phase') != 'code-removed':
        raise ValueError('verification-helper-cleanup-failed')
    return dict(status='passed', runId=manifest['runId'], verificationId=identifier, reportPath=str(path),
        edgeAddress=result['edgeAddress'], servicesStarted=False, containerMutationsPerformed=False,
        databaseMutationsPerformed=False, privateConfigurationRead=False, isolationAccepted=False)
