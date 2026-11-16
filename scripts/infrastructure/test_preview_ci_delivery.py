"""CI admission, extraction, and broker boundary tests. No SSH/GitHub access."""
import io
import json
import os
from pathlib import Path
import tempfile
import tarfile
import unittest
from unittest.mock import patch
import zipfile

import preview_ci_delivery as delivery
import preview_deploy_broker as broker
import preview_deploy_gateway as gateway


class DeliveryTests(unittest.TestCase):
    def test_only_successful_exact_preview_push_is_eligible(self):
        run = dict(event='push', head_branch='preview', conclusion='success', status='completed',
                   head_sha='a'*40, path='.github/workflows/ci.yml', head_repository={'full_name':'owner/web'})
        self.assertTrue(delivery.eligible(run, 'owner/web', 'a'*40))
        for change in ({'event':'pull_request'}, {'head_branch':'develop'}, {'conclusion':'failure'},
                       {'head_sha':'b'*40}, {'head_repository':{'full_name':'fork/web'}}):
            self.assertFalse(delivery.eligible({**run, **change}, 'owner/web', 'a'*40))

    def test_zip_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with zipfile.ZipFile(root/'bad.zip', 'w') as archive:
                archive.writestr('../outside', 'no')
            with self.assertRaises(ValueError):
                delivery.unpack(root/'bad.zip', root/'output')
            self.assertFalse((root/'outside').exists())

    def test_broker_arguments_cannot_select_paths_or_commands(self):
        self.assertEqual(broker.identity(['a'*32, 'b'*64]), ['a'*32, 'b'*64])
        for arguments in (['../../etc', 'b'*64], ['a'*32, 'b'*64, '--help'], ['-c', 'arbitrary']):
            with self.assertRaises(ValueError):
                broker.identity(arguments)

    def test_deploy_key_cannot_request_shell_sftp_or_docker(self):
        for command in ('bash', 'internal-sftp', '/usr/lib/openssh/sftp-server', 'docker ps', 'deploy a b;sh'):
            with patch.dict('os.environ', {'SSH_ORIGINAL_COMMAND':command}), self.assertRaises(SystemExit):
                gateway.main()

    def test_upload_cannot_escape_run_directory(self):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode='w') as archive:
            member = tarfile.TarInfo('../outside')
            member.size = 1
            archive.addfile(member, io.BytesIO(b'x'))
        data.seek(0)
        class Input:
            buffer = data
        with tempfile.TemporaryDirectory() as folder, patch.object(gateway.Path, 'home', return_value=Path(folder)), patch.object(gateway.sys, 'stdin', Input()):
            with self.assertRaises(ValueError):
                gateway.upload('a'*32, 'b'*64)
            self.assertFalse((Path(folder)/'outside').exists())

    @unittest.skipUnless(os.name == 'posix', 'Linux directory-FD boundary')
    def test_broker_reads_regular_owned_files_and_rejects_symlinks_and_limits(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'data').write_bytes(b'public-test')
            (root/'link').symlink_to(root/'data')
            fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
            try:
                self.assertEqual(broker.read_owned(fd, ['data'], os.getuid(), 20), b'public-test')
                with self.assertRaises(OSError):
                    broker.read_owned(fd, ['link'], os.getuid(), 20)
                with self.assertRaises(ValueError):
                    broker.read_owned(fd, ['data'], os.getuid(), 2)
            finally:
                os.close(fd)


if __name__ == '__main__':
    unittest.main()
