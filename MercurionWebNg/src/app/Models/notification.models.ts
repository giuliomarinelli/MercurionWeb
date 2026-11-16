export type BadgeAppearanceClass = 'fade-in' | 'fade-out' | 'hidden' |''


export type NotificationSyncState =
  | 'inactive'
  | 'baselining'
  | 'ready'
  | 'recovering'
  | 'degraded'
  | 'stopped'
