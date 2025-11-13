export interface SecurityAuditEvent {
  id: string
  userId: string
  event: 'PASSWORD_CHANGED' | 'EMAIL_CHANGED' | 'PHONE_CHANGED' | 'MFA_ENABLED' | 'MFA_DISABLED'
  ip?: string
  userAgent?: string
  createdAt: string
  metadata?: Record<string, any>
}
