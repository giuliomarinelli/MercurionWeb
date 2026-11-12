"""Recovery guards, existing-container lifecycle and redacted transport; synthetic fixtures only."""
import contextlib
import copy
import io
import json
import hashlib
import subprocess
import uuid
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, MagicMock, patch

import guest_preview_cold_recovery as guest
import preview_cold_recovery as host

RID = 'a' * 32
ATTEMPT = 'b' * 32
INSPECTION = 'c' * 32


def fixture():
    models = {'shared': dict(name='mercurion-shared', services={}, volumes={}, networks={}),
              'preview': dict(name='mercurion-preview', services={}, volumes={}, networks={})}
    loaded, containers, volumes = {}, [], []
    for index, (name, role) in enumerate(guest.ROLES.items(), 1):
        project = 'shared' if role == 'meilisearch' else 'preview'
        model = models[project]
        network = 'search' if role == 'meilisearch' else 'bus' if role == 'nats' else 'data'
        model['networks'][network] = dict(name='mercurion_stg_' + network)
        spec = dict(networks={network: {}}, volumes=[dict(type='bind', source='/run/fixture/' + role,
                                                        target='/run/mercurion', read_only=True)])
        mounts = [dict(Type='bind', Source='/run/fixture/' + role, Destination='/run/mercurion', RW=False)]
        if role != 'nats':
            key = ('meili' if role == 'meilisearch' else role) + '-data'
            volume = 'mercurion_shared_meili' if role == 'meilisearch' else 'mercurion_preview_' + role
            model['volumes'][key] = dict(name=volume)
            spec['volumes'].append(dict(type='volume', source=key, target='/data'))
            mounts.append(dict(Type='volume', Name=volume, Destination='/data', RW=True))
            volumes.append(dict(name=volume, driver='local', labels={'com.docker.compose.project': model['name'],
                'com.docker.compose.volume': key, 'mercurion.bootstrap.run': RID}))
        model['services'][name] = spec
        loaded[role] = dict(imageId='sha256:' + str(index) * 64)
        containers.append(dict(service=name, id=str(index) * 64, image=loaded[role]['imageId'],
            status='exited', running=False, mounts=mounts,
            networks={'mercurion_stg_' + network: {'IPAddress': '', 'GlobalIPv6Address': ''}}))
    current = dict(runId=RID, status='inventoried', coldRecoveryCandidate=True, inspectionId=INSPECTION,
                   bootId='fixture-boot', runIsTmpfs=True, secretRunPresent=False, containers=containers, volumes=volumes)
    return current, models, loaded


