import type { ConfigurationModel } from './config.model'
import { ConfigKey } from './config.schema'

export type AppConfiguration = ConfigurationModel[ConfigKey.App]
export type DataConfiguration = ConfigurationModel[ConfigKey.Data]
export type JwtConfigurations = ConfigurationModel[ConfigKey.Jwt]
type SecretJwtConfiguration = JwtConfigurations['preAuthorizationToken']
export type JwtConfiguration =
    Omit<SecretJwtConfiguration, 'secret'> &
    Partial<Pick<SecretJwtConfiguration, 'secret'>>
export type JwtAudience = JwtConfigurations['audience']
export type SmsConfiguration = ConfigurationModel[ConfigKey.Sms]
export type SecureCookieConfiguration = ConfigurationModel[ConfigKey.SecureCookie]
export type CookieConfiguration = Omit<SecureCookieConfiguration, 'secret'>
export type TotpConfiguration = ConfigurationModel[ConfigKey.Totp]
export type SessionConfiguration = ConfigurationModel[ConfigKey.Session]
export type OAuth2ProviderConfiguration = ConfigurationModel[ConfigKey.Dropbox] & {
    scopes?: string[]
}
export type MeilisearchConfiguration = ConfigurationModel[ConfigKey.Meilisearch]
export type CloudflareConfiguration = ConfigurationModel[ConfigKey.Cloudflare]
export type RedisConfiguration = ConfigurationModel[ConfigKey.Redis]
export type SSO_Configurations = ConfigurationModel[ConfigKey.SSO]
export type SSO_Configuration = SSO_Configurations[keyof SSO_Configurations]
export type FeedbackConfiguration = ConfigurationModel[ConfigKey.Feedback]
