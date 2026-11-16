"""Synthetic retirement: host contracts and disposable Linux/tmpfs filesystem checks."""
import copy
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import unittest
import uuid
from unittest.mock import Mock, patch

import secret_delivery as delivery
import synthetic_run_retirement as host


def evidence(identifier):
    return dict(localHelperHashMatches=True, receipt=dict(schemaVersion=1, runId=identifier,
        environment='preview', consumer='tox21', helperSha256=host.LEGACY_HELPER,
        phases=host.DELIVERY_PHASES, syntheticOnly=True, servicesStarted=False, isolationAccepted=False))


class HostRetirementTests(unittest.TestCase):
    def test_only_complete_synthetic_preview_receipt_is_accepted(self):
        identifier=uuid.uuid4().hex
        valid=evidence(identifier)
        plan=host.build_plan(identifier,valid)
        self.assertEqual([s.phase for s in plan.steps],['staged','retired','retirement-verified','code-removed'])
        self.assertIsNone(plan.steps[1].data)
        for change in ({'environment':'production'}, {'syntheticOnly':False}, {'servicesStarted':True},
                       {'runId':'a'*32}, {'helperSha256':'0'*64}, {'phases':[]}, {'schemaVersion':True}):
            invalid=copy.deepcopy(valid)
            invalid['receipt'].update(change)
            with self.subTest(change=change),self.assertRaises(ValueError):
                host.build_plan(identifier,invalid)
        with self.assertRaises(ValueError):
            host.build_plan('../unsafe',valid)

    def test_host_receipts_and_stop_at_each_failed_phase(self):
        identifier=uuid.uuid4().hex
        plan=host.build_plan(identifier,evidence(identifier))
        calls=[]
        def invoke(step):
            calls.append(step.phase)
            doc=dict(schemaVersion=1,runId=identifier,phase=step.phase)
            if step.phase=='retirement-verified':
                doc.update(consumer='tox21',servicesStarted=False,isolationAccepted=False,state='retired')
            return 0,json.dumps(doc).encode()
        result=host.execute(plan,invoke)
        self.assertEqual(result['state'],'retired')
        self.assertTrue(result['valuesAbsent'])
        for failure in range(4):
            calls.clear()
            def fail(step):
                return (1,b'') if len(calls)==failure else invoke(step)
            with self.assertRaises(ValueError):
                host.execute(plan,fail)
            self.assertEqual(len(calls),failure)

    def test_mount_overlap_including_stopped_container_and_parents(self):
        identifier=uuid.uuid4().hex
        target=(delivery.BASE/identifier).as_posix()
        for source in (target,target+'/active/bootstrap.json',delivery.BASE.as_posix(),'/run','/'):
            invoke=Mock(side_effect=['c'*64,json.dumps(dict(mounts=[dict(Source=source)],binds=None,specs=None))])
            with self.subTest(source=source),self.assertRaises(delivery.DeliveryError):
                delivery.no_consumer_mounts(identifier,invoke)
            self.assertIn('-a',invoke.call_args_list[0].args)
        invoke=Mock(side_effect=['c'*64,json.dumps(dict(mounts=[],binds=[target+'-other:/data:ro'],specs=None))])
        delivery.no_consumer_mounts(identifier,invoke)
        with self.assertRaises(delivery.DeliveryError):
            delivery.no_consumer_mounts(identifier,Mock(side_effect=FileNotFoundError('docker')))
        with self.assertRaises(delivery.DeliveryError):
            delivery.no_consumer_mounts(identifier,Mock(side_effect=RuntimeError('unresolvable mount')))
        for data in (dict(mounts=[],binds=[target+':/data:ro'],specs=None),
                     dict(mounts=[],binds=None,specs=[dict(Source=target)])):
            with self.assertRaises(delivery.DeliveryError):
                delivery.no_consumer_mounts(identifier,Mock(side_effect=['c'*64,json.dumps(data)]))

    def test_malformed_verification_receipt_never_reaches_code_cleanup(self):
        identifier=uuid.uuid4().hex
        plan=host.build_plan(identifier,evidence(identifier))
        calls=[]
        def invoke(step):
            calls.append(step.phase)
            if step.phase=='retirement-verified':
                return 0,b'{}'
            return 0,json.dumps(dict(schemaVersion=1,runId=identifier,phase=step.phase)).encode()
        with self.assertRaises(ValueError):
            host.execute(plan,invoke)
        self.assertNotIn('code-removed',calls)


@unittest.skipUnless(sys.platform=='linux' and os.geteuid()==0
    and os.environ.get('MERCURION_SYNTHETIC_DELIVERY_TEST')=='1','Disposable Linux/tmpfs root harness required')