class RecoveryContracts(unittest.TestCase):
    def test_existing_resources_are_accepted_without_mutations(self):
        current, models, loaded = fixture()
        with patch.object(guest.snapshot, 'docker') as docker:
            guest.validate_state(current, copy.deepcopy(current), models, loaded)
            docker.assert_not_called()

    def test_changed_boot_running_container_image_mount_network_or_volume_is_rejected(self):
        previous, models, loaded = fixture()
        changes = [lambda x: x.update(bootId='different'), lambda x: x.update(runIsTmpfs=False),
            lambda x: x['containers'][0].update(running=True), lambda x: x['containers'][0].update(id='f' * 64),
            lambda x: x['containers'][0].update(image='sha256:' + 'f' * 64),
            lambda x: x['containers'][0]['mounts'][0].update(RW=True),
            lambda x: x['containers'][0]['mounts'][0].update(Source='/other'),
            lambda x: x['containers'][0].update(networks={'other': {}}),
            lambda x: x['volumes'][0].update(driver='other'),
            lambda x: x['volumes'][0]['labels'].update({'mercurion.bootstrap.run': 'other'}),
            lambda x: x['volumes'].pop()]
        for change in changes:
            current = copy.deepcopy(previous)
            change(current)
            with self.subTest(change=change), self.assertRaises(ValueError):
                guest.validate_state(current, previous, models, loaded)

    def test_cold_inspection_required(self):
        current, models, loaded = fixture()
        for change in (dict(status='failed'), dict(coldRecoveryCandidate=False)):
            with self.assertRaises(ValueError):
                guest.validate_state(current, current | change, models, loaded)

    def test_empty_volume_is_rejected_and_existing_markers_are_not_changed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            paths = {name: root / name for name in ('mercurion_preview_postgres', 'mercurion_preview_redis', 'mercurion_shared_meili')}
            for path in paths.values():
                path.mkdir()
            with self.assertRaisesRegex(ValueError, 'marker-missing'):
                guest.markers(paths)
            pg, redis, meili = paths.values()
            (pg / 'global').mkdir()
            (pg / 'PG_VERSION').write_text('16\n')
            (pg / 'global/pg_control').write_bytes(b'synthetic-control')
            (redis / 'appendonlydir').mkdir()
            manifest = redis / 'appendonlydir/appendonly.aof.manifest'
            manifest.write_text('synthetic-aof-manifest')
            (meili / 'data.ms').mkdir()
            (meili / 'data.ms/fixture').write_text('synthetic-persisted-marker')
            self.assertTrue(guest.markers(paths))
            self.assertEqual(manifest.read_text(), 'synthetic-aof-manifest')
            (pg / 'PG_VERSION').write_text('17')
            with self.assertRaisesRegex(ValueError, 'marker-missing'):
                guest.markers(paths)

    def test_preflight_rejects_changed_metadata_before_preparing_secrets(self):
        previous, models, loaded = fixture()
        receiver = Mock()
        with patch.object(guest, 'read', return_value=previous), \
                patch.object(guest.snapshot, 'inventory', return_value=previous | dict(bootId='changed')), \
                patch.object(guest, 'resources') as resources:
            with self.assertRaises(ValueError):
                guest.prepare(Path('/unused'), {'runId': RID}, 'd' * 64, INSPECTION, ATTEMPT, {}, receiver, models, loaded)
            resources.assert_not_called()
            receiver.prepare.assert_not_called()

    def test_data_guard_failure_prevents_secret_apply_and_start(self):
        previous, models, loaded = fixture()
        prepared = dict(status='prepared', attemptId=ATTEMPT, bootId=previous['bootId'], originalState=previous)
        receiver = Mock()
        with patch.object(guest, 'read', side_effect=[prepared, {'attemptId': ATTEMPT}]), \
                patch.object(guest.snapshot, 'inventory', return_value=copy.deepcopy(previous)), \
                patch.object(guest, 'resources', side_effect=ValueError('persistent-data-marker-missing')), \
                patch.object(guest.snapshot, 'docker') as docker:
            with self.assertRaisesRegex(ValueError, 'marker-missing'):
                guest.activate(Path('/unused'), {'runId': RID}, 'd' * 64, ATTEMPT, {}, Mock(), receiver, models, loaded)
            receiver.apply.assert_not_called()
            docker.assert_not_called()

    def test_success_starts_only_original_ids_and_runs_persistence_checks(self):
        previous, models, loaded = fixture()
        prepared = dict(status='prepared', attemptId=ATTEMPT, bootId=previous['bootId'], originalState=previous)
        receiver = SimpleNamespace(BASE=Path('/run/synthetic'), apply=Mock(), inspect=Mock())
        servers = SimpleNamespace(retry=lambda check, container: check(), postgres_check=Mock(return_value=True),
            redis_check=Mock(return_value=True), nats_check=Mock(return_value=True), meili_check=Mock(return_value=True))
        def docker(*args):
            if args[0] == 'start':
                return args[1]
            self.assertEqual(args[:3], ('inspect', '--format', '{{json .NetworkSettings.Networks}}'))
            return json.dumps({'private': {'IPAddress': '172.18.0.2', 'GlobalIPv6Address': ''}})
        report = {}
        with patch.object(guest, 'read', side_effect=[prepared, {'attemptId': ATTEMPT}]), \
                patch.object(guest.snapshot, 'inventory', return_value=copy.deepcopy(previous)), \
                patch.object(guest, 'resources'), patch.object(guest.snapshot, 'docker', side_effect=docker) as calls, \
                patch.object(guest, 'meili_indexes', return_value=True) as indexes, \
                patch.object(guest, 'authenticated_nats', return_value=True) as nats:
            guest.activate(Path('/unused'), {'runId': RID}, 'd' * 64, ATTEMPT, report, servers, receiver, models, loaded)
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(set(report['originalContainers']), {item['id'] for item in previous['containers']})
        self.assertTrue(all(report['checks'].values()))
        self.assertEqual([call.args for call in calls.call_args_list if call.args[0] == 'start'],
                         [('start', item['id']) for item in previous['containers']])
        self.assertTrue(all(call.args[0] in ('start', 'inspect') for call in calls.call_args_list))
        indexes.assert_called_once()
        nats.assert_called_once()

    def test_final_readback_cannot_pass_with_a_server_missing(self):
        for running in ('', '1' * 64):
            with tempfile.TemporaryDirectory() as directory:
                base = Path(directory)
                root = base / ('server-' + RID)
                root.mkdir()
                def activated(*args):
                    args[4].update(status='passed', phase='finished', servicesStarted=True,
                                   originalContainers=[str(n) * 64 for n in range(1, 5)])
                with patch.object(guest.snapshot, 'BASE', base), \
                        patch.object(guest, 'original', return_value=(Mock(), Mock(), {'runId': RID}, {}, {})), \
                        patch.object(guest, 'activate', side_effect=activated), \
                        patch.object(guest.snapshot, 'docker', return_value=running), \
                        patch('sys.argv', ['recovery', 'activate', '--run-id', RID, '--manifest-sha256', 'd' * 64,
                                           '--inspection-id', INSPECTION, '--attempt-id', ATTEMPT]), \
                        contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(guest.main(), 1)
                result = json.loads((root / ('recovery-' + ATTEMPT + '-activate.json')).read_text())
                self.assertEqual(result['status'], 'failed')
                self.assertEqual(result['code'], 'server-ended-after-readiness')

    def test_prepare_marker_reservation_prevents_second_attempt(self):
        previous, models, loaded = fixture()
        receiver = Mock()
        with tempfile.TemporaryDirectory() as directory, patch.object(guest, 'read', return_value=previous), \
                patch.object(guest.snapshot, 'inventory', side_effect=lambda *_: copy.deepcopy(previous)), \
                patch.object(guest, 'resources'), patch.dict(os.environ, {'SUDO_USER': 'synthetic-owner'}):
            report = {}
            guest.prepare(Path(directory), {'runId': RID}, 'd' * 64, INSPECTION, ATTEMPT, report, receiver, models, loaded)
            self.assertEqual(report['status'], 'prepared')
            with self.assertRaises(FileExistsError):
                guest.prepare(Path(directory), {'runId': RID}, 'd' * 64, INSPECTION, 'e' * 32, {}, receiver, models, loaded)
            receiver.prepare.assert_called_once()

    def test_plan_never_reads_private_configuration_or_starts_ssh(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(host.bundle, 'verify', return_value={'runId': RID}), \
                patch.object(host, 'inspection', return_value={}), patch.object(host, 'execute') as execute, \
                patch('sys.argv', ['recovery', '--bundle', directory, '--inspection-id', INSPECTION]), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(host.main(), 0)
            self.assertFalse(json.loads(output.getvalue())['privateConfigurationRead'])
            execute.assert_not_called()


class ExistingVerificationContracts(unittest.TestCase):
    def test_existing_running_recovery_is_checked_without_applying_or_starting(self):
        previous, models, loaded = fixture()
        current = copy.deepcopy(previous)
        for item in current['containers']:
            item.update(status='running', running=True)
        current['secretRunPresent'] = True
        receiver = Mock()
        prepared = dict(status='prepared', attemptId=ATTEMPT, originalState=previous)
        started = dict(status='failed', attemptId=ATTEMPT, servicesStarted=True)
        with patch.object(guest, 'read', side_effect=[prepared, started]), \
                patch.object(guest.snapshot, 'inventory', return_value=current), patch.object(guest, 'resources'), \
                patch.object(guest, 'verify_services') as verify, patch.object(guest.snapshot, 'docker') as docker:
            guest.verify_existing(Path('/unused'), {'runId': RID}, 'f' * 64, ATTEMPT, {}, Mock(), receiver, models, loaded)
        verify.assert_called_once()
        docker.assert_not_called()
        receiver.apply.assert_not_called()
        receiver.prepare.assert_not_called()
        receiver.receive.assert_not_called()

    def test_partial_results_and_exact_failed_probe_survive_failure(self):
        current, _, _ = fixture()
        receiver = Mock(BASE=Path('/run/synthetic'))
        servers = SimpleNamespace(retry=lambda check, container: check(), postgres_check=Mock(return_value=True),
            redis_check=Mock(return_value=True), nats_check=Mock(return_value=True), meili_check=Mock(return_value=True))
        network = json.dumps({'private': {'IPAddress': '172.18.0.2', 'GlobalIPv6Address': ''}})
        report = {}
        with patch.object(guest.snapshot, 'docker', return_value=network), \
                patch.object(guest, 'authenticated_nats', side_effect=ValueError('nats-authentication')):
            with self.assertRaisesRegex(ValueError, 'nats-authentication'):
                guest.verify_services(current, {'runId': RID}, report, servers, receiver)
        self.assertEqual(report['failedCheck'], 'natsConsumerCredentials')
        self.assertEqual(report['probeErrorCode'], 'nats-authentication')
        self.assertEqual(report['checks'], dict(postgresRoleAndVector=True, redisAuthAndKeyevents=True,
                                              natsAuthRequired=True, natsConsumerCredentials=False))
        servers.meili_check.assert_not_called()

    def test_host_verification_has_no_private_payload_and_cleans_only_its_helpers(self):
        verification = 'd' * 32
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'receipts').mkdir()
            (root / 'server-bootstrap.json').write_text('{}')
            previous = dict(runId=RID, attemptId=ATTEMPT, status='failed', servicesStarted=True)
            (root / 'receipts' / ('recovery-' + ATTEMPT + '-activate.json')).write_text(json.dumps(previous))
            result = dict(runId=RID, attemptId=ATTEMPT, verificationId=verification, status='passed',
                          serverMutationsPerformed=False, meilisearchAddress='172.18.0.2')
            cleanup = '\n'.join(json.dumps(dict(runId=value, phase='code-removed')) for value in (verification, ATTEMPT)).encode()
            responses = [(0, json.dumps({'runId': verification}).encode()), (0, None), (0, cleanup)]
            with patch.object(host, 'os', SimpleNamespace(name='nt')), \
                    patch.object(host.uuid, 'uuid4', return_value=SimpleNamespace(hex=verification)), \
                    patch.object(host, 'transport', side_effect=responses) as transport, \
                    patch.object(host, 'payload') as payload, \
                    patch.object(host, 'fetch', return_value=(result, root / 'verified.json')), \
                    contextlib.redirect_stdout(io.StringIO()):
                value = host.verify_existing(root, {'runId': RID}, {'inspectionId': INSPECTION}, ATTEMPT)
            payload.assert_not_called()
            self.assertFalse(value['serverMutationsPerformed'])
            self.assertFalse(value['privateConfigurationRead'])
            steps = [call.args[0] for call in transport.call_args_list]
            self.assertEqual([step.phase for step in steps], ['staged', 'verify', 'code-removed'])
            self.assertTrue(steps[1].interactive)
            self.assertIsNone(steps[1].data)
            self.assertEqual(json.loads((root / 'receipts' / ('recovery-' + ATTEMPT + '-activate.json')).read_text()), previous)


