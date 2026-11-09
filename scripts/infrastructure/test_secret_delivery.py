"""Run Linux integration cases only in the disposable local tmpfs test container."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import unittest
import uuid
from unittest.mock import patch

import secret_delivery as delivery


def payload(identifier, environment='preview'):
    return dict(schemaVersion=1, runId=identifier, environment=environment, consumer='tox21',
                variables=dict(NATS_USERNAME='synthetic-tox21', NATS_PASSWORD='synthetic-not-a-secret'))


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.identifier = uuid.uuid4().hex

    def test_valid_both_environments_and_literal_values(self):
        for environment in ('preview', 'production'):
            doc = payload(self.identifier, environment)
            doc['variables']['NATS_PASSWORD'] = 'synthetic-$()\n"\\\u00e8'
            self.assertEqual(delivery.validate(delivery.encode(doc), self.identifier), doc)

    def test_rejects_invalid_contracts(self):
        variants = [[], {}, payload(self.identifier)]
        variants[-1]['unexpected'] = 'value'
        for key, values in {
            'schemaVersion': [True, 1.0, 2, None],
            'runId': ['../escape', 'a' * 32, None],
            'environment': ['staging', None, 'development'],
            'consumer': ['nest', '../tox21', None],
            'variables': [{}, [], {'NATS_USERNAME': 'synthetic'},
                          {'NATS_USERNAME': 'synthetic', 'NATS_PASSWORD': 'synthetic', 'PY_ENV': 'production'}],
        }.items():
            for value in values:
                doc = payload(self.identifier)
                doc[key] = value
                variants.append(doc)
        for value in (None, '', '  ', '\0', '\ud800', 123):
            doc = payload(self.identifier)
            doc['variables']['NATS_PASSWORD'] = value
            variants.append(doc)
        for doc in variants:
            with self.subTest(doc_type=type(doc).__name__), self.assertRaises(delivery.DeliveryError):
                delivery.validate(delivery.encode(doc), self.identifier)

    def test_invalid_encoding_duplicates_constants_depth_and_size(self):
        for data in (b'', b'\xff', b'{"schemaVersion":1,"schemaVersion":1}', b'NaN',
                     b'[' * 2000, b' ' * (delivery.LIMIT + 1)):
            with self.assertRaises(delivery.DeliveryError):
                delivery.validate(data, self.identifier)

    def test_errors_never_include_payload(self):
        doc = payload(self.identifier)
        doc['consumer'] = 'synthetic-private-marker'
        with self.assertRaises(delivery.DeliveryError) as error:
            delivery.validate(delivery.encode(doc), self.identifier)
        self.assertNotIn('synthetic-private-marker', str(error.exception))


@unittest.skipUnless(sys.platform == 'linux' and os.geteuid() == 0
                     and os.environ.get('MERCURION_SYNTHETIC_DELIVERY_TEST') == '1',
                     'Disposable Linux root/tmpfs harness required')
class LinuxDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.identifier = uuid.uuid4().hex
        self.run = delivery.BASE / self.identifier
        self.doc = payload(self.identifier)
        delivery.prepare(self.identifier, 'preview', 'nobody')

    def invoke(self, command, data=None, uid=0):
        def identity():
            os.setgroups([])
            os.setgid(uid)
            os.setuid(uid)
        return subprocess.run([sys.executable, '-B', str(Path(delivery.__file__)), command,
                               '--run-id', self.identifier], input=data, capture_output=True,
                              preexec_fn=identity, timeout=10, check=False)

    def receive(self, doc=None):
        result = self.invoke('receive', delivery.encode(self.doc if doc is None else doc), 65534)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_real_owner_receive_apply_and_consumer_permissions(self):
        self.receive()
        self.assertEqual((self.run / 'inbox/payload.json').stat().st_uid, 65534)
        result = self.invoke('apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        path = self.run / 'active/bootstrap.json'
        self.assertEqual(path.stat().st_uid, 10021)
        self.assertEqual(path.stat().st_gid, 10021)
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o400)
        self.assertFalse((self.run / 'inbox/payload.json').exists())
        self.assertEqual((self.run / 'inbox').stat().st_uid, 0)
        self.assertNotIn(b'synthetic', result.stdout + result.stderr)
        # Real consumer UID, no root/group privileges, reads repeatedly after apply exits.
        script = 'import pathlib,sys; print(pathlib.Path(sys.argv[1]).read_text())'
        for attempt in range(2):
            read = subprocess.run([sys.executable, '-B', '-c', script, str(path)],
                                  capture_output=True, user=10021, group=10021, extra_groups=[], timeout=10)
            self.assertEqual(read.returncode, 0, read.stderr)
            doc = json.loads(read.stdout)
            self.assertEqual(doc['environment'], 'staging')
            self.assertEqual(doc['variables'], self.doc['variables'])
        read = subprocess.run([sys.executable, '-B', '-c', script, str(path)], capture_output=True,
                              user=65534, group=65534, extra_groups=[], timeout=10)
        self.assertNotEqual(read.returncode, 0)
        self.assertNotIn(b'synthetic', read.stderr)

    def test_production_mapping(self):
        # Protected preparation determines environment; payload cannot switch it.
        other = uuid.uuid4().hex
        delivery.prepare(other, 'production', 'nobody')
        original = self.identifier
        self.identifier = other
        self.receive(payload(other, 'production'))
        self.assertEqual(self.invoke('apply').returncode, 0)
        self.assertEqual(json.loads((delivery.BASE / other / 'active/bootstrap.json').read_bytes())
                         ['environment'], 'production')
        self.identifier = original

    def test_real_tox21_adapter_reads_delivered_file(self):
        reader = Path('/consumer/secret_bootstrap.py')
        self.assertTrue(reader.is_file(), 'Harness must mount the existing Tox21 reader')
        self.receive()
        self.assertEqual(self.invoke('apply').returncode, 0)
        path = self.run / 'active/bootstrap.json'
        script = (
            'import sys; sys.path.insert(0,"/consumer"); '
            'from secret_bootstrap import load_secret_file_environment; '
            'target={"PY_ENV":"staging","MERCURION_BOOTSTRAP_FILE":sys.argv[1]}; '
            'load_secret_file_environment(target); '
            'assert target["NATS_USERNAME"]=="synthetic-tox21"; '
            'assert target["NATS_PASSWORD"]=="synthetic-not-a-secret"; '
            'print("consumer-ok")')
        result = subprocess.run([sys.executable, '-B', '-c', script, str(path)], capture_output=True,
                                user=10021, group=10021, extra_groups=[], timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, b'consumer-ok\n')

    def test_inspection_is_metadata_only_and_rejects_missing_or_tampered_active(self):
        self.assertNotEqual(self.invoke('inspect', uid=65534).returncode, 0)
        self.receive()
        self.assertEqual(self.invoke('apply').returncode, 0)
        result = self.invoke('inspect', uid=65534)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['phase'], 'active')
        self.assertNotIn(b'synthetic', result.stdout)
        os.chmod(self.run / 'active/bootstrap.json', 0o444)
        self.assertNotEqual(self.invoke('inspect', uid=65534).returncode, 0)

    def test_busy_inbox_rejected_without_publication(self):
        import fcntl
        self.receive()
        with delivery.directory(self.run / 'inbox', 65534, 0o700) as inbox:
            fcntl.flock(inbox, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertNotEqual(self.invoke('apply').returncode, 0)
        self.assertFalse((self.run / 'active').exists())

    def test_missing_tmpfs_guard_prevents_prepare(self):
        with patch.object(delivery.Path, 'read_text', return_value=''):
            with self.assertRaises(delivery.DeliveryError):
                delivery.prepare(uuid.uuid4().hex, 'preview', 'nobody')

    def test_repeated_receive_prepare_apply_are_rejected(self):
        self.receive()
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 65534).returncode, 0)
        with self.assertRaises(FileExistsError):
            delivery.prepare(self.identifier, 'preview', 'nobody')
        self.assertEqual(self.invoke('apply').returncode, 0)
        before = (self.run / 'active/bootstrap.json').read_bytes()
        self.assertNotEqual(self.invoke('apply').returncode, 0)
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 65534).returncode, 0)
        self.assertEqual((self.run / 'active/bootstrap.json').read_bytes(), before)

    def test_missing_input_and_environment_mismatch_never_publish(self):
        self.assertNotEqual(self.invoke('receive', b'', 65534).returncode, 0)
        self.assertFalse((self.run / 'inbox/payload.json').exists())
        self.receive(payload(self.identifier, 'production'))
        self.assertNotEqual(self.invoke('apply').returncode, 0)
        self.assertFalse((self.run / 'active').exists())

    def test_non_owner_receive_and_non_root_apply_rejected(self):
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 10021).returncode, 0)
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 0).returncode, 0)
        self.assertNotEqual(self.invoke('apply', uid=65534).returncode, 0)

    def test_payload_symlink_hardlink_fifo_and_modes_rejected(self):
        path = self.run / 'inbox/payload.json'
        target = self.run / 'target'
        target.write_bytes(delivery.encode(self.doc))
        for kind in ('symlink', 'hardlink', 'fifo', 'world-readable'):
            with self.subTest(kind=kind):
                if kind == 'symlink':
                    path.symlink_to(target)
                elif kind == 'hardlink':
                    os.link(target, path)
                    os.chown(path, 65534, 65534)
                    os.chmod(path, 0o600)
                elif kind == 'fifo':
                    os.mkfifo(path, 0o600)
                    os.chown(path, 65534, 65534)
                else:
                    path.write_bytes(delivery.encode(self.doc))
                    os.chown(path, 65534, 65534)
                    os.chmod(path, 0o644)
                self.assertNotEqual(self.invoke('apply').returncode, 0)
                self.assertFalse((self.run / 'active').exists())
                path.unlink()
                (self.run / 'applying').rmdir()

    def test_parent_symlink_and_loose_permissions_rejected(self):
        inbox = self.run / 'inbox'
        inbox.rename(self.run / 'original-inbox')
        inbox.symlink_to(self.run / 'original-inbox')
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 65534).returncode, 0)
        inbox.unlink()
        (self.run / 'original-inbox').rename(inbox)
        os.chmod(self.run, 0o777)
        self.assertNotEqual(self.invoke('receive', delivery.encode(self.doc), 65534).returncode, 0)
        os.chmod(self.run, 0o711)

    def test_atomic_publish_on_write_failure_and_reserved_run(self):
        self.receive()
        with patch.object(delivery, 'create_file', side_effect=OSError('synthetic-private-marker')):
            with self.assertRaises(OSError):
                delivery.apply(self.identifier)
        self.assertFalse((self.run / 'active').exists())
        self.assertTrue((self.run / 'inbox/payload.json').exists())
        self.assertNotEqual(self.invoke('apply').returncode, 0)

    def test_tampered_payload_revalidated_by_apply(self):
        self.receive()
        path = self.run / 'inbox/payload.json'
        path.write_bytes(b'{"consumer":"synthetic-private-marker"}')
        result = self.invoke('apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(b'synthetic-private-marker', result.stdout + result.stderr)
        self.assertFalse((self.run / 'active').exists())

    def test_encoded_consumer_size_checked_before_publication(self):
        doc = payload(self.identifier)
        doc['variables']['NATS_PASSWORD'] = '\u00e8' * 200000
        data = json.dumps(doc, ensure_ascii=False).encode('utf-8')
        self.assertLess(len(data), delivery.LIMIT)
        self.assertEqual(self.invoke('receive', data, 65534).returncode, 0)
        self.assertNotEqual(self.invoke('apply').returncode, 0)
        self.assertFalse((self.run / 'active').exists())


if __name__ == '__main__':
    unittest.main()
