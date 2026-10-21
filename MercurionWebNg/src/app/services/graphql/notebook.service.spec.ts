import { Apollo } from 'apollo-angular';
import { DocumentNode, Kind, OperationDefinitionNode } from 'graphql';
import { firstValueFrom, of } from 'rxjs';
import { GRAPHQL_QUERY_FETCH_POLICY } from './graphql-query-policy';
import { NotebookService } from './notebook.service';

function operationOf(document: DocumentNode): OperationDefinitionNode {
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (!operation) throw new Error('Missing operation definition');
  return operation;
}

describe('NotebookService — scientific-domain GraphQL contract', () => {
  it('reads NotebookSection/NotebookExperiment/ExperimentExecution from the new schema', () => {
    const querySpy = jasmine.createSpy('query').and.returnValue(of({ data: {} }));
    const notebook = new NotebookService({ query: querySpy } as unknown as Apollo);
    const id = '01990f17-0ff8-7b75-83d7-2c995ae7e2b1';

    const checks = [
      { call: () => notebook.getSectionById(id), field: 'notebookSection', operation: 'GetNotebookSection' },
      { call: () => notebook.getExperimentById(id), field: 'notebookExperiment', operation: 'GetNotebookExperiment' },
      { call: () => notebook.getExecutionById(id), field: 'experimentExecution', operation: 'GetExperimentExecution' },
    ];

    for (const testCase of checks) {
      testCase.call();
      const argument = querySpy.calls.mostRecent().args[0] as {
        query: DocumentNode;
        variables: { id: string };
        fetchPolicy: string;
      };
      const definition = operationOf(argument.query);
      const first = definition.selectionSet.selections[0];
      expect(definition.name?.value).toBe(testCase.operation);
      expect(first.kind === Kind.FIELD ? first.name.value : undefined).toBe(testCase.field);
      expect(argument.variables).toEqual({ id });
      expect(argument.fetchPolicy).toBe(GRAPHQL_QUERY_FETCH_POLICY.mutableSnapshot);
    }
  });

  it('creates a notebook using ScientificNotebookCreateInput rather than a title argument', async () => {
    const mutateSpy = jasmine.createSpy('mutate').and.returnValue(of({
      data: { createLabNotebook: { id: 'notebook-id', title: 'Ricerca' } }
    }));
    const notebook = new NotebookService({ mutate: mutateSpy } as unknown as Apollo);

    const result = await firstValueFrom(notebook.createNotebook('Ricerca'));
    expect(result).toEqual({ id: 'notebook-id', title: 'Ricerca' });

    const options = mutateSpy.calls.mostRecent().args[0] as {
      mutation: DocumentNode; variables: unknown
    };
    expect(options.variables).toEqual({ input: { title: 'Ricerca' } });
    expect(operationOf(options.mutation).name?.value).toBe('CreateLabNotebook');
  });

  it('archives instead of calling removed notebook delete operations', async () => {
    const mutateSpy = jasmine.createSpy('mutate').and.returnValue(of({
      data: { archiveLabNotebook: { id: 'notebook-id', archivedAt: '1792580000000' } }
    }));
    const notebook = new NotebookService({ mutate: mutateSpy } as unknown as Apollo);

    const result = await firstValueFrom(notebook.archiveNotebook('notebook-id'));
    expect(result.archivedAt).toBe('1792580000000');
    const options = mutateSpy.calls.mostRecent().args[0] as {
      mutation: DocumentNode; variables: unknown
    };
    expect(options.variables).toEqual({ id: 'notebook-id' });
    expect(operationOf(options.mutation).name?.value).toBe('ArchiveLabNotebook');
  });

  it('uses a Delta JSON object for an execution update', async () => {
    const mutateSpy = jasmine.createSpy('mutate').and.returnValue(of({
      data: { updateExperimentExecution: { id: 'run', title: 'E1', status: 'DRAFT' } }
    }));
    const notebook = new NotebookService({ mutate: mutateSpy } as unknown as Apollo);
    const delta = { ops: [{ insert: 'Risultati dell’esperimento\n' }] };
    await firstValueFrom(notebook.updateExecution('run', { contentDelta: delta }));
    expect(mutateSpy.calls.mostRecent().args[0].variables).toEqual({
      input: { id: 'run', contentDelta: delta }
    });
  });

  it('starts an execution through an explicit scientific-domain mutation', async () => {
    const mutateSpy = jasmine.createSpy('mutate').and.returnValue(of({
      data: { startExperimentExecution: { id: 'run', status: 'IN_PROGRESS' } }
    }));
    const notebook = new NotebookService({ mutate: mutateSpy } as unknown as Apollo);
    const result = await firstValueFrom(notebook.startExecution('run'));
    expect(result.status).toBe('IN_PROGRESS');
    expect(operationOf(mutateSpy.calls.mostRecent().args[0].mutation).name?.value)
      .toBe('StartExperimentExecution');
  });
});
