import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { MeiliSearch } from 'meilisearch'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'

const INDEX_NAME = 'security_logs'

export type SecurityAuditEventType =
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'PHONE_CHANGED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'ACCOUNT_RECOVERY_TOKEN_GENERATED'
  | 'ACCOUNT_RECOVERY_ACCOUNT_RECOVERED'

export interface SecurityAuditEvent {
  id: string
  timestamp: string
  userId: UUID
  event: SecurityAuditEventType
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
}

interface BaseOptions {
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * ATTENZIONE:
 * - i campi sensibili (email, telefono, ecc.) vanno passati già MASCHERATI
 *   (es. usando SecurityService.maskEmail / maskPhone) da chi chiama.
 */
@Injectable()
export class SecurityAuditService implements OnModuleInit {
  private lastMeiliFailure = 0

  constructor(
    @Inject('MEILISEARCH_CLIENT')
    private readonly meiliClient: MeiliSearch
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureIndexExists()
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      await this.meiliClient.getIndex(INDEX_NAME)
    } catch {
      await this.meiliClient.createIndex(INDEX_NAME, { primaryKey: 'id' })
    }
  }

  private buildEvent(
    userId: UUID,
    event: SecurityAuditEventType,
    options?: BaseOptions
  ): SecurityAuditEvent {
    return {
      id: uuidv7(),
      timestamp: new Date().toISOString(),
      userId,
      event,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: options?.metadata ?? {}
    }
  }

  private async send(event: SecurityAuditEvent): Promise<void> {
    try {
      await this.meiliClient.index(INDEX_NAME).addDocuments([event])
    } catch (err: any) {
      const now = Date.now()
      // best effort + rate limit dei log di errore del logger stesso
      if (now - this.lastMeiliFailure > 10_000) {
        this.lastMeiliFailure = now
        // qui potresti anche usare console.error o un logger "di base" se vuoi
        // per evitare dipendenze circolari con MeiliLoggerService
        console.error('[SecurityAudit] Failed to send event to Meili:', err?.message ?? err)
      }
    }
  }

  // ==========
  //  EVENTI
  // ==========

  /**
   * Password cambiata (sia via changePassword che via reset).
   * @param viaResetFlow true se viene da "password dimenticata"
   */
  async passwordChanged(
    userId: UUID,
    opts?: BaseOptions & { viaResetFlow?: boolean }
  ): Promise<void> {
    const { viaResetFlow, ...base } = opts ?? {}
    const event = this.buildEvent(userId, 'PASSWORD_CHANGED', {
      ...base,
      metadata: {
        ...(base.metadata ?? {}),
        viaResetFlow: !!viaResetFlow
      }
    })
    await this.send(event)
  }

  /**
   * Email cambiata.
   * ATTENZIONE: passare email già mascherate (es. ***@gm**.com).
   */
  async emailChanged(
    userId: UUID,
    maskedOldEmail: string | null,
    maskedNewEmail: string,
    opts?: BaseOptions
  ): Promise<void> {
    const event = this.buildEvent(userId, 'EMAIL_CHANGED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        oldEmail: maskedOldEmail,
        newEmail: maskedNewEmail
      }
    })
    await this.send(event)
  }

  /**
   * Telefono cambiato.
   * ATTENZIONE: passare telefono già mascherato.
   */
  async phoneChanged(
    userId: UUID,
    maskedOldPhone: string | null,
    maskedNewPhone: string,
    opts?: BaseOptions
  ): Promise<void> {
    const event = this.buildEvent(userId, 'PHONE_CHANGED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        oldPhone: maskedOldPhone,
        newPhone: maskedNewPhone
      }
    })
    await this.send(event)
  }

  /**
   * MFA abilitata.
   * @param strategy stringa tipo "EMAIL_OTP" / "SMS_OTP" / "APP_TOTP"
   */
  async mfaEnabled(
    userId: UUID,
    strategy: string,
    opts?: BaseOptions
  ): Promise<void> {
    const event = this.buildEvent(userId, 'MFA_ENABLED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        strategy
      }
    })
    await this.send(event)
  }

  /**
   * MFA disabilitata.
   * @param strategy stringa tipo "EMAIL_OTP" / "SMS_OTP" / "APP_TOTP"
   * @param backupCodesCleared true se in quell’operazione hai anche cancellato i backup code
   */
  async mfaDisabled(
    userId: UUID,
    strategy: string,
    opts?: BaseOptions & { backupCodesCleared?: boolean }
  ): Promise<void> {
    const { backupCodesCleared, ...base } = opts ?? {}
    const event = this.buildEvent(userId, 'MFA_DISABLED', {
      ...base,
      metadata: {
        ...(base.metadata ?? {}),
        strategy,
        backupCodesCleared: !!backupCodesCleared
      }
    })
    await this.send(event)
  }

  async accountRecovery(userId: UUID, strategy: | 'ACCOUNT_RECOVERY_TOKEN_GENERATED' | 'ACCOUNT_RECOVERY_ACCOUNT_RECOVERED'): Promise<void> {
    const event = this.buildEvent(userId, strategy)
    await this.send(event)
  }
  
}
