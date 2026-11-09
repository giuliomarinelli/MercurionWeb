"""Local tool tests, including real loopback sockets; not VM acceptance."""
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import socket
import struct
import tempfile
import unittest
from unittest.mock import patch

from private_port_probe import (IMAGE, control_servers, correlate, dns_query, dns_response_valid,
                                prepare_dns, probe, route_for, run_guest, run_origin, serve_host, targets, validate_config)


def fixture(dns_address='172.27.0.1'):
    base = datetime.now(timezone.utc) - timedelta(seconds=6)
    stamp = lambda seconds: (base+timedelta(seconds=seconds)).isoformat()
    config = dict(runId='a'*32, nonce='b'*32, targets=targets(dns_address),
                  readyAtUtc=stamp(0), expiresAtUtc=stamp(120))

    def result(endpoint, start, end, outcome='reachable'):
        return dict(address=endpoint['address'], port=endpoint['port'], transport=endpoint['transport'],
                    nonce=config['nonce'], outcome=outcome, observedAtUtc=stamp(start), finishedAtUtc=stamp(end))

    host = dict(runId=config['runId'], nonce=config['nonce'], targets=config['targets'],
                status='controls-passed', closed=True, controls=[],
                preparation=[result(config['targets'][2], -2, -1)])
    guest = dict(runId=config['runId'], nonce=config['nonce'], status='observed-path-not-reachable',
                 cleanupErrors=[], imageId=IMAGE, dockerPlatform='linux/amd64', cases=[])
    for endpoint in config['targets']:
        for start, end in ((.1, .2), (4.8, 4.9)):
            host['controls'].append(dict(result(endpoint, start, end), targetId=endpoint['id']))
        for origin in ('guest', 'bridge', 'inf-vm02-private-'+config['runId']):
            control = dict(transport=endpoint['transport'], address='127.0.0.1', port=50000)
            attempted = result(endpoint, 2, 3, 'not-reachable')
            attempted['route'] = dict(interface='eth0', gateway='10.203.240.1', prefixLength=0)
            guest['cases'].append(dict(origin=origin, targetId=endpoint['id'],
                                       controlBefore=result(control, 1, 1.1), hostProbe=attempted,
                                       controlAfter=result(control, 4, 4.1)))
    return config, host, guest


