import { UUID } from 'node:crypto'

export const InAppNotificationType = Object.freeze({
  PasswordChanged: 'security.password_changed',
  SupportReplyReceived: 'support.reply_received',
  SupportUserReplyReceived: 'support.user_reply_received'
} as const)

export type InAppNotificationType =
  (typeof InAppNotificationType)[keyof typeof InAppNotificationType]

export const InAppNotificationCategory = Object.freeze({
  Security: 'security',
  Support: 'support'
} as const)

export type InAppNotificationCategory =
  (typeof InAppNotificationCategory)[keyof typeof InAppNotificationCategory]

interface BaseNotificationInput {
  recipientUserId: UUID
  dedupeKey: string
}

export interface PasswordChangedNotificationInput extends BaseNotificationInput {
  type: typeof InAppNotificationType.PasswordChanged
}

export interface SupportReplyReceivedNotificationInput extends BaseNotificationInput {
  type: typeof InAppNotificationType.SupportReplyReceived
  ticketId: string
  ticketPublicId: string
}

export interface SupportUserReplyReceivedNotificationInput extends BaseNotificationInput {
  type: typeof InAppNotificationType.SupportUserReplyReceived
  ticketId: string
  ticketPublicId: string
}

export type CreateInAppNotificationInput =
  | PasswordChangedNotificationInput
  | SupportReplyReceivedNotificationInput
  | SupportUserReplyReceivedNotificationInput

export interface UserNotificationDraft {
  recipientUserId: UUID
  type: InAppNotificationType
  version: number
  category: InAppNotificationCategory
  title: string
  summary: string
  body: string
  payload: Record<string, unknown>
  resourceType: string | null
  resourceId: string | null
  dedupeKey: string
}

export function buildInAppNotification(
  input: CreateInAppNotificationInput
): UserNotificationDraft {
  switch (input.type) {
    case InAppNotificationType.PasswordChanged:
      return {
        recipientUserId: input.recipientUserId,
        type: input.type,
        version: 1,
        category: InAppNotificationCategory.Security,
        title: 'Password modificata',
        summary: 'La password del tuo account è stata modificata.',
        body:
          'La password del tuo account Mercurion è stata modificata. Se non hai eseguito tu questa operazione, verifica immediatamente la sicurezza del tuo account.',
        payload: {},
        resourceType: null,
        resourceId: null,
        dedupeKey: input.dedupeKey
      }

    case InAppNotificationType.SupportReplyReceived:
      return {
        recipientUserId: input.recipientUserId,
        type: input.type,
        version: 1,
        category: InAppNotificationCategory.Support,
        title: 'Nuova risposta dal supporto',
        summary: 'Il ticket ' + input.ticketPublicId + ' ha ricevuto una nuova risposta.',
        body:
          'Il team di supporto ha pubblicato una nuova risposta nel ticket ' +
          input.ticketPublicId +
          '.',
        payload: {
          ticketPublicId: input.ticketPublicId
        },
        resourceType: 'help_ticket',
        resourceId: input.ticketId,
        dedupeKey: input.dedupeKey
      }

    case InAppNotificationType.SupportUserReplyReceived:
      return {
        recipientUserId: input.recipientUserId,
        type: input.type,
        version: 1,
        category: InAppNotificationCategory.Support,
        title: 'Nuova risposta utente',
        summary: 'Il ticket ' + input.ticketPublicId + ' ha ricevuto una nuova risposta dall’utente.',
        body:
          'L’utente ha pubblicato una nuova risposta nel ticket ' +
          input.ticketPublicId +
          '.',
        payload: {
          ticketPublicId: input.ticketPublicId
        },
        resourceType: 'help_ticket',
        resourceId: input.ticketId,
        dedupeKey: input.dedupeKey
      }
  }
}
