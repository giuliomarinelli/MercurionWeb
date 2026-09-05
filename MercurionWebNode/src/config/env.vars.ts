import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator"
import { Environment } from "./config"

export class EnvVars {

  // ========================
  // Core environment
  // ========================

  @IsEnum(Environment)
  @IsOptional()
  APP_ENV?: Environment

  @IsString()
  @IsOptional()
  NODE_ENV?: 'development' | 'production'

  // ========================
  // AppConfig
  // ========================

  @IsInt()
  @Min(1)
  APP_PORT!: number

  @IsInt()
  @Min(1)
  APP_NATS_PORT!: number

  @IsString()
  APP_NATS_HOST!: string

  @IsString()
  APP_PROJECT_NAME!: string

  @IsString()
  APP_GLOBAL_NAME!: string

  @IsUUID()
  APP_PROJECT_ID!: string

  @IsString()
  APP_CORS_ORIGINS!: string

  @IsString()
  APP_USER_ACTIVATION_ORIGIN!: string

  @IsString()
  APP_HOST!: string

  @IsString()
  APP_SESSION_SIGNATURE_SECRET!: string

  @IsString()
  APP_PASSWORD_PEPPER!: string

  @IsString()
  APP_REDIS_ID_HMAC_SECRET!: string

  @IsString()
  APP_AES_SECRET!: string

  @IsString()
  @IsOptional()
  APP_VERSION!: string

  @IsString()
  APP_DEVICE_ID_SIGNATURE_SECRET!: string

  @IsString()
  APP_SUPPORT_EMAIL!: string

  @IsInt()
  @Min(1)
  APP_MAX_NATS_PAYLOAD_BYTES!: number

  // ========================
  // DataConfig (Postgres)
  // ========================

  @IsString()
  SQL_DATABASE_TYPE!: 'postgres' | 'mariadb'

  @IsString()
  SQL_DATABASE_HOST!: string

  @IsInt()
  @Min(1)
  SQL_DATABASE_PORT!: number

  @IsString()
  SQL_DATABASE_USERNAME!: string

  @IsString()
  SQL_DATABASE_PASSWORD!: string

  @IsString()
  SQL_DATABASE!: string

  @IsBoolean()
  SQL_DATABASE_SYNCHRONIZE!: boolean

  @IsBoolean()
  SQL_DATABASE_LOGGING!: boolean

  @IsString()
  SQL_DATABASE_LOGGER!: string

  // ========================
  // JWT – secrets (HS512)
  // ========================

  @IsString()
  JWT_SECRETS_PRE_AUTHORIZATION_TOKEN!: string

  @IsString()
  JWT_SECRETS_ACTIVATION_TOKEN!: string

  @IsString()
  JWT_SECRETS_PHONE_NUMBER_VERIFICATION_TOKEN!: string

  @IsString()
  JWT_SECRETS_EMAIL_VERIFICATION_TOKEN!: string

  @IsString()
  JWT_SECRETS_EMAIL_MFA_ACTIVATION!: string

  @IsString()
  JWT_SECRETS_SMS_MFA_ACTIVATION!: string

  @IsString()
  JWT_SECRETS_APP_MFA_ACTIVATION!: string

  @IsString()
  JWT_SECRETS_EMAIL_MFA_INACTIVATION!: string

  @IsString()
  JWT_SECRETS_SMS_MFA_INACTIVATION!: string

  @IsString()
  JWT_SECRETS_APP_MFA_INACTIVATION!: string

  @IsString()
  JWT_SECRETS_CHANGE_PASSWORD!: string

  @IsString()
  JWT_SECRETS_ACCOUNT_RECOVERY!: string

  @IsString()
  JWT_SECRETS_SSO_PRE_AUTHORIZATION_TOKEN!: string

  // ========================
  // JWT – expirations
  // ========================

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_ACCESS_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_WS_ACCESS_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_ACTIVATION_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_CHANGE_PASSWORD!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_ACCOUNT_RECOVERY!: number

  @IsInt()
  @Min(1)
  JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN!: number

  @IsInt()
  @Min(1)
  MFA_CHANGE_TIME!: number

  // ========================
  // JWT – audience
  // ========================

