import json
from pathlib import Path
import ssl
import unittest
from unittest.mock import MagicMock, patch

import probe_egress as egress


class EgressTests(unittest.TestCase):
    def test_private_dns_answer_never_opens_connection(self):
        with patch.object(egress.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('192.168.1.1', 443))]), \
                patch.object(egress.socket, 'create_connection') as connect:
            result = egress.probe()
        connect.assert_not_called()
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['stage'], 'dns')

    def test_invalid_certificate_is_a_failure_without_http_attempt(self):
        context = MagicMock()
        context.wrap_socket.side_effect = ssl.SSLCertVerificationError('fixture')
        with patch.object(egress.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('151.101.0.223', 443))]), \
                patch.object(egress.socket, 'create_connection', return_value=MagicMock()), \
                patch.object(egress.ssl, 'SSLContext', return_value=context), \
                patch.object(egress.http.client, 'HTTPSConnection') as http:
            result = egress.probe()
        http.assert_not_called()
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['errorType'], 'SSLCertVerificationError')

    def test_report_from_another_target_is_rejected(self):
        with self.assertRaises(ValueError):
            egress.decode_client(json.dumps(dict(endpoint='https://other.example/', family='IPv4', method='HEAD')))

    def test_client_process_failure_cleans_its_container_and_network(self):
        calls = []

        def invoke(*args, **kwargs):
            calls.append(args)
            if args[0] == 'version':
                return 'linux/amd64'
            if args[:2] == ('image', 'inspect'):
                return json.dumps([dict(Id=egress.IMAGE, Os='linux', Architecture='amd64')])
            if args[:2] == ('network', 'create'):
                return 'b' * 64
            if args[0] == 'create':
                return 'c' * 64
            if args[0] == 'inspect':
                return '1'
            return ''

        with patch.object(egress.subprocess, 'run', return_value=MagicMock(stdout=json.dumps(
                dict(endpoint=f'https://{egress.HOST}{egress.PATH}', family='IPv4', method='HEAD', status='failed')))):
            report = egress.run(Path('/fixture'), 'a' * 32, invoke)
        self.assertEqual(report['status'], 'invalid')
        self.assertIn(('rm', '--force', 'c' * 64), calls)
        self.assertIn(('network', 'rm', 'b' * 64), calls)
        self.assertFalse(report['isolationAccepted'])


if __name__ == '__main__':
    unittest.main()
