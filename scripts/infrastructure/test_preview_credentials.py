"""Credential separation tests using synthetic data only; never read owner files."""
import base64
import copy
import unittest

import preview_credentials as credentials


class PreviewCredentialTests(unittest.TestCase):
    def configuration(self):
        value = credentials.template('https://preview.mercurion.app',
            {name: 'synthetic-' + name for name in credentials.RSA_NAMES})
        value['providers'] = {name: 'synthetic-' + name for name in credentials.PROVIDERS}
        value['meilisearchClients'] = {'searchKey': 'synthetic-search-only', 'logKey': 'synthetic-log-writer'}
        return value

    def test_application_payload_contains_restricted_meili_keys_and_never_server_master(self):
        value = self.configuration()
        payload = credentials.application_document(value, ['172.30.1.3/32'])
        self.assertEqual(payload['environment'], 'staging')
        variables = payload['variables']
        self.assertEqual(variables['MEILISEARCH_MASTER_KEY'], 'synthetic-search-only')
        self.assertEqual(variables['MEILISEARCH_LOG_KEY'], 'synthetic-log-writer')
        self.assertNotIn(value['meilisearchServer']['masterKey'], variables.values())
        self.assertNotIn(value['postgresServer']['adminPassword'], variables.values())
        self.assertNotIn(value['tox21']['password'], variables.values())
        self.assertNotIn('APP_ENV', variables)
        self.assertNotIn('NODE_ENV', variables)
        self.assertNotIn('JWT_LOCAL_KEYS_CONFIG', variables)
        self.assertFalse(any('<' in item for key, item in variables.items() if key not in credentials.PROVIDERS))
        self.assertEqual(variables['GOOGLE_REDIRECT_URI'], 'https://preview.mercurion.app/api/oauth2/sso/Google/callback')
        self.assertEqual(variables['SECURE_COOKIE_SECURE'], 'true')
        self.assertEqual(variables['DISABLE_TURNSTILE'], 'false')

    def test_server_master_cannot_be_reused_as_either_application_key(self):
        for field in ('searchKey', 'logKey'):
            value = self.configuration()
            value['meilisearchClients'][field] = value['meilisearchServer']['masterKey']
            with self.assertRaisesRegex(ValueError, 'master key'):
                credentials.validate(value)
        value = self.configuration()
        value['applicationSecrets']['APP_PASSWORD_PEPPER'] = value['meilisearchServer']['masterKey']
        with self.assertRaisesRegex(ValueError, 'master key'):
            credentials.validate(value)

    def test_missing_provider_or_application_keys_are_not_silently_synthetic(self):
        value = self.configuration()
        value['providers']['EMAIL_PASSWORD'] = ''
        with self.assertRaisesRegex(ValueError, 'EMAIL_PASSWORD'):
            credentials.validate(value)
        credentials.validate(value, application=False)
        value = self.configuration()
        value['meilisearchClients']['logKey'] = ''
        with self.assertRaisesRegex(ValueError, 'logKey'):
            credentials.validate(value)
        value['meilisearchClients']['logKey'] = value['meilisearchClients']['searchKey']
        with self.assertRaisesRegex(ValueError, 'distinct'):
            credentials.validate(value)

    def test_generated_secrets_have_distinct_roles_and_no_provider_credentials(self):
        value = credentials.template('https://preview.mercurion.app',
            {name: 'synthetic-' + name for name in credentials.RSA_NAMES})
        credentials.validate(value, application=False)
        self.assertTrue(all(item == '' for item in value['providers'].values()))
        self.assertNotEqual(value['applicationSecrets']['APP_NATS_PASSWORD'], value['tox21']['password'])
        self.assertNotEqual(value['postgresServer']['adminPassword'], value['applicationSecrets']['SQL_DATABASE_PASSWORD'])
        self.assertEqual(len([name for name in value['applicationSecrets'] if name.startswith('JWT_SECRETS_')]), 13)
        self.assertEqual(len(base64.b64decode(value['applicationSecrets']['APP_AES_SECRET'])), 32)
        value['applicationSecrets']['APP_AES_SECRET'] = base64.b64encode(b'x' * 64).decode()
        with self.assertRaisesRegex(ValueError, 'exactly 32 bytes'):
            credentials.validate(value, application=False)

    def test_origin_and_proxy_trust_are_explicit_and_restricted(self):
        for origin in ('http://preview.mercurion.app', 'https://user:pass@preview.mercurion.app',
                       'https://preview.mercurion.app/path', 'https://preview.mercurion.app:8443'):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                credentials.validate_origin(origin)
        value = self.configuration()
        original = copy.deepcopy(value)
        for peers in ([], ['0.0.0.0/0'], ['172.16.0.0/12']):
            with self.assertRaises(ValueError):
                credentials.application_document(value, peers)
        self.assertEqual(value, original)

    def test_server_documents_limit_material_to_the_specific_consumer(self):
        value = self.configuration()
        documents = credentials.server_documents(value)
        master = value['meilisearchServer']['masterKey']
        for role, (uid, gid, files) in documents.items():
            self.assertGreater(uid, 0)
            self.assertGreater(gid, 0)
            if role != 'meilisearch':
                self.assertNotIn(master, str(files))
        tox = documents['tox21'][2]
        self.assertEqual(tox['http-public.pem'], value['applicationSecrets']['JWT_RS256_PUBLIC_KEY'])
        self.assertNotIn(value['applicationSecrets']['JWT_RS256_PRIVATE_KEY'], str(tox))
        self.assertNotIn(value['applicationSecrets']['JWT_WS_RS256_PRIVATE_KEY'], str(tox))
        self.assertNotIn(value['applicationSecrets']['APP_NATS_PASSWORD'], str(tox))
        self.assertNotIn(value['providers']['EMAIL_PASSWORD'], str(documents))


if __name__ == '__main__':
    unittest.main()
