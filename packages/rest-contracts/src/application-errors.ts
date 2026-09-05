export interface ApplicationErrorDefinition {
  readonly httpStatus: number;
  readonly graphQlStatus?: number
  readonly defaultMessage?: string;
  readonly publicMessage?: string;
  readonly exposeInProduction: boolean;
}

export const APPLICATION_ERROR_CATALOG = {
  ACCOUNT_ACTIVATION_USER_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "AccountActivation::User not found",
    exposeInProduction: true,
  },
  ACCOUNT_RECOVERY_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    defaultMessage: "AccountRecovery::TooManyAttempts",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  ACCOUNT_RECOVERY_CODE_INVALID: {
    httpStatus: 401,
    defaultMessage: "AccountRecovery::wrong recovery code",
    exposeInProduction: true,
  },
  ACCOUNT_RECOVERY_SECOND_TOO_MANY_ATTEMPTS: {
    httpStatus: 500,
    defaultMessage: "AccountRecoverySecond::TooManyAttempts",
    exposeInProduction: false,
  },
  AUTHENTICATION_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    defaultMessage: "Authentication::TooManyAttempts",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  AUTHENTICATION_INVALID_CREDENTIALS: {
    httpStatus: 401,
    defaultMessage: "AuthenticationInvalidCredentials",
    exposeInProduction: true,
  },
  AUTHENTICATION_UNAUTHORIZED: {
    httpStatus: 500,
    defaultMessage: "Unauthorized",
    exposeInProduction: false,
  },
  AUTHENTICATION_UNAUTHENTICATED: {
    httpStatus: 500,
    defaultMessage: "Unauthenticated",
    exposeInProduction: false,
  },
  AUTHENTICATION_UNAUTHENTICATED_LEGACY_TYPO: {
    httpStatus: 401,
    defaultMessage: "Unauthanticated",
    exposeInProduction: true,
  },
  AUTHENTICATION_UNAUTHENTICATED_SOFT: {
    httpStatus: 401,
    graphQlStatus: 200,
    defaultMessage: "Unauthenticated",
    exposeInProduction: true,
  },
  AUTHENTICATION_UNAUTHENTICATED_FATAL: {
    httpStatus: 401,
    defaultMessage: "Fatal: unauthenticated",
    exposeInProduction: true,
  },
  ACCESS_TOKEN_INVALID_OR_EXPIRED: {
    httpStatus: 500,
    defaultMessage: "InvalidOrExpiredAccessToken",
    exposeInProduction: false,
  },
  TOKEN_INVALID_OR_EXPIRED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  TOKEN_TYPE_INVALID: {
    httpStatus: 500,
    defaultMessage: "InvalidToken::Type mismatch",
    exposeInProduction: false,
  },
  TOKEN_REVOKED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  ACCESS_TOKEN_MISSING: {
    httpStatus: 500,
    defaultMessage: "NoProvidedAccessToken",
    exposeInProduction: false,
  },
  ACCESS_TOKEN_SESSION_MISSING: {
    httpStatus: 500,
    defaultMessage: "NoSuchSessionInAccessTokenSignature",
    exposeInProduction: false,
  },
  SESSION_INVALID: {
    httpStatus: 403,
    defaultMessage: "InvalidSession",
    exposeInProduction: true,
  },
  SESSION_SIGNATURE_INVALID: {
    httpStatus: 403,
    defaultMessage: "InvalidSessionSignature",
    exposeInProduction: true,
  },
  SESSION_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "UnauthorizedNoSuchSession",
    exposeInProduction: false,
  },
  SECURE_COOKIE_SIGNATURE_INVALID: {
    httpStatus: 500,
    defaultMessage: "InvalidSecureCookieSignature",
    exposeInProduction: false,
  },
  SECURE_COOKIE_VALUE_MISSING: {
    httpStatus: 500,
    defaultMessage: "NoSuchElementForCookieSigning",
    exposeInProduction: false,
  },
  PERMISSION_DENIED: {
    httpStatus: 403,
    defaultMessage: "Forbidden::missing permissions",
    exposeInProduction: true,
  },
  ACTION_NOT_ALLOWED: {
    httpStatus: 403,
    defaultMessage: "NotAllowedAction",
    exposeInProduction: true,
  },
  UNPROCESSABLE_ENTITY: {
    httpStatus: 422,
    defaultMessage: "UnprocessableEntity",
    exposeInProduction: true,
  },
  USER_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "NoSuchUser",
    exposeInProduction: true,
  },
  USER_REGISTRATION_EMAIL_CONFLICT: {
    httpStatus: 409,
    defaultMessage: "UserRegistrationConflict::Email already exists",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_USER_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "ChangeEmail::UserNotFound",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_EMPTY: {
    httpStatus: 500,
    defaultMessage: "ChangeEmail::EmptyEmail",
    exposeInProduction: false,
  },
  CHANGE_EMAIL_IS_CURRENT: {
    httpStatus: 409,
    defaultMessage: "ChangeEmail::NewEmailIsCurrentEmail",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_IN_USE_OR_PENDING: {
    httpStatus: 403,
    defaultMessage: "ChangeEmail::EmailAlreadyInUseOrPending",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_CONFIRM_USER_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "ChangeEmailConfirm::UserNotFound",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_CONFIRM_NO_UNCONFIRMED_EMAIL: {
    httpStatus: 400,
    defaultMessage: "ChangeEmailConfirm::NoUnconfirmedEmail",
    exposeInProduction: true,
  },
  CHANGE_EMAIL_CONFIRM_INVALID_TOTP: {
    httpStatus: 401,
    defaultMessage: "ChangeEmailConfirm::InvalidTotp",
    exposeInProduction: true,
  },
  CHANGE_PHONE_USER_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "ChangePhone::UserNotFound",
    exposeInProduction: true,
  },
  CHANGE_PHONE_NO_PENDING_CHANGE: {
    httpStatus: 500,
    defaultMessage: "ChangePhone::NoPendingChange",
    exposeInProduction: false,
  },
  CHANGE_PHONE_ALREADY_SET: {
    httpStatus: 409,
    defaultMessage: "ChangePhone::NumberAlreadySet",
    exposeInProduction: true,
  },
  CHANGE_PHONE_IN_USE_OR_PENDING: {
    httpStatus: 403,
    defaultMessage: "ChangePhone::NumberAlreadyUsedOrPending",
    exposeInProduction: true,
  },
  CHANGE_PHONE_INVALID_TOTP: {
    httpStatus: 401,
    defaultMessage: "ChangePhone::InvalidTOTP",
    exposeInProduction: true,
  },
  DELETE_PHONE_USER_NOT_FOUND: {
    httpStatus: 400,
    defaultMessage: "DeletePhone::UserNotFound",
    exposeInProduction: true,
  },
  DELETE_PHONE_NO_NUMBER: {
    httpStatus: 400,
    defaultMessage: "DeletePhone::NoPhoneNumber",
    exposeInProduction: true,
  },
  DELETE_PHONE_IN_USE_OR_PENDING: {
    httpStatus: 403,
    defaultMessage: "DeletePhone::NumberAlreadyUsedOrPending",
    exposeInProduction: true,
  },
  DELETE_PHONE_NO_PENDING_DELETION: {
    httpStatus: 403,
    defaultMessage: "DeletePhone::NoPendingDeletion",
    exposeInProduction: true,
  },
  ACCOUNT_CONTACT_CHANGE_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  ACCOUNT_CONTACT_CHANGE_SEND_TOO_MANY_REQUESTS: {
    httpStatus: 429,
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  PASSWORD_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    defaultMessage: "Password::TooManyAttempts",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  PASSWORD_RESET_SEND_TOO_MANY_REQUESTS: {
    httpStatus: 429,
    defaultMessage: "PasswordResetSend::TooManyRequests",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  PASSWORD_CHANGE_TOKEN_INVALID_OR_EXPIRED: {
    httpStatus: 403,
    defaultMessage: "InvalidOrExpiredChangePasswordToken",
    exposeInProduction: true,
  },
  PASSWORD_CHANGE_CREDENTIALS_INVALID: {
    httpStatus: 401,
    defaultMessage: "ChangePassword::Invalid Credentials",
    exposeInProduction: true,
  },
  PASSWORD_REUSED: {
    httpStatus: 403,
    defaultMessage: "PasswordReused",
    exposeInProduction: true,
  },
  PASSWORD_ENCODING_FAILED: {
    httpStatus: 500,
    defaultMessage: "PasswordEncodingException",
    exposeInProduction: false,
  },
  PASSWORD_COMPARISON_FAILED: {
    httpStatus: 500,
    defaultMessage: "PasswordComparingException",
    exposeInProduction: false,
  },
  MFA_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    defaultMessage: "Mfa::TooManyAttempts",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  MFA_SEND_TOO_MANY_REQUESTS: {
    httpStatus: 429,
    defaultMessage: "MfaSend::TooManyRequests",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  MFA_BACKUP_CODE_TOO_MANY_ATTEMPTS: {
    httpStatus: 429,
    defaultMessage: "BackupCode::TooManyAttempts",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS: {
    httpStatus: 429,
    defaultMessage: "BackupCodeRegen::TooManyRequests",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  MFA_BACKUP_CODES_NOT_ENABLED: {
    httpStatus: 500,
    defaultMessage: "BackupCodes::MfaNotEnabled",
    exposeInProduction: false,
  },
  MFA_BACKUP_CODES_ALREADY_GENERATED: {
    httpStatus: 403,
    defaultMessage: "BackupCodesAlreadyGenerated",
    exposeInProduction: true,
  },
  MFA_JWT_VALIDATION_INVALID: {
    httpStatus: 401,
    defaultMessage: "InvalidJwtValidation",
    exposeInProduction: true,
  },
  MFA_OTP_SECRET_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "OtpSecretNotFound",
    exposeInProduction: false,
  },
  MFA_TOTP_SECRET_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "TotpSecretNotFound",
    exposeInProduction: false,
  },
  MFA_TEMPORARY_APP_TOTP_SECRET_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "TemporaryAppTotpSecretNotFound",
    exposeInProduction: false,
  },
  MFA_STRATEGY_NOT_ENABLED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  MFA_STRATEGY_ALREADY_ENABLED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  MFA_STRATEGY_NOT_ACTIVE: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  MFA_STRATEGY_UNSUPPORTED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  MFA_SETTINGS_USER_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "MfaSettings::User not found",
    exposeInProduction: false,
  },
  MFA_TEMPORARILY_LOCKED: {
    httpStatus: 403,
    defaultMessage: "MfaTemporarilyLocked",
    exposeInProduction: true,
  },
  MFA_PREAUTHORIZATION_EXPIRED: {
    httpStatus: 401,
    defaultMessage: "ExpiredPreauthorizationToken",
    exposeInProduction: true,
  },
  MFA_PREAUTHORIZATION_INVALID: {
    httpStatus: 401,
    defaultMessage: "InvalidPreauthorizationToken",
    exposeInProduction: true,
  },
  MFA_DEVICE_MISMATCH: {
    httpStatus: 401,
    defaultMessage: "MfaDeviceMismatch",
    exposeInProduction: true,
  },
  MFA_CODE_INVALID: {
    httpStatus: 401,
    defaultMessage: "Invalid MFA OTP",
    exposeInProduction: true,
  },
  FEEDBACK_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "Feedback::NotFound",
    exposeInProduction: true,
  },
  FEEDBACK_TOO_MANY_REQUESTS: {
    httpStatus: 429,
    defaultMessage: "Feedback::TooManyRequests",
    publicMessage: "Rate limit exceeded.",
    exposeInProduction: true,
  },
  TICKET_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "TicketNotFound",
    exposeInProduction: true,
  },
  TICKET_CLOSED_FOR_PUBLISHING: {
    httpStatus: 403,
    defaultMessage: "Forbidden::Cannot publish on a closed ticket",
    exposeInProduction: true,
  },
  TICKET_INITIAL_MESSAGE_CREATE_FAILED: {
    httpStatus: 500,
    defaultMessage: "Failed to create first ticket message",
    exposeInProduction: false,
  },
  LAB_NOTEBOOK_CHAPTER_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "LabNotebook::Chapter not found",
    exposeInProduction: false,
  },
  MOLECULE_SMILES_CONFLICT: {
    httpStatus: 409,
    defaultMessage: "Conflict::Smiles already exist",
    exposeInProduction: true,
  },
  CHEMBL_ITEM_ACCESS_DENIED: {
    httpStatus: 403,
    defaultMessage: "ChEMBLItemAddError::Forbidden",
    exposeInProduction: true,
  },
  CUSTOM_ITEM_ACCESS_DENIED: {
    httpStatus: 403,
    defaultMessage: "CustomItemAddError::Forbidden",
    exposeInProduction: true,
  },
  SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED: {
    httpStatus: 500,
    defaultMessage: "SyntheticStepMoleculeRefError::Forbidden",
    exposeInProduction: false,
  },
  MOLECULE_COLLECTION_ITEM_TYPE_UNKNOWN: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  MOLECULE_NOT_FOUND: {
    httpStatus: 404,
    defaultMessage: "Molecule not found",
    exposeInProduction: true,
  },
  MOLECULE_COLLECTION_NAME_CONFLICT: {
    httpStatus: 500,
    defaultMessage:
      'duplicate key value violates unique constraint "unique_name_per_user"',
    exposeInProduction: false,
  },
  TOX21_PAYLOAD_TOO_LARGE: {
    httpStatus: 413,
    defaultMessage: "MercurionTox21ClientConnection::PayloadTooLarge",
    exposeInProduction: true,
  },
  TOX21_INVALID_PAYLOAD: {
    httpStatus: 500,
    defaultMessage: "MercurionTox21ClientConnection::InvalidPayload",
    exposeInProduction: false,
  },
  TOX21_INVALID_ARE_SAME_STRUCTURE_PAYLOAD: {
    httpStatus: 500,
    defaultMessage:
      "MercurionTox21ClientConnection::InvalidPayload:are_same_structure",
    exposeInProduction: false,
  },
  TOX21_INVALID_MOLECULE_PROPERTIES_PAYLOAD: {
    httpStatus: 500,
    defaultMessage:
      "MercurionTox21ClientConnection::InvalidPayload:get_molecule_properties",
    exposeInProduction: false,
  },
  TOX21_INVALID_CANONICAL_SMILES_PAYLOAD: {
    httpStatus: 500,
    defaultMessage:
      "MercurionTox21ClientConnection::InvalidPayload:to_canonical_smiles",
    exposeInProduction: false,
  },
  TOX21_TIMEOUT: {
    httpStatus: 504,
    defaultMessage: "MercurionTox21ClientConnectionTimeoutNoResponse",
    exposeInProduction: true,
  },
  TOX21_UNKNOWN_ERROR: {
    httpStatus: 500,
    defaultMessage: "MercurionTox21ClientConnectionUnknownError",
    exposeInProduction: false,
  },
  TOX21_UPSTREAM_ERROR: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  DROPBOX_ACCESS_TOKEN_MISSING: {
    httpStatus: 500,
    defaultMessage: "Unauthorized::Dropbox access token not available",
    exposeInProduction: false,
  },
  DROPBOX_UPLOAD_FAILED: {
    httpStatus: 500,
    defaultMessage: "UploadFailed::Dropbox error",
    exposeInProduction: false,
  },
  DROPBOX_UPLOAD_RESPONSE_INVALID: {
    httpStatus: 500,
    defaultMessage: "UploadFailed::Invalid Dropbox response",
    exposeInProduction: false,
  },
  DROPBOX_USER_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "NotFound::User",
    exposeInProduction: false,
  },
  DROPBOX_DOCUMENT_NOT_FOUND: {
    httpStatus: 500,
    defaultMessage: "NotFound::Dropbox document not found",
    exposeInProduction: false,
  },
  DROPBOX_DOCUMENT_ACCESS_DENIED: {
    httpStatus: 500,
    defaultMessage: "Unauthorized::Missing permissions to access this file",
    exposeInProduction: false,
  },
  DROPBOX_DOWNLOAD_FAILED: {
    httpStatus: 500,
    defaultMessage: "DownloadFailed::Dropbox error",
    exposeInProduction: false,
  },
  DROPBOX_DELETE_FAILED: {
    httpStatus: 500,
    defaultMessage: "DeleteFailed::Could not remove file from Dropbox",
    exposeInProduction: false,
  },
  DROPBOX_DELETE_DATABASE_SYNC_FAILED: {
    httpStatus: 500,
    defaultMessage: "DeleteFailed::File removed from Dropbox but not from DB",
    exposeInProduction: false,
  },
  SSO_GOOGLE_ID_TOKEN_MISSING: {
    httpStatus: 401,
    defaultMessage: "SSO_Unauthorized::No id_token from Google",
    exposeInProduction: true,
  },
  SSO_GOOGLE_ID_TOKEN_INVALID: {
    httpStatus: 401,
    defaultMessage: "SSO_Unauthorized::Invalid Google id_token",
    exposeInProduction: true,
  },
  SSO_GITHUB_ACCESS_TOKEN_MISSING: {
    httpStatus: 401,
    defaultMessage: "SSO_Unauthorized::GitHub: access_token missing",
    exposeInProduction: true,
  },
  SSO_GITHUB_PROFILE_FETCH_FAILED: {
    httpStatus: 500,
    exposeInProduction: false,
  },
  SSO_DISCORD_ACCESS_TOKEN_MISSING: {
    httpStatus: 401,
    defaultMessage: "SSO_Unauthorized::Discord: missing access token",
    exposeInProduction: true,
  },
  SSO_LINKEDIN_ACCESS_TOKEN_MISSING: {
    httpStatus: 500,
    defaultMessage: "LinkedIn: missing access token",
    exposeInProduction: false,
  },
  SSO_CALLBACK_FAILED: {
    httpStatus: 500,
    defaultMessage: "SSO_Unauthorized::failed callback flow",
    exposeInProduction: false,
  },
  SSO_PROVIDER_UNSUPPORTED: {
    httpStatus: 400,
    exposeInProduction: true,
  },
  PERSISTENCE_FAILED: {
    httpStatus: 500,
    defaultMessage: "PersistenceError",
    exposeInProduction: false,
  },
} as const satisfies Record<string, ApplicationErrorDefinition>;

