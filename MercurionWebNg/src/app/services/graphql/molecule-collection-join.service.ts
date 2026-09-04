import { Helpers } from './../../helpers';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { AddChemblMoleculeToCollectionInput, AddCustomMoleculeToCollectionInput } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { extractGqlData } from './graphql-helpers/v1/extract-gql-data.helper';
import {
  AddChemblMoleculeToCollectionDocument,
  AddChemblMoleculeToCollectionMutation,
  AddChemblMoleculeToCollectionMutationVariables,
  AddCustomMoleculeToCollectionDocument,
  AddCustomMoleculeToCollectionMutation,
  AddCustomMoleculeToCollectionMutationVariables,
  RemoveChemblMoleculeFromCollectionDocument,
  RemoveChemblMoleculeFromCollectionMutation,
  RemoveChemblMoleculeFromCollectionMutationVariables,
  RemoveCustomMoleculeFromCollectionDocument,
  RemoveCustomMoleculeFromCollectionMutation,
  RemoveCustomMoleculeFromCollectionMutationVariables
} from '../../generated/graphql';

// --- MoleculeJoinService ---
@Injectable({ providedIn: 'root' })
export class MoleculeJoinService {
  constructor(private apollo: Apollo) { }

  // Aggiungi Chembl
  addChemblMoleculeToCollection(
    params: AddChemblMoleculeToCollectionInput
  ): Observable<AddChemblMoleculeToCollectionMutation['addChemblMoleculeToCollection']> {
    return this.apollo
      .mutate<AddChemblMoleculeToCollectionMutation, AddChemblMoleculeToCollectionMutationVariables>({
        mutation: AddChemblMoleculeToCollectionDocument,
        variables: params })
      .pipe(map(res => extractGqlData<AddChemblMoleculeToCollectionMutation, 'addChemblMoleculeToCollection'>(res, 'addChemblMoleculeToCollection')));
  }

  // Aggiungi Custom (ritorna già il campo properties parsato)
  addCustomMoleculeToCollection(params: AddCustomMoleculeToCollectionInput) {
    return this.apollo
      .mutate<AddCustomMoleculeToCollectionMutation, AddCustomMoleculeToCollectionMutationVariables>({
        mutation: AddCustomMoleculeToCollectionDocument,
        variables: params })
      .pipe(
        map(res => extractGqlData<AddCustomMoleculeToCollectionMutation, 'addCustomMoleculeToCollection'>(res, 'addCustomMoleculeToCollection')),
        map((entity) => ({
          ...entity,
          properties: Helpers.parseMoleculeProperties(entity.propertiesJson)
        }))
      )
  }

  // Rimuovi Chembl
  removeChemblMoleculeFromCollection(collectionId: string, itemId: string): Observable<boolean> {
    return this.apollo
      .mutate<RemoveChemblMoleculeFromCollectionMutation, RemoveChemblMoleculeFromCollectionMutationVariables>({
        mutation: RemoveChemblMoleculeFromCollectionDocument,
        variables: { collectionId, itemId } })
      .pipe(map(res => extractGqlData<RemoveChemblMoleculeFromCollectionMutation, 'removeChemblMoleculeFromCollection'>(res, 'removeChemblMoleculeFromCollection')))
  }

  // Rimuovi Custom
  removeCustomMoleculeFromCollection(collectionId: string, itemId: string): Observable<boolean> {
    return this.apollo
      .mutate<RemoveCustomMoleculeFromCollectionMutation, RemoveCustomMoleculeFromCollectionMutationVariables>({
        mutation: RemoveCustomMoleculeFromCollectionDocument,
        variables: { collectionId, itemId } })
      .pipe(map(res => extractGqlData<RemoveCustomMoleculeFromCollectionMutation, 'removeCustomMoleculeFromCollection'>(res, 'removeCustomMoleculeFromCollection')));
  }
}