class PrivatePortTests(unittest.TestCase):
    def test_dns_checks_transaction_question_and_response_bit(self):
        query = dns_query('a'*32)
        response = struct.pack('!HHHHHH', 0xaaaa, 0x8183, 1, 0, 0, 0)+query[12:]
        self.assertTrue(dns_response_valid(response, query))
        for broken in (b'', b'\x00\x00'+response[2:], query, response[:-1], response[:12]+b'X'+response[13:]):
            self.assertFalse(dns_response_valid(broken, query))

    def test_target_and_window_validation(self):
        config, _, _ = fixture()
        validate_config(config)
        for address in ('8.8.8.8', '127.0.0.1', '0.0.0.0', '::1', '169.254.1.1',
                        '100.64.0.1', '172.32.0.1', '192.169.0.1', 'fc00::1', 'not-an-ip'):
            with self.subTest(address=address), self.assertRaises(ValueError):
                targets(address)
        for change in ({'nonce':'bad'}, {'expiresAtUtc':'2000-01-01T00:00:00+00:00'},
                       {'targets':targets('172.27.0.1')[::-1]}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_config({**config, **change})

    def test_default_switch_subnet_reallocation(self):
        for address in ('10.203.241.1', '172.27.0.1', '192.168.160.1'):
            with self.subTest(address=address):
                config, _, _ = fixture()
                config['targets'] = targets(address)
                validate_config(config)
                self.assertEqual(config['targets'][2]['address'], address)
                self.assertEqual(config['targets'][0]['address'], '10.203.240.1')
                self.assertEqual(config['targets'][1]['address'], '10.203.240.1')

    def test_invalid_dns_address_leaves_diagnostic_report_without_listeners(self):
        with tempfile.TemporaryDirectory() as temporary, patch('private_port_probe.control_servers') as listeners:
            directory = Path(temporary)/'host'
            result = serve_host(directory, 'a'*32, '8.8.8.8')
            self.assertEqual(result['status'], 'invalid')
            self.assertEqual(result['errorType'], 'ValueError')
            self.assertEqual(result['controls'], [])
            self.assertTrue(result['closed'])
            self.assertFalse((directory/'ready.json').exists())
            self.assertEqual(json.loads((directory/'result.json').read_text())['status'], 'invalid')
            listeners.assert_not_called()

    def test_loopback_tcp_and_dns_controls_and_close(self):
        nonce = 'c'*32
        with control_servers('127.0.0.1', nonce) as ports:
            for protocol, port in (('tcp', ports['tcp']), ('dns-udp', ports['udp'])):
                self.assertEqual(probe(protocol, '127.0.0.1', port, nonce)['outcome'], 'reachable')
            self.assertEqual(probe('tcp', '127.0.0.1', ports['tcp'], 'd'*32)['outcome'], 'unexpected-service')
            tcp_port = ports['tcp']
        self.assertEqual(probe('tcp', '127.0.0.1', tcp_port, nonce, timeout=.2)['outcome'], 'not-reachable')

    def test_partial_bind_failure_closes_new_socket(self):
        # The occupied socket belongs to this test; no existing service is touched.
        with socket.socket() as occupied:
            occupied.bind(('127.0.0.1', 0))
            occupied.listen()
            created = []
            constructor = socket.socket

            def track(*args, **kwargs):
                value = constructor(*args, **kwargs)
                created.append(value)
                return value

            with patch('private_port_probe.socket.socket', side_effect=track), self.assertRaises(OSError):
                with control_servers('127.0.0.1', 'c'*32, tcp_ports=(0, occupied.getsockname()[1]), udp=False):
                    self.fail('Occupied port accepted')
            self.assertEqual(len(created), 2)
            self.assertTrue(all(value.fileno() == -1 for value in created))

    def test_route_selects_most_specific_up_route(self):
        raw = ('Iface Destination Gateway Flags RefCnt Use Metric Mask\n'
               'eth0 00000000 01F0CB0A 0003 0 0 0 00000000\n'
               'eth0 00F0CB0A 00000000 0001 0 0 0 00FFFFFF\n')
        self.assertEqual(route_for('10.203.240.1', raw)['prefixLength'], 24)
        self.assertEqual(route_for('172.27.0.1', raw)['prefixLength'], 0)
        self.assertIsNone(route_for('10.203.240.1', 'Iface Destination Gateway Flags RefCnt Use Metric Mask\n'))

    def test_failed_positive_prevents_target_attempt(self):
        config, _, _ = fixture()
        calls = []

        def failed(*args):
            calls.append(args)
            return dict(outcome='not-reachable')

        with self.assertRaises(RuntimeError):
            run_origin(config, 'guest', '127.0.0.1', dict(tcp=50000, udp=50001), failed)
        self.assertEqual(len(calls), 1)

    def test_readiness_is_bounded_and_separate_from_measurement(self):
        attempts = []
        outcomes = iter(('not-reachable', 'reachable'))
        prepare_dns('172.27.0.1', 'c'*32, attempts, lambda *args: dict(outcome=next(outcomes)))
        self.assertEqual(len(attempts), 2)
        for outcome, count in (('not-reachable', 3), ('unexpected-service', 1)):
            attempts = []
            with self.assertRaises(RuntimeError):
                prepare_dns('172.27.0.1', 'c'*32, attempts, lambda *args: dict(outcome=outcome))
            self.assertEqual(len(attempts), count)

    def test_expiry_prevents_all_docker_calls(self):
        config, _, _ = fixture()
        config['expiresAtUtc'] = '2000-01-01T00:00:00+00:00'
        calls = []
        report = run_guest(Path('/unused'), config, lambda *args, **kwargs: calls.append(args))
        self.assertEqual(calls, [])
        self.assertEqual(report['status'], 'invalid')

    def test_cleanup_failure_invalidates_negative_report(self):
        config, _, _ = fixture()
        counter = 0

        def invoke(*args, **kwargs):
            nonlocal counter
            if args[0] == 'version':
                return 'linux/amd64'
            if args[:2] == ('image', 'inspect'):
                return json.dumps([dict(Id=IMAGE, Os='linux', Architecture='amd64')])
            if args[:2] == ('network', 'create'):
                return 'f'*64
            if args[0] == 'create':
                counter += 1
                return format(counter, '064x')
            if args[0] == 'logs':
                return '{"tcp":50000,"udp":50001}'
            if args[0] == 'inspect':
                return '172.18.0.2'
            if args[0] == 'rm':
                raise RuntimeError('Synthetic cleanup failure')
            return ''

        negative_cases = [dict(hostProbe=dict(outcome='not-reachable'))]*3
        with patch('private_port_probe.run_origin', return_value=negative_cases):
            result = run_guest(Path('/fixture'), config, invoke)
        self.assertEqual(result['status'], 'invalid')
        self.assertEqual(len(result['cases']), 9)
        self.assertEqual(len(result['cleanupErrors']), 2)

    def correlate_fixture(self, config, host, guest):
        with tempfile.TemporaryDirectory(prefix='private-ports-unit-') as directory:
            root = Path(directory)
            (root/'host').mkdir()
            for path, value in ((root/'host/ready.json', config), (root/'host/result.json', host),
                                (root/'private-port-probe.json', guest)):
                path.write_text(json.dumps(value), encoding='utf-8')
            return correlate(root)

    def test_correlates_all_nine_cases_without_global_acceptance(self):
        for address in ('10.203.241.1', '172.27.0.1', '192.168.160.1'):
            with self.subTest(address=address):
                result = self.correlate_fixture(*fixture(address))
                self.assertEqual(result['caseCount'], 9)
                self.assertFalse(result['isolationAccepted'])

    def test_rejects_incomplete_reachable_or_uncorrelated_reports(self):
        mutations = [
            lambda c,h,g: g['cases'].pop(),
            lambda c,h,g: g['cases'].__setitem__(0, copy.deepcopy(g['cases'][1])),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(outcome='reachable'),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(outcome='invalid-path'),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(route=None),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(nonce='0'*32),
            lambda c,h,g: g['cleanupErrors'].append(dict(id='fixture')),
            lambda c,h,g: h.update(closed=False),
            lambda c,h,g: h['preparation'][-1].update(outcome='not-reachable'),
            lambda c,h,g: h['controls'][0].update(outcome='not-reachable'),
            lambda c,h,g: h['controls'].__delitem__(slice(0,2)),
            lambda c,h,g: g['cases'][0]['controlBefore'].update(nonce='0'*32),
            lambda c,h,g: g['cases'][0]['controlAfter'].update(address='127.0.0.2'),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(finishedAtUtc='2099-01-01T00:00:00+00:00'),
        ]
        for index, mutate in enumerate(mutations):
            config, host, guest = fixture()
            mutate(config, host, guest)
            with self.subTest(index=index), self.assertRaises(ValueError):
                self.correlate_fixture(config, host, guest)


if __name__ == '__main__':
    unittest.main()
