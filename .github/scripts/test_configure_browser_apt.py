"""Mirror selection and fail-closed checks, with no live APT/system modifications."""
from pathlib import Path
import tempfile
import unittest

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
        self.assertIn('URIs: ' + setup.ARCHIVE_LIST, actual)
        self.assertIn('URIs: ' + setup.SECURITY_LIST, actual)
        self.assertNotIn('azure.archive', actual)
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

    def test_invalid_source_changes_no_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'etc/apt/sources.list.d/ubuntu.sources'
            source.parent.mkdir(parents=True)
            original = SOURCE.replace('noble', 'unknown')
            source.write_text(original, encoding='utf-8')
            with self.assertRaises(ValueError):
                setup.configure(root)
            self.assertEqual(source.read_text(encoding='utf-8'), original)
            self.assertFalse((root / 'etc/apt/mercurion-archive-mirrors.txt').exists())

    def test_writes_bounded_fail_closed_settings_after_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'etc/apt/sources.list.d/ubuntu.sources'
            source.parent.mkdir(parents=True)
            (root / 'etc/apt/apt.conf.d').mkdir()
            source.write_text(SOURCE, encoding='utf-8')
            self.assertEqual(setup.configure(root)['aptErrorsFatal'], True)
            self.assertEqual((root / 'etc/apt/apt.conf.d/99-mercurion-browser-network').read_text(), setup.NETWORK)
            self.assertNotIn('azure.archive', source.read_text())
            for name, official in [('archive', setup.ARCHIVE), ('security', setup.SECURITY)]:
                mirrors = (root / f'etc/apt/mercurion-{name}-mirrors.txt').read_text()
                self.assertEqual(mirrors, f'{setup.MIRROR}\tpriority:1\n{official}\tpriority:2\n')
            self.assertEqual(setup.configure(root)['aptErrorsFatal'], True)


if __name__ == '__main__':
    unittest.main()
