"""LAN tool checks: real loopback controls, simulated reports/Docker; no VM acceptance."""
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from lan_canary_probe import IMAGE, correlate, guest_case, guest_control, run_guest, validate, watch
from network_canary import now, probe, route_for


def fixture():
    base = datetime.now(timezone.utc)-timedelta(seconds=6)
    stamp = lambda offset: (base+timedelta(seconds=offset)).isoformat()
    config = dict(runId='a'*32, nonce='b'*32, address='192.168.0.218', port=50000,
                  readyAtUtc=stamp(0), expiresAtUtc=stamp(600.000024))

    def result(address, port, begin, end, outcome='reachable'):
        return dict(address=address, port=port, nonce=config['nonce'], observedAtUtc=stamp(begin),
                    finishedAtUtc=stamp(end), outcome=outcome)

    host = dict(**{key:config[key] for key in ('runId','nonce','address','port')},
                status='controls-passed', finished=True, stopReason='requested',
                controls=[result(config['address'], config['port'], .1, .2),
                          result(config['address'], config['port'], 4.8, 4.9)])
    guest = dict(**{key:config[key] for key in ('runId','nonce','address','port')},
                 scope='synthetic LAN fixture', status='observed-path-not-reachable',
                 imageId=IMAGE, dockerPlatform='linux/amd64', cleanupErrors=[], cases=[])
    for origin in ('guest','bridge','inf-vm02-lan-'+config['runId']):
        attempted = result(config['address'], config['port'], 2, 3, 'not-reachable')
        attempted['route'] = dict(interface='eth0', gateway='10.203.240.1', prefixLength=0)
        guest['cases'].append(dict(network=origin, status='observed-path-not-reachable', cleanupErrors=[],
                                   controlBefore=result('127.0.0.1', 50001, 1, 1.1), hostProbe=attempted,
                                   controlAfter=result('127.0.0.1', 50001, 4, 4.1)))
    return config, host, guest


