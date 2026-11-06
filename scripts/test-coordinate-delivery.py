import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('coordinate-delivery.py'))
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)
REVISION = 'a' * 40


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
        findings = [{'Severity': 'CRITICAL'}] if critical else []
        files = {'sbom.cdx.json': {'bomFormat': 'CycloneDX', 'components': [{'type': 'library', 'name': 'synthetic', 'version': '1'}]}, 'runtime-audit.json': {}, 'load.log': 'fixture',
                 'policy-result.json': {'eligible': not critical},
                 'vulnerabilities.json': {'SchemaVersion': 2, 'Metadata': {'ImageID': digest}, 'Results': [{'Vulnerabilities': findings}]}}
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


if __name__ == '__main__':
    unittest.main()
