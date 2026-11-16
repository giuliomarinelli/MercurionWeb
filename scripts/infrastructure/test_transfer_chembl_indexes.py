"""Focused contract checks; fake APIs never connect to development or staging."""
import copy
import io
from pathlib import Path
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

import transfer_chembl_indexes as transfer
from meili_logical_transfer import ApiError


class FakeClient:
    def __init__(self):
        self.indexes = {}
        self.calls = []

    def call(self, path, body=None, method=None):
        self.calls.append((path, method))
        if path == '/version':
            return {'pkgVersion': '1.14.0'}
        if path.startswith('/tasks?'):
            return {'total': 0}
        if path.startswith('/tasks/'):
            return {'status': 'succeeded'}
        if path == '/indexes':
            self.indexes[body['uid']] = {'uid': body['uid'], 'primaryKey': body['primaryKey'],
                                         'updatedAt': 'unchanged', 'settings': {}, 'documents': []}
            return {'taskUid': 1}
        uid = path.split('/')[2]
        if uid not in self.indexes:
            raise ApiError(404, path, 'index_not_found')
        index = self.indexes[uid]
        if path.endswith('/settings'):
            if method == 'PATCH':
                index['settings'] = copy.deepcopy(body)
                return {'taskUid': 1}
            return copy.deepcopy(index['settings'])
        if path.endswith('/stats'):
            return {'numberOfDocuments': len(index['documents'])}
        if '/documents' in path:
            if method == 'POST':
                index['documents'] = copy.deepcopy(body)
                return {'taskUid': 1}
            return {'results': copy.deepcopy(index['documents']), 'total': len(index['documents'])}
        return {key: index[key] for key in ('uid', 'primaryKey', 'updatedAt')}