class AuthenticationContracts(unittest.TestCase):
    def test_log_index_check_uses_master_without_creating_or_printing_values(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'server.toml'
            path.write_text('master_key="synthetic-marker"', encoding='utf-8')
            opener = Mock()
            opener.open.return_value = io.BytesIO(json.dumps({'results': [{'uid': uid, 'primaryKey': 'id'} for uid in guest.INDEXES]}).encode())
            with patch.object(guest.urllib.request, 'build_opener', return_value=opener), contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertTrue(guest.meili_indexes('172.18.0.2', path))
            request = opener.open.call_args.args[0]
            self.assertEqual(request.get_method(), 'GET')
            self.assertEqual(request.get_header('Authorization'), 'Bearer synthetic-marker')
            self.assertEqual(output.getvalue(), '')
            opener.open.return_value = io.BytesIO(b'{"results":[]}')
            with patch.object(guest.urllib.request, 'build_opener', return_value=opener):
                with self.assertRaisesRegex(ValueError, 'log-indexes-missing'):
                    guest.meili_indexes('172.18.0.2', path)

    def test_nats_requires_pong_after_authentication_for_both_users(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'server.json'
            path.write_text(json.dumps({'authorization': {'users': [dict(user='node', password='synthetic-node'), dict(user='tox', password='synthetic-tox')]}}))
            connection = MagicMock()
            connection.__enter__.return_value = connection
            connection.makefile.side_effect = [io.BytesIO(b'INFO {}\r\n+OK\r\nPONG\r\n') for _ in range(2)]
            with patch.object(guest.socket, 'create_connection', return_value=connection) as connect:
                self.assertTrue(guest.authenticated_nats('172.18.0.2', path))
            self.assertEqual(connect.call_count, 2)
            for call in connection.sendall.call_args_list:
                message = json.loads(call.args[0].split(b'\r\n')[0][8:])
                self.assertIn('pass', message)
                self.assertNotIn('password', message)
            connection.makefile.side_effect = [io.BytesIO(b"INFO {}\r\n-ERR 'Authorization Violation'\r\n")]
            with patch.object(guest.socket, 'create_connection', return_value=connection):
                with self.assertRaisesRegex(ValueError, '^nats-authentication$'):
                    guest.authenticated_nats('172.18.0.2', path)

    def test_marker_qa_records_guard_execution_in_the_server_result(self):
        import qa_preview_recovery_markers as qa
        with patch.object(qa, 'original_wait', return_value='{"health":true}'), \
                patch.object(qa.fixture, 'value', side_effect=['/preview-qa-synthetic-meilisearch-server', 'PERSISTENT_MARKERS_OK']), \
                contextlib.redirect_stdout(io.StringIO()):
            result = json.loads(qa.wait_with_markers('container-id', lambda: None))
        self.assertTrue(result['persistenceMarkers'])


class HostTransportContracts(unittest.TestCase):
    def run_fixture(self, success):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'receipts').mkdir()
            (root / 'server-bootstrap.json').write_text('{}')
            configuration = root / 'synthetic-config.json'
            configuration.write_text('{}')
            inspected = dict(inspectionId=INSPECTION, bootId='fixture-boot')
            prepared = dict(status='prepared', runId=RID, attemptId=ATTEMPT, bootId='fixture-boot')
            result = dict(status='passed' if success else 'failed', runId=RID, attemptId=ATTEMPT,
                          servicesStarted=True, meilisearchAddress='172.18.0.2')
            responses = [(0, json.dumps({'runId': ATTEMPT}).encode()), (0, None),
                (0, json.dumps(dict(runId=RID, phase='received', consumer='preview-servers')).encode()),
                (0 if success else 1, None), (0, json.dumps({'phase': 'code-removed'}).encode())]
            with patch.object(host, 'os', SimpleNamespace(name='nt')), patch.object(host, 'payload', return_value=b'synthetic-private-marker'), \
                    patch.object(host.uuid, 'uuid4', return_value=SimpleNamespace(hex=ATTEMPT)), \
                    patch.object(host, 'transport', side_effect=responses) as transport, \
                    patch.object(host, 'fetch', side_effect=[(prepared, root / 'prepared.json'), (result, root / 'result.json')]), \
                    contextlib.redirect_stdout(io.StringIO()) as output:
                if success:
                    answer = host.execute(root, {'runId': RID}, inspected, configuration)
                    self.assertEqual(answer['status'], 'passed')
                else:
                    with self.assertRaisesRegex(ValueError, 'recovery-incomplete'):
                        host.execute(root, {'runId': RID}, inspected, configuration)
            self.assertNotIn('synthetic-private-marker', output.getvalue())
            steps = [call.args[0] for call in transport.call_args_list]
            self.assertEqual([step.phase for step in steps],
                             ['staged', 'prepare', 'receive', 'activate'] + (['code-removed'] if success else []))
            self.assertTrue(all(step.data is None for step in steps if step.interactive))
            self.assertEqual(steps[2].data, b'synthetic-private-marker')
            state = json.loads(next((root / 'receipts').glob('*state.json')).read_text())
            self.assertEqual(state['status'], 'passed' if success else 'failed')
            if not success:
                self.assertEqual(state['phase'], 'original-server-start-and-readiness')

    def test_success_payload_only_on_noninteractive_ssh_stdin(self):
        self.run_fixture(True)

    def test_partial_start_is_preserved_without_retry_or_helper_removal(self):
        self.run_fixture(False)


@unittest.skipUnless(os.environ.get('PREVIEW_COLD_DOCKER_FIXTURE') == '1', 'Opt-in local Docker inode replacement fixture')
class DockerBindFixture(unittest.TestCase):
    def test_start_existing_container_reopens_replaced_read_only_bind(self):
        prefix = ['docker', '--context', 'desktop-linux'] if os.name == 'nt' else ['docker']
        def run(*args):
            return subprocess.check_output([*prefix, *args], text=True, timeout=30).strip()
        name = 'recovery-bind-fixture-' + uuid.uuid4().hex
        container = None
        volume = False
        image = 'python:3.11-slim-trixie'
        try:
            run('image', 'inspect', image)
            run('volume', 'create', name)
            volume = True
            def replace(value):
                run('run', '--rm', '--pull', 'never', '--network', 'none', '--read-only', '--mount',
                    'type=volume,source=' + name + ',target=/fixture', image, 'python', '-c',
                    "from pathlib import Path;p=Path('/fixture/value');p.unlink(missing_ok=True);p.write_text('" + value + "');p.chmod(0o400)")
            replace('first')
            source = run('volume', 'inspect', '--format', '{{.Mountpoint}}', name) + '/value'
            container = run('create', '--pull', 'never', '--network', 'none', '--read-only', '--mount',
                'type=bind,source=' + source + ',target=/value,readonly', image,
                'python', '-c', "from pathlib import Path;print(Path('/value').read_text())")
            self.assertEqual(run('start', '-a', container), 'first')
            replace('second')
            self.assertEqual(run('start', '-a', container), 'second')
        finally:
            if container:
                run('rm', container)
            if volume:
                run('volume', 'rm', name)


@unittest.skipUnless(sys.platform == 'linux' and os.environ.get('PREVIEW_COLD_LINUX_FIXTURE') == '1',
                     'Opt-in disposable root Linux loader fixture')
class LinuxLoaderFixture(unittest.TestCase):
    def test_root_loader_executes_only_owner_bytes_matching_the_pinned_hash(self):
        import pwd
        account = pwd.getpwnam('nobody')
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            run = home / '.mercurion-infra' / ('recovery-' + ATTEMPT)
            run.mkdir(parents=True)
            for path in (run.parent, run):
                path.chmod(0o700)
                os.chown(path, account.pw_uid, account.pw_gid)
            raw = json.dumps({'guest_preview_recovery_inventory': 'validated=True',
                'guest_preview_cold_recovery': "import sys;assert sys.argv[1]=='prepare';print('PINNED_HELPERS_OK')"}).encode()
            helper = run / 'helpers.json'
            helper.write_bytes(raw)
            helper.chmod(0o600)
            os.chown(helper, account.pw_uid, account.pw_gid)
            owner = SimpleNamespace(pw_dir=str(home), pw_uid=account.pw_uid)
            arguments = ['loader', ATTEMPT, hashlib.sha256(raw).hexdigest(), 'prepare', RID, INSPECTION, 'd' * 64]
            with patch.object(pwd, 'getpwnam', return_value=owner), patch.dict(os.environ, {'SUDO_USER': 'nobody'}), \
                    patch('sys.argv', arguments), patch.dict(sys.modules), contextlib.redirect_stdout(io.StringIO()) as output:
                exec(compile(host.LOAD, '<loader-fixture>', 'exec'), {})
            self.assertEqual(output.getvalue().strip(), 'PINNED_HELPERS_OK')
            helper.write_bytes(raw + b' ')
            with patch.object(pwd, 'getpwnam', return_value=owner), patch.dict(os.environ, {'SUDO_USER': 'nobody'}), \
                    patch('sys.argv', arguments), self.assertRaises(AssertionError):
                exec(compile(host.LOAD, '<loader-fixture>', 'exec'), {})


@unittest.skipUnless(os.environ.get('PREVIEW_COLD_NATS_FIXTURE') == '1', 'Opt-in real local NATS authentication fixture')
class RealNatsFixture(unittest.TestCase):
    def test_real_connect_protocol_accepts_both_users_and_rejects_wrong_password(self):
        import socket
        import time
        prefix = ['docker', '--context', 'desktop-linux'] if os.name == 'nt' else ['docker']
        def docker(*args):
            return subprocess.check_output([*prefix, *args], text=True, timeout=30).strip()
        identifier = None
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'synthetic-nats.json'
            users = [dict(user='synthetic-node', password='synthetic-node-password'),
                     dict(user='synthetic-tox', password='synthetic-tox-password')]
            path.write_text(json.dumps({'port': 4222, 'authorization': {'users': users}}), encoding='utf-8')
            image = os.environ.get('PREVIEW_COLD_NATS_IMAGE', 'sha256:ca1d4783151aab46ae6b4e0d62d9bab3614fffc8b2dc1e557bac27b4490163df')
            try:
                identifier = docker('run', '-d', '--pull', 'never', '--read-only', '--cap-drop', 'ALL',
                    '--user', '10021:10021', '--publish', '127.0.0.1::4222',
                    '--mount', 'type=bind,source=' + str(path.resolve()) + ',target=/synthetic-nats.json,readonly',
                    image, '--config', '/synthetic-nats.json')
                port = int(docker('port', identifier, '4222/tcp').rsplit(':', 1)[1])
                connect = socket.create_connection
                for _ in range(40):
                    try:
                        with connect(('127.0.0.1', port), timeout=1) as stream:
                            if stream.recv(16384).startswith(b'INFO '):
                                break
                    except OSError:
                        time.sleep(.1)
                else:
                    self.fail('Synthetic broker not ready')
                def connection(address, timeout):
                    return connect(('127.0.0.1', port), timeout=timeout)
                with patch.object(guest.socket, 'create_connection', side_effect=connection):
                    self.assertTrue(guest.authenticated_nats('127.0.0.1', path))
                    wrong = Path(directory) / 'wrong.json'
                    wrong.write_text(json.dumps({'authorization': {'users': [dict(user='synthetic-node', password='wrong')]}}))
                    with self.assertRaisesRegex(ValueError, '^nats-authentication$'):
                        guest.authenticated_nats('127.0.0.1', wrong)
            finally:
                if identifier:
                    docker('rm', '--force', identifier)


if __name__ == '__main__':
    unittest.main()
