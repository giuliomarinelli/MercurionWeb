import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('coordinate-delivery.py'))
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)
REVISION = 'a' * 40

export_spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-web-container.py'))
exporter = importlib.util.module_from_spec(export_spec)
export_spec.loader.exec_module(exporter)


class ScannerCacheTests(unittest.TestCase):
    def test_release_scans_do_not_reuse_unexpired_database_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cache = root / 'cache'
            (cache / 'db').mkdir(parents=True)
            previous = cache / 'db/metadata.json'
            previous.write_text('{"NextUpdate":"2099-01-01T00:00:00Z"}')
            refreshed = []
            def scan(command, **kwargs):
                mount = next(arg for arg in command if arg.startswith('type=bind,src=') and arg.endswith(',dst=/cache'))
                owned = Path(mount[len('type=bind,src='):-len(',dst=/cache')])
                if '--download-db-only' in command:
                    self.assertFalse((owned / 'db').exists())
                    refreshed.append(owned)
                    (owned / 'db').mkdir()
                    (owned / 'db/metadata.json').write_text('{"Version":2,"UpdatedAt":"synthetic-current"}')
                return SimpleNamespace(stdout='', stderr='', check_returncode=lambda: None)
            with patch.object(exporter.subprocess, 'run', side_effect=scan):
                for name in ('first', 'second'):
                    output = root / name
                    output.mkdir()
                    self.assertEqual(exporter.scan_archive(output, cache)['UpdatedAt'], 'synthetic-current')
            self.assertEqual(len(set(refreshed)), 2)
            self.assertTrue(all(not path.exists() for path in refreshed))
            self.assertEqual(json.loads(previous.read_text())['NextUpdate'], '2099-01-01T00:00:00Z')


class ImageIdentityTests(unittest.TestCase):
    def image(self):
        return {'Os': 'linux', 'Architecture': 'amd64', 'Config': {
            'User': '10001:10001', 'ExposedPorts': {'8098/tcp': {}}, 'Cmd': ['node', 'dist/src/main.js'],
            'Env': ['APP_ENV=production'], 'Labels': {'org.opencontainers.image.source': 'https://github.com/giuliomarinelli/MercurionWeb',
                'org.opencontainers.image.version': 'qa', 'org.opencontainers.image.revision': REVISION}}}

    def test_expected_image_identity_is_accepted(self):
        exporter.validate_identity(self.image(), 'web-node', REVISION, 'qa')

    def test_wrong_source_revision_is_rejected(self):
        with self.assertRaises(ValueError):
            exporter.validate_identity(self.image(), 'web-node', 'b' * 40, 'qa')

    def test_staging_image_cannot_be_exported_as_production(self):
        image = self.image()
        image['Config']['Env'] = ['APP_ENV=staging']
        with self.assertRaises(ValueError):
            exporter.validate_identity(image, 'web-node', REVISION, 'qa')

    def test_explicit_staging_identity_is_accepted_and_mixed_markers_fail(self):
        image = self.image()
        image['Config']['Env'] = ['APP_ENV=staging']
        image['Config']['Labels']['org.mercurion.environment'] = 'staging'
        exporter.validate_identity(image, 'web-node', REVISION, 'qa', 'staging')
        image['Config']['Env'] = ['APP_ENV=production']
        with self.assertRaises(ValueError):
            exporter.validate_identity(image, 'web-node', REVISION, 'qa', 'staging')

    def test_frontend_staging_requires_environment_provenance(self):
        image = self.image()
        image['Config'].update(User='10101:10101', ExposedPorts={'3497/tcp': {}})
        with self.assertRaises(ValueError):
            exporter.validate_identity(image, 'web-ng', REVISION, 'qa', 'staging')
        image['Config']['Labels']['org.mercurion.environment'] = 'staging'
        exporter.validate_identity(image, 'web-ng', REVISION, 'qa', 'staging')
        with self.assertRaises(ValueError):
            exporter.validate_identity(image, 'web-ng', REVISION, 'qa', 'production')

    def test_scanner_for_another_image_cannot_approve_candidate(self):
        with self.assertRaises(ValueError):
            delivery.security_summary({'SchemaVersion': 2, 'Metadata': {'ImageID': 'wrong'}, 'Results': [{}]}, 'sha256:'+'a'*64)


