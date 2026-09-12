/**
 * Dependency-neutral configuration vocabulary.
 *
 * This module intentionally contains no Nest registration or environment
 * loading. Runtime configuration factories and consumers may depend on it,
 * but it must never depend on a factory.
 */
export enum Environment {
    Development = 'development',
    Staging = 'staging',
    Production = 'production',
    Test = 'test'
}

export enum ConfigKey {
    App = 'App',
    Data = 'Data',
    Jwt = 'Jwt',
    SecureCookie = 'SecureCookie',
    Email = 'Email',
    Sms = 'Sms',
    Totp = 'Totp',
    Session = 'Session',
    Dropbox = 'Dropbox',
    Meilisearch = 'Meilisearch',
    Cloudflare = 'Cloudflare',
    Redis = 'Redis',
    SSO = 'SSO'
}