class LinuxRetirementTests(unittest.TestCase):
    def setUp(self):
        self.identifier=uuid.uuid4().hex
        self.run=delivery.BASE/self.identifier
        delivery.prepare(self.identifier,'preview','nobody')

    def make_active(self):
        doc=dict(schemaVersion=1,runId=self.identifier,environment='preview',consumer='tox21',
                 variables=dict(NATS_USERNAME='synthetic',NATS_PASSWORD='synthetic-not-a-secret'))
        received=subprocess.run([sys.executable,'-B',delivery.__file__,'receive','--run-id',self.identifier],
            input=delivery.encode(doc),capture_output=True,user=65534,group=65534,extra_groups=[],timeout=10)
        self.assertEqual(received.returncode,0,received.stderr)
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'received')
        delivery.apply(self.identifier)

    def retire(self):
        return delivery.retire(self.identifier,'preview','nobody',check_mounts=lambda identifier:None)

    def test_reconcile_phases_and_retire_without_reading_credential_contents(self):
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'prepared')
        self.make_active()
        original=delivery.read_file
        def metadata_only(parent,name,uid):
            self.assertIn(name,('state.json','retired.json'))
            return original(parent,name,uid)
        with patch.object(delivery,'read_file',side_effect=metadata_only):
            self.assertEqual(self.retire(),'retired')
        self.assertEqual(set(os.listdir(self.run)),{'state.json','retired.json'})
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'retired')
        self.assertEqual(self.retire(),'retired')
        with self.assertRaises(FileExistsError):
            delivery.prepare(self.identifier,'preview','nobody')
        with self.assertRaises(delivery.DeliveryError):
            delivery.apply(self.identifier)
        self.assertFalse((self.run/'applying').exists())
        result=subprocess.run([sys.executable,'-B',delivery.__file__,'inspect-retired','--run-id',self.identifier],
            capture_output=True,user=65534,group=65534,extra_groups=[],timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['state'],'retired')
        self.assertNotIn(b'synthetic',result.stdout)

    def test_other_run_and_unknown_files_are_preserved(self):
        self.make_active()
        other=uuid.uuid4().hex
        delivery.prepare(other,'preview','nobody')
        unknown=self.run/'foreign'
        unknown.write_text('synthetic marker')
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        self.assertTrue((self.run/'active/bootstrap.json').exists())
        self.assertTrue(unknown.exists())
        unknown.unlink()
        self.retire()
        self.assertTrue((delivery.BASE/other/'inbox').is_dir())

    def test_mounted_or_unavailable_docker_blocks_before_mutation(self):
        self.make_active()
        def blocked(identifier):
            raise delivery.DeliveryError('consumer-mounted')
        with self.assertRaises(delivery.DeliveryError):
            delivery.retire(self.identifier,'preview','nobody',check_mounts=blocked)
        self.assertFalse((self.run/'retiring.json').exists())
        self.assertTrue((self.run/'active/bootstrap.json').exists())

    def test_partial_retirement_remains_reserved_and_is_not_retried(self):
        self.make_active()
        with patch.object(delivery.os,'unlink',side_effect=OSError('synthetic interruption')):
            with self.assertRaises(OSError):
                self.retire()
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'interrupted')
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        self.assertTrue((self.run/'active/bootstrap.json').exists())

    def test_owner_environment_and_busy_lock_block_before_removal(self):
        import fcntl
        self.make_active()
        for environment,owner in (('production','nobody'),('preview','root')):
            with self.assertRaises(delivery.DeliveryError):
                delivery.retire(self.identifier,environment,owner,check_mounts=lambda identifier:None)
        with delivery.directory(self.run,0,0o711) as run:
            fcntl.flock(run,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                self.retire()
        self.assertFalse((self.run/'retiring.json').exists())

    def test_symlink_hardlink_and_loose_file_modes_are_rejected(self):
        self.make_active()
        path=self.run/'active/bootstrap.json'
        os.chmod(path,0o444)
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        os.chmod(path,0o400)
        outside=delivery.BASE/('test-hardlink-'+self.identifier)
        os.link(path,outside)
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        outside.unlink()
        path.unlink()
        path.symlink_to('/etc/passwd')
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        self.assertTrue(path.is_symlink())

    def test_absent_and_received_or_interrupted_runs_are_not_deleted(self):
        absent=uuid.uuid4().hex
        self.assertEqual(delivery.retire(absent,'preview','nobody'),'absent')
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        os.mkdir(self.run/'applying',0o700)
        self.assertEqual(delivery.reconcile(self.identifier,'preview','nobody'),'interrupted')
        with self.assertRaises(delivery.DeliveryError):
            self.retire()
        self.assertTrue((self.run/'inbox').is_dir())

    def test_complete_host_plan_real_verified_helper_and_mocked_docker_read(self):
        self.make_active()
        plan=host.build_plan(self.identifier,evidence(self.identifier))
        def invoke(step):
            parts=shlex.split(step.command)
            if step.interactive:
                self.assertEqual(parts[:2],['sudo','--'])
                parts=parts[2:]
                index=parts.index('-c')+1
                # Only Docker's read-only empty-container reply is simulated. The
                # verified loader, helper, identities and filesystem run for real.
                prefix=("import subprocess\n"
                    "def fake_docker(args,**kwargs):\n"
                    " assert args[:4]==['docker','--host','unix:///var/run/docker.sock','ps'] and '-a' in args\n"
                    " return subprocess.CompletedProcess(args,0,stdout='',stderr='')\n"
                    "subprocess.run=fake_docker\n")
                parts[index]=prefix+parts[index]
            result=subprocess.run(['/bin/sh','-c',shlex.join([sys.executable,*parts[1:]])],
                input=step.data,capture_output=True,user=0 if step.interactive else 65534,
                group=0 if step.interactive else 65534,extra_groups=[],
                env=dict(os.environ,HOME='/nonexistent',SUDO_USER='nobody'),timeout=10)
            self.assertEqual(result.returncode,0,(step.phase,result.stderr))
            return result.returncode,result.stdout
        result=host.execute(plan,invoke)
        self.assertEqual(result['state'],'retired')
        self.assertEqual(set(os.listdir(self.run)),{'state.json','retired.json'})
        self.assertFalse((Path('/nonexistent/.mercurion-infra')/('delivery-'+self.identifier)).exists())


if __name__=='__main__':
    unittest.main()