class DeliveryTests(unittest.TestCase):
    def record(self, root, role, critical=False, target='staging'):
        directory = root / role
        directory.mkdir()
        source = 'https://github.com/giuliomarinelli/' + ('MercurionTox21' if role == 'tox21' else 'MercurionWeb')
        config = json.dumps({'config': {'Labels': {'org.opencontainers.image.source': source,
                            'org.opencontainers.image.revision': REVISION, 'org.opencontainers.image.version': 'qa'}}}).encode()
        with tarfile.open(directory / 'image.tar', 'w') as archive:
            for name, data in [('manifest.json', b'[{"Config":"config.json","RepoTags":[]}]'), ('config.json', config)]:
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        digest = 'sha256:' + delivery.hashlib.sha256(config).hexdigest()
        findings = [{'Severity': 'CRITICAL', 'VulnerabilityID': 'CVE-fixture', 'PkgName': 'fixture'}] if critical else []
        files = {'sbom.cdx.json': {'bomFormat': 'CycloneDX', 'components': [{'type': 'library', 'name': 'synthetic', 'version': '1'}]}, 'runtime-audit.json': {}, 'load.log': 'fixture',
                 'policy-result.json': {'eligible': not critical},
                 'vulnerabilities.json': {'SchemaVersion': 2, 'Metadata': {'ImageID': digest}, 'Results': [{'Target': 'fixture', 'Vulnerabilities': findings}]}}
        for name, content in files.items():
            (directory / name).write_text(json.dumps(content))
        value = {'schema_version': 1, 'component': role, 'source': source, 'revision': REVISION,
                 'version': 'qa', 'target': target, 'config_digest': digest, 'archive_load_verified': True,
                 'security_eligible': not critical,
                 'model': {'model_version': 'synthetic', 'export_revision': REVISION,
                           'files': {'weights.pt': 'c' * 64, 'thresholds.json': 'd' * 64}} if role == 'tox21' else None,
                 'files': {name: delivery.checksum(directory / name) for name in [*files, 'image.tar']}}
        (directory / 'component.json').write_text(json.dumps(value))
        return directory

    def test_missing_web_and_critical_tox_cannot_be_ready(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            result = delivery.coordinate(REVISION, {'tox21': self.record(root, 'tox21', critical=True)}, root / 'candidate.json')
            self.assertFalse(result['eligible_for_integrated_acceptance'])
            self.assertEqual(result['missing_components'], ['web-ng', 'web-node'])
            self.assertEqual(result['blocked_components'], ['tox21'])

    def test_three_consistent_records_are_candidates_without_deployment_claim(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            result = delivery.coordinate(REVISION, {role: self.record(root, role) for role in ['web-ng', 'web-node', 'tox21']}, root / 'candidate.json')
            self.assertTrue(result['eligible_for_integrated_acceptance'])
            self.assertEqual(result['status'], 'candidate')
            self.assertFalse(result['deployed'])

    def test_tampered_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = self.record(root, 'tox21')
            with (directory / 'image.tar').open('ab') as stream:
                stream.write(b'changed')
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                delivery.coordinate(REVISION, {'tox21': directory}, root / 'candidate.json')

    def test_claimed_approval_cannot_hide_critical_findings(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = self.record(root, 'tox21', critical=True)
            record = directory / 'component.json'
            value = json.loads(record.read_text())
            value['security_eligible'] = True
            record.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'contradicts'):
                delivery.coordinate(REVISION, {'tox21': directory}, root / 'candidate.json')

    def test_empty_sbom_with_valid_checksum_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = self.record(root, 'tox21')
            sbom = directory / 'sbom.cdx.json'
            sbom.write_text(json.dumps({'bomFormat': 'CycloneDX', 'components': []}))
            record = directory / 'component.json'
            value = json.loads(record.read_text())
            value['files']['sbom.cdx.json'] = delivery.checksum(sbom)
            record.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'SBOM'):
                delivery.coordinate(REVISION, {'tox21': directory}, root / 'candidate.json')

    def test_web_revision_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, 'Web image revision'):
                delivery.coordinate('b' * 40, {'web-ng': self.record(root, 'web-ng')}, root / 'candidate.json')

    def test_different_targets_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, 'different runtime targets'):
                delivery.coordinate(REVISION, {'web-ng': self.record(root, 'web-ng'),
                                              'tox21': self.record(root, 'tox21', target='production')}, root / 'candidate.json')

    def test_every_severity_blocks_and_old_approval_cannot_hide_low_finding(self):
        for severity in ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'):
            scan = {'SchemaVersion': 2, 'Metadata': {'ImageID': 'fixture'}, 'Results': [
                {'Target': 'fixture', 'Vulnerabilities': [{'Severity': severity,
                 'VulnerabilityID': 'GHSA-fixture', 'PkgName': 'fixture'}]}]}
            result = delivery.security_summary(scan, 'fixture')
            self.assertFalse(result['eligible'])
            self.assertEqual(len(result['blocking']), 1)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = self.record(root, 'tox21', critical=True)
            scan_path = directory / 'vulnerabilities.json'
            value = json.loads(scan_path.read_text())
            value['Results'][0]['Vulnerabilities'][0]['Severity'] = 'LOW'
            scan_path.write_text(json.dumps(value))
            record_path = directory / 'component.json'
            record = json.loads(record_path.read_text())
            record['files']['vulnerabilities.json'] = delivery.checksum(scan_path)
            record['security_eligible'] = True
            record_path.write_text(json.dumps(record))
            with self.assertRaisesRegex(ValueError, 'contradicts'):
                delivery.coordinate(REVISION, {'tox21': directory}, root / 'candidate.json')

    def test_malformed_scans_fail_closed(self):
        for results in ([], [{}], [{'Target': 'fixture', 'Vulnerabilities': None}],
                        [{'Target': 'fixture', 'Vulnerabilities': [{'Severity': 'LOW'}]}]):
            with self.assertRaises(ValueError):
                delivery.security_summary({'SchemaVersion': 2, 'Metadata': {'ImageID': 'fixture'}, 'Results': results}, 'fixture')


if __name__ == '__main__':
    unittest.main()
