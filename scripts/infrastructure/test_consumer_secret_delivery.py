"""Consumer contracts; real tmpfs identities with Docker simulated, no guest SSH."""
import copy
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import unittest
import uuid
from unittest.mock import patch

import secret_delivery as delivery
import synthetic_consumer_host as host
import synthetic_consumer_mount as guest
from test_synthetic_secret_delivery import receipt


def plan():
    return host.build_plan(reader_path=Path('/consumer/secret_bootstrap.py') if sys.platform=='linux' else None)


def result(p):
    checks=[]
    for index,case in enumerate(host.CASES):
        cid=f'{max(0,index-1):064x}'
        checks.append(dict(case=case,containerId=cid,result=dict(schemaVersion=1,runId=p.run_id,
            case='read' if index<3 else case,uid=65534 if case=='unauthorized' else 10021,
            invocationId=uuid.uuid4().hex,outcome='loaded-readonly' if index<3 else 'blocked')))
    return dict(schemaVersion=1,runId=p.run_id,environment='preview',consumer='tox21',phase='consumer-verified',
        status='passed',attemptId=uuid.uuid4().hex,checks=checks,cleanupErrors=[],assetsRemoved=True,
        removedContainers=list({entry['containerId'] for entry in checks}),readerSha256=p.reader_sha256,
        probeSha256=p.probe_sha256,imageId=guest.IMAGE,syntheticOnly=True,realServicesStarted=False,
        isolationAccepted=False,retirementState='retired',finishedAtUtc='2026-11-10T12:00:00+00:00')


class ConsumerHostTests(unittest.TestCase):
    def setUp(self):
        self.plan=plan()
        self.valid=result(self.plan)

    def response(self,step):
        return 0,json.dumps(self.valid).encode() if step.phase=='consumer-result' else receipt(self.plan,step)

    def test_fresh_source_bundle_and_payload_only_on_receive_stdin(self):
        self.assertNotEqual(self.plan.run_id,plan().run_id)
        source=self.plan.steps[0].data
        self.assertEqual(hashlib.sha256(source).hexdigest(),self.plan.helper_sha256)
        self.assertLess(len(source),host.transport.CODE_LIMIT)
        compile(source,'bundle','exec')
        password=json.loads(self.plan.steps[2].data)['variables']['NATS_PASSWORD']
        for step in self.plan.steps:
            self.assertNotIn(password,step.command)
            if step.phase!='received':
                self.assertNotIn(password.encode(),step.data or b'')
            if step.interactive:
                self.assertIsNone(step.data)
        report=host.execute(self.plan,self.response)
        self.assertNotIn(password,json.dumps(report))
        self.assertTrue(report['codeRemoved'])
        self.assertEqual(report['phases'],[step.phase for step in self.plan.steps])

    def test_every_phase_failure_stops_without_retry_or_later_cleanup(self):
        for failure in range(len(self.plan.steps)):
            calls=[]
            def invoke(step):
                calls.append(step.phase)
                return (2,None) if len(calls)==failure+1 else self.response(step)
            with self.subTest(failure=failure),self.assertRaises(ValueError):
                host.execute(self.plan,invoke)
            self.assertEqual(calls,[step.phase for step in self.plan.steps[:failure+1]])

    def test_invalid_lifecycle_or_hash_or_incomplete_cleanup_is_rejected(self):
        mutations=[lambda v:v.update(readerSha256='0'*64),lambda v:v.update(syntheticOnly=False),
            lambda v:v.update(realServicesStarted=True),lambda v:v.update(isolationAccepted=True),
            lambda v:v.update(retirementState='active'),lambda v:v.update(assetsRemoved=False),
            lambda v:v.update(cleanupErrors=['mount']),lambda v:v.update(schemaVersion=True),
            lambda v:v.update(unexpected='field'),lambda v:v['checks'].pop(),
            lambda v:v['removedContainers'].pop(),
            lambda v:v['checks'][1].update(containerId='f'*64),
            lambda v:v['checks'][1]['result'].update(invocationId=v['checks'][0]['result']['invocationId']),
            lambda v:v['checks'][3]['result'].update(outcome='loaded-readonly')]
        for mutate in mutations:
            value=copy.deepcopy(self.valid); mutate(value)
            with self.subTest(mutation=mutate),self.assertRaises(ValueError):
                host.validate_result(value,self.plan)

    def test_malformed_result_preserves_staged_code(self):
        for output in (b'{}',b'not-json',b'x'*16385):
            calls=[]
            def invoke(step):
                calls.append(step.phase)
                return (0,output) if step.phase=='consumer-result' else self.response(step)
            with self.assertRaises(ValueError):
                host.execute(self.plan,invoke)
            self.assertNotIn('code-removed',calls)

    def test_docker_transport_is_local_and_does_not_inherit_context(self):
        with patch.dict(os.environ,DOCKER_HOST='tcp://unexpected',DOCKER_CONTEXT='unexpected'), \
                patch.object(guest.subprocess,'run') as invoke:
            invoke.return_value.stdout='ok'
            guest.docker('ps')
            args,kwargs=invoke.call_args
            self.assertEqual(args[0],['docker','--host','unix:///var/run/docker.sock','ps'])
            self.assertNotIn('DOCKER_HOST',kwargs['env'])
            self.assertNotIn('DOCKER_CONTEXT',kwargs['env'])


