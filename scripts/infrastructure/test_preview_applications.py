"""Application bootstrap guards and disposable tmpfs ownership. Synthetic data only."""
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import runpy
import stat
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, Mock
import uuid

import preview_application_bootstrap as host
import preview_application_bundle as bundle
import preview_application_secrets as receiver
import guest_preview_applications as guest
import guest_preview_cold_recovery as cold
import test_preview_servers as fixtures


def configuration():
    value = fixtures.configuration()
    value['applicationSecrets']['JWT_RS256_PUBLIC_KEY'] = '-----BEGIN PUBLIC KEY-----\nsynthetic\n-----END PUBLIC KEY-----'
    return value


class ApplicationContracts(unittest.TestCase):
    def test_owner_configuration_rejection_reports_only_known_field_names(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'synthetic.json'
            config = configuration()
            config['providers']['EMAIL_PASSWORD'] = ''
            config['providers']['GOOGLE_CLIENT_SECRET'] = 'private-marker-do-not-print'
            path.write_text(json.dumps(config))
            with self.assertRaises(host.LocalConfigurationError) as error:
                host.load_configuration(path)
            self.assertIn('providers.EMAIL_PASSWORD', str(error.exception))
            self.assertNotIn('private-marker', str(error.exception))
            path.write_text('{"private-marker":broken')
            with self.assertRaisesRegex(host.LocalConfigurationError, '^configuration-invalid-json-or-encoding$'):
                host.load_configuration(path)

    def test_invalid_owner_configuration_stops_before_state_or_transport(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'synthetic.json'
            path.write_text('{}')
            with patch.object(host, 'os', SimpleNamespace(name='nt')), \
                    patch.object(host.subprocess, 'run') as process, patch.object(host, 'transport') as transport, \
                    self.assertRaises(host.LocalConfigurationError):
                host.execute(root, {'runId':'a'*32}, path)
            self.assertFalse((root / 'execution-state.json').exists())
            process.assert_not_called()
            transport.assert_not_called()

    def test_payload_separates_server_admin_and_consumer_credentials(self):
        config = configuration()
        raw = host.payload(config, 'a' * 32, '172.30.4.2')
        value = receiver.validate(raw, 'a' * 32)
        node = json.loads(value['documents']['web-node']['values.json'])['variables']
        self.assertEqual(json.loads(node['APP_TRUSTED_PROXY_CIDRS']), ['172.30.4.2/32'])
        self.assertNotIn(config['meilisearchServer']['masterKey'].encode(), raw)
        self.assertNotIn(config['postgresServer']['adminPassword'].encode(), raw)
        self.assertNotIn(config['tox21']['password'], node.values())
        self.assertEqual(set(value['documents']['tox21']), {'values.json', 'http-public.pem'})

    def test_receiver_rejects_paths_runtime_overrides_and_global_proxy_trust(self):
        original = json.loads(host.payload(configuration(), 'a' * 32, '172.30.4.2'))
        for mutation in ('path', 'role', 'runtime', 'proxy', 'duplicate-key', 'invalid-pem', 'wrong-run'):
            value = copy.deepcopy(original)
            if mutation == 'path':
                value['documents']['tox21']['../escape'] = 'hidden-value'
            elif mutation == 'role':
                value['documents']['postgres'] = {}
            elif mutation == 'invalid-pem':
                value['documents']['tox21']['http-public.pem'] = 'not-a-public-pem'
            elif mutation == 'wrong-run':
                value['runId'] = 'b' * 32
            else:
                doc = json.loads(value['documents']['web-node']['values.json'])
                if mutation == 'runtime': doc['variables']['NODE_OPTIONS'] = 'hidden-value'
                elif mutation == 'proxy': doc['variables']['APP_TRUSTED_PROXY_CIDRS'] = '["0.0.0.0/0"]'
                else: doc['variables']['MEILISEARCH_LOG_KEY'] = doc['variables']['MEILISEARCH_MASTER_KEY']
                value['documents']['web-node']['values.json'] = json.dumps(doc)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError) as error:
                receiver.validate(json.dumps(value).encode(), 'a' * 32)
            self.assertNotIn('hidden-value', str(error.exception))

    def test_bundle_allowlist_rejects_extra_path_before_opening_any_file(self):
        manifest = dict(schemaVersion=1, scope='preview-applications-only', runId='a'*32,
            serverRunId='b'*32, serverManifestSha256='c'*64, releaseRevision='d'*40, toolRevision='e'*40,
            files={name:'f'*64 for name in bundle.expected_files()} | {'../../private':'f'*64})
        with patch.object(bundle.servers.transport, 'read', return_value=manifest), \
                patch.object(bundle.servers.delivery, 'checksum') as checksum, self.assertRaises(ValueError):
            bundle.verify(Path('synthetic'))
        checksum.assert_not_called()

    def test_existing_attempt_stops_before_private_configuration_read(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'execution-state.json').write_text('{}')
            with patch.object(host, 'os', SimpleNamespace(name='nt')), self.assertRaisesRegex(ValueError, 'already-attempted'):
                host.execute(root, {}, root / 'not-present-private.json')

    def test_ssh_transfer_failure_is_recorded_without_retry_or_activation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            private = root / 'synthetic.json'
            private.write_text(json.dumps(configuration()))
            with patch.object(host, 'os', SimpleNamespace(name='nt')), \
                    patch.object(host.preview_credentials, 'validate'), \
                    patch.object(bundle.servers.delivery, 'checksum', return_value='d'*64), \
                    patch.object(host.subprocess, 'run', return_value=SimpleNamespace(returncode=1)) as process, \
                    patch.object(host, 'transport') as transport, patch('builtins.print'), \
                    self.assertRaisesRegex(ValueError, 'public-transfer'):
                host.execute(root, {'runId':'a'*32}, private)
            process.assert_called_once()
            transport.assert_not_called()
            state = json.loads((root / 'execution-state.json').read_text())
            self.assertEqual((state['phase'], state['status']), ('public-transfer', 'failed'))

    def test_schema_failure_never_starts_applications_or_registers_members(self):
        rid = 'a'*32
        loaded = {role:dict(imageId='sha256:'+'b'*64) for role in ('web-node','web-ng','tox21','edge')}
        models = {'shared':{}, 'preview':{}}
        prepared = dict(status='ready', runId=rid, loaded=loaded, edgeId='edge', edgeAddress='172.30.4.2')
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            private = base / rid / 'active/web-node'
            private.mkdir(parents=True)
            node = json.loads(host.payload(configuration(), rid, '172.30.4.2'))['documents']['web-node']['values.json']
            (private / 'values.json').write_text(node)
            def docker(*args, **kwargs):
                if args[0] == 'exec': return '1'
                raise ValueError('application-docker-operation')
            with patch.object(receiver, 'guard'), patch.object(receiver, 'apply'), patch.object(receiver, 'BASE', base), \
                    patch.object(cold, 'read', side_effect=[prepared, {}, {}]), \
                    patch.object(bundle.servers.transport, 'read', return_value={}), \
                    patch.object(bundle, 'projection', return_value=models), patch.object(guest, 'address', return_value=prepared['edgeAddress']), \
                    patch.object(guest.snapshot, 'inventory', return_value={'containers':[{'service':'postgres-preview','id':'postgres'}]}), \
                    patch.object(guest, 'docker', side_effect=docker) as calls, self.assertRaises(ValueError):
                guest.activate(base, dict(runId=rid, serverRunId='b'*32, serverManifestSha256='c'*64), {})
            self.assertFalse(any('up' in call.args for call in calls.call_args_list))
            self.assertFalse((base / 'application-members.json').exists())

    def test_registered_applications_are_pinned_and_unknown_or_running_drift_is_rejected(self):
        roles = {'nginx-edge':'mercurion-shared','web-node-preview':'mercurion-preview',
                 'web-ng-preview':'mercurion-preview','tox21-preview':'mercurion-preview'}
        members = [dict(service=name, project=project, id=str(index)*64, image='sha256:'+str(index)*64)
                   for index,(name,project) in enumerate(roles.items(), 1)]
        record = dict(schemaVersion=1, serverRunId='a'*32, appRunId='b'*32,
                      appManifestSha256=hashlib.sha256(b'public').hexdigest(), members=members)
        def inspect(*args):
            member = next(m for m in members if m['id'] == args[-1])
            return json.dumps(dict(Id=member['id'], Image=member['image'], State=dict(Running=False),
                Config=dict(Labels={'com.docker.compose.service':member['service'],
                    'com.docker.compose.project':member['project'], 'mercurion.application.run':'b'*32}),
                HostConfig=dict(ReadonlyRootfs=True, Privileged=False, PortBindings={})))
        current = dict(runId='a'*32, containers=[dict(running=False)])
        with patch.object(cold.os.path, 'lexists', return_value=True), patch.object(cold, 'read', return_value=record), \
                patch.object(cold.snapshot, 'regular', return_value=b'public'), patch.object(cold.snapshot, 'docker', side_effect=inspect):
            self.assertEqual(cold.registered_applications(current), members)
            record['appManifestSha256'] = 'f'*64
            with self.assertRaisesRegex(ValueError, 'manifest'):
                cold.registered_applications(current)


class ProjectionContracts(unittest.TestCase):
    def test_projection_reuses_server_networks_and_never_mounts_server_secrets(self):
        models = bundle.preview_compose.render()
        before = copy.deepcopy(models)
        loaded = {role:dict(imageId='sha256:'+str(n)*64) for n,role in enumerate(('web-ng','web-node','tox21','edge'),1)}
        result = bundle.projection(models, loaded, 'a'*32)
        self.assertEqual(models, before)
        self.assertEqual(sum(len(m['services']) for m in result.values()), 4)
        self.assertTrue(all(not m['volumes'] for m in result.values()))
        for model in result.values():
            for spec in model['services'].values():
                self.assertFalse(spec.get('ports'))
                for mount in spec.get('volumes', []):
                    self.assertTrue(mount['read_only'])
                    self.assertNotIn('/run/mercurion-preview', mount['source'])
        for name in ('data','bus','web','search'):
            self.assertTrue(result['preview']['networks'][name]['external'])
        with self.assertRaises(ValueError): bundle.projection(models, loaded, '../escape')


@unittest.skipUnless(os.environ.get('PREVIEW_SECRET_FIXTURE') == '1' and sys.platform == 'linux',
                     'Disposable root Linux tmpfs only')
class TmpfsContracts(unittest.TestCase):
    def test_real_receive_apply_isolates_uids_and_prevents_reuse(self):
        import pwd
        rid = uuid.uuid4().hex
        receiver.prepare(rid, 'nobody')
        account = pwd.getpwnam('nobody')
        data = host.payload(configuration(), rid, '172.30.4.2')
        child = os.fork()
        if child == 0:
            try:
                os.setgid(account.pw_gid); os.setuid(account.pw_uid)
                receiver.receive(rid, io.BytesIO(data)); os._exit(0)
            except Exception: os._exit(1)
        self.assertEqual(os.waitpid(child, 0)[1], 0)
        receiver.apply(rid)
        receiver.inspect(rid)
        for role,(uid,gid,names) in receiver.ROLES.items():
            for name in names:
                info = (receiver.BASE / rid / 'active' / role / name).stat()
                self.assertEqual((info.st_uid,info.st_gid,stat.S_IMODE(info.st_mode)), (uid,gid,0o400))
        self.assertFalse((receiver.BASE / rid / 'inbox/payload.json').exists())
        with self.assertRaises(OSError): receiver.prepare(rid, 'nobody')
        with self.assertRaises(ValueError): receiver.apply(rid)

    def test_public_copy_handles_windows_modes_and_pins_bytes_before_execution(self):
        import pwd
        rid = uuid.uuid4().hex
        account = pwd.getpwnam('nobody')
        home = Path('/tmp') / ('app-owner-'+rid)
        source = home / ('vm045-applications-'+rid)
        source.mkdir(parents=True)
        name = 'scripts/infrastructure/guest_preview_applications.py'
        script = source / name
        script.parent.mkdir(parents=True)
        script.write_text('# public\n')
        manifest = source / 'application-bootstrap.json'
        manifest.write_text(json.dumps(dict(runId=rid, files={name:hashlib.sha256(script.read_bytes()).hexdigest()})))
        digest = hashlib.sha256(manifest.read_bytes()).hexdigest()
        for path in (source, *source.rglob('*')):
            os.chown(path, account.pw_uid, account.pw_gid)
            path.chmod(0o777 if path.is_dir() else 0o666)
        owner = SimpleNamespace(pw_dir=str(home), pw_uid=account.pw_uid, pw_gid=account.pw_gid)
        with patch.object(pwd,'getpwnam',return_value=owner), patch.dict(os.environ, SUDO_USER='nobody'), \
                patch.object(sys,'argv',['copy',rid,digest]), patch.object(runpy,'run_path') as execute:
            exec(compile(host.COPY,'<app-copy>','exec'), {'EXPECTED_FILES':{name}})
        execute.assert_called_once()
        target = Path('/opt/mercurion/releases') / ('application-'+rid) / name
        self.assertEqual(target.read_bytes(), script.read_bytes())
        self.assertEqual((target.stat().st_uid, stat.S_IMODE(target.stat().st_mode)), (0,0o644))


if __name__ == '__main__':
    unittest.main()
