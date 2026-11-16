"""COPY stream guards: commit only after hash/row checks, never replay foreign SQL."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest

from embedding_dump_inventory import HEADER,inventory
from guest_embedding_import import stream_copy
from preview_embedding_import import STAGE,LAUNCH,STATUS


def chunk():
    return b'\\set ON_ERROR_STOP on\nBEGIN;\n'+HEADER+b'\n'+b'00000000-0000-0000-0000-000000000001\t17\tCCO\t[1,0,0]\tfixture-model\t2026-11-12 00:00:00+00\tfixture\n\\.\nCOMMIT;\n'


class EmbeddingImport(unittest.TestCase):
    def record(self,data):return dict(name='molecule_embeddings-000.sql',sha256=hashlib.sha256(data).hexdigest(),rows=1,bytes=len(data))

    def test_journal_and_commit_follow_verified_copy_data(self):
        data=chunk();out=io.BytesIO()
        self.assertEqual(stream_copy(io.BytesIO(data),out,self.record(data),'a'*64),1)
        value=out.getvalue()
        self.assertLess(value.index(b'\\.\n'),value.index(b'INSERT INTO mercurion_ops.embedding_import_chunks'))
        self.assertTrue(value.endswith(b'COMMIT;\n'))
        self.assertEqual(value.count(b'COMMIT;'),1)

    def test_checksum_count_extra_sql_and_bad_header_never_commit(self):
        data=chunk()
        variants=[(data,dict(self.record(data),sha256='f'*64)),(data,dict(self.record(data),rows=2)),
                  (data+b'DROP TABLE users;',self.record(data+b'DROP TABLE users;')),
                  (data.replace(b'BEGIN;',b'DROP TABLE users;'),self.record(data))]
        for source,record in variants:
            out=io.BytesIO()
            with self.subTest(record=record),self.assertRaises(ValueError):stream_copy(io.BytesIO(source),out,record,'a'*64)
            self.assertNotIn(b'COMMIT;',out.getvalue())
            self.assertNotIn(b'DROP TABLE',out.getvalue())

    def test_chunk_identifier_cannot_inject_journal_sql(self):
        out=io.BytesIO()
        with self.assertRaises(ValueError):stream_copy(io.BytesIO(chunk()),out,dict(self.record(chunk()),name="x');DROP TABLE users;"),'a'*64)
        self.assertEqual(out.getvalue(),b'')

    def test_inventory_numbers_hashes_and_hides_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'chunks';source.mkdir()
            (source/'molecule_embeddings-000.sql').write_bytes(chunk())
            with contextlib.redirect_stdout(io.StringIO()) as output:result=inventory(source,Path(directory)/'manifest.json')
            self.assertEqual(result['rowCount'],1)
            self.assertEqual(result['dimensions'],{3:1})
            self.assertEqual(result['files'][0]['sha256'],hashlib.sha256(chunk()).hexdigest())
            self.assertNotIn('CCO',output.getvalue())

    def test_missing_chunk_number_stops_before_scan(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory);(source/'molecule_embeddings-001.sql').write_bytes(chunk())
            with self.assertRaises(ValueError):inventory(source,source/'manifest.json')
            self.assertFalse((source/'manifest.json').exists())

    def test_remote_staging_and_worker_commands_compile(self):
        for source in (STAGE,LAUNCH,STATUS):compile(source,'<embedding-owner-command>','exec')


if __name__=='__main__':unittest.main()
