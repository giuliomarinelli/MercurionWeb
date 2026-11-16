"""Cold-recovery inventory contracts; synthetic metadata, no VM or private files."""
import contextlib
import copy
import hashlib
import io
import json
import os
import sys
from pathlib import Path
import tempfile
import subprocess
import uuid
import unittest
from unittest.mock import patch

import guest_preview_recovery_inventory as guest
import preview_recovery_inventory as host

RID = 'a' * 32


def containers():
    return [dict(Id=str(index) * 64, Image='sha256:' + str(index) * 64,
        Config=dict(Env=['PASSWORD=never-print-this'], Labels={
            'com.docker.compose.service': name, 'com.docker.compose.project': project,
            'mercurion.bootstrap.run': RID, 'unrelated': 'never-print-this'}),
        State=dict(Status='exited', Running=False), HostConfig=dict(ReadonlyRootfs=True),
        Mounts=[], NetworkSettings=dict(Networks={}))
        for index, (name, project) in enumerate(guest.EXPECTED.items(), 1)]


class InventoryContracts(unittest.TestCase):
    def test_sanitized_summary_does_not_include_environment_or_arbitrary_labels(self):
        data = containers()
        result = guest.summarize(data, RID, [item['Id'] for item in data])
        self.assertEqual(len(result), 4)
        self.assertNotIn('never-print-this', json.dumps(result))
        self.assertEqual({item['status'] for item in result}, {'exited'})

    def test_original_short_ids_resolve_uniquely_to_current_full_ids(self):
        full = [str(n) * 64 for n in range(1, 5)]
        self.assertEqual(guest.resolve_ids([value[:12] for value in full], full), full)
        self.assertEqual(guest.resolve_ids(full, full), full)
        for recorded, current in (([full[0][:12]] * 4, full),
                                  ([value[:12] for value in full], full[:-1]),
                                  ([value[:12] for value in full], [*full[:3], 'f' * 64]),
                                  ([value[:12] for value in full], [full[0], full[0], *full[2:]])):
            with self.subTest(recorded=recorded, current=current), self.assertRaises(ValueError):
                guest.resolve_ids(recorded, current)

    def test_rejects_missing_duplicate_foreign_or_unowned_containers(self):
        original = containers()
        variants = [original[:-1]]
        for change in (lambda item: item.update(Id='f' * 64),
                       lambda item: item['Config']['Labels'].update({'mercurion.bootstrap.run': 'b' * 32}),
                       lambda item: item['Config']['Labels'].update({'com.docker.compose.project': 'other'}),
                       lambda item: item['Config']['Labels'].update({'com.docker.compose.service': 'web-node'})):
            data = copy.deepcopy(original)
            change(data[0])
            variants.append(data)
        variants.append([original[0]] * 4)
        for data in variants:
            with self.subTest(data=data), self.assertRaises(ValueError):
                guest.summarize(data, RID, [item['Id'] for item in original])

    def test_rejects_publishing_privileged_or_writable_root(self):
        for values in (dict(PortBindings={'7700/tcp': []}), dict(Privileged=True), dict(ReadonlyRootfs=False)):
            data = containers()
            data[0]['HostConfig'].update(values)
            with self.subTest(values=values), self.assertRaisesRegex(ValueError, 'runtime-contract'):
                guest.summarize(data, RID, [item['Id'] for item in data])

    def test_inspection_commands_are_read_only_and_use_local_socket(self):
        import subprocess
        completed = subprocess.CompletedProcess([], 0, '[]', '')
        with patch.object(guest.subprocess, 'run', return_value=completed) as run:
            guest.docker('inspect', 'a' * 64)
        self.assertEqual(run.call_args.args[0][:4], ['docker', '--host', 'unix:///var/run/docker.sock', 'inspect'])
        self.assertFalse(any(k.startswith(('DOCKER_', 'COMPOSE_')) for k in run.call_args.kwargs['env']))

    def test_docker_failure_does_not_echo_stderr(self):
        import subprocess
        with patch.object(guest.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, '', 'never-print-this')):
            with self.assertRaisesRegex(ValueError, '^docker-read-failed$'):
                guest.docker('inspect', 'missing')

    def test_release_digest_mismatch_prevents_docker_calls(self):
        with patch.object(guest, 'regular', return_value=b'{}'), patch.object(guest, 'docker') as docker:
            with self.assertRaisesRegex(ValueError, 'manifest-mismatch'):
                guest.inventory(RID, 'f' * 64)
            docker.assert_not_called()

    def test_unsuccessful_original_bootstrap_prevents_docker_calls(self):
        raw = json.dumps(dict(runId=RID)).encode()
        previous = json.dumps(dict(runId=RID, status='failed')).encode()
        with patch.object(guest, 'regular', side_effect=[raw, previous]), patch.object(guest, 'docker') as docker:
            with self.assertRaisesRegex(ValueError, 'successful-bootstrap-required'):
                guest.inventory(RID, hashlib.sha256(raw).hexdigest())
            docker.assert_not_called()

    def test_changed_container_set_prevents_inspection(self):
        raw = json.dumps(dict(runId=RID)).encode()
        previous = json.dumps(dict(runId=RID, status='passed', ownedContainers=[str(n) * 64 for n in range(1, 5)])).encode()
        with patch.object(guest, 'regular', side_effect=[raw, previous]), patch.object(guest, 'docker', return_value='') as docker:
            with self.assertRaisesRegex(ValueError, 'container-set-changed'):
                guest.inventory(RID, hashlib.sha256(raw).hexdigest())
            self.assertEqual(docker.call_count, 1)

    def test_plan_never_starts_ssh_or_reads_configuration(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(host.bundle, 'verify', return_value={'runId': RID}), \
                patch.object(host, 'execute') as execute, patch('sys.argv', ['inventory', '--bundle', directory]), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(host.main(), 0)
            self.assertFalse(json.loads(output.getvalue())['sshStarted'])
            execute.assert_not_called()


@unittest.skipUnless(sys.platform == 'linux' and os.environ.get('PREVIEW_RECOVERY_FIXTURE') == '1',
                     'Opt-in disposable root Linux fixture only')
class LinuxInventoryFixture(unittest.TestCase):
    def test_real_protected_metadata_and_tmpfs_without_secret_bodies(self):
        self.assertEqual(os.geteuid(), 0)
        with tempfile.TemporaryDirectory(prefix='recovery-fixture-', dir='/opt') as directory:
            base = Path(directory)
            root = base / ('server-' + RID)
            root.mkdir(mode=0o755)
            raw = json.dumps(dict(runId=RID)).encode()
            (root / 'server-bootstrap.json').write_bytes(raw)
            data = containers()
            owned = [item['Id'] for item in data]
            (root / 'bootstrap-result.json').write_text(json.dumps(dict(runId=RID, status='passed', ownedContainers=[value[:12] for value in owned])))
            for index, item in enumerate(data[:3]):
                item['Mounts'] = [dict(Type='volume', Name='fixture-' + str(index), Source='/var/lib/docker/volumes/fixture',
                                      Destination='/data', RW=True)]
            def docker(*args):
                if args[0] == 'ps':
                    return '\n'.join(owned)
                if args[0] == 'inspect':
                    self.assertEqual(args[1:3], ('--format', guest.CONTAINER_FORMAT))
                    return '\n'.join(json.dumps(item) for item in data)
                self.assertEqual(args[:2], ('volume', 'inspect'))
                return '\n'.join(json.dumps(dict(Name='fixture-' + str(n), Driver='local', Labels={'private-marker': 'never-print-this'}))
                                     for n in range(3))
            with patch.object(guest, 'BASE', base), patch.object(guest, 'docker', side_effect=docker):
                result = guest.inventory(RID, hashlib.sha256(raw).hexdigest())
                self.assertTrue(result['coldRecoveryCandidate'])
                self.assertFalse(result['secretRunPresent'])
                self.assertNotIn('never-print-this', json.dumps(result))
                data[0]['State'].update(Status='running', Running=True)
                self.assertFalse(guest.inventory(RID, hashlib.sha256(raw).hexdigest())['coldRecoveryCandidate'])


@unittest.skipUnless(os.environ.get('PREVIEW_RECOVERY_DOCKER_FIXTURE') == '1', 'Opt-in local Docker metadata fixture')
class DockerFormatFixture(unittest.TestCase):
    def test_real_docker_templates_exclude_environment_and_arbitrary_labels(self):
        prefix = ['docker', '--context', 'desktop-linux'] if os.name == 'nt' else ['docker']
        def run(*args):
            return subprocess.check_output([*prefix, *args], text=True, timeout=30).strip()
        volume = 'recovery-inventory-fixture-' + uuid.uuid4().hex
        identifier = None
        created_volume = False
        try:
            identifier = run('create', '--pull', 'never', '--network', 'none', '--read-only',
                '--label', 'com.docker.compose.service=meilisearch', '--label', 'com.docker.compose.project=mercurion-shared',
                '--label', 'mercurion.bootstrap.run=' + RID, '--label', 'private-marker=never-print-this',
                '--env', 'PASSWORD=never-print-this', 'python:3.11-slim-trixie', 'python', '-V')
            value = run('inspect', '--format', guest.CONTAINER_FORMAT, identifier)
            self.assertEqual(json.loads(value)['Config']['Labels']['mercurion.bootstrap.run'], RID)
            self.assertNotIn('never-print-this', value)
            run('volume', 'create', '--label', 'private-marker=never-print-this', volume)
            created_volume = True
            value = run('volume', 'inspect', '--format', guest.VOLUME_FORMAT, volume)
            self.assertEqual(json.loads(value)['Name'], volume)
            self.assertNotIn('never-print-this', value)
        finally:
            if identifier:
                run('rm', identifier)
            if created_volume:
                run('volume', 'rm', volume)


if __name__ == '__main__':
    unittest.main()