class FakeDocker:
    """Metadata-only Docker double; actual Docker mount/UID proof is a separate harness."""
    def __init__(self):
        self.items={}
        self.calls=[]
        self.rw=False
        self.bad_image=False
        self.fail_start=False
        self.fail_remove=False

    def __call__(self,*args):
        self.calls.append(args)
        op=args[0]
        if op=='image':
            return json.dumps([dict(Id='bad' if self.bad_image else guest.IMAGE,Os='linux',Architecture='amd64')])
        if op=='ps':
            selected=self.items.items()
            if '--filter' in args:
                label=args[args.index('--filter')+1].split('=',1)[1]
                selected=[(cid,item) for cid,item in selected if guest.LABEL+'='+item['label']==label]
            return '\n'.join(cid for cid,_ in selected)
        if op=='create':
            assert '--pull' in args and args[args.index('--pull')+1]=='never'
            assert 'NATS_PASSWORD' not in args and '--env' not in args
            uid=args[args.index('--user')+1]
            label=args[args.index('--label')+1].split('=',1)[1]
            mounts=[]
            for index,arg in enumerate(args):
                if arg=='--mount':
                    spec=dict(piece.split('=',1) for piece in args[index+1].split(',') if '=' in piece)
                    mounts.append(dict(Type='bind',Source=spec['source'],Destination=spec['target'],RW=self.rw))
            cid=uuid.uuid4().hex*2
            self.items[cid]=dict(label=label,uid=uid,mounts=mounts,case=args[-1],runId=args[-3],logs=[])
            return cid
        item=self.items[args[-1]]
        if op=='inspect':
            template=args[2]
            if 'Config.Labels' in template: return item['label']
            if 'ExitCode' in template: return '0'
            if '"binds"' in template:
                return json.dumps(dict(mounts=item['mounts'],binds=None,specs=None))
            return json.dumps(dict(image=guest.IMAGE,requestedImage=guest.IMAGE,user=item['uid'],
                readonly=True,network='none',ports=None,privileged=False,capDrop=['ALL'],capAdd=None,
                security=['no-new-privileges=true'],mounts=item['mounts']))
        if op in ('start','restart'):
            if self.fail_start: raise RuntimeError('simulated-engine-failure')
            doc=dict(schemaVersion=1,runId=item['runId'],case=item['case'],uid=int(item['uid'].split(':')[0]),
                invocationId=uuid.uuid4().hex,outcome='loaded-readonly' if item['case']=='read' else 'blocked')
            item['logs'].append(json.dumps(doc))
            return item['logs'][-1] if op=='start' else args[-1]
        if op=='wait': return '0'
        if op=='logs': return '\n'.join(item['logs'])
        if op=='rm':
            if self.fail_remove: raise RuntimeError('simulated-cleanup-failure')
            del self.items[args[-1]]
            return args[-1]
        raise AssertionError(op)


@unittest.skipUnless(sys.platform=='linux' and os.geteuid()==0
    and os.environ.get('MERCURION_SYNTHETIC_DELIVERY_TEST')=='1','Disposable Linux/tmpfs root harness required')
