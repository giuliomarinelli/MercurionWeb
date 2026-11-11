"""Server artifact identity guards; synthetic image metadata, no Docker or credentials."""
import copy
import unittest
import export_preview_service as exporter


class ServerIdentityTests(unittest.TestCase):
    def test_role_revision_platform_and_nonroot_identity_must_all_match(self):
        revision = 'a' * 40
        for role, user in exporter.USERS.items():
            image = {'Os': 'linux', 'Architecture': 'amd64', 'Config': {'User': user, 'Labels': {
                'org.opencontainers.image.source': 'https://github.com/giuliomarinelli/MercurionWeb',
                'org.opencontainers.image.revision': revision, 'org.mercurion.runtime.role': role}}}
            exporter.identity(image, role, revision)
            for mutation in (lambda doc: doc['Config'].update(User='0:0'),
                             lambda doc: doc.update(Architecture='arm64'),
                             lambda doc: doc['Config']['Labels'].update({'org.mercurion.runtime.role': 'other'}),
                             lambda doc: doc['Config']['Labels'].update({'org.opencontainers.image.revision': 'b' * 40}),
                             lambda doc: doc['Config']['Labels'].update({'org.opencontainers.image.source': 'other'})):
                altered = copy.deepcopy(image)
                mutation(altered)
                with self.subTest(role=role), self.assertRaises(ValueError):
                    exporter.identity(altered, role, revision)


if __name__ == '__main__':
    unittest.main()
