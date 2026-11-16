"""Host contracts plus actual remote Python commands in the local Linux harness."""
import copy
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import synthetic_secret_delivery as host


def receipt(plan, step):
    doc = dict(schemaVersion=1, runId=plan.run_id, phase=step.phase)
    if step.phase in ('received', 'active'):
        doc.update(consumer='tox21', servicesStarted=False, isolationAccepted=False)
    return json.dumps(doc).encode()


class HostTests(unittest.TestCase):
    def setUp(self):
        self.plan = host.build_plan()

    def test_payload_only_on_receive_stdin_and_never_command_or_report(self):
        completed = []
        def invoke(step):
            completed.append(step.phase)
            return 0, receipt(self.plan, step)
        result = host.execute(self.plan, invoke)
        self.assertEqual(len(completed), 6)
        for step in self.plan.steps:
            arguments = host.ssh_arguments(step)
            self.assertIn('-t' if step.interactive else '-T', arguments)
            self.assertIn('StrictHostKeyChecking=yes', arguments)
            self.assertIn('ClearAllForwardings=yes', arguments)
            self.assertEqual(arguments[-2], 'mercurion-server')
            self.assertNotIn('synthetic-only-', step.command)
            if step.interactive:
                self.assertIsNone(step.data)
                self.assertEqual(shlex.split(step.command)[:2], ['sudo', '--'])
            elif step.phase == 'received':
                doc = json.loads(step.data)
                self.assertEqual(doc['runId'], self.plan.run_id)
                self.assertEqual(doc['environment'], 'preview')
        self.assertNotIn('synthetic-only-', json.dumps(result))
        self.assertFalse(result['servicesStarted'])
        self.assertFalse(result['isolationAccepted'])

    def test_failure_each_phase_stops_without_retry_or_cleanup_of_active_files(self):
        for index in range(6):
            calls = []
            def invoke(step):
                calls.append(step.phase)
                return (1, b'') if len(calls) - 1 == index else (0, receipt(self.plan, step))
            with self.assertRaises(ValueError):
                host.execute(self.plan, invoke)
            self.assertEqual(len(calls), index + 1)

    def test_mismatched_malformed_or_excessive_receipt_stops_before_sudo(self):
        for output in (b'not-json', b'{}', b'x' * 4097,
                       b'{"schemaVersion":true,"phase":"staged"}',
                       json.dumps(dict(schemaVersion=1, runId='a' * 32, phase='staged')).encode()):
            calls = []
            def invoke(step):
                calls.append(step.phase)
                return 0, output
            with self.assertRaises(ValueError):
                host.execute(self.plan, invoke)
            self.assertEqual(calls, ['staged'])

    def test_environment_and_source_guards_and_unique_runs(self):
        with self.assertRaises(ValueError):
            host.build_plan('staging')
        for source in (b'', b'x' * (host.CODE_LIMIT + 1)):
            with self.assertRaises(ValueError):
                host.build_plan(helper=source)
        other = host.build_plan('production')
        self.assertNotEqual(other.run_id, self.plan.run_id)
        self.assertEqual(json.loads(other.steps[2].data)['environment'], 'production')

    def test_transport_never_captures_password_prompts_or_pipes_payload_to_sudo(self):
        with patch.object(host.subprocess, 'run') as invoke:
            for step in self.plan.steps:
                host.transport(step)
                args, kwargs = invoke.call_args
                self.assertIsNone(kwargs['stderr'])
                self.assertEqual(kwargs['input'], step.data)
                if step.interactive:
                    self.assertIsNone(kwargs['stdout'])
                    self.assertIsNone(kwargs['stdin'])
                elif step.data is None:
                    self.assertEqual(kwargs['stdin'], subprocess.DEVNULL)
        invalid = copy.copy(self.plan.steps[1])
        invalid.data = b'synthetic'
        with self.assertRaises(ValueError):
            host.ssh_arguments(invalid)

    def test_native_child_receives_exact_command_and_binary_stdin(self):
        import hashlib
        step = copy.copy(self.plan.steps[2])
        step.data = b'synthetic-\xc3\xa8\x00\r\n'
        digest = hashlib.sha256(step.command.encode('utf-8')).hexdigest()
        actual_run = subprocess.run
        with tempfile.TemporaryDirectory() as temporary:
            child = Path(temporary) / 'native_transport_fixture.py'
            child.write_text(
                'import hashlib,sys\n'
                'assert sys.argv[1]=="-T"\n'
                f'assert hashlib.sha256(sys.argv[-1].encode("utf-8")).hexdigest()=="{digest}"\n'
                'assert sys.stdin.buffer.read()==b"synthetic-\\xc3\\xa8\\x00\\r\\n"\n'
                'print("native-transport-ok")\n', encoding='ascii')
            def native_bridge(arguments, **kwargs):
                self.assertEqual(arguments[0], 'ssh.exe')
                return actual_run([sys.executable, '-B', str(child), *arguments[1:]], **kwargs)
            with patch.object(host.subprocess, 'run', side_effect=native_bridge):
                code, output = host.transport(step)
            self.assertEqual(code, 0)
            self.assertEqual(output.strip(), b'native-transport-ok')


