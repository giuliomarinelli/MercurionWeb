# Configuration reference

`MercurionWebNode/env/.env.example` is the safe, copyable example. The validated source of
truth is `MercurionWebNode/src/config/config.schema.ts`; this page intentionally describes
names and classifications, not real values. `<placeholder>` means a local value is required;
`false`, `development`, or the documented port is a safe development default where shown.

| Group | Variables | Required | Classification and purpose |
| --- | --- | --- | --- |
| Runtime | `APP_ENV`, `NODE_ENV`, `LOCAL_DUMMY_AUTH`, `DISABLE_TURNSTILE`, `APP_VERSION`, `LOCAL_TEST_ACCOUNT_EMAIL` | defaults/optional | Runtime mode and local-only test identity. The password is local-only and is never documented with a value. |
| App/NATS | `APP_PORT`, `APP_NATS_PORT`, `APP_NATS_HOST`, `APP_PROJECT_NAME`, `APP_GLOBAL_NAME`, `APP_PROJECT_ID`, `APP_TRUSTED_PROXY_CIDRS`, `APP_USER_ACTIVATION_ORIGIN`, `APP_HOST`, `APP_MAX_NATS_PAYLOAD_BYTES`, `APP_SHUTDOWN_TIMEOUT_MS` | mostly required | Non-secret listener, identity, origin and NATS transport settings. CORS is disabled in every environment. The proxy list identifies only the nginx peer immediately in front of Fastify. |
| App secrets | `APP_SESSION_SIGNATURE_SECRET`, `APP_PASSWORD_PEPPER`, `APP_REDIS_ID_HMAC_SECRET`, `APP_AES_SECRET`, `APP_DEVICE_ID_SIGNATURE_SECRET` | yes | Secret material for sessions, password/device protection, Redis identifiers and encryption. |
| Support | `APP_SUPPORT_EMAIL` | yes | Non-secret support address. |
| PostgreSQL | `SQL_DATABASE_TYPE`, `SQL_DATABASE_HOST`, `SQL_DATABASE_PORT`, `SQL_DATABASE_USERNAME`, `SQL_DATABASE_PASSWORD`, `SQL_DATABASE`, `SQL_DATABASE_LOGGING`, `SQL_DATABASE_LOGGER` | yes | Database connection and logging; password is secret. Schema changes use [versioned migrations](database-migrations.md). |
| JWT | `JWT_SECRETS_PRE_AUTHORIZATION_TOKEN`, `JWT_SECRETS_ACTIVATION_TOKEN`, `JWT_SECRETS_PHONE_NUMBER_VERIFICATION_TOKEN`, `JWT_SECRETS_EMAIL_VERIFICATION_TOKEN`, `JWT_SECRETS_EMAIL_MFA_ACTIVATION`, `JWT_SECRETS_SMS_MFA_ACTIVATION`, `JWT_SECRETS_APP_MFA_ACTIVATION`, `JWT_SECRETS_EMAIL_MFA_INACTIVATION`, `JWT_SECRETS_SMS_MFA_INACTIVATION`, `JWT_SECRETS_APP_MFA_INACTIVATION`, `JWT_SECRETS_CHANGE_PASSWORD`, `JWT_SECRETS_ACCOUNT_RECOVERY`, `JWT_SECRETS_SSO_PRE_AUTHORIZATION_TOKEN` | yes | Secret signing material for authentication and account workflows. |
| JWT policy | `JWT_EXPIRATION_ACCESS_TOKEN`, `JWT_EXPIRATION_WS_ACCESS_TOKEN`, `JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN`, `JWT_EXPIRATION_ACTIVATION_TOKEN`, `JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN`, `JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN`, `JWT_EXPIRATION_CHANGE_PASSWORD`, `JWT_EXPIRATION_ACCOUNT_RECOVERY`, `JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN`, `MFA_CHANGE_TIME`, `JWT_AUD_API`, `JWT_AUD_WS`, `JWT_AUD_AUTH` | yes | Token lifetimes and audience labels; lifetimes are positive milliseconds. |
| Cookies | `SECURE_COOKIE_PATH`, `SECURE_COOKIE_HTTP_ONLY`, `SECURE_COOKIE_SAME_SITE`, `SECURE_COOKIE_SECURE`, `SECURE_COOKIE_DOMAIN`, `SECURE_COOKIE_SECRET` | yes | Cookie policy; `SECURE_COOKIE_SECRET` is secret, the remaining values are policy. |
| Email/SMS/TOTP | `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_DEFAULT_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`, `TWILIO_FROM`, `TOTP_CONFIG_BYTES`, `TOTP_CONFIG_DIGITS`, `TOTP_CONFIG_PERIOD`, `TOTP_CONFIG_PEPPER` | yes | Delivery and MFA settings; SMTP/Twilio credentials and TOTP pepper are secret. |
| Sessions | `SHORT_SESSION_LASTING`, `PERSISTENT_SESSION_LASTING`, `SESSION_ZERO_ID` | yes | Session lifetimes and sentinel identifier; no secret value is implied. |
| Dropbox | `DROPBOX_API_URL`, `DROPBOX_AUTH_URL`, `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REDIRECT_URI`, `DROPBOX_TOKEN_URL` | yes | OAuth/object-store endpoints and credentials; app secret is secret. |
| Search/edge | `MEILISEARCH_HOST`, `MEILISEARCH_MASTER_KEY`, `CLOUDFLARE_SECRET_KEY` | yes | Search endpoint/key and Cloudflare integration; keys are secret. |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | yes | Session/cache store; password is secret. |
| SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | yes | OAuth client configuration; client secrets are secret and redirect URIs are environment-specific. |
| Feedback | `UM_FEEDBACK_ANON_AUTHOR_KEY` | yes | Anonymous feedback attribution key; secret. |

Development service defaults are PostgreSQL `localhost:5431`, Redis `localhost:6378`, NATS
`nats://localhost` on port `4223`, Meilisearch `http://localhost:7700`, Nest `8099`, Angular
`3498`, and nginx `http://localhost:8888`. Production endpoints and credentials are not
part of this repository documentation.
