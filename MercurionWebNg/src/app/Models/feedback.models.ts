export type FeedbackEnv = 'staging' | 'prod'

export type FeedbackSource = 'manual_page' | 'prompted'

export type FeedbackKind = 'bug' | 'ux' | 'idea' | 'question' | 'other'

export type FeedbackContextKind = 'global' | 'navigation' | 'search' | 'prediction' | 'editor' | 'collection' | 'export' | 'auth' | 'performance' | 'error'

export type FeedbackStatus = 'new' | 'triaged' | 'resolved' | 'spam'

export interface Feedback {
  id: string
  createdAtMs: string
  env: FeedbackEnv
  source: FeedbackSource
  kind: FeedbackKind
  ratingUtility: number | null
  ratingClarity: number | null
  ratingExperience: number | null
  message: string | null
  contextKind: FeedbackContextKind
  contextRef: string | null
  contextMeta: Record<string, unknown> | null
  clientVersion: string | null
  status: FeedbackStatus
  internalNote: string | null
  tags: string[] | null
}

export interface UpdateFeedbackDTO {
  status?: FeedbackStatus
  internalNote?: string
  tags?: string[]
}

export interface CreateFeedbackDTO {
  env: FeedbackEnv
  source?: FeedbackSource
  kind?: FeedbackKind
  contextKind?: FeedbackContextKind
  contextRef?: string
  contextMeta?: Record<string, unknown>
  clientVersion?: string
  ratingUtility?: number
  ratingClarity?: number
  ratingExperience?: number
  message?: string
}

