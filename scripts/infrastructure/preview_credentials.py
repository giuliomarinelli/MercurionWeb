"""Owner-only preview configuration creation. Never print credential values."""
import argparse
import base64
import json
import ipaddress
import os
from pathlib import Path
import secrets
import shutil
import subprocess
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
PROVIDERS = ('EMAIL_SMTP_HOST', 'EMAIL_SMTP_PORT', 'EMAIL_SMTP_SECURE', 'EMAIL_USERNAME',
             'EMAIL_PASSWORD', 'EMAIL_DEFAULT_FROM', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
             'TWILIO_FROM', 'DROPBOX_APP_KEY', 'DROPBOX_APP_SECRET', 'CLOUDFLARE_SECRET_KEY',
             'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
             'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET',
             'ORCID_CLIENT_ID', 'ORCID_CLIENT_SECRET', 'ORCID_ISSUER')
APPLICATION_SECRETS = ('APP_SESSION_SIGNATURE_SECRET', 'APP_PASSWORD_PEPPER',
    'APP_REDIS_ID_HMAC_SECRET', 'APP_AES_SECRET', 'APP_USER_ID_AES_ENCRYPTION_SECRET',
    'APP_DEVICE_ID_SIGNATURE_SECRET', 'SECURE_COOKIE_SECRET', 'TOTP_CONFIG_PEPPER',
    'UM_FEEDBACK_ANON_AUTHOR_KEY', 'SQL_DATABASE_PASSWORD', 'REDIS_PASSWORD')
RSA_NAMES = ('JWT_RS256_PRIVATE_KEY', 'JWT_RS256_PUBLIC_KEY',
             'JWT_WS_RS256_PRIVATE_KEY', 'JWT_WS_RS256_PUBLIC_KEY')


def public_defaults():
    # This is the tracked example, never an operational dotenv file.
    text = (ROOT / 'MercurionWebNode/env/.env.example').read_text(encoding='utf-8')
    return dict(line.strip().split('=', 1) for line in text.splitlines()
                if line.strip() and not line.lstrip().startswith('#') and '=' in line)


def validate_origin(origin):
    value = urlparse(origin)
    if (value.scheme != 'https' or not value.hostname or value.netloc != value.hostname
            or value.path or value.query or value.fragment or value.username):
        raise ValueError('Preview origin must be an HTTPS hostname without path or port')


def rsa_pairs():
    node = shutil.which('node')
    if not node:
        raise ValueError('Node.js required to generate independent HTTP/WS RSA keys')
    code = """const c=require('node:crypto');const result={};
for(const prefix of ['JWT_RS256','JWT_WS_RS256']){
const p=c.generateKeyPairSync('rsa',{modulusLength:3072,
publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
result[prefix+'_PRIVATE_KEY']=p.privateKey;result[prefix+'_PUBLIC_KEY']=p.publicKey;}
process.stdout.write(JSON.stringify(result));"""
    outcome = subprocess.run([node, '-e', code], capture_output=True, text=True, timeout=40)
    if outcome.returncode:
        raise ValueError('RSA generation failed')
    return json.loads(outcome.stdout)


def template(origin, keys):
    validate_origin(origin)
    defaults = public_defaults()
    hmacs = tuple(name for name in defaults if name.startswith('JWT_SECRETS_'))
    internal = {name: base64.b64encode(secrets.token_bytes(
                    32 if name in ('APP_AES_SECRET', 'APP_USER_ID_AES_ENCRYPTION_SECRET') else 64)).decode()
                for name in (*APPLICATION_SECRETS, *hmacs)}
    internal.update(keys)
    internal.update(APP_NATS_USERNAME='preview-web-node', APP_NATS_PASSWORD=secrets.token_hex(32))
    return {'schemaVersion': 1, 'environment': 'preview', 'origin': origin,
            'providers': {name: '' for name in PROVIDERS},
            'applicationSecrets': internal,
            'postgresServer': {'adminPassword': secrets.token_hex(32)},
            'tox21': {'username': 'preview-tox21', 'password': secrets.token_hex(32)},
            'meilisearchServer': {'masterKey': secrets.token_hex(32)},
            'meilisearchClients': {'searchKey': '', 'logKey': ''}}


def validate(document, application=True):
    expected = {'schemaVersion', 'environment', 'origin', 'providers', 'applicationSecrets',
                'postgresServer', 'tox21', 'meilisearchServer', 'meilisearchClients'}
    if (set(document) != expected or document['schemaVersion'] != 1
            or document['environment'] != 'preview' or set(document['providers']) != set(PROVIDERS)):
        raise ValueError('Invalid preview configuration shape')
    validate_origin(document['origin'])
    master = document['meilisearchServer'].get('masterKey')
    if not isinstance(master, str) or len(master) < 32:
        raise ValueError('Meilisearch server master key must have at least 32 characters')
    values = document['applicationSecrets']
    generated = {name for name in public_defaults() if name.startswith('JWT_SECRETS_')}
    allowed = set(APPLICATION_SECRETS) | generated | set(RSA_NAMES) | {'APP_NATS_USERNAME', 'APP_NATS_PASSWORD'}
    if set(values) != allowed or any(not isinstance(value, str) or not value.strip() for value in values.values()):
        raise ValueError('Invalid application secret names or missing generated values')
    try:
        aes = base64.b64decode(values['APP_AES_SECRET'], validate=True)
    except ValueError:
        raise ValueError('APP_AES_SECRET must encode exactly 32 bytes') from None
    if len(aes) != 32:
        raise ValueError('APP_AES_SECRET must encode exactly 32 bytes')
    if master in values.values():
        raise ValueError('Meilisearch server master key must never be an application secret')
    clients = document['meilisearchClients']
    if set(clients) != {'searchKey', 'logKey'}:
        raise ValueError('Separate Meilisearch client keys required')
    if any(value and value == master for value in clients.values()):
        raise ValueError('Meilisearch client key must differ from server master key')
    if application:
        missing = [name for name, value in document['providers'].items()
                   if not isinstance(value, str) or not value.strip() or value.startswith('<')]
        missing += [name for name, value in clients.items() if not isinstance(value, str) or not value.strip()]
        if missing:
            raise ValueError('Missing fields: ' + ', '.join(missing))
        if clients['searchKey'] == clients['logKey']:
            raise ValueError('Meilisearch search and log keys must be distinct')


