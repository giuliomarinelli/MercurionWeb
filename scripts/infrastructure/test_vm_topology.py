import contextlib
import errno
import io
import json
from pathlib import Path
import socket
import subprocess
import sys
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'deployment/local-vm/fixtures'))
import topology_fixture as fixture
import run_vm_topology as runner


class FixtureTests(unittest.TestCase):
    def test_no_route_requires_both_kernel_error_and_namespace_evidence(self):
        raw = 'Iface Destination Gateway Flags RefCnt Use Metric Mask\neth0 000015AC 00000000 0001 0 0 0 0000FFFF\n'
        self.assertEqual(fixture.namespace_route('172.27.0.3',raw),(True,None))
        self.assertFalse(fixture.namespace_route('172.27.0.3','broken')[0])
        for evidence,expected in [((True,None),'no-route'),((False,None),'invalid'),
                                  ((True,dict(interface='eth0',prefixLength=0)),'invalid')]:
            with self.subTest(evidence=evidence), patch.object(fixture,'namespace_route',return_value=evidence), \
                    patch.object(fixture.socket,'create_connection',side_effect=OSError(errno.ENETUNREACH,'synthetic')):
                result=fixture.client('172.27.0.3','unit-fixture')
                self.assertEqual(result['outcome'],expected)

    def test_live_identity_mismatch_deadline_and_closed_port(self):
        process = subprocess.Popen([sys.executable, '-B', str(ROOT / 'deployment/local-vm/fixtures/topology_fixture.py'),
                                    'serve', '--identity', 'unit-fixture', '--bind', '127.0.0.1', '--port', '0', '--seconds', '2'],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            port = json.loads(process.stdout.readline())['port']
            good = fixture.client('127.0.0.1', 'unit-fixture', port)
            self.assertEqual(good['outcome'], 'reachable')
            wrong = fixture.client('127.0.0.1', 'another-fixture', port)
            self.assertEqual(wrong['outcome'], 'unexpected-service')
            self.assertTrue(wrong['tcpConnected'])
            _, stderr = process.communicate(timeout=8)
            self.assertEqual(process.returncode, 0, stderr)
            closed = fixture.client('127.0.0.1', 'unit-fixture', port)
            self.assertEqual(closed['outcome'], 'not-reachable')
            self.assertFalse(closed['tcpConnected'])
        finally:
            if process.poll() is None:
                process.kill()
                process.communicate()

    def test_temporary_dns_outage_is_not_a_negative_pass(self):
        for error, expected in [(socket.EAI_AGAIN, 'invalid'), (socket.EAI_NONAME, 'not-resolved')]:
            with patch.object(fixture.socket, 'getaddrinfo', side_effect=socket.gaierror(error, 'fixture')):
                self.assertEqual(fixture.resolve('unit-fixture')['status'], expected)

    def test_public_address_is_not_contacted(self):
        with patch.object(fixture.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('8.8.8.8', 18080))]), \
                patch.object(fixture.socket, 'create_connection') as connect:
            result = fixture.client('unit-fixture', 'unit-fixture')
        connect.assert_not_called()
        self.assertEqual(result['outcome'], 'dns-unavailable')


