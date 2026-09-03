import { TestBed } from '@angular/core/testing';
import { Kind, OperationDefinitionNode } from 'graphql';

import { UpdateMoleculeCollectionNameDocument } from '../../generated/graphql';
import { MoleculeCollectionService } from './molecule-collection.service';

describe('MoleculeCollectionService', () => {
  let service: MoleculeCollectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeCollectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps the collection-name mutation field and variables under its semantic operation name', () => {
    const operation = UpdateMoleculeCollectionNameDocument.definitions.find(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION,
    );
    const selectedField = operation?.selectionSet.selections[0];

    expect(operation?.name?.value).toBe('UpdateMoleculeCollectionName');
    expect(operation?.variableDefinitions?.map(
      definition => definition.variable.name.value,
    )).toEqual(['id', 'name']);
    expect(
      selectedField?.kind === Kind.FIELD ? selectedField.name.value : undefined,
    ).toBe('updateMoleculeCollection');
  });
});