export type ApplicationErrorCode = keyof typeof APPLICATION_ERROR_CATALOG;

export const ApplicationErrorCode = Object.freeze(
  Object.fromEntries(
    Object.keys(APPLICATION_ERROR_CATALOG).map((code) => [code, code]),
  ),
) as { readonly [Code in ApplicationErrorCode]: Code };

export interface ApplicationErrorPayload {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

const applicationErrorCodes = new Set<string>(
  Object.keys(APPLICATION_ERROR_CATALOG),
);

const legacyMessageCodes = new Map<string, ApplicationErrorCode>();
const ambiguousLegacyMessages = new Set<string>();

for (const [code, definition] of Object.entries(
  APPLICATION_ERROR_CATALOG as Readonly<
    Record<ApplicationErrorCode, ApplicationErrorDefinition>
  >,
)) {
  const message = definition.defaultMessage;
  if (!message || ambiguousLegacyMessages.has(message)) {
    continue;
  }
  if (legacyMessageCodes.has(message)) {
    legacyMessageCodes.delete(message);
    ambiguousLegacyMessages.add(message);
    continue;
  }
  legacyMessageCodes.set(message, code as ApplicationErrorCode);
}

export function isApplicationErrorCode(
  value: unknown,
): value is ApplicationErrorCode {
  return typeof value === "string" && applicationErrorCodes.has(value);
}

export function isApplicationErrorPayload(
  value: unknown,
): value is ApplicationErrorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ApplicationErrorPayload>;
  return (
    isApplicationErrorCode(payload.code) && typeof payload.message === "string"
  );
}

export function getApplicationErrorDefinition(
  code: ApplicationErrorCode,
): ApplicationErrorDefinition {
  return APPLICATION_ERROR_CATALOG[code];
}

export function resolveLegacyApplicationErrorCode(
  message: string,
): ApplicationErrorCode | undefined {
  return legacyMessageCodes.get(message);
}
