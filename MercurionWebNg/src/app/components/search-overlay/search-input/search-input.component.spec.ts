import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { SearchInputComponent } from './search-input.component';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';

describe('SearchInputComponent', () => {
  let component: SearchInputComponent;
  let fixture: ComponentFixture<SearchInputComponent>;
  let requests: Subject<unknown>[];
  let results: unknown[];

  beforeEach(async () => {
    requests = [];
    results = [];

    await TestBed.configureTestingModule({
      imports: [SearchInputComponent],
      providers: [
        {
          provide: MoleculeCollectionItemService,
          useValue: {
            searchChemblMolecules_excludeAlreadyAdded: () => {
              const request = new Subject<unknown>();
              requests.push(request);
              return request;
            }
          }
        },
        {
          provide: AddMoleculesToCollectionContextService,
          useValue: { collectionId: () => 'collection-1' }
        },
        {
          provide: MoleculeSearchService,
          useValue: { searchMolecule: () => new Subject<unknown>() }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchInputComponent);
    component = fixture.componentInstance;
    component.onResult.subscribe(result => results.push(result));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses latest-wins search requests so a stale response cannot replace newer results', async () => {
    component.search_excludeAlreadyAdded = true;

    component['query'].set('first');
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 310));
    component['query'].set('second');
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 310));

    expect(requests.length).toBe(2);
    requests[0].next(['stale']);
    requests[1].next(['current']);

    expect(results).toEqual([['current']]);
  });
});
