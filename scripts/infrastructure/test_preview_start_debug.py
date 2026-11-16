"""Focused startup/debug contracts; synthetic inputs, no owner credentials or VM."""
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout

import start_preview as startup
import preview_nest_debug as debug
import restore_preview_secrets as secrets
import preview_application_bootstrap as applications


class StartupTests(unittest.TestCase):
    def test_current_projects_are_the_adopted_generation(self):
        value = startup.startup_profile(Path(__file__).with_name('preview-startup.example.json'))
        self.assertTrue(all('u6d019947800b4578bc2b5d40791f5132' in x for x in value['servers'].values()))
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'bad.json'
            value['servers']['unexpected'] = 'other'
            path.write_text(json.dumps(value))
            with self.assertRaises(ValueError):
                startup.startup_profile(path)

    def test_secrets_precede_data_and_apps_and_failure_stops_sequence(self):
        settings = secrets.profile(Path(__file__).with_name('preview-operations.example.json'))
        config = startup.startup_profile(Path(__file__).with_name('preview-startup.example.json'))
        phases = []
        with tempfile.TemporaryDirectory() as folder:
            token = Path(folder)/'token'
            token.write_text('synthetic-token-value')
            def remote(host, script, args, **kwargs):
                phases.append(args[0])
                if args[0] == 'applications':
                    raise RuntimeError('not-ready')
            with patch.object(applications, 'load_configuration'), patch.object(startup, 'restore',
                    side_effect=lambda *args: phases.append('secrets')), patch.object(startup, 'ssh', side_effect=remote), redirect_stdout(io.StringIO()):
                with self.assertRaises(RuntimeError):
                    startup.start(settings, config, Path(folder)/'private.json', token)
        self.assertEqual(phases, ['preflight', 'edge', 'secrets', 'servers', 'applications'])

    def test_guest_code_compiles_and_never_recreates_resources(self):
        compile(startup.GUEST, '<guest-startup>', 'exec')
        self.assertNotIn("'compose'", startup.GUEST)
        self.assertNotIn("'update'", startup.GUEST)
        self.assertIn("docker('start',ids[name])", startup.GUEST)


class DebugTests(unittest.TestCase):
    def test_debug_pins_image_keeps_secret_entrypoint_and_binds_host_loopback(self):
        model = debug.override('sha256:synthetic', ['node', '--inspect=0.0.0.0:9229', 'dist/src/bootstrap-secrets.cli.js'], True)
        item = model['services']['web-node-preview']
        self.assertEqual(item['ports'], ['127.0.0.1:19229:9229'])
        self.assertEqual(item['image'], 'sha256:synthetic')
        self.assertNotIn('volumes', item)
        self.assertNotIn('environment', item)
        self.assertNotIn('ports', debug.override('sha256:synthetic', ['node', 'dist/src/bootstrap-secrets.cli.js'], False)['services']['web-node-preview'])


if __name__ == '__main__':
    unittest.main()
