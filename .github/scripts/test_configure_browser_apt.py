"""Mirror selection and fail-closed checks, with no live APT/system modifications."""
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch

import configure_browser_apt as setup

SOURCE = '''Types: deb
URIs: mirror+file:/etc/apt/apt-mirrors.txt
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://azure.archive.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
'''


class BrowserAptTests(unittest.TestCase):
    def test_direct_https_mirrors_preserve_suites_components_and_signatures(self):
        actual = setup.rewrite(SOURCE)
        self.assertIn('URIs: ' + setup.ARCHIVE, actual)
        self.assertIn('URIs: ' + setup.SECURITY, actual)
        self.assertNotIn('azure.archive', actual)
        self.assertNotIn('mirror+file:', actual)
        self.assertEqual([line for line in SOURCE.splitlines() if not line.startswith('URIs:')],
                         [line for line in actual.splitlines() if not line.startswith('URIs:')])
        self.assertEqual(setup.rewrite(actual), actual)

    def test_unrecognized_suite_key_or_mixed_mirrors_fail(self):
        for text in (SOURCE.replace('noble', 'resolute'), SOURCE.replace('Signed-By:', 'Other-Key:'),
                     SOURCE.replace('apt-mirrors.txt', 'apt-mirrors.txt https://other.invalid/')):
            with self.subTest(text=text), self.assertRaises(ValueError):
                setup.rewrite(text)

    def test_unrelated_repository_is_unchanged(self):
        extra = '\nTypes: deb\nURIs: https://packages.microsoft.com/ubuntu/24.04/prod\nSuites: noble\nComponents: main\n'
        self.assertTrue(setup.rewrite(SOURCE + extra).endswith(extra))

    def test_dns_failure_changes_no_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'etc/apt/sources.list.d/ubuntu.sources'
            source.parent.mkdir(parents=True)
            source.write_text(SOURCE, encoding='utf-8')
            with patch.object(setup.socket, 'getaddrinfo', side_effect=socket.gaierror('synthetic DNS failure')):
                with self.assertRaises(socket.gaierror):
                    setup.configure(root)
            self.assertEqual(source.read_text(encoding='utf-8'), SOURCE)
            self.assertFalse((root / 'etc/apt/apt.conf.d/99-mercurion-browser-network').exists())

    def test_writes_bounded_fail_closed_settings_after_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'etc/apt/sources.list.d/ubuntu.sources'
            source.parent.mkdir(parents=True)
            (root / 'etc/apt/apt.conf.d').mkdir()
            source.write_text(SOURCE, encoding='utf-8')
            with patch.object(setup.socket, 'getaddrinfo', return_value=[('synthetic',)]):
                self.assertEqual(setup.configure(root)['aptErrorsFatal'], True)
            self.assertEqual((root / 'etc/apt/apt.conf.d/99-mercurion-browser-network').read_text(), setup.NETWORK)
            self.assertNotIn('azure.archive', source.read_text())


if __name__ == '__main__':
    unittest.main()