class LanTests(unittest.TestCase):
    def test_rejects_bad_endpoints_markers_and_windows(self):
        config, _, _ = fixture()
        validate(config)
        for changes in ({'address':'8.8.8.8'}, {'address':'127.0.0.1'}, {'address':'169.254.1.1'},
                        {'address':'100.64.0.1'}, {'address':'::1'}, {'port':22}, {'port':True},
                        {'nonce':'bad'}, {'runId':'../bad'}, {'expiresAtUtc':'2000-01-01T00:00:00Z'},
                        {'expiresAtUtc':(datetime.fromisoformat(config['readyAtUtc'])+timedelta(seconds=601)).isoformat()}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate({**config, **changes})

    def test_missing_route_prevents_socket_attempt(self):
        with patch('network_canary.route_for', return_value=None), patch('network_canary._probe') as client:
            result = probe('192.168.0.218', 50000, 'b'*32, require_route=True)
            self.assertEqual(result['outcome'], 'invalid-path')
            client.assert_not_called()

    def test_namespace_route_uses_longest_prefix(self):
        raw = 'Iface Destination Gateway Flags RefCnt Use Metric Mask\neth0 00000000 01F0CB0A 0003 0 0 0 00000000\neth1 0000A8C0 00000000 0001 0 0 0 00FFFFFF\n'
        self.assertEqual(route_for('192.168.0.218', raw)['interface'], 'eth1')
        self.assertEqual(route_for('8.8.8.8', raw)['gateway'], '10.203.240.1')

    def test_real_loopback_marker_controls_and_close(self):
        with guest_control('b'*32) as port:
            self.assertEqual(probe('127.0.0.1', port, 'b'*32)['outcome'], 'reachable')
            self.assertEqual(probe('127.0.0.1', port, 'c'*32)['outcome'], 'unexpected-service')
        self.assertEqual(probe('127.0.0.1', port, 'b'*32, timeout=.2)['outcome'], 'not-reachable')

    def test_reachable_guest_target_not_accepted(self):
        config, _, _ = fixture()
        result = guest_case(config, lambda *args, **kwargs: dict(outcome='reachable'))
        self.assertEqual(result['status'], 'invalid')

    def test_expiry_prevents_all_docker_calls(self):
        config, _, _ = fixture()
        config['expiresAtUtc'] = '2000-01-01T00:00:00Z'
        invoke = unittest.mock.Mock()
        result = run_guest(config, Path('/unused'), invoke)
        self.assertEqual(result['status'], 'invalid')
        invoke.assert_not_called()

    def test_watch_failure_leaves_report_and_no_ready(self):
        config, _, _ = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = watch(config, root, lambda *args: dict(outcome='not-reachable'))
            self.assertEqual(result['status'], 'invalid')
            self.assertFalse((root/'lan-ready.json').exists())
            self.assertEqual(json.loads((root/'lan-control.json').read_text())['status'], 'invalid')

    def test_wrong_image_stops_before_creating_resources(self):
        config, _, _ = fixture()
        invoke = unittest.mock.Mock(side_effect=['linux/amd64', json.dumps([dict(Id='wrong', Os='linux', Architecture='amd64')])])
        with patch('lan_canary_probe.guest_case') as attempt:
            result = run_guest(config, Path('/unused'), invoke)
            self.assertEqual(result['status'], 'invalid')
            attempt.assert_not_called()
        self.assertEqual(invoke.call_count, 2)

    def test_network_cleanup_failure_invalidates_negative_run(self):
        config, _, fixture_guest = fixture()
        calls = []

        def invoke(*args):
            calls.append(args)
            if args[0] == 'version':
                return 'linux/amd64'
            if args[0] == 'image':
                return json.dumps([dict(Id=IMAGE, Os='linux', Architecture='amd64')])
            if args[:2] == ('network','create'):
                return 'f'*64
            if args[:2] == ('network','rm'):
                raise RuntimeError('Synthetic cleanup failure')
            raise AssertionError('Unexpected Docker operation')

        with patch('lan_canary_probe.guest_case', return_value=fixture_guest['cases'][0]), patch(
                'lan_canary_probe.run_case', side_effect=fixture_guest['cases'][1:]):
            result = run_guest(config, Path('/unused'), invoke)
        self.assertEqual(result['status'], 'invalid')
        self.assertEqual(len(result['cleanupErrors']), 1)
        self.assertFalse(any(args[0] in ('load','pull') for args in calls))

    def test_watch_stop_still_takes_final_control(self):
        config, _, _ = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'lan-stop').touch()
            result = watch(config, root, lambda *args: dict(outcome='reachable'))
            self.assertEqual(result['status'], 'controls-passed')
            self.assertEqual(len(result['controls']), 2)
            self.assertEqual(result['stopReason'], 'requested')

    def test_correlates_three_origins_without_global_acceptance(self):
        result = correlate(*fixture())
        self.assertEqual(result['caseCount'], 3)
        self.assertFalse(result['isolationAccepted'])

    def test_rejects_incomplete_reachable_uncorrelated_or_unclean_reports(self):
        mutations = [
            lambda c,h,g: g['cases'].pop(),
            lambda c,h,g: g['cases'].__setitem__(0, copy.deepcopy(g['cases'][1])),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(outcome='reachable'),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(route=None),
            lambda c,h,g: g['cleanupErrors'].append('synthetic'),
            lambda c,h,g: h['controls'][0].update(outcome='not-reachable'),
            lambda c,h,g: h['controls'][0].update(address='192.168.0.1'),
            lambda c,h,g: g['cases'][0]['controlAfter'].update(nonce='c'*32),
            lambda c,h,g: h.update(stopReason='deadline'),
            lambda c,h,g: h['controls'].pop(),
            lambda c,h,g: g['cases'][0]['hostProbe'].update(finishedAtUtc='2099-01-01T00:00:00Z'),
        ]
        for index, mutation in enumerate(mutations):
            config, host, guest = fixture()
            mutation(config, host, guest)
            with self.subTest(index=index), self.assertRaises(ValueError):
                correlate(config, host, guest)


if __name__ == '__main__':
    unittest.main()