class ConsumerLinuxTests(unittest.TestCase):
    def setUp(self):
        self.plan=plan()
        self.identifier=self.plan.run_id
        self.reader=Path('/consumer/secret_bootstrap.py').read_bytes()
        self.probe=Path(__file__).with_name('synthetic_consumer_probe.py').read_bytes()
        self.fake=FakeDocker()

    def active(self):
        delivery.prepare(self.identifier,'preview','nobody')
        response=subprocess.run([sys.executable,'-B',delivery.__file__,'receive','--run-id',self.identifier],
            input=self.plan.steps[2].data,capture_output=True,user=65534,group=65534,extra_groups=[],timeout=10)
        self.assertEqual(response.returncode,0,response.stderr)
        delivery.apply(self.identifier)
        return guest.Runner(delivery,self.identifier,self.reader,self.probe,invoke=self.fake)

    def test_real_filesystem_protocol_cleans_owned_assets_then_retires(self):
        runner=self.active()
        report=runner.run_checks('preview','nobody')
        host.validate_result(report,self.plan)
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'retired')
        self.assertFalse(runner.assets.exists())
        self.assertFalse(self.fake.items)
        self.assertEqual(len(report['removedContainers']),5)

    def test_existing_run_mount_prevents_fixture_and_retirement(self):
        runner=self.active()
        self.fake.items['a'*64]=dict(mounts=[dict(Source=str(runner.secret))],label='unrelated')
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertTrue(runner.secret.exists())
        self.assertIn('a'*64,self.fake.items)
        self.assertFalse(any(call[0]=='create' for call in self.fake.calls))

    def test_rw_mount_is_blocked_before_probe_and_owned_container_removed(self):
        runner=self.active(); self.fake.rw=True
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertFalse(any(call[0]=='start' for call in self.fake.calls))
        self.assertFalse(self.fake.items)
        self.assertTrue(runner.secret.exists())
        self.assertTrue(report['assetsRemoved'])

    def test_engine_failure_preserves_active_but_cleans_owned_fixtures(self):
        runner=self.active(); self.fake.fail_start=True
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertFalse(self.fake.items)
        self.assertTrue(runner.secret.exists())
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'active')

    def test_cleanup_failure_blocks_retirement_and_preserves_assets(self):
        runner=self.active(); self.fake.fail_remove=True
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertTrue(report['cleanupErrors'])
        self.assertTrue(runner.secret.exists())
        self.assertTrue(runner.assets.is_dir())

    def test_wrong_image_or_retired_run_are_never_repurposed(self):
        runner=self.active(); self.fake.bad_image=True
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertFalse(any(call[0]=='create' for call in self.fake.calls))
        delivery.retire(self.identifier,'preview','nobody',check_mounts=lambda _:None)
        self.fake.calls.clear()
        report=runner.run_checks('preview','nobody')
        self.assertEqual(report['status'],'invalid')
        self.assertTrue(all(call[0]=='ps' for call in self.fake.calls))

    def test_ownership_mismatch_prevents_container_removal(self):
        runner=self.active()
        cid=runner.create('read')
        self.fake.items[cid]['label']='another-attempt'
        with self.assertRaises(ValueError): runner.remove(cid)
        self.assertIn(cid,self.fake.items)

    def test_complete_verified_bundle_commands_with_real_identities(self):
        # Execute STAGE/LOAD/CLEANUP as transported; only the Docker daemon is simulated.
        def invoke(step):
            args=shlex.split(step.command)[2:] if step.interactive else shlex.split(step.command)
            if step.phase=='consumer-tested':
                index=args.index('-c')+1
                prefix=('import sys,subprocess\n'
                    f'sys.path.insert(0,{str(Path(__file__).parent)!r})\n'
                    'from test_consumer_secret_delivery import FakeDocker\n'
                    'engine=FakeDocker()\n'
                    'def fake_docker(args,**kwargs):\n'
                    ' assert args[:3]==["docker","--host","unix:///var/run/docker.sock"]\n'
                    ' return subprocess.CompletedProcess(args,0,stdout=engine(*args[3:]),stderr="")\n'
                    'subprocess.run=fake_docker\n')
                args[index]=prefix+args[index]
            response=subprocess.run([sys.executable,*args[1:]],input=step.data,capture_output=True,
                user=0 if step.interactive else 65534,group=0 if step.interactive else 65534,
                extra_groups=[],env=dict(os.environ,HOME='/nonexistent',SUDO_USER='nobody'),timeout=15)
            self.assertEqual(response.returncode,0,(step.phase,response.stderr,response.stdout))
            return response.returncode,response.stdout
        report=host.execute(self.plan,invoke)
        self.assertTrue(report['codeRemoved'])
        self.assertEqual(report['retirementState'],'retired')
        self.assertFalse((Path('/nonexistent/.mercurion-infra')/('delivery-'+self.identifier)).exists())


if __name__=='__main__':
    unittest.main()
