import type { JsonObject } from '../../json.models'

/** UI projection of the DB-first scientific notebook hierarchy. */
export type NotebookDelta = JsonObject

export interface NotebookTree {
  id: string
  title: string
  archivedAt: string | null
  premiseDelta?: NotebookDelta | null
  premiseText?: string
  sections: SectionTree[]
}

export interface SectionTree {
  id: string
  title: string
  sectionOrder: number
  notebookId?: string
  contentDelta?: NotebookDelta | null
  sanitizedText?: string
  experiments: ExperimentTree[]
}

export interface ExperimentTree {
  id: string
  title: string
  experimentOrder: number
  sectionId?: string
  archivedAt: string | null
  contentDelta?: NotebookDelta | null
  sanitizedText?: string
  executions: ExecutionTree[]
  protocolRevisions?: ProtocolRevisionSummary[]
}

export type ExecutionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ExecutionTree {
  id: string
  title: string
  executionOrder: number
  experimentId?: string
  status: string
  archivedAt: string | null
  protocolRevisionId: string | null
  contentDelta?: NotebookDelta | null
  sanitizedText?: string
  startedAt?: string | null
  completedAt?: string | null
  protocolRevision?: ProtocolRevisionSummary | null
}

export interface ProtocolRevisionSummary {
  id: string
  revisionNumber: number
  snapshotSchemaVersion: number
  createdAt: string
}

export interface ProtocolRevisionDetail extends ProtocolRevisionSummary {
  experimentId: string
  checksumSha256: string
  snapshot: NotebookDelta
}

export type NotebookNodeKind = 'notebook' | 'section' | 'experiment' | 'execution'
