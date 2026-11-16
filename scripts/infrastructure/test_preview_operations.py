"""Owner tooling tests: synthetic credentials, fake SSH/Docker, no live VM access."""
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import restore_preview_secrets as secrets
import preview_application_rollout as rollout
import test_preview_credentials as fixtures

EXAMPLE = Path(__file__).with_name('preview-operations.example.json')


class RestoreTests(unittest.TestCase):
    def test_profile_rejects_unknown_fields_and_path_traversal(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'profile.json'
            value = secrets.profile(EXAMPLE)
            for change in ({'sshHost': '-oProxyCommand=evil'}, {'serverRelease': '/opt/mercurion/releases/../secret'},
                           {'password': 'not-public'}):
                path.write_text(json.dumps({**value, **change}))
                with self.assertRaises(ValueError):
                    secrets.profile(path)

    def run_restore(self, folder, active):
        config = Path(folder)/'configuration.json'
        token = Path(folder)/'token'
        configuration = fixtures.PreviewCredentialTests().configuration()
        configuration['applicationSecrets']['JWT_RS256_PUBLIC_KEY'] = '-----BEGIN PUBLIC KEY-----\nsynthetic\n-----END PUBLIC KEY-----'
        config.write_text(json.dumps(configuration))
        token.write_text('synthetic-cloudflare-token')
        calls = []
        def ssh(host, script, args=(), **options):
            calls.append((script, args, options))
            if script == secrets.STATUS:
                return json.dumps(dict(status='already-active' if active else 'prepared', edgeAddress='172.22.0.2')).encode()
            if script == secrets.CF_STATUS:
                return b'active' if active else b'prepared'
            return b''
        output = io.StringIO()
        with patch.object(secrets, 'ssh', side_effect=ssh), redirect_stdout(output):
            result = secrets.restore(secrets.profile(EXAMPLE), config, token)
        self.assertNotIn('synthetic-cloudflare-token', output.getvalue())
        self.assertFalse(result['servicesStarted'])
        return calls

    def test_post_reboot_uses_stdin_and_never_shares_sudo_stdin(self):
        with tempfile.TemporaryDirectory() as folder:
            calls = self.run_restore(folder, False)
        sends = [entry for entry in calls if entry[2].get('data') is not None]
        self.assertEqual(len(sends), 3)
        self.assertTrue(all(not options.get('sudo') for _, _, options in sends))
        application = json.loads(sends[1][2]['data'])
        values = json.loads(application['documents']['web-node']['values.json'])['variables']
        self.assertEqual(json.loads(values['APP_TRUSTED_PROXY_CIDRS']), ['172.22.0.2/32'])
        self.assertNotIn('master_key', sends[1][2]['data'].decode())

    def test_already_active_secrets_are_not_replaced(self):
        with tempfile.TemporaryDirectory() as folder:
            calls = self.run_restore(folder, True)
        self.assertFalse(any(options.get('data') for _, _, options in calls))
        self.assertFalse(any(script in (secrets.APPLY, secrets.CF_APPLY) for script, _, _ in calls))

    def test_guest_code_is_valid_python_and_transports_fail_closed(self):
        for name in ('PREPARE', 'STATUS', 'RECEIVE', 'APPLY', 'CF_PREPARE', 'CF_STATUS', 'CF_RECEIVE', 'CF_APPLY'):
            compile(getattr(secrets, name), name, 'exec')
        with self.assertRaises(ValueError):
            secrets.ssh('host', 'print(1)', sudo=True, data=b'secret')


class RolloutTests(unittest.TestCase):
    def test_override_changes_only_application_image_and_pull_policy(self):
        result = rollout.overlay({'web-node': 'sha256:'+'a'*64})
        self.assertEqual(result, {'services': {'web-node-preview': {
            'image': 'sha256:'+'a'*64, 'pull_policy': 'never'}}})

    def test_compose_always_uses_explicit_project_files_and_never_dotenv(self):
        with patch.object(rollout, 'docker', return_value='') as docker:
            settings = secrets.profile(EXAMPLE)
            rollout.compose(settings, Path('/tmp/new-images.json'), 'up', '-d', '--no-deps', 'web-node-preview')
        args = docker.call_args.args
        self.assertEqual(args[:5], ('compose', '--env-file', '/dev/null', '-p', 'mercurion-preview'))
        self.assertIn('--no-deps', args)
        self.assertNotIn('--remove-orphans', args)

    def test_rejects_servers_and_traversal_before_loading_any_helper(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for roles in (['postgres'], ['web-node', 'web-node'], ['web-node']):
                (root/'rollout.json').write_text(json.dumps(dict(schemaVersion=1, runId='a'*32,
                    webRevision='b'*40, roles=roles, files={'../outside': 'c'*64})))
                with self.assertRaises(ValueError):
                    rollout.validate(root)

    def test_no_deploy_when_archive_roundtrip_digest_differs(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'web-node').mkdir()
            (root/'web-node/component.json').write_text(json.dumps({'config_digest': 'sha256:'+'a'*64}))
            class FakeDelivery:
                def archive_config(self, path):
                    return 'sha256:'+'b'*64, {}
            with patch.object(rollout, 'coordinator', return_value=(FakeDelivery(), None)), \
                 patch.object(rollout, 'docker', return_value='Loaded image ID: sha256:'+'c'*64):
                with self.assertRaisesRegex(ValueError, 'config-mismatch'):
                    rollout.load_image(root, 'web-node')

    def test_failed_rollout_keeps_previous_images_and_requires_explicit_rollback(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            settings = secrets.profile(EXAMPLE)
            compose = root/'applications.json'
            original = dict(name='mercurion-preview', services={'web-node-preview': {'image': 'original'}})
            compose.write_text(json.dumps(original))
            settings['applicationCompose'] = str(compose)
            previous = {'web-node': 'sha256:'+'a'*64}
            with patch.object(rollout.os, 'name', 'posix'), patch.object(rollout.os, 'geteuid', return_value=0, create=True), \
                 patch.object(rollout, 'validate', return_value=dict(runId='a'*32, roles=['web-node'])), \
                 patch.object(rollout, 'profile', return_value=settings), \
                 patch.object(rollout, 'current_images', return_value=previous), \
                 patch.object(rollout, 'load_image', return_value='sha256:'+'b'*64), \
                 patch.object(rollout, 'compose') as compose_call, \
                 patch.object(rollout, 'readiness', side_effect=RuntimeError('unhealthy')):
                with self.assertRaises(RuntimeError):
                    rollout.guest(root)
            state = json.loads((root/'rollout-state.json').read_text())
            self.assertEqual(state['status'], 'failed')
            self.assertEqual(state['previousImages'], previous)
            self.assertEqual(json.loads(compose.read_text()), original)
            self.assertEqual(compose_call.call_count, 2)  # validation + up; no hidden rollback


if __name__ == '__main__':
    unittest.main()
