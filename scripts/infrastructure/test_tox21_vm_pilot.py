"""Fail-closed VM pilot transport/load tests. No Docker or guest required."""
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import run_tox21_vm_pilot as pilot
import test_tox21_transport as fixtures


def broker(root):
    directory = root / 'broker'
    directory.mkdir()
    config = json.dumps({'os': 'linux', 'architecture': 'amd64', 'config': {'Labels': {
        'org.opencontainers.image.revision': '5a815f11a911efa2c88fd1dbfb18ed89a449bfc1',
        'org.opencontainers.image.version': 'fixture',
        'org.mercurion.crypto.revision': '2f1f834330b2d36ab3db8bfb33aaa1ac16794588'}}}).encode()
    with tarfile.open(directory / 'image.tar', 'w') as archive:
        for name, raw in [('manifest.json', b'[{"Config":"config.json","RepoTags":[]}]'), ('config.json', config)]:
            info = tarfile.TarInfo(name)
            info.size = len(raw)
            archive.addfile(info, io.BytesIO(raw))
    digest, _ = pilot.transport.delivery.archive_config(directory / 'image.tar')
    pilot.transport.write(directory / 'vulnerabilities.json', {
        'SchemaVersion': 2, 'Metadata': {'ImageID': digest},
        'Results': [{'Target': 'binary', 'Type': 'gobinary'}]})
    pilot.transport.write(directory / 'sbom.cdx.json', {'bomFormat': 'CycloneDX', 'components': [{'name': 'fixture'}]})
    return directory, digest


class PilotTests(unittest.TestCase):
    def package(self, root):
        candidate = fixtures.source(root)
        bundle = root / 'bundle'
        pilot.transport.prepare(candidate, bundle, 'c' * 40)
        report = root / 'preflight.json'
        pilot.transport.write(report, {'status': 'ready', 'readyForArtifactTransfer': True,
            'request': pilot.transport.read(bundle / 'preflight/request.json'),
            'checks': dict.fromkeys(('platform', 'os', 'address', 'gateway', 'ipv4OnlyBaseline', 'docker', 'compose', 'space'), True)})
        directory, _ = broker(root)
        output = root / 'pilot'
        pilot.prepare(bundle, report, directory, output)
        return output

    def test_missing_or_wrong_preflight_cannot_authorize_load(self):
        with self.assertRaises(ValueError):
            pilot.ready({'status': 'ready', 'readyForArtifactTransfer': True, 'checks': {}}, {})
        with self.assertRaises(ValueError):
            pilot.ready({'status': 'ready', 'readyForArtifactTransfer': True, 'request': {'other': True}}, {})

    def test_low_unknown_and_unfixed_broker_findings_all_block(self):
        for severity in ('LOW', 'UNKNOWN', 'MEDIUM', 'HIGH', 'CRITICAL'):
            with self.subTest(severity=severity), tempfile.TemporaryDirectory() as temporary:
                directory, _ = broker(Path(temporary))
                path = directory / 'vulnerabilities.json'
                scan = pilot.transport.read(path)
                scan['Results'][0]['Vulnerabilities'] = [{'VulnerabilityID': 'GO-fixture', 'PkgName': 'fixture', 'Severity': severity}]
                path.write_text(json.dumps(scan))
                with self.assertRaises(ValueError):
                    pilot.broker(directory)

    def test_archive_roundtrip_uses_exact_loaded_id_and_requires_config_match(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory, digest = broker(root)
            calls = []
            def docker(*args, **kwargs):
                calls.append(args)
                if args[0] == 'load':
                    return 'Loaded image ID: sha256:' + 'a' * 64
                (root / 'roundtrip.tar').write_bytes((directory / 'image.tar').read_bytes())
                return ''
            result = pilot.load_archive(directory / 'image.tar', digest, root / 'roundtrip.tar', execute=docker)
            self.assertTrue(result['roundtripVerified'])
            self.assertEqual(calls[1][-1], 'sha256:' + 'a' * 64)
            with self.assertRaisesRegex(ValueError, 'differs'):
                pilot.load_archive(directory / 'image.tar', 'sha256:' + 'b' * 64, root / 'roundtrip.tar', execute=docker)
            with self.assertRaisesRegex(ValueError, 'Ambiguous'):
                pilot.load_archive(directory / 'image.tar', digest, root / 'roundtrip.tar', execute=lambda *a, **k: 'unexpected')

    def test_script_tampering_or_manifest_traversal_blocks_execution(self):
        for mutation in ('script', 'traversal'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temporary:
                output = self.package(Path(temporary))
                if mutation == 'script':
                    (output / pilot.SCRIPTS[-1]).write_text('changed')
                else:
                    path = output / 'pilot.json'
                    manifest = pilot.transport.read(path)
                    manifest['files']['../outside'] = 'a' * 64
                    path.write_text(json.dumps(manifest))
                with patch.object(pilot, 'docker') as command, self.assertRaises(ValueError):
                    pilot.execute(output, output / 'result.json')
                command.assert_not_called()

    def test_changed_guest_readiness_leaves_docker_unmodified(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = self.package(Path(temporary))
            with patch.object(pilot.guest, 'inspect', return_value={'readyForArtifactTransfer': False}), \
                    patch.object(pilot, 'docker') as command:
                result = pilot.execute(output, output / 'result.json')
            command.assert_not_called()
            self.assertEqual(result['status'], 'failed')
            self.assertEqual(result['loaded'], {})
            self.assertFalse(result['realServicesStarted'])
            with self.assertRaises(ValueError):
                pilot.execute(output, output / 'result.json')


if __name__ == '__main__':
    unittest.main()
