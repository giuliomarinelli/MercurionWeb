from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import Mock

from probe_guest_ipv6 import run, select_interface


class GuestIpv6Tests(unittest.TestCase):
    def config(self):
        return dict(runId='a' * 32, nonce='b' * 32, address='fe80::1234', port=50000,
                    expiresAtUtc=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat())

    def read(self, *args):
        if args == ('-4', 'route', 'show', 'default'):
            return [dict(dev='eth0')]
        if args == ('-6', 'address', 'show'):
            return [dict(ifname='eth0', flags=['UP'], addr_info=[dict(family='inet6', scope='link', local='fe80::2')])]
        return [dict(dev='eth0', dst='fe80::1234', prefsrc='fe80::2')]

    def test_guest_scope_is_selected_independently_of_windows(self):
        connect = Mock(return_value=dict(outcome='not-reachable', errorType='TimeoutError'))
        result = run(self.config(), self.read, connect)
        connect.assert_called_once_with('fe80::1234%eth0', 50000, 'b' * 32)
        self.assertEqual(result['status'], 'observed-path-not-reachable')
        self.assertFalse(result['isolationAccepted'])

    def test_ambiguous_interface_or_missing_ipv6_is_rejected(self):
        for routes, addresses in [([dict(dev='eth0'), dict(dev='eth1')], []), ([dict(dev='eth0')], [])]:
            with self.assertRaises(ValueError):
                select_interface(routes, addresses)

    def test_expired_or_scoped_host_configuration_does_not_connect(self):
        for field, value in [('expiresAtUtc', '2000-01-01T00:00:00+00:00'), ('address', 'fe80::1234%24'),
                             ('address', '::1'), ('port', 22)]:
            with self.subTest(field=field):
                connect = Mock()
                result = run({**self.config(), field: value}, self.read, connect)
                connect.assert_not_called()
                self.assertEqual(result['status'], 'invalid')

    def test_missing_route_is_invalid_not_a_successful_negative_test(self):
        def read(*args):
            return [dict(dev='wrong')] if args[:3] == ('-6', 'route', 'get') else self.read(*args)
        connect = Mock()
        result = run(self.config(), read, connect)
        connect.assert_not_called()
        self.assertEqual(result['status'], 'invalid')

    def test_unreachable_network_and_reachable_target_require_review(self):
        for probe in (dict(outcome='not-reachable', errorType='OSError', errno=101), dict(outcome='reachable')):
            result = run(self.config(), self.read, Mock(return_value=probe))
            self.assertEqual(result['status'], 'review-required')


if __name__ == '__main__':
    unittest.main()
