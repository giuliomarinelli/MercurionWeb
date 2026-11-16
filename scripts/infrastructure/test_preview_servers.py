"""Server bootstrap contracts and disposable Linux tmpfs integration; synthetic values only."""
import copy
import io
import json
import os
from pathlib import Path
import stat
import sys
import runpy
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid

import guest_preview_servers as guest
import preview_server_bootstrap as host
import preview_server_bundle as bundle
import preview_server_secrets as receiver
import test_preview_credentials as fixtures


def configuration():
    return fixtures.PreviewCredentialTests().configuration()


class ServerContracts(unittest.TestCase):
    def test_public_copy_recovery_skips_transfer_and_records_one_time_attempt(self):
        identifier = 'a' * 32
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'execution-state.json').write_text(json.dumps(dict(runId=identifier,
                phase='guest-preflight-and-load', status='failed', servicesStarted=False)))
            configuration_path = root / 'synthetic-configuration.json'
            configuration_path.write_text('{}')
            preflight = dict(runId=identifier, status='ready', readyForSecretDelivery=True, secretInboxPrepared=True)
            result = dict(runId=identifier, status='passed', ownedContainers=['1', '2', '3', '4'],
                          servicesStarted=True, meilisearchAddress='172.20.0.2')
            received = json.dumps(dict(runId=identifier, consumer='preview-servers', phase='received', servicesStarted=False))
            with patch.object(host, 'os', SimpleNamespace(name='nt')), patch.object(bundle, 'verify', return_value={'runId': identifier}), \
                    patch.object(bundle.delivery, 'checksum', return_value='c' * 64), patch.object(host, 'payload', return_value=b'{}'), \
                    patch.object(host, 'transport', return_value=(0, '')), patch.object(host, 'invoke_step', return_value=received), \
                    patch.object(host, 'fetch', side_effect=[(preflight, root / 'preflight-result.json'), (result, root / 'bootstrap-result.json')]), \
                    patch.object(host.subprocess, 'run') as process, patch('builtins.print'):
                self.assertEqual(host.execute(root, configuration_path, resume_public_copy=True)['status'], 'passed')
                process.assert_not_called()
            state = json.loads((root / 'execution-state.json').read_text())
            self.assertTrue(state['resumePublicCopyAttempted'])
            self.assertEqual((state['phase'], state['status']), ('finished', 'passed'))
            with self.assertRaisesRegex(ValueError, 'recovery-not-eligible'):
                host.resume_state(root, identifier)

    def test_public_copy_recovery_requires_exact_unstarted_failed_phase_and_no_receipts(self):
        identifier = 'a' * 32
        original = dict(runId=identifier, phase='guest-preflight-and-load', status='failed', servicesStarted=False)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'execution-state.json'
            path.write_text(json.dumps(original))
            self.assertEqual(host.resume_state(root, identifier), original)
            for change in (dict(runId='b' * 32), dict(phase='secrets-receive'), dict(status='passed'),
                           dict(servicesStarted=True), dict(resumePublicCopyAttempted=True)):
                path.write_text(json.dumps(original | change))
                with self.assertRaisesRegex(ValueError, 'recovery-not-eligible'):
                    host.resume_state(root, identifier)
            path.write_text(json.dumps(original))
            (root / 'receipts').mkdir()
            (root / 'receipts/preflight-result.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'recovery-not-eligible'):
                host.resume_state(root, identifier)

    def test_bundle_rejects_paths_outside_its_allowlist_before_checksum_reads(self):
        record = dict(schemaVersion=1, scope='preview-servers-only', runId='a' * 32,
            releaseRevision='a' * 40, toolRevision='b' * 40, files={'../private-configuration.json': 'c' * 64})
        with patch.object(bundle.transport, 'read', return_value=record), patch.object(bundle.delivery, 'checksum') as checksum:
            with self.assertRaisesRegex(ValueError, 'bundle-scope'):
                bundle.verify(Path('public-bundle'))
            checksum.assert_not_called()

    def test_payload_excludes_provider_and_rsa_material_and_isolates_master(self):
        value = configuration()
        before = copy.deepcopy(value)
        data = host.payload(value, 'a' * 32)
        doc = receiver.validate(data, 'a' * 32)
        self.assertEqual(value, before)
        for secret in value['providers'].values():
            self.assertNotIn(secret, data.decode())
        for name in fixtures.credentials.RSA_NAMES:
            self.assertNotIn(value['applicationSecrets'][name], data.decode())
        for role, files in doc['documents'].items():
            if role != 'meilisearch':
                self.assertNotIn(value['meilisearchServer']['masterKey'], str(files))

    def test_unknown_role_path_or_server_directive_is_rejected_without_values(self):
        identifier = 'a' * 32
        original = json.loads(host.payload(configuration(), identifier))
        variants = []
        for change in (
            lambda doc: doc['documents'].update({'web-node': {'values.json': 'private-marker'}}),
            lambda doc: doc['documents']['postgres'].update({'../escape': 'private-marker'}),
            lambda doc: doc['documents']['redis'].update({'server.conf': 'include /private-marker\n'}),
            lambda doc: doc['documents']['nats'].update({'server.json': '{"port":4223}'}),
            lambda doc: doc['documents']['meilisearch'].update({'server.toml': 'master_key="private-marker"'}),
            lambda doc: doc.update(consumer='web-node'),
            lambda doc: doc.update(environment='production')):
            value = copy.deepcopy(original)
            change(value)
            variants.append(value)
        for value in variants:
            with self.assertRaises(ValueError) as error:
                receiver.validate(json.dumps(value).encode(), identifier)
            self.assertNotIn('private-marker', str(error.exception))

    def test_meili_master_cannot_be_reused_by_broker(self):
        value = configuration()
        value['tox21']['password'] = value['meilisearchServer']['masterKey']
        with self.assertRaisesRegex(ValueError, 'master-isolation'):
            host.payload(value, 'a' * 32)


class ProjectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.models = bundle.preview_compose.render()
        cls.loaded = {role: {'imageId': 'sha256:' + str(index) * 64}
                      for index, role in enumerate(('postgres', 'redis', 'nats', 'meilisearch'), 1)}

    def test_only_four_private_servers_and_owned_paths_are_projected(self):
        before = copy.deepcopy(self.models)
        result = bundle.projection(self.models, self.loaded, 'a' * 32)
        self.assertEqual(before, self.models)
        self.assertEqual({name for model in result.values() for name in model['services']},
                         {'postgres-preview', 'redis-preview', 'nats-preview', 'meilisearch'})
        for model in result.values():
            self.assertTrue(all(network['internal'] and not network['enable_ipv6'] for network in model['networks'].values()))
            for service in model['services'].values():
                self.assertFalse(service.get('ports'))
                self.assertTrue(service['read_only'])
                self.assertEqual(service['labels']['mercurion.bootstrap.run'], 'a' * 32)
                for mount in service['volumes']:
                    if mount['type'] == 'bind':
                        self.assertTrue(mount['read_only'])
                        self.assertTrue(mount['source'].startswith(('/run/mercurion-preview/', '/opt/mercurion/releases/')))
        self.assertEqual(sum(len(model['volumes']) for model in result.values()), 3)

    def test_existing_network_stops_before_docker_mutations(self):
        result = bundle.projection(self.models, self.loaded, 'a' * 32)
        calls = []
        def docker(*args):
            calls.append(args)
            return 'mercurion_stg_data' if args[0] == 'network' else ''
        with patch.object(guest, 'docker', side_effect=docker), self.assertRaisesRegex(ValueError, 'existing-network'):
            guest.collisions(result)
        self.assertTrue(all(args[:2] == ('ps', '-aq') or args[:2] == ('network', 'ls') for args in calls))

    def test_invalid_run_and_nonimmutable_image_are_rejected(self):
        with self.assertRaises(ValueError):
            bundle.projection(self.models, self.loaded, '../escape')
        loaded = copy.deepcopy(self.loaded)
        loaded['postgres']['imageId'] = 'postgres:latest'
        with self.assertRaises(ValueError):
            bundle.projection(self.models, loaded, 'a' * 32)


@unittest.skipUnless(os.environ.get('PREVIEW_SECRET_FIXTURE') == '1' and sys.platform == 'linux',
                     'Disposable root Linux tmpfs fixture only')
class TmpfsIntegration(unittest.TestCase):
    def public_copy_fixture(self, mode=0o644, directory_mode=0o755):
        import pwd
        identifier = uuid.uuid4().hex
        account = pwd.getpwnam('nobody')
        home = Path('/tmp') / ('operator-' + identifier)
        home.mkdir()
        operator = SimpleNamespace(pw_dir=str(home), pw_uid=account.pw_uid, pw_gid=account.pw_gid)
        source = home / ('vm043-servers-' + identifier)
        source.mkdir(mode=0o755)
        names = {'scripts/infrastructure/guest_preview_servers.py', 'deployment/local-vm/operational/postgres-init.sh'}
        for name in names:
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('# public fixture\n')
        manifest = dict(runId=identifier, files={name: bundle.delivery.checksum(source / name) for name in names})
        path = source / 'server-bootstrap.json'
        path.write_text(json.dumps(manifest))
        for item in [source, *source.rglob('*')]:
            item.chmod(directory_mode if item.is_dir() else mode)
            os.chown(item, account.pw_uid, account.pw_gid)
        return identifier, operator, source, names, bundle.delivery.checksum(path)

    def copy_public(self, fixture):
        import pwd
        identifier, operator, source, names, digest = fixture
        with patch.object(pwd, 'getpwnam', return_value=operator), patch.dict(os.environ, {'SUDO_USER': 'nobody'}), patch.object(sys, 'argv',
                ['loader', identifier, digest]), patch.object(runpy, 'run_path') as run:
            exec(compile(host.COPY_RELEASE, '<public-copy-fixture>', 'exec'), {'EXPECTED_FILES': names})
        run.assert_called_once()

    def test_verified_public_copy_normalizes_windows_scp_modes_in_protected_release(self):
        for mode, directory_mode in ((0o644, 0o755), (0o664, 0o775), (0o666, 0o777)):
            with self.subTest(mode=oct(mode), directoryMode=oct(directory_mode)):
                fixture = self.public_copy_fixture(mode, directory_mode)
                identifier, _, source, names, _ = fixture
                self.copy_public(fixture)
                root = Path('/opt/mercurion/releases') / ('server-' + identifier)
                for item in [root, *root.rglob('*')]:
                    info = item.stat()
                    self.assertEqual(info.st_uid, 0)
                    self.assertFalse(info.st_mode & 0o022)
                for name in names:
                    info = (root / name).stat()
                    self.assertEqual(stat.S_IMODE(info.st_mode), 0o755 if name.endswith('.sh') else 0o644)
                    self.assertEqual((root / name).read_bytes(), (source / name).read_bytes())

    def test_public_copy_rejects_tampering_symlinks_wrong_owner_and_existing_release_before_execution(self):
        for variant in ('manifest', 'content', 'symlink', 'owner', 'existing-release', 'writable-protected-parent'):
            with self.subTest(variant=variant):
                fixture = self.public_copy_fixture(0o666, 0o777)
                identifier, _, source, names, _ = fixture
                path = source / 'scripts/infrastructure/guest_preview_servers.py'
                if variant == 'manifest':
                    (source / 'server-bootstrap.json').write_text('{}')
                elif variant == 'content':
                    path.write_text('raise RuntimeError("unverified bytes")\n')
                elif variant == 'symlink':
                    target = source / 'untrusted.py'
                    path.rename(target)
                    path.symlink_to(target)
                elif variant == 'owner':
                    os.chown(path, 0, 0)
                elif variant == 'existing-release':
                    (Path('/opt/mercurion/releases') / ('server-' + identifier)).mkdir(parents=True)
                else:
                    Path('/opt/mercurion/releases').chmod(0o777)
                try:
                    with patch.object(runpy, 'run_path') as run:
                        with self.assertRaises((AssertionError, ValueError, OSError)):
                            self.copy_public(fixture)
                        run.assert_not_called()
                finally:
                    if variant == 'writable-protected-parent':
                        Path('/opt/mercurion/releases').chmod(0o755)

    def test_prepare_receive_apply_permissions_nonroot_inspect_and_retry_denial(self):
        identifier = uuid.uuid4().hex
        receiver.prepare(identifier, 'nobody')
        data = host.payload(configuration(), identifier)
        import pwd
        account = pwd.getpwnam('nobody')
        def child():
            os.setgid(account.pw_gid)
            os.setuid(account.pw_uid)
            receiver.receive(identifier, io.BytesIO(data))
        process = os.fork()
        if process == 0:
            try:
                child()
                os._exit(0)
            except Exception:
                os._exit(1)
        self.assertEqual(os.waitpid(process, 0)[1], 0)
        self.assertEqual(receiver.apply(identifier)['phase'], 'active')
        active = receiver.BASE / identifier / 'active'
        for role, (uid, gid, names) in receiver.ROLES.items():
            for name in names:
                info = (active / role / name).stat()
                self.assertEqual((info.st_uid, info.st_gid, stat.S_IMODE(info.st_mode)), (uid, gid, 0o400))
        self.assertFalse((receiver.BASE / identifier / 'inbox/payload.json').exists())
        process = os.fork()
        if process == 0:
            try:
                os.setgid(account.pw_gid)
                os.setuid(account.pw_uid)
                receiver.guard(False)
                receiver.inspect(identifier)
                os._exit(0)
            except Exception:
                os._exit(1)
        self.assertEqual(os.waitpid(process, 0)[1], 0)
        with self.assertRaises(OSError):
            receiver.prepare(identifier, 'nobody')
        with self.assertRaises(ValueError):
            receiver.apply(identifier)
        self.assertFalse((receiver.BASE / identifier / 'applying').exists())


if __name__ == '__main__':
    unittest.main()
