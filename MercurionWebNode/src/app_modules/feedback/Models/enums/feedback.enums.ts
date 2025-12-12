export enum FeedbackEnv {
  STAGING = 'staging',
  PROD = 'prod'
}

export enum FeedbackSource {
  MANUAL_PAGE = 'manual_page',
  PROMPTED = 'prompted'
}

export enum FeedbackKind {
  BUG = 'bug',
  UX = 'ux',
  IDEA = 'idea',
  QUESTION = 'question',
  OTHER = 'other'
}

export enum FeedbackContextKind {
  GLOBAL = 'global',
  NAVIGATION = 'navigation',
  SEARCH = 'search',
  PREDICTION = 'prediction',
  EDITOR = 'editor',
  COLLECTION = 'collection',
  EXPORT = 'export',
  AUTH = 'auth',
  PERFORMANCE = 'performance',
  ERROR = 'error'
}

export enum FeedbackStatus {
  NEW = 'new',
  TRIAGED = 'triaged',
  RESOLVED = 'resolved',
  SPAM = 'spam'
}
