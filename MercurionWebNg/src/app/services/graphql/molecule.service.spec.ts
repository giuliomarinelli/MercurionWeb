import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { firstValueFrom, of, throwError } from 'rxjs';

import { GetMoleculeDetailDocument } from '../../generated/graphql';
import { GRAPHQL_QUERY_FETCH_POLICY } from './graphql-query-policy';
import { MoleculeService } from './molecule.service';

describe('MoleculeService', () => {
  let service: MoleculeService;
  let querySpy: jasmine.Spy;

  const molecule = {
    id: 42,
    cmbId: 'CHEMBL42',
    preferredName: 'Reference molecule',
    preferredNameIt: null,
    canonicalSmiles: 'CCO',
    moleculeType: 'Small molecule',
    maxPhase: 4,
    naturalProduct: false,
    prodrug: false,
    blackBoxWarning: false,
    synonyms: [],
    administrationRoutes: {
      oral: true,
      parenteral: false,
      topical: false
    },
    properties: {
      mwFreebase: 46.07,
      alogp: null,
      hba: 1,
      hbd: 1,
      psa: 20.2,
      rtb: 0
    }
  };

  beforeEach(() => {
    querySpy = jasmine.createSpy('query').and.returnValue(of({
      data: { moleculeByMolregno: molecule }
    }));
    TestBed.configureTestingModule({
      providers: [{
        provide: Apollo,
        useValue: { query: querySpy }
      }]
    });
    service = TestBed.inject(MoleculeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses a one-shot cache-first read for stable molecule reference data', async () => {
    await expectAsync(firstValueFrom(service.getMoleculeByMolregno('42')))
      .toBeResolvedTo(molecule);

    expect(querySpy).toHaveBeenCalledOnceWith({
      query: GetMoleculeDetailDocument,
      variables: { molregno: '42' },
      fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.stableReference,
      context: {
        credentials: 'include'
      }
    });
  });

  it('propagates a one-shot network failure without retaining a watcher', async () => {
    const networkError = new Error('network unavailable');
    querySpy.and.returnValue(throwError(() => networkError));

    await expectAsync(firstValueFrom(service.getMoleculeByMolregno('42')))
      .toBeRejectedWith(networkError);
    expect(querySpy).toHaveBeenCalledTimes(1);
  });
});
