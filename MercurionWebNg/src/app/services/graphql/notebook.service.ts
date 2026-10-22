import { computed, Injectable, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import { finalize, map, Observable, tap } from 'rxjs';
import {
  ArchiveExperimentExecutionDocument,
  ArchiveLabNotebookDocument,
  ArchiveNotebookExperimentDocument,
  CancelExperimentExecutionDocument,
  CompleteExperimentExecutionDocument,
  CreateExperimentExecutionDocument,
  CreateLabNotebookDocument,
  CreateNotebookExperimentDocument,
  CreateNotebookSectionDocument,
  GetAllNotebooksDocument,
  GetAllNotebooksQuery,
  GetExperimentExecutionDocument,
  GetExperimentExecutionQuery,
  GetExperimentProtocolRevisionDocument,
  GetExperimentProtocolRevisionQuery,
  GetNotebookDetailDocument,
  GetNotebookDetailQuery,
  GetNotebookExperimentDocument,
  GetNotebookExperimentQuery,
  GetNotebookSectionDocument,
  GetNotebookSectionQuery,
  LinkMoleculeToExecutionDocument,
  LinkSynthesisToExecutionDocument,
  LinkSynthesisToExperimentDocument,
  ReorderExperimentExecutionsDocument,
  ReorderNotebookExperimentsDocument,
  ReorderNotebookSectionsDocument,
  StartExperimentExecutionDocument,
  UnlinkSynthesisFromExperimentDocument,
  UpdateExperimentExecutionDocument,
  UpdateLabNotebookDocument,
  UpdateNotebookExperimentDocument,
  UpdateNotebookSectionDocument,
} from '../../generated/graphql';
import {
  ExecutionTree, ExperimentTree, NotebookDelta, NotebookTree,
  ProtocolRevisionDetail, SectionTree
} from '../../Models/graphql/notebook/notebook.models';
import { extractGqlData } from './graphql-helpers/v1/extract-gql-data.helper';
import { GRAPHQL_QUERY_FETCH_POLICY } from './graphql-query-policy';

/**
 * DB-first Notebook v1 client.
 *
 * All operations originate from the static GraphQL catalog. No inline gql.
 * Snapshot reads are one-shot network-only. No silent/background subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class NotebookService {
  private readonly _notebooks = signal<NotebookTree[]>([]);
  private readonly _loading = signal(false);

  readonly notebooks = computed(() => this._notebooks());
  readonly loading = computed(() => this._loading());

  constructor(private readonly apollo: Apollo) {}

  private read<T extends Record<string, unknown>, K extends keyof T>(
    query: DocumentNode,
    field: K,
    variables?: Record<string, unknown>,
  ): Observable<T[K]> {
    return this.apollo.query<T, Record<string, unknown>>({
      query, variables,
      fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.mutableSnapshot,
    }).pipe(map(result => extractGqlData<T, K>(result, field, true) as T[K]));
  }

  private write<T extends Record<string, unknown>, K extends keyof T>(
    mutation: DocumentNode,
    field: K,
    variables: Record<string, unknown>,
  ): Observable<NonNullable<T[K]>> {
    return this.apollo.mutate<T, Record<string, unknown>>({
      mutation, variables,
    }).pipe(map(result => extractGqlData<T, K>(result, field)));
  }

  getAllNotebooks(): Observable<NotebookTree[]> {
    this._loading.set(true);
    return this.read<GetAllNotebooksQuery, 'labNotebooksByUser'>(
      GetAllNotebooksDocument, 'labNotebooksByUser'
    ).pipe(
      map(notebooks => notebooks as NotebookTree[]),
      tap(notebooks => this._notebooks.set(notebooks)),
      finalize(() => this._loading.set(false)),
    );
  }

  getNotebookById(id: string): Observable<NotebookTree | null> {
    return this.read<GetNotebookDetailQuery, 'labNotebook'>(
      GetNotebookDetailDocument, 'labNotebook', { id }
    ).pipe(map(item => item as NotebookTree | null));
  }

  getSectionById(id: string): Observable<SectionTree | null> {
    return this.read<GetNotebookSectionQuery, 'notebookSection'>(
      GetNotebookSectionDocument, 'notebookSection', { id }
    ).pipe(map(section => section as SectionTree | null));
  }

  getExperimentById(id: string): Observable<ExperimentTree | null> {
    return this.read<GetNotebookExperimentQuery, 'notebookExperiment'>(
      GetNotebookExperimentDocument, 'notebookExperiment', { id }
    ).pipe(map(experiment => experiment as ExperimentTree | null));
  }

  getExecutionById(id: string): Observable<ExecutionTree | null> {
    return this.read<GetExperimentExecutionQuery, 'experimentExecution'>(
      GetExperimentExecutionDocument, 'experimentExecution', { id }
    ).pipe(map(execution => execution as ExecutionTree | null));
  }

  getProtocolRevisionById(id: string): Observable<ProtocolRevisionDetail | null> {
    return this.read<GetExperimentProtocolRevisionQuery, 'experimentProtocolRevision'>(
      GetExperimentProtocolRevisionDocument, 'experimentProtocolRevision', { id }
    ).pipe(map(revision => revision as ProtocolRevisionDetail | null));
  }

  createNotebook(title: string): Observable<{ id: string; title: string }> {
    return this.write<{ createLabNotebook: { id: string; title: string } }, 'createLabNotebook'>(
      CreateLabNotebookDocument, 'createLabNotebook', { input: { title } }
    );
  }

  updateNotebook(id: string, changes: { title?: string; premiseDelta?: NotebookDelta | null }):
  Observable<{ id: string; title: string }> {
    return this.write<{ updateLabNotebook: { id: string; title: string } }, 'updateLabNotebook'>(
      UpdateLabNotebookDocument, 'updateLabNotebook', { input: { id, ...changes } }
    );
  }

  archiveNotebook(id: string): Observable<{ id: string; archivedAt: string | null }> {
    return this.write<
      { archiveLabNotebook: { id: string; archivedAt: string | null } }, 'archiveLabNotebook'
    >(ArchiveLabNotebookDocument, 'archiveLabNotebook', { id });
  }

  createSection(notebookId: string, title: string): Observable<{ id: string; title: string }> {
    return this.write<
      { createNotebookSection: { id: string; title: string } }, 'createNotebookSection'
    >(CreateNotebookSectionDocument, 'createNotebookSection', { input: { notebookId, title } });
  }

  updateSection(id: string, changes: { title?: string; contentDelta?: NotebookDelta | null }):
  Observable<{ id: string; title: string }> {
    return this.write<
      { updateNotebookSection: { id: string; title: string } }, 'updateNotebookSection'
    >(UpdateNotebookSectionDocument, 'updateNotebookSection', { input: { id, ...changes } });
  }

  createExperiment(sectionId: string, title: string):
  Observable<{ id: string; title: string }> {
    return this.write<
      { createNotebookExperiment: { id: string; title: string } }, 'createNotebookExperiment'
    >(CreateNotebookExperimentDocument, 'createNotebookExperiment', { input: { sectionId, title } });
  }

  updateExperiment(id: string, changes: { title?: string; contentDelta?: NotebookDelta | null }):
  Observable<{ id: string; title: string }> {
    return this.write<
      { updateNotebookExperiment: { id: string; title: string } }, 'updateNotebookExperiment'
    >(UpdateNotebookExperimentDocument, 'updateNotebookExperiment', { input: { id, ...changes } });
  }

  archiveExperiment(id: string): Observable<{ id: string; archivedAt: string | null }> {
    return this.write<
      { archiveNotebookExperiment: { id: string; archivedAt: string | null } }, 'archiveNotebookExperiment'
    >(ArchiveNotebookExperimentDocument, 'archiveNotebookExperiment', { id });
  }

  createExecution(experimentId: string, title: string):
  Observable<{ id: string; title: string; status: string }> {
    return this.write<
      { createExperimentExecution: { id: string; title: string; status: string } },
      'createExperimentExecution'
    >(CreateExperimentExecutionDocument, 'createExperimentExecution', { input: { experimentId, title } });
  }

  updateExecution(id: string, changes: { title?: string; contentDelta?: NotebookDelta | null }):
  Observable<{ id: string; title: string; status: string }> {
    return this.write<
      { updateExperimentExecution: { id: string; title: string; status: string } },
      'updateExperimentExecution'
    >(UpdateExperimentExecutionDocument, 'updateExperimentExecution', { input: { id, ...changes } });
  }

  startExecution(id: string): Observable<ExecutionTree> {
    return this.write<{ startExperimentExecution: ExecutionTree }, 'startExperimentExecution'>(
      StartExperimentExecutionDocument, 'startExperimentExecution', { id }
    );
  }

  completeExecution(id: string): Observable<ExecutionTree> {
    return this.write<{ completeExperimentExecution: ExecutionTree }, 'completeExperimentExecution'>(
      CompleteExperimentExecutionDocument, 'completeExperimentExecution', { id }
    );
  }

  cancelExecution(id: string): Observable<ExecutionTree> {
    return this.write<{ cancelExperimentExecution: ExecutionTree }, 'cancelExperimentExecution'>(
      CancelExperimentExecutionDocument, 'cancelExperimentExecution', { id }
    );
  }

  archiveExecution(id: string): Observable<{ id: string; archivedAt: string | null }> {
    return this.write<
      { archiveExperimentExecution: { id: string; archivedAt: string | null } },
      'archiveExperimentExecution'
    >(ArchiveExperimentExecutionDocument, 'archiveExperimentExecution', { id });
  }

  reorderSections(parentId: string, orderedIds: string[]): Observable<boolean> {
    return this.write<{ reorderNotebookSections: boolean }, 'reorderNotebookSections'>(
      ReorderNotebookSectionsDocument, 'reorderNotebookSections', { input: { parentId, orderedIds } }
    );
  }

  reorderExperiments(parentId: string, orderedIds: string[]): Observable<boolean> {
    return this.write<{ reorderNotebookExperiments: boolean }, 'reorderNotebookExperiments'>(
      ReorderNotebookExperimentsDocument, 'reorderNotebookExperiments', { input: { parentId, orderedIds } }
    );
  }

  reorderExecutions(parentId: string, orderedIds: string[]): Observable<boolean> {
    return this.write<{ reorderExperimentExecutions: boolean }, 'reorderExperimentExecutions'>(
      ReorderExperimentExecutionsDocument, 'reorderExperimentExecutions', { input: { parentId, orderedIds } }
    );
  }

  linkSynthesisToExperiment(experimentId: string, synthesisId: string): Observable<boolean> {
    return this.write<{ linkSynthesisToExperiment: boolean }, 'linkSynthesisToExperiment'>(
      LinkSynthesisToExperimentDocument, 'linkSynthesisToExperiment',
      { input: { experimentId, synthesisId } }
    );
  }

  unlinkSynthesisFromExperiment(experimentId: string, synthesisId: string): Observable<boolean> {
    return this.write<{ unlinkSynthesisFromExperiment: boolean }, 'unlinkSynthesisFromExperiment'>(
      UnlinkSynthesisFromExperimentDocument, 'unlinkSynthesisFromExperiment',
      { input: { experimentId, synthesisId } }
    );
  }

  linkSynthesisToExecution(executionId: string, synthesisId: string, stepId?: string):
  Observable<boolean> {
    return this.write<{ linkSynthesisToExecution: boolean }, 'linkSynthesisToExecution'>(
      LinkSynthesisToExecutionDocument, 'linkSynthesisToExecution',
      { input: { executionId, synthesisId, ...(stepId ? { stepId } : {}) } }
    );
  }

  linkMoleculeToExecution(executionId: string, moleculeId: string): Observable<boolean> {
    return this.write<{ linkMoleculeToExecution: boolean }, 'linkMoleculeToExecution'>(
      LinkMoleculeToExecutionDocument, 'linkMoleculeToExecution',
      { input: { executionId, moleculeId } }
    );
  }

  /** Explicit reload; no unmanaged subscribe() or silent stale cache. */
  refreshNotebooks(): Observable<NotebookTree[]> {
    return this.getAllNotebooks();
  }
}
