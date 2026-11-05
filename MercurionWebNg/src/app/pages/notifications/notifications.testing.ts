import { utcInstantFromEpochMs, type UserNotificationDTO } from '@mercurion/rest-contracts'

export function notificationFixture(
  id: string,
  overrides: Partial<UserNotificationDTO> = {}
): UserNotificationDTO {
  const instant = utcInstantFromEpochMs(Date.UTC(2026, 9, 27, 10))
  return {
    id,
    type: 'support.reply_received',
    version: 1,
    category: 'support',
    title: `Notifica ${id}`,
    summary: `Anteprima ${id}`,
    body: `Contenuto completo ${id}`,
    payload: {},
    resourceType: null,
    resourceId: null,
    createdAt: instant,
    updatedAt: instant,
    seenAt: instant,
    readAt: instant,
    dismissedAt: null,
    ...overrides,
  }
}
