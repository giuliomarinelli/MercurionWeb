export type StatusPageCode = 403 | 404

export interface StatusPageConfig {
  readonly code: StatusPageCode
  readonly heading: string
  readonly description: string
  readonly title: string
}

export const STATUS_PAGE_CONFIG: Record<StatusPageCode, StatusPageConfig> = {
  403: {
    code: 403,
    heading: 'Accesso non consentito.',
    description: 'Siamo spiacenti, ma non disponi dei permessi per accedere alla pagina o al contenuto che cercavi.',
    title: '403 Accesso negato',
  },
  404: {
    code: 404,
    heading: 'Pagina non trovata.',
    description: 'Siamo spiacenti, ma non siamo riusciti a trovare la pagina o il contenuto che cercavi.',
    title: '404 Pagina non trovata',
  },
}
