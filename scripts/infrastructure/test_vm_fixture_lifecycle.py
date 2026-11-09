"""Lifecycle safety checks with synthetic backend replies; not VM evidence."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock

from run_vm_fixture_lifecycle import FILES, IMAGE, LABEL, Lifecycle, ROOT, canonical_model


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='mercurion-fixture-lifecycle-unit-')
        self.root = Path(self.temporary.name)/'bundle'
        self.root.mkdir()
        self.models = {}
        for project,service_count,network_count,volume_count in (
                ('shared',4,7,1),('preview',6,3,3),('production',6,3,3)):
            self.models[project] = dict(name='mercurion-'+project,
                services={f'fixture-{index}':{} for index in range(service_count)},
                networks={f'network-{index}':dict(name=f'unit-{project}-network-{index}') for index in range(network_count)},
                volumes={f'volume-{index}':dict(name=f'unit-{project}-volume-{index}') for index in range(volume_count)})
        files = {}
        for relative in FILES:
            path = self.root/relative
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes((ROOT/relative).read_bytes())
            files[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        (self.root/'expected-models.json').write_text(json.dumps(self.models))
        files['expected-models.json'] = hashlib.sha256((self.root/'expected-models.json').read_bytes()).hexdigest()
        (self.root/'bundle-manifest.json').write_text(json.dumps(dict(schemaVersion=1,runId='a'*32,files=files)))
        self.calls = []
        self.collision = False

    def tearDown(self):
        self.temporary.cleanup()

    def invoke(self,*args,**kwargs):
        self.calls.append(args)
        if args[0] == 'version':
            return 'linux/amd64'
        if args[:2] == ('image','inspect'):
            return json.dumps([dict(Id=IMAGE.split('@')[1],Os='linux',Architecture='amd64')])
        if args[0] == 'compose':
            self.assertIn('config',args)
            project = Path(args[args.index('-f')+1]).parent.name
            return json.dumps(self.models[project])
        if args[:2] == ('network','ls'):
            return 'unit-shared-network-0' if self.collision else ''
        if args[0] in ('volume','ps'):
            return ''
        raise AssertionError('Unexpected mutation: '+args[0])

    def test_existing_network_blocks_before_any_mutation(self):
        self.collision = True
        lifecycle = Lifecycle(self.root,self.invoke)
        result = lifecycle.run()
        self.assertEqual(result['status'],'invalid')
        self.assertFalse(result['mutationsAttempted'])
        self.assertIn('Existing fixture names',result['errorDetail'])
        self.assertFalse((self.root/'execution-started.json').exists())
        self.assertFalse(any('up' in args or 'rm' in args or 'pull' in args for args in self.calls))

    def test_tampered_bundle_never_contacts_docker(self):
        (self.root/FILES[0]).write_text('modified bytes')
        invoke = Mock()
        result = Lifecycle(self.root,invoke).run()
        self.assertEqual(result['status'],'invalid')
        self.assertFalse(result['mutationsAttempted'])
        invoke.assert_not_called()

    def test_wrong_local_image_cannot_trigger_a_pull(self):
        invoke = Mock(side_effect=['linux/amd64',json.dumps([dict(Id='wrong',Os='linux',Architecture='amd64')])])
        result = Lifecycle(self.root,invoke).run()
        self.assertFalse(result['mutationsAttempted'])
        self.assertEqual(result['status'],'invalid')
        self.assertEqual(invoke.call_count,2)

    def test_other_bind_mounts_rejected(self):
        model = dict(services=dict(fixture=dict(volumes=[dict(type='bind',source='/unrelated/file')])))
        with self.assertRaises(ValueError):
            canonical_model(model,self.root)

    def test_config_drift_blocks_before_up(self):
        lifecycle = Lifecycle(self.root,self.invoke)
        self.models['shared']['services']['fixture-0']['ports'] = ['9999:18080']
        result = lifecycle.run()
        self.assertEqual(result['status'],'invalid')
        self.assertFalse(result['mutationsAttempted'])
        self.assertIn('Rendered Compose differs',result['errorDetail'])

    def test_label_race_never_removes_foreign_container(self):
        lifecycle = Lifecycle(self.root)
        lifecycle.volume_names = set()

        def invoke(*args,**kwargs):
            self.calls.append(args)
            if args[0] == 'ps':
                return 'c'*64
            if args[0] == 'inspect':
                return 'another-run'
            return ''

        lifecycle.invoke = invoke
        removed = lifecycle.cleanup()
        self.assertEqual(removed['container'],[])
        self.assertTrue(lifecycle.cleanup_errors)
        self.assertFalse(any(args[0] == 'rm' for args in self.calls))

    def test_failed_up_attempt_still_runs_owned_cleanup(self):
        lifecycle = Lifecycle(self.root)
        lifecycle.preflight = Mock(return_value=dict(services=16))
        lifecycle.invoke = Mock(side_effect=subprocess.TimeoutExpired('compose up',90))
        lifecycle.cleanup = Mock(return_value=dict(container=[],network=[],volume=[]))
        phases = []
        result = lifecycle.run(lambda value:phases.append(copy.deepcopy(value['phase'])))
        self.assertEqual(result['status'],'invalid')
        self.assertTrue(result['mutationsAttempted'])
        lifecycle.cleanup.assert_called_once()
        self.assertIn('cleanup',phases)
        self.assertEqual(phases[-1],'finished')

    def test_report_write_failure_cannot_skip_owned_cleanup(self):
        lifecycle = Lifecycle(self.root)
        lifecycle.preflight = Mock(return_value=dict(services=16))
        lifecycle.invoke = Mock(side_effect=subprocess.TimeoutExpired('compose up',90))
        lifecycle.cleanup = Mock(return_value=dict(container=[],network=[],volume=[]))

        def checkpoint(report):
            if report['phase'] in ('cleanup','finished'):
                raise OSError('Synthetic report write failure')

        result = lifecycle.run(checkpoint)
        lifecycle.cleanup.assert_called_once()
        self.assertEqual(result['status'],'invalid')
        self.assertEqual(len(result['cleanupErrors']),2)


if __name__ == '__main__':
    unittest.main()
