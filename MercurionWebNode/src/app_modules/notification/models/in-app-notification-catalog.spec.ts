import {
  InAppNotificationCategory,
  InAppNotificationType,
  buildInAppNotification
} from './in-app-notification-catalog'

describe('in-app notification catalog', () => {
  const userId = '018f0f12-3d4c-7abc-8def-0123456789ab'

  it('builds a password-changed snapshot without challenge material', () => {
    const notification = buildInAppNotification({
      type: InAppNotificationType.PasswordChanged,
      recipientUserId: userId,
      dedupeKey: 'security.password_changed:audit-1'
    })

    expect(notification).toMatchObject({
      type: InAppNotificationType.PasswordChanged,
      version: 1,
      category: InAppNotificationCategory.Security,
      recipientUserId: userId,
      payload: {},
      resourceType: null,
      resourceId: null
    })
    expect(notification.title).toContain('Password')
    expect(JSON.stringify(notification)).not.toMatch(/otp|token|secret/i)
  })

  it('builds a support-reply notification with a semantic target', () => {
    const notification = buildInAppNotification({
      type: InAppNotificationType.SupportReplyReceived,
      recipientUserId: userId,
      dedupeKey: 'support.reply_received:message-1:' + userId,
      ticketId: '018f0f12-3d4c-7abc-8def-0123456789ac',
      ticketPublicId: 'T-123'
    })

    expect(notification).toMatchObject({
      category: InAppNotificationCategory.Support,
      resourceType: 'help_ticket',
      resourceId: '018f0f12-3d4c-7abc-8def-0123456789ac',
      payload: {
        ticketPublicId: 'T-123'
      }
    })
  })
})