  @IsString()
  JWT_AUD_API!: string

  @IsString()
  JWT_AUD_WS!: string

  @IsString()
  JWT_AUD_AUTH!: string

  // ========================
  // Secure Cookie
  // ========================

  @IsString()
  SECURE_COOKIE_PATH!: string

  @IsBoolean()
  SECURE_COOKIE_HTTP_ONLY!: boolean

  @IsString()
  SECURE_COOKIE_SAME_SITE!: 'strict' | 'lax' | 'none'

  @IsBoolean()
  SECURE_COOKIE_SECURE!: boolean

  @IsString()
  SECURE_COOKIE_DOMAIN!: string

  @IsString()
  SECURE_COOKIE_SECRET!: string

  // ========================
  // Email
  // ========================

  @IsString()
  EMAIL_SMTP_HOST!: string

  @IsInt()
  @Min(1)
  EMAIL_SMTP_PORT!: number

  @IsBoolean()
  EMAIL_SMTP_SECURE!: boolean

  @IsString()
  EMAIL_USERNAME!: string

  @IsString()
  EMAIL_PASSWORD!: string

  @IsString()
  EMAIL_DEFAULT_FROM!: string

  // ========================
  // SMS (Twilio)
  // ========================

  @IsString()
  TWILIO_ACCOUNT_SID!: string

  @IsString()
  TWILIO_AUTH_TOKEN!: string

  @IsString()
  TWILIO_NUMBER!: string

  @IsString()
  TWILIO_FROM!: string

  // ========================
  // TOTP
  // ========================

  @IsInt()
  @Min(1)
  TOTP_CONFIG_BYTES!: number

  @IsInt()
  @Min(1)
  TOTP_CONFIG_DIGITS!: number

  @IsInt()
  @Min(1)
  TOTP_CONFIG_PERIOD!: number

  @IsString()
  TOTP_CONFIG_PEPPER!: string

  // ========================
  // Session
  // ========================

  @IsInt()
  @Min(1)
  SHORT_SESSION_LASTING!: number

  @IsInt()
  @Min(1)
  PERSISTENT_SESSION_LASTING!: number

  @IsUUID()
  SESSION_ZERO_ID!: string

  // ========================
  // Dropbox
  // ========================

  @IsString()
  DROPBOX_API_URL!: string

  @IsString()
  DROPBOX_AUTH_URL!: string

  @IsString()
  DROPBOX_APP_KEY!: string

  @IsString()
  DROPBOX_APP_SECRET!: string

  @IsString()
  DROPBOX_REDIRECT_URI!: string

  @IsString()
  DROPBOX_TOKEN_URL!: string

  // ========================
  // Meilisearch
  // ========================

  @IsString()
  MEILISEARCH_HOST!: string

  @IsString()
  MEILISEARCH_MASTER_KEY!: string

  // ========================
  // Cloudflare
  // ========================

  @IsString()
  CLOUDFLARE_SECRET_KEY!: string

  // ========================
  // Redis
  // ========================

  @IsString()
  REDIS_HOST!: string

  @IsInt()
  @Min(1)
  REDIS_PORT!: number

  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD!: string

  // ========================
  // SSO
  // ========================

  @IsString()
  GOOGLE_CLIENT_ID!: string

  @IsString()
  GOOGLE_CLIENT_SECRET!: string

  @IsString()
  GOOGLE_REDIRECT_URI!: string

  @IsString()
  GITHUB_CLIENT_ID!: string

  @IsString()
  GITHUB_CLIENT_SECRET!: string

  @IsString()
  GITHUB_REDIRECT_URI!: string

  @IsString()
  LINKEDIN_CLIENT_ID!: string

  @IsString()
  LINKEDIN_CLIENT_SECRET!: string

  @IsString()
  LINKEDIN_REDIRECT_URI!: string

  @IsString()
  DISCORD_CLIENT_ID!: string

  @IsString()
  DISCORD_CLIENT_SECRET!: string

  @IsString()
  DISCORD_REDIRECT_URI!: string

  // ========================
  // Unmapped
  // ========================

  @IsString()
  UM_FEEDBACK_ANON_AUTHOR_KEY!: string
}
