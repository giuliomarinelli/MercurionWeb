"""Local protocol checks only; these tests do not establish VM isolation."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from network_canary import probe, target


class CanaryTests(unittest.TestCase):
    def test_requested_stop_still_checks_the_listener_before_closing(self):
        with tempfile.TemporaryDirectory(prefix='inf-vm02-canary-') as directory:
            root = Path(directory).resolve()
            self.assertEqual(root.parent, Path(tempfile.gettempdir()).resolve())
            self.assertTrue(root.name.startswith('inf-vm02-canary-'))
            output = root / 'run'
            process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).with_name('network_canary.py')),
                                        'serve', '--bind', '127.0.0.1', '--output', str(output), '--seconds', '30'],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                json.loads(process.stdout.readline())
                (output / 'stop').touch()
                _, stderr = process.communicate(timeout=8)
                self.assertEqual(process.returncode, 0, stderr)
                result = json.loads((output / 'result.json').read_text())
                self.assertEqual(result['status'], 'controls-passed')
                self.assertEqual(result['stopReason'], 'requested')
                self.assertGreaterEqual(len(result['controls']), 2)
                self.assertTrue(all(c['outcome'] == 'reachable' for c in result['controls']))
            finally:
                if process.poll() is None:
                    process.kill()
                    process.communicate()

    def test_rejects_wildcards_multicast_public_and_privileged_targets(self):
        for address, port in [('0.0.0.0', 50000), ('::', 50000), ('224.0.0.1', 50000),
                              ('8.8.8.8', 50000), ('127.0.0.1', 22), ('127.0.0.1', 65536),
                              ('fe80::1', 50000)]:
            with self.subTest(address=address, port=port), self.assertRaises(ValueError):
                target(address, port)

    def test_live_marker_wrong_service_and_closed_port_on_both_loopbacks(self):
        for address in ('127.0.0.1', '::1'):
            with self.subTest(address=address), tempfile.TemporaryDirectory(prefix='inf-vm02-canary-') as directory:
                root = Path(directory).resolve()
                self.assertEqual(root.parent, Path(tempfile.gettempdir()).resolve())
                self.assertTrue(root.name.startswith('inf-vm02-canary-'))
                output = root / 'run'
                process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).with_name('network_canary.py')),
                                            'serve', '--bind', address, '--output', str(output), '--seconds', '2'],
                                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                try:
                    ready = json.loads(process.stdout.readline())
                    positive = probe(address, ready['port'], ready['nonce'])
                    self.assertEqual(positive['outcome'], 'reachable')
                    wrong = probe(address, ready['port'], '0' * 32)
                    self.assertEqual(wrong['outcome'], 'unexpected-service')
                    stdout, stderr = process.communicate(timeout=8)
                    self.assertEqual(process.returncode, 0, stderr)
                    result = json.loads((output / 'result.json').read_text(encoding='utf-8'))
                    self.assertEqual(result['status'], 'controls-passed')
                    self.assertGreaterEqual(len(result['controls']), 2)
                    self.assertTrue(all(c['outcome'] == 'reachable' for c in result['controls']))
                    self.assertFalse(result['isolationAccepted'])
                    self.assertTrue(json.loads(stdout)['closed'])
                    negative = probe(address, ready['port'], ready['nonce'])
                    self.assertEqual(negative['outcome'], 'not-reachable')
                    self.assertFalse(negative['isolationAccepted'])
                finally:
                    if process.poll() is None:
                        process.kill()
                        process.communicate()


if __name__ == '__main__':
    unittest.main()
