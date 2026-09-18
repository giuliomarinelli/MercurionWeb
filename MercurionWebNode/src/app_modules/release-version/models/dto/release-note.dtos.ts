export interface ReleaseNoteHeader {
    title: string
    summary: string
    audience: 'internal' | 'users' | 'mixed'
    risk: 'low' | 'medium' | 'high'
    type: 'beta' | 'prod'
    date: number // unix ms timestamp
}

export type ReleaseScope =
    | 'api'
    | 'db'
    | 'ui'
    | 'infra'
    | 'auth'
    | 'search'
    | 'jobs'
    | 'other'

export interface ReleaseChangeRef {
    issues?: string[] // es. ['#123']
    pr?: string[] // es. ['#456']
    docs?: string[] // es. ['DOC-12']
}

export interface ReleaseChangeItem {
    text: string
    scope: ReleaseScope
    breaking: boolean
    refs?: ReleaseChangeRef
}

export interface ReleaseChanges {
    added?: ReleaseChangeItem[]
    changed?: ReleaseChangeItem[]
    fixed?: ReleaseChangeItem[]
    deprecated?: ReleaseChangeItem[]
    removed?: ReleaseChangeItem[]
    security?: ReleaseChangeItem[]
}

export interface ReleaseOpsNotes {
    deployNotes?: string
    migration?: {
        required: boolean
        notes?: string | null
    }
    rollback?: {
        safe: boolean
        notes?: string | null
    }
    config?: Array<{
        key: string
        action: 'add' | 'update' | 'remove'
        notes?: string | null
    }>
}

export interface ReleaseCompatibility {
    api?: {
        minClientVersion?: string
        notes?: string | null
    }
    db?: {
        requiresMigration?: boolean
        notes?: string | null
    }
    breakingChanges?: Array<{
        text: string
        mitigation?: string | null
    }>
}

export interface ReleaseNote extends ReleaseNoteHeader {
    changes?: ReleaseChanges
    ops?: ReleaseOpsNotes
    compatibility?: ReleaseCompatibility
    extra?: Record<string, unknown> | null
}