@unittest.skipUnless(sys.platform == 'linux' and os.geteuid() == 0
                     and os.environ.get('MERCURION_SYNTHETIC_DELIVERY_TEST') == '1',
                     'Disposable Linux root/tmpfs harness required')
class RemoteCommandTests(unittest.TestCase):
    def setUp(self):
        # The disposable harness mounts tmpfs at nobody's home; no real user's files.
        import pwd
        self.assertEqual(pwd.getpwnam('nobody').pw_dir, '/nonexistent')
        self.assertTrue(Path('/nonexistent').is_dir())
        self.plan = host.build_plan()

    def invoke(self, step):
        parts = shlex.split(step.command)
        privileged = step.interactive
        if privileged:
            self.assertEqual(parts[:2], ['sudo', '--'])
            parts = parts[2:]
        # Exercise the same POSIX shell quoting as the real SSH command.
        command = shlex.join([sys.executable, *parts[1:]])
        environment = dict(os.environ, HOME='/nonexistent', SUDO_USER='nobody')
        result = subprocess.run(['/bin/sh', '-c', command], input=step.data, capture_output=True,
                                user=0 if privileged else 65534,
                                group=0 if privileged else 65534, extra_groups=[],
                                env=environment, timeout=10)
        # Real stderr is never persisted by the host; synthetic-only harness captures it for assertions.
        self.assertEqual(result.returncode, 0, (step.phase, result.stderr))
        return result.returncode, result.stdout

    def test_complete_plan_real_commands_and_active_file_retained(self):
        result = host.execute(self.plan, self.invoke)
        self.assertEqual(result['phases'][-1], 'code-removed')
        active = Path('/run/mercurion-bootstrap') / self.plan.run_id / 'active/bootstrap.json'
        self.assertTrue(active.is_file())
        data = json.loads(active.read_bytes())
        self.assertEqual(data['environment'], 'staging')
        self.assertEqual(data['variables'], json.loads(self.plan.steps[2].data)['variables'])
        self.assertFalse((Path('/nonexistent/.mercurion-infra') /
                          ('delivery-' + self.plan.run_id)).exists())

    def test_guest_source_tampering_blocked_before_privileged_execution(self):
        self.invoke(self.plan.steps[0])
        path = (Path('/nonexistent/.mercurion-infra') /
                ('delivery-' + self.plan.run_id) / 'secret_delivery.py')
        path.write_text('raise RuntimeError("synthetic-marker-must-not-execute")', encoding='ascii')
        step = self.plan.steps[1]
        parts = shlex.split(step.command)[2:]
        result = subprocess.run([sys.executable, *parts[1:]], capture_output=True,
                                env=dict(os.environ, SUDO_USER='nobody'), timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(b'synthetic-marker-must-not-execute', result.stderr)
        self.assertFalse((Path('/run/mercurion-bootstrap') / self.plan.run_id).exists())


if __name__ == '__main__':
    unittest.main()
