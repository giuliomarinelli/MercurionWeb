import { Apollo } from 'apollo-angular';
import { DocumentNode, Kind, OperationDefinitionNode } from 'graphql';
import { firstValueFrom, Observable, of } from 'rxjs';
import type {
  DeleteChapterMutationVariables,
  DeleteLabNotebookMutationVariables,
  DeleteSectionMutationVariables,
} from '../../generated/graphql';
import { NotebookService } from './notebook.service';

describe('NotebookService', () => {
  let service: NotebookService;
  let mutateSpy: jasmine.Spy;

  beforeEach(() => {
    mutateSpy = jasmine.createSpy('mutate').and.returnValue(of({
      data: {
        deleteLabNotebook: true,
        deleteChapter: true,
        deleteSection: true,
      },
    }));
    service = new NotebookService({ mutate: mutateSpy } as unknown as Apollo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  const deleteCases: ReadonlyArray<{
    label: string;
    operationName: string;
    fieldName: string;
    execute: (notebookService: NotebookService, id: string) => Observable<boolean>;
  }> = [
    {
      label: 'notebook',
      operationName: 'DeleteLabNotebook',
      fieldName: 'deleteLabNotebook',
      execute: (notebookService, id) => notebookService.deleteNotebook(id),
    },
    {
      label: 'chapter',
      operationName: 'DeleteChapter',
      fieldName: 'deleteChapter',
      execute: (notebookService, id) => notebookService.deleteChapter(id),
    },
    {
      label: 'section',
      operationName: 'DeleteSection',
      fieldName: 'deleteSection',
      execute: (notebookService, id) => notebookService.deleteSection(id),
    },
  ];

  for (const deleteCase of deleteCases) {
    it(`executes the ${deleteCase.label} delete with an ID! string variable`, async () => {
      const id = '01990f17-0ff8-7b75-83d7-2c995ae7e2b1';

      await expectAsync(firstValueFrom(deleteCase.execute(service, id)))
        .toBeResolvedTo(true);

      expect(mutateSpy).toHaveBeenCalledOnceWith(jasmine.objectContaining({
        variables: { id },
      }));

      const mutation = mutateSpy.calls.mostRecent().args[0].mutation as DocumentNode;
      const operation = mutation.definitions.find(
        (definition): definition is OperationDefinitionNode =>
          definition.kind === Kind.OPERATION_DEFINITION,
      );
      const variableDefinition = operation?.variableDefinitions?.[0];
      const selectedField = operation?.selectionSet.selections[0];

      expect(operation?.name?.value).toBe(deleteCase.operationName);
      expect(variableDefinition?.variable.name.value).toBe('id');
      expect(variableDefinition?.type.kind).toBe(Kind.NON_NULL_TYPE);
      expect(
        variableDefinition?.type.kind === Kind.NON_NULL_TYPE
          && variableDefinition.type.type.kind === Kind.NAMED_TYPE
          ? variableDefinition.type.type.name.value
          : undefined,
      ).toBe('ID');
      expect(
        selectedField?.kind === Kind.FIELD ? selectedField.name.value : undefined,
      ).toBe(deleteCase.fieldName);
    });
  }

  it('keeps generated delete argument types compatible with string UUID values', () => {
    const id = '01990f17-0ff8-7b75-83d7-2c995ae7e2b1';
    const generatedVariables: [
      DeleteLabNotebookMutationVariables,
      DeleteChapterMutationVariables,
      DeleteSectionMutationVariables,
    ] = [{ id }, { id }, { id }];

    expect(generatedVariables.map(variables => variables.id))
      .toEqual([id, id, id]);
  });
});