class TransferTests(unittest.TestCase):
    def test_bulk_timeout_reaches_http_opener_without_changing_shared_default(self):
        client = transfer.TransferClient('http://127.0.0.1:17700', 'synthetic')
        self.assertEqual(30, transfer.Client('http://127.0.0.1:17700', 'synthetic').timeout)
        with patch.object(client.opener, 'open', side_effect=TimeoutError(10060, 'synthetic')) as call:
            with self.assertRaises(TimeoutError) as caught:
                client.call('/indexes/example/documents', [{'id': 'synthetic'}], 'POST')
            self.assertEqual(1, call.call_count)
            self.assertEqual(180, call.call_args.kwargs['timeout'])
            details = transfer.failure_details(caught.exception)
            self.assertEqual('/indexes/example/documents', details['operation'])
            self.assertEqual('POST', details['method'])
            self.assertTrue(details['requestMayHaveBeenAccepted'])
            self.assertNotIn('synthetic', str(details))

    def test_403_fails_before_batch_validation_or_journal_access(self):
        error = ApiError(403, '/version', 'invalid_api_key')
        with patch.object(transfer.Client, 'call', side_effect=error) as call, \
                patch.object(transfer, 'load_bundle') as load:
            with self.assertRaises(ApiError):
                transfer.import_bundle(transfer.TransferClient('http://127.0.0.1:17700', 'synthetic'), Path('unused'))
            load.assert_not_called()
            call.assert_called_once_with('/version', None, None)
        self.assertEqual({'status': 'failed', 'code': 'meili-http-403', 'automaticCleanup': False,
                          'reasonType': 'ApiError', 'errno': None, 'operation': '/version',
                          'apiCode': 'invalid_api_key'}, transfer.failure_details(error))

    def test_private_stdin_accepts_powershell_line_ending_and_rejects_controls(self):
        with patch.object(transfer.sys, 'stdin', io.StringIO('synthetic-key\r\n')):
            self.assertEqual('synthetic-key', transfer.read_key(True, 'unused'))
        for invalid in ('', '\r\n', 'synthetic\nsecond', 'synthetic\x1b'):
            with patch.object(transfer.sys, 'stdin', io.StringIO(invalid)):
                with self.assertRaises(ValueError):
                    transfer.read_key(True, 'unused')

    @patch.object(transfer, 'emit')
    @patch.object(transfer.time, 'sleep')
    def test_get_transport_retry_is_bounded_and_never_repeats_writes(self, sleep, _):
        client = transfer.TransferClient('http://127.0.0.1:17700', 'synthetic')
        failure = urllib.error.URLError(ConnectionResetError(10054, 'synthetic'))
        with patch.object(transfer.Client, 'call', side_effect=[failure, {'status': 'succeeded'}]) as call:
            self.assertEqual('succeeded', client.call('/tasks/491')['status'])
            self.assertEqual(2, call.call_count)
        with patch.object(transfer.Client, 'call', side_effect=failure) as call:
            with self.assertRaises(urllib.error.URLError):
                client.call('/tasks/491')
            self.assertEqual(4, call.call_count)
        for method in ('POST', 'PATCH'):
            with patch.object(transfer.Client, 'call', side_effect=failure) as call:
                with self.assertRaises(urllib.error.URLError):
                    client.call('/indexes/example/documents', [], method)
                self.assertEqual(1, call.call_count)

    @patch.object(transfer, 'emit')
    def test_pending_success_is_reconciled_without_resending_batch(self, _):
        import json
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            self.bundle(root)
            target = FakeClient()
            transfer.import_bundle(target, root)
            journal = json.loads((root / 'import-journal.json').read_text())
            uid = transfer.INDEXES[0]
            label = next(part for part in journal['indexes'][uid]['completed'] if part.endswith('.json'))
            journal['indexes'][uid]['completed'].remove(label)
            journal['indexes'][uid]['pending'] = {'label': label, 'taskUid': 491}
            transfer.save(root / 'import-journal.json', journal)
            target.calls.clear()
            transfer.import_bundle(target, root)
            self.assertIn(('/tasks/491', None), target.calls)
            self.assertFalse(any(method for _, method in target.calls))

    @patch.object(transfer, 'emit')
    def test_explicit_no_space_retry_preserves_completed_work_and_failure_record(self, _):
        import json
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            self.bundle(root)
            target = FakeClient()
            transfer.import_bundle(target, root)
            manifest = json.loads((root / 'manifest.json').read_text())
            uid = transfer.INDEXES[0]
            label = manifest['indexes'][0]['files'][0]['file']
            journal = json.loads((root / 'import-journal.json').read_text())
            journal['indexes'][uid]['completed'].remove(label)
            journal['indexes'][uid]['pending'] = {'label': label, 'taskUid': 470}
            transfer.save(root / 'import-journal.json', journal)
            call = target.call
            def with_failed_task(path, body=None, method=None):
                if path == '/tasks/470':
                    return {'status': 'failed', 'indexUid': uid, 'type': 'documentAdditionOrUpdate',
                            'error': {'code': 'no_space_left_on_device'}}
                return call(path, body, method)
            target.call = with_failed_task
            with self.assertRaisesRegex(ValueError, 'task-failed'):
                transfer.import_bundle(target, root)
            transfer.import_bundle(target, root, retry_failed_task=470)
            final = json.loads((root / 'import-journal.json').read_text())
            self.assertEqual(470, final['indexes'][uid]['failedTasks'][0]['taskUid'])
            self.assertIn(label, final['indexes'][uid]['completed'])
            with self.assertRaisesRegex(ValueError, 'not-pending'):
                transfer.import_bundle(target, root, retry_failed_task=470)

    def bundle(self, root):
        source = FakeClient()
        for uid in transfer.INDEXES:
            source.indexes[uid] = {'uid': uid, 'primaryKey': 'id', 'updatedAt': 'unchanged',
                                  'settings': {'filterableAttributes': ['molregno']},
                                  'documents': [{'id': 1, 'molregno': 1280, 'name': 'aspirin'}]}
        transfer.export(source, root)
        return source

    @patch.object(transfer, 'emit')
    def test_selective_roundtrip_preserves_logs_and_never_accesses_keys(self, _):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            source = self.bundle(root)
            target = FakeClient()
            target.indexes['logs_staging'] = {'uid': 'logs_staging', 'primaryKey': 'id',
                'updatedAt': 'old', 'settings': {'searchableAttributes': ['message']},
                'documents': [{'id': 'retained', 'message': 'preserve'}]}
            original = copy.deepcopy(target.indexes['logs_staging'])
            transfer.import_bundle(target, root)
            self.assertEqual(original, target.indexes['logs_staging'])
            for uid in transfer.INDEXES:
                self.assertEqual(source.indexes[uid]['documents'], target.indexes[uid]['documents'])
                self.assertEqual(source.indexes[uid]['settings'], target.indexes[uid]['settings'])
            self.assertTrue(all(uid in target.indexes for uid in transfer.LOGS))
            writes = len([call for call in target.calls if call[1]])
            transfer.import_bundle(target, root)
            self.assertEqual(writes, len([call for call in target.calls if call[1]]))
            self.assertFalse(any('/keys' in path for path, _ in source.calls + target.calls))

    @patch.object(transfer, 'emit')
    def test_corrupted_batch_rejected_before_target_writes(self, _):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            self.bundle(root)
            next(root.glob('*-000000000.json')).write_text('[]')
            target = FakeClient()
            with self.assertRaisesRegex(ValueError, 'checksum'):
                transfer.import_bundle(target, root)
            self.assertEqual([('/version', None)], target.calls)

    @patch.object(transfer, 'emit')
    def test_existing_unowned_chembl_index_rejected(self, _):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            self.bundle(root)
            target = FakeClient()
            target.indexes[transfer.INDEXES[0]] = {'uid': transfer.INDEXES[0], 'primaryKey': 'id', 'updatedAt': 'old'}
            with self.assertRaisesRegex(ValueError, 'already-exists'):
                transfer.import_bundle(target, root)
            self.assertFalse(any(method for _, method in target.calls))


if __name__ == '__main__':
    unittest.main()
