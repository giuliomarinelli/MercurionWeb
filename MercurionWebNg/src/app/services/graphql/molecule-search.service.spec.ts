import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { firstValueFrom, of } from 'rxjs';

import { MoleculeSearchDocument } from '../../generated/graphql';
import { GRAPHQL_QUERY_FETCH_POLICY } from './graphql-query-policy';
import { MoleculeSearchService } from './molecule-search.service';

describe('MoleculeSearchService', () => {
  let service: MoleculeSearchService;
  let querySpy: jasmine.Spy;

  beforeEach(() => {
    querySpy = jasmine.createSpy('query').and.returnValue(of({
      data: { moleculeSearch: [] }
    }));
    TestBed.configureTestingModule({
      providers: [{
        provide: Apollo,
        useValue: { query: querySpy }
      }]
    });
    service = TestBed.inject(MoleculeSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('refreshes mutable search results with a one-shot network-only query', async () => {
    await expectAsync(firstValueFrom(service.searchMolecule('aspirin', 12)))
      .toBeResolvedTo([]);

    expect(querySpy).toHaveBeenCalledOnceWith({
      query: MoleculeSearchDocument,
      variables: {
        input: {
          query: 'aspirin',
          limit: 12
        }
      },
      fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.mutableSnapshot
    });
    expect(service.loading()).toBeFalse();
    expect(service.results()).toEqual([]);
  });
});