def application_document(document, trusted_proxy_cidrs):
    validate(document)
    if not trusted_proxy_cidrs:
        raise ValueError('Immediate edge peer addresses required before application bootstrap')
    for cidr in trusted_proxy_cidrs:
        network = ipaddress.ip_network(cidr)
        if network.num_addresses != 1:
            raise ValueError('Trust only individual immediate edge peer addresses')
    values = public_defaults()
    values = {name: value for name, value in values.items()
              if name not in ('APP_ENV', 'NODE_ENV', 'JWT_LOCAL_KEYS_CONFIG', 'TWILIO_NUMBER')
              and not name.startswith('LOCAL_TEST_ACCOUNT_')}
    origin = document['origin']
    values.update(document['applicationSecrets'])
    values.update(document['providers'])
    values.update(APP_USER_ACTIVATION_ORIGIN=origin, APP_HOST='0.0.0.0', APP_PORT='8098',
        APP_NATS_HOST='nats://nats-preview', APP_NATS_PORT='4222',
        APP_TRUSTED_PROXY_CIDRS=json.dumps(trusted_proxy_cidrs),
        SQL_DATABASE_HOST='postgres-preview', SQL_DATABASE_PORT='5432',
        SQL_DATABASE_USERNAME='mercurion_preview', SQL_DATABASE='mercurion_preview',
        REDIS_HOST='redis-preview', REDIS_PORT='6379', MEILISEARCH_HOST='http://meilisearch:7700',
        MEILISEARCH_MASTER_KEY=document['meilisearchClients']['searchKey'],
        MEILISEARCH_LOG_KEY=document['meilisearchClients']['logKey'],
        SECURE_COOKIE_DOMAIN=urlparse(origin).hostname, SECURE_COOKIE_SECURE='true',
        LOCAL_DUMMY_AUTH='false', DISABLE_TURNSTILE='false')
    for provider in ('Google', 'GitHub', 'LinkedIn', 'Discord', 'ORCID'):
        values[provider.upper() + '_REDIRECT_URI'] = origin + '/api/oauth2/sso/' + provider + '/callback'
    values['DROPBOX_REDIRECT_URI'] = origin + '/api/oauth2/Dropbox/callback'
    if document['meilisearchServer']['masterKey'] in values.values():
        raise ValueError('Server master key found in application payload')
    return {'schemaVersion': 1, 'environment': 'staging', 'variables': values}


def server_documents(document):
    validate(document, application=False)
    values = document['applicationSecrets']
    return {
        'postgres': (70, 70, {'admin-password': document['postgresServer']['adminPassword'],
                             'application-password': values['SQL_DATABASE_PASSWORD']}),
        'redis': (999, 1000, {'server.conf': 'bind 0.0.0.0\nprotected-mode yes\ndir /data\nappendonly yes\nnotify-keyspace-events Exg\nrequirepass ' + json.dumps(values['REDIS_PASSWORD']) + '\n'}),
        'nats': (10021, 10021, {'server.json': json.dumps({'port': 4222, 'authorization': {'users': [
            {'user': values['APP_NATS_USERNAME'], 'password': values['APP_NATS_PASSWORD']},
            {'user': document['tox21']['username'], 'password': document['tox21']['password']}]}})}),
        'tox21': (10021, 10021, {'values.json': json.dumps({'schemaVersion': 1, 'environment': 'staging',
            'variables': {'NATS_USERNAME': document['tox21']['username'], 'NATS_PASSWORD': document['tox21']['password']}}),
            'http-public.pem': values['JWT_RS256_PUBLIC_KEY']}),
        'meilisearch': (10001, 10001, {'server.toml': 'env="production"\nhttp_addr="0.0.0.0:7700"\ndb_path="/meili_data/data.ms"\nno_analytics=true\nmax_indexing_memory="64Mb"\nmax_indexing_threads=1\nmaster_key=' + json.dumps(document['meilisearchServer']['masterKey']) + '\n'})}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['create', 'validate'])
    parser.add_argument('--file', type=Path, required=True)
    parser.add_argument('--origin', default='https://preview.mercurion.app')
    parser.add_argument('--infrastructure-only', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'create':
            if args.file.exists():
                raise ValueError('Configuration exists; never overwrite or regenerate stable secrets')
            value = template(args.origin, rsa_pairs())
            fd = os.open(args.file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(value, stream, indent=2)
                stream.write('\n')
            print(json.dumps({'status': 'created', 'path': str(args.file), 'valuesPrinted': False}))
        else:
            value = json.loads(args.file.read_text(encoding='utf-8-sig'))
            validate(value, application=not args.infrastructure_only)
            print(json.dumps({'status': 'valid', 'environment': 'preview', 'valuesPrinted': False}))
    except (ValueError, OSError) as error:
        # Validation diagnostics are constructed from fixed field names only.
        print(json.dumps({'status': 'invalid', 'reason': str(error) if isinstance(error, ValueError) else type(error).__name__}))
        raise SystemExit(1)
