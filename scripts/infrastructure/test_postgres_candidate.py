"""Safety and restore selection for the isolated PostgreSQL candidate workflow."""
import hashlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import prepare_postgres_candidate as prepare
import smoke_postgres_update as smoke


class PostgresCandidate(unittest.TestCase):
    def test_existing_preparation_directory_is_preserved_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'preserve.txt').write_text('preserve')
            with patch.object(prepare.urllib.request,'urlopen') as network, self.assertRaises(FileExistsError):
                prepare.prepare(root)
            network.assert_not_called()
            self.assertEqual((root/'preserve.txt').read_text(),'preserve')

    def test_source_hash_failure_prevents_build_context_completion(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'new'
            with patch.object(prepare.urllib.request,'urlopen',return_value=io.BytesIO(b'tampered')), self.assertRaises(ValueError):
                prepare.prepare(root)
            self.assertFalse((root/'build-inputs.json').exists())
            self.assertFalse((root/'postgresql-16.16.tar.bz2').exists())

    def test_restore_preserves_table_data_and_hnsw_but_keeps_precreated_extension(self):
        source='\n'.join([
            '1; 2615 2200 SCHEMA - public postgres',
            '2; 3079 12345 EXTENSION - vector ',
            '3; 0 0 COMMENT - EXTENSION vector ',
            '4; 1259 54321 TABLE public vector postgres',
            '5; 0 54321 TABLE DATA public vector postgres',
            '6; 1259 54322 INDEX public fixture_hnsw postgres',
            '7; 2615 54323 SCHEMA - public_fixture postgres'])
        lines=smoke.restore_entries(source).splitlines()
        self.assertEqual(lines,source.splitlines()[3:])

    def test_bad_legacy_sql_never_invokes_docker_or_creates_run(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            legacy=root/'invalid.sql'; legacy.write_text('invalid')
            with patch.object(smoke.subprocess,'run') as command, self.assertRaises(ValueError):
                smoke.smoke('sha256:'+'a'*64,'sha256:'+'b'*64,legacy,root/'run')
            command.assert_not_called()
            self.assertFalse((root/'run').exists())

    def test_existing_report_directory_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            legacy=root/'fixture.sql'; legacy.write_bytes(b'fixture')
            report=root/'run'; report.mkdir(); (report/'compatibility.json').write_text('preserve')
            with patch.object(smoke,'LEGACY_HASH',hashlib.sha256(b'fixture').hexdigest()), \
                 patch.object(smoke.subprocess,'run') as command, self.assertRaises(FileExistsError):
                smoke.smoke('sha256:'+'a'*64,'sha256:'+'b'*64,legacy,report)
            command.assert_not_called()
            self.assertEqual((report/'compatibility.json').read_text(),'preserve')


if __name__=='__main__': unittest.main()
