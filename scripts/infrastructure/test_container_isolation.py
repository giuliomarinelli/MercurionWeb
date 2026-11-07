"""Failure-path tests; live Docker tool validation is recorded separately."""
from datetime import datetime, timedelta, timezone
import json
import unittest

from probe_container_isolation import run_case, validate


class IsolationTests(unittest.TestCase):
    def config(self):
        return dict(runId='a' * 32, nonce='b' * 32, address='172.26.48.1', port=51740,
                    archiveSha256='c' * 64,
                    expiresAtUtc=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat())

    def test_expired_or_malformed_run_is_rejected_before_docker(self):
        validate(self.config())
        for key, value in [('nonce', 'bad'), ('runId', '../other'), ('archiveSha256', 'bad'),
                           ('address', '8.8.8.8'), ('address', '::1'), ('port', 22),
                           ('expiresAtUtc', '2000-01-01T00:00:00+00:00')]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                validate({**self.config(), key: value})

    def exercise(self, outcomes, cleanup_fails=False):
        calls = []
        config = self.config()

        def invoke(*args, **kwargs):
            calls.append(args)
            if args[0] == 'create':
                return format(len(calls), '064x')
            if args[:2] == ('start', '--attach'):
                command = next(c for c in reversed(calls) if c[0] == 'create')
                return json.dumps(dict(outcome=outcomes.pop(0), nonce=config['nonce'],
                                       address=command[command.index('--host') + 1],
                                       port=int(command[command.index('--port') + 1])))
            if args[0] == 'inspect':
                return '0' if 'ExitCode' in args[2] else '172.18.0.2'
            if args[0] == 'logs':
                return '50000'
            if args[0] == 'rm' and cleanup_fails:
                raise RuntimeError('simulated removal failure')
            return ''

        return run_case(config, 'fixture', '/fixture/probe.py', invoke), calls

    def test_failed_positive_control_prevents_host_probe_and_cleans_created_containers(self):
        report, calls = self.exercise(['not-reachable'])
        self.assertEqual(report['status'], 'invalid')
        self.assertNotIn('hostProbe', report)
        self.assertEqual(len([c for c in calls if c[0] == 'rm']), 2)
        self.assertFalse(report['isolationAccepted'])

    def test_unexpected_service_is_not_reported_as_blocked(self):
        report, _ = self.exercise(['reachable', 'unexpected-service', 'reachable'])
        self.assertEqual(report['status'], 'target-reachable')
        self.assertFalse(report['isolationAccepted'])

    def test_cleanup_failure_invalidates_otherwise_negative_result(self):
        report, _ = self.exercise(['reachable', 'not-reachable', 'reachable'], cleanup_fails=True)
        self.assertEqual(report['status'], 'invalid')
        self.assertTrue(report['cleanupErrors'])


if __name__ == '__main__':
    unittest.main()
