export function notificationCategoryLabel(category: string): string {
  switch (category) {
    case 'security':
      return 'Sicurezza'
    case 'support':
      return 'Assistenza'
    default:
      return category || 'Aggiornamento'
  }
}
