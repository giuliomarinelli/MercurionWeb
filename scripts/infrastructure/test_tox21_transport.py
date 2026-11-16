"""Transport integrity and read-only guest readiness regression tests, no VM."""
import copy
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import types
import unittest

import guest_artifact_preflight as guest
import prepare_tox21_transport as transport


def source(root):
    candidate = root / 'candidate'
    directory = candidate / 'export'
    directory.mkdir(parents=True)
    revision = 'a' * 40
    config = json.dumps({'os': 'linux', 'architecture': 'amd64', 'config': {'Labels': {
        'org.opencontainers.image.source': 'https://github.com/giuliomarinelli/MercurionTox21',
        'org.opencontainers.image.revision': revision,
        'org.opencontainers.image.version': 'fixture'}}}).encode()
    digest = 'sha256:' + hashlib.sha256(config).hexdigest()
    with tarfile.open(directory / 'image.tar', 'w') as archive:
        for name, raw in [('manifest.json', b'[{"Config":"config.json","RepoTags":[]}]'),
                          ('config.json', config)]:
            info = tarfile.TarInfo(name)
            info.size = len(raw)
            archive.addfile(info, io.BytesIO(raw))
    files = {'sbom.cdx.json': {'bomFormat': 'CycloneDX', 'components': [{'name': 'fixture'}]},
             'vulnerabilities.json': {'SchemaVersion': 2, 'Metadata': {'ImageID': digest, 'OS': {'Family': 'wolfi'}},
                                      'Results': [{'Target': 'wolfi', 'Class': 'os-pkgs', 'Type': 'wolfi'}]},
             'policy-result.json': {'eligible': True}, 'load.log': 'fixture',
             'runtime-audit.json': {'size_bytes': 1000, 'readonly': True, 'training_absent': True,
                                    'repeatable_inference': True, 'build': {'revision': revision}}}
    for name, value in files.items():
        transport.write(directory / name, value)
    record = {'schema_version': 1, 'component': 'tox21',
              'source': 'https://github.com/giuliomarinelli/MercurionTox21',
              'revision': revision, 'version': 'fixture', 'target': 'staging',
              'config_digest': digest, 'archive_load_verified': True, 'security_eligible': True,
              'model': {'model_version': 'fixture', 'export_revision': 'b' * 40,
                        'files': {'weights.pt': 'c' * 64, 'thresholds.json': 'd' * 64}},
              'files': {name: transport.delivery.checksum(directory / name) for name in (*files, 'image.tar')}}
    transport.write(directory / 'component.json', record)
    transport.write(candidate / 'candidate-summary.json', {
        'status': 'candidate-ready', 'environment': 'preview', 'revision': revision,
        'configDigest': digest, 'archiveSha256': record['files']['image.tar'],
        'securityEligible': True, 'cleanupVerified': True})
    return candidate


