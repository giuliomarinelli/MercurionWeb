import { Injectable } from '@nestjs/common'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import type { UtcInstant } from '@mercurion/rest-contracts'
import { utcNow } from 'src/utils/temporal/temporal'
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service'
import { OutboxEventType } from 'src/app_modules/notification/models/enums/outbox-event-type.enum'
import { DataSource } from 'typeorm'
import { TransactionContext, runInTransaction, transactionManager } from 'src/persistence/transaction-context'

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
  timestamp: UtcInstant
  userId: UUID
  event: SecurityAuditEventType
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

interface BaseOptions {
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/**
 * ATTENZIONE:
 * - i campi sensibili (email, telefono, ecc.) vanno passati già MASCHERATI
 *   (es. usando SecurityService.maskEmail / maskPhone) da chi chiama.
 */
@Injectable()
export class SecurityAuditService {
  constructor(
    private readonly outbox: NotificationOutboxService,
    private readonly dataSource: DataSource
  ) {}

  private buildEvent(
    userId: UUID,
    event: SecurityAuditEventType,
    options?: BaseOptions
  ): SecurityAuditEvent {
    return {
      id: uuidv7(),
      timestamp: utcNow(),
      userId,
      event,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: options?.metadata ?? {}
    }
  }

  private async send(event: SecurityAuditEvent, context?: TransactionContext): Promise<void> {
    const append = async (manager: Parameters<NotificationOutboxService['append']>[0]) => {
      await this.outbox.append(manager, {
        aggregateId: event.userId,
        eventType: OutboxEventType.SecurityAuditRecorded,
        payload: { indexName: INDEX_NAME, document: event },
        dedupeKey: `security-audit:${event.id}`,
        correlationId: event.id as UUID
      })
    }
    if (context) {
      await append(transactionManager(context))
      return
    }
    await runInTransaction(this.dataSource, async (_context, manager) => append(manager))
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
    opts?: BaseOptions & { viaResetFlow?: boolean },
    context?: TransactionContext
  ): Promise<void> {
    const { viaResetFlow, ...base } = opts ?? {}
    const event = this.buildEvent(userId, 'PASSWORD_CHANGED', {
      ...base,
      metadata: {
        ...(base.metadata ?? {}),
        viaResetFlow: !!viaResetFlow
      }
    })
    await this.send(event, context)
  }

  /**
   * Email cambiata.
   * ATTENZIONE: passare email già mascherate (es. ***@gm**.com).
   */
  async emailChanged(
    userId: UUID,
    maskedOldEmail: string | null,
    maskedNewEmail: string,
    opts?: BaseOptions,
    context?: TransactionContext
  ): Promise<void> {
    const event = this.buildEvent(userId, 'EMAIL_CHANGED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        oldEmail: maskedOldEmail,
        newEmail: maskedNewEmail
      }
    })
    await this.send(event, context)
  }

  /**
   * Telefono cambiato.
   * ATTENZIONE: passare telefono già mascherato.
   */
  async phoneChanged(
    userId: UUID,
    maskedOldPhone: string | null,
    maskedNewPhone: string,
    opts?: BaseOptions,
    context?: TransactionContext
  ): Promise<void> {
    const event = this.buildEvent(userId, 'PHONE_CHANGED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        oldPhone: maskedOldPhone,
        newPhone: maskedNewPhone
      }
    })
    await this.send(event, context)
  }

  /**
   * MFA abilitata.
   * @param strategy stringa tipo "EMAIL_OTP" / "SMS_OTP" / "APP_TOTP"
   */
  async mfaEnabled(
    userId: UUID,
    strategy: string,
    opts?: BaseOptions,
    context?: TransactionContext
  ): Promise<void> {
    const event = this.buildEvent(userId, 'MFA_ENABLED', {
      ...opts,
      metadata: {
        ...(opts?.metadata ?? {}),
        strategy
      }
    })
    await this.send(event, context)
  }

  /**
   * MFA disabilitata.
   * @param strategy stringa tipo "EMAIL_OTP" / "SMS_OTP" / "APP_TOTP"
   * @param backupCodesCleared true se in quell’operazione hai anche cancellato i backup code
   */
  async mfaDisabled(
    userId: UUID,
    strategy: string,
    opts?: BaseOptions & { backupCodesCleared?: boolean },
    context?: TransactionContext
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
    await this.send(event, context)
  }

  async accountRecovery(userId: UUID, strategy: | 'ACCOUNT_RECOVERY_TOKEN_GENERATED' | 'ACCOUNT_RECOVERY_ACCOUNT_RECOVERED', context?: TransactionContext): Promise<void> {
    const event = this.buildEvent(userId, strategy)
    await this.send(event, context)
  }
  
}
