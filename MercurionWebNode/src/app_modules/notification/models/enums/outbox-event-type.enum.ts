export enum OutboxEventType {
  TicketOpenedSupport = 'TICKET_OPENED_SUPPORT',
  TicketOpenedUser = 'TICKET_OPENED_USER',
  UserMessageAdded = 'USER_MESSAGE_ADDED',
  SupportReplied = 'SUPPORT_REPLIED',
  MeilisearchUpsert = 'MEILISEARCH_UPSERT',
  MeilisearchDelete = 'MEILISEARCH_DELETE',
  SecurityAuditRecorded = 'SECURITY_AUDIT_RECORDED',
  LogRecorded = 'LOG_RECORDED',
  EmailSend = 'EMAIL_SEND'
}