class TransportTests(unittest.TestCase):
    def test_verified_partial_bundle_does_not_claim_web_release_or_deployment(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            candidate = source(root)
            (candidate / '.env').write_text('must not be copied')
            result = transport.prepare(candidate, root / 'bundle', 'c' * 40)
            self.assertFalse(result['integratedAcceptance'])
            self.assertEqual(result['missingComponents'], ['web-ng', 'web-node'])
            self.assertFalse((root / 'bundle/.env').exists())
            with self.assertRaises(FileExistsError):
                transport.prepare(candidate, root / 'bundle', 'c' * 40)

    def test_tampering_extra_files_and_path_traversal_fail(self):
        for mutation in ('archive', 'extra', 'traversal', 'approval'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                bundle = root / 'bundle'
                transport.prepare(source(root), bundle, 'c' * 40)
                if mutation == 'archive':
                    with (bundle / 'components/tox21/image.tar').open('ab') as stream:
                        stream.write(b'changed')
                elif mutation == 'extra':
                    (bundle / '.env').write_text('unexpected')
                else:
                    manifest = transport.read(bundle / 'transport.json')
                    if mutation == 'traversal':
                        manifest['files']['../outside'] = {'sha256': 'a' * 64, 'bytes': 1}
                    else:
                        manifest['integratedAcceptance'] = True
                    (bundle / 'transport.json').write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):
                    transport.validate(bundle)

    def test_low_finding_cannot_be_hidden_by_approval_and_rehashed_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            candidate = source(root)
            scan_path = candidate / 'export/vulnerabilities.json'
            scan = transport.read(scan_path)
            scan['Results'][0]['Vulnerabilities'] = [{'Severity': 'LOW', 'PkgName': 'fixture', 'VulnerabilityID': 'CVE-fixture'}]
            scan_path.write_text(json.dumps(scan))
            record_path = candidate / 'export/component.json'
            record = transport.read(record_path)
            record['files']['vulnerabilities.json'] = transport.delivery.checksum(scan_path)
            record_path.write_text(json.dumps(record))
            with self.assertRaises(ValueError):
                transport.prepare(candidate, root / 'bundle', 'c' * 40)

    def test_production_or_unverified_runtime_is_rejected(self):
        for field, value in [('target', 'production'), ('archive_load_verified', False)]:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                candidate = source(root)
                path = candidate / 'export/component.json'
                record = transport.read(path)
                record[field] = value
                path.write_text(json.dumps(record))
                with self.assertRaises(ValueError):
                    transport.prepare(candidate, root / 'bundle', 'c' * 40)


class GuestReadinessTests(unittest.TestCase):
    def request(self):
        return {'schemaVersion': 1, 'runId': 'a' * 32, 'environment': 'preview',
                'component': 'tox21', 'revision': 'b' * 40, 'configDigest': 'sha256:' + 'c' * 64,
                'archiveSha256': 'd' * 64, 'archiveBytes': 1000, 'runtimeBytes': 2000,
                'helperSha256': 'e' * 64}

    def inspect(self, changed=None, free=10**10):
        calls = []
        answers = [json.dumps([{'addr_info': [{'family': 'inet', 'local': '10.203.240.10', 'prefixlen': 24}]}]),
                   json.dumps([{'gateway': '10.203.240.1', 'dev': 'eth0'}]), '[]',
                   json.dumps({'os': 'linux', 'architecture': 'amd64', 'root': '/var/lib/docker', 'version': '29.9.3'}), '5.7.0']
        if changed:
            answers[changed[0]] = changed[1]
        def execute(argv):
            calls.append(argv)
            return answers[len(calls) - 1]
        result = guest.inspect(self.request(), Path('/fixture'), execute=execute,
                               disk_usage=lambda _: types.SimpleNamespace(free=free),
                               machine='x86_64', os_release={'ID': 'ubuntu', 'VERSION_ID': '26.04'})
        return result, calls

    def test_only_fixed_read_queries_with_explicit_local_docker_socket(self):
        result, calls = self.inspect()
        self.assertTrue(result['readyForArtifactTransfer'])
        self.assertEqual([call[:3] for call in calls[:3]], [['ip', '-j', 'address'], ['ip', '-j', '-4'], ['ip', '-j', '-6']])
        self.assertEqual(calls[3][:4], ['docker', '--host', 'unix:///var/run/docker.sock', 'info'])
        self.assertEqual(calls[4], ['docker', '--host', 'unix:///var/run/docker.sock', 'compose', 'version', '--short'])
        self.assertEqual(len(calls), 5)

    def test_changed_gateway_ipv6_or_insufficient_disk_blocks_transfer(self):
        for change in [(1, '[{"gateway":"172.27.0.1","dev":"eth0"}]'),
                       (2, '[{"dst":"default","gateway":"fe80::1"}]'),
                       (3, '{"os":"linux","architecture":"arm64","root":"/var/lib/docker","version":"29.9.3"}')]:
            self.assertFalse(self.inspect(changed=change)[0]['readyForArtifactTransfer'])
        self.assertFalse(self.inspect(free=100)[0]['readyForArtifactTransfer'])

    def test_wrong_helper_environment_and_negative_sizes_fail_closed(self):
        guest.validate_request(self.request(), 'e' * 64)
        for field, value in [('helperSha256', 'f' * 64), ('environment', 'production'),
                             ('archiveBytes', -1), ('runtimeBytes', True), ('runId', '../bad')]:
            request = copy.deepcopy(self.request())
            request[field] = value
            with self.assertRaises(ValueError):
                guest.validate_request(request, 'e' * 64)


if __name__ == '__main__':
    unittest.main()