class RunnerTests(unittest.TestCase):
    def test_structural_no_route_is_distinct_and_requires_healthy_peers(self):
        healthy=[dict(outcome='reachable')]*2
        no_route=dict(outcome='no-route',tcpConnected=False,errno=101,routeObserved=True,route=None)
        self.assertEqual(runner.assess_negative(healthy,dict(status='not-resolved'),[no_route],healthy),'passed')
        for change in ({'routeObserved':False},{'route':dict(interface='eth0')},{'errno':None}):
            self.assertEqual(runner.assess_negative(healthy,dict(status='not-resolved'),[{**no_route,**change}],healthy),'invalid')
        self.assertEqual(runner.assess_negative([],dict(status='not-resolved'),[no_route],healthy),'invalid')
    def test_empty_plan_cannot_be_reported_as_a_success(self):
        empty = json.dumps(dict(schemaVersion=1, fixturePort=18080, allow=[], deny=[]))
        with patch.object(Path, 'read_text', return_value=empty), self.assertRaises(ValueError):
            runner.load_matrix()

    def test_failed_controls_dns_only_or_missing_attempt_never_pass(self):
        healthy = [dict(outcome='reachable')] * 2
        absent = dict(status='not-resolved')
        blocked = [dict(outcome='not-reachable', tcpConnected=False)]
        self.assertEqual(runner.assess_negative(healthy, absent, blocked, healthy), 'passed')
        self.assertEqual(runner.assess_negative([dict(outcome='not-reachable')] * 2, absent, blocked, healthy), 'invalid')
        self.assertEqual(runner.assess_negative(healthy, absent, [], healthy), 'invalid')
        self.assertEqual(runner.assess_negative(healthy, dict(status='invalid'), blocked, healthy), 'invalid')
        self.assertEqual(runner.assess_negative(healthy, absent, blocked, []), 'invalid')

    def test_connected_wrong_service_is_a_negative_failure(self):
        healthy = [dict(outcome='reachable')] * 2
        self.assertEqual(runner.assess_negative(healthy, dict(status='not-resolved'),
                                               [dict(outcome='unexpected-service', tcpConnected=True)], healthy), 'failed')

    def test_timed_out_probe_removes_only_its_own_client(self):
        identifier = 'c' * 64
        calls = []
        probe = runner.Runner()
        probe.nodes['source'] = dict(id='f' * 64)

        def invoke(*args, **kwargs):
            calls.append(args)
            if args[0] == 'create':
                return identifier
            if args[0] == 'start':
                raise subprocess.TimeoutExpired('docker start', 12)
            if args[0] == 'inspect':
                return probe.run_id
            return ''

        probe.invoke = invoke
        with self.assertRaises(subprocess.TimeoutExpired):
            probe.measure('source', '127.0.0.1', 'unit-fixture')
        self.assertIn(('rm', '--force', identifier), calls)
        self.assertFalse(probe.owned)
        self.assertNotIn(('rm', '--force', 'f' * 64), calls)

    def test_ownership_mismatch_never_removes_a_container(self):
        invoke = Mock(return_value='another-run')
        probe = runner.Runner(invoke)
        with self.assertRaises(ValueError):
            probe.remove_client('c' * 64)
        self.assertTrue(all(call.args[0] != 'rm' for call in invoke.call_args_list))

    def test_default_command_is_plan_only_without_docker(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['run_vm_topology.py']), patch.object(runner, 'docker') as invoke, contextlib.redirect_stdout(output):
            self.assertEqual(runner.main(), 0)
        invoke.assert_not_called()
        self.assertFalse(json.loads(output.getvalue())['runtimeExecuted'])

    def test_complete_matrix_with_simulated_docker_preserves_fixtures_and_cleans_clients(self):
        matrix = runner.load_matrix()
        refs = sorted({ref for mode in ('allow', 'deny') for pair in matrix[mode] for ref in pair})
        ids = {ref: format(index + 1, '064x') for index, ref in enumerate(refs)}
        ips = {ref: f'172.20.0.{index + 2}' for index, ref in enumerate(refs)}
        allowed = {tuple(pair) for pair in matrix['allow']}
        clients = {}
        calls = []
        probe = runner.Runner()

        def invoke(*args, **kwargs):
            calls.append(args)
            if args[0] == 'version':
                return 'linux/amd64'
            if args[0] == 'ps':
                if '-a' in args:
                    return '\n'.join(clients)
                project = next(a.split('mercurion-')[1] for a in args if a.startswith('label=com.docker.compose.project='))
                service = next(a.split('=')[-1] for a in args if a.startswith('label=com.docker.compose.service='))
                return ids[f'{project}/{service}']
            if args[0] == 'inspect':
                if args[2] == '{{.State.ExitCode}}':
                    return '0'
                if runner.RUN_LABEL in args[2]:
                    return probe.run_id
                ref = next(ref for ref, identifier in ids.items() if identifier == args[-1])
                identity = ref.split('/')[1]
                return json.dumps(dict(id=ids[ref], image=runner.IMAGE, running=True, ports={}, readonly=True,
                                       privileged=False, user='65534:65534', entrypoint=['python'], dnsOptions=['ndots:1'],
                                       command=['-B', '/fixture/topology_fixture.py', 'serve', '--identity', identity],
                                       networks={'fixture-net': dict(IPAddress=ips[ref])}))
            if args[0] == 'create':
                identifier = format(1000 + len(calls), '064x')
                clients[identifier] = args
                return identifier
            if args[0] == 'start':
                command = clients[args[-1]]
                origin_id = command[command.index('--network') + 1].split(':')[1]
                origin = next(ref for ref in refs if ids[ref] == origin_id)
                host = command[command.index('--host') + 1]
                if 'resolve' in command:
                    target = next(ref for ref in refs if ref.split('/')[1] == host)
                    reachable = (origin, target) in allowed
                    return json.dumps(dict(host=host, status='resolved' if reachable else 'not-resolved',
                                           addresses=[ips[target]] if reachable else []))
                identity = command[command.index('--identity') + 1]
                target = origin if host == '127.0.0.1' else next(ref for ref in refs if host in (ips[ref], ref.split('/')[1]))
                reachable = origin == target or (origin, target) in allowed
                return json.dumps(dict(host=host, identity=identity, tcpConnected=reachable,
                                       outcome='reachable' if reachable else 'not-reachable',
                                       dns=dict(addresses=[ips[target]])))
            if args[0] == 'rm':
                self.assertNotIn(args[-1], ids.values(), 'fixture removal attempted')
                del clients[args[-1]]
                return ''
            raise AssertionError(f'Unexpected Docker operation: {args[0]}')

        probe.invoke = invoke
        report = probe.run(matrix)
        self.assertEqual(report['status'], 'passed', report)
        self.assertEqual(len(report['cases']), 33)
        self.assertFalse(report['isolationAccepted'])
        self.assertFalse(report['cleanupErrors'])
        self.assertFalse(clients)
        self.assertFalse(any(call[0] in ('stop', 'network', 'volume') for call in calls))


if __name__ == '__main__':
    unittest.main()
