import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CollectionPickerFacade } from './collection-picker.facade';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';

describe('CollectionPickerFacade', () => {
  const first = { id: 'one', name: 'One' } as any;
  const second = { id: 'two', name: 'Two' } as any;
  let service: jasmine.SpyObj<MoleculeCollectionService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<MoleculeCollectionService>('MoleculeCollectionService', [
      'getPaginatedCollections',
      'createCollection'
    ]);
    service.getPaginatedCollections.and.returnValue(of({
      items: [first, second, first],
      currentPage: 1,
      totalPages: 2
    } as any));
    TestBed.configureTestingModule({
      providers: [{ provide: MoleculeCollectionService, useValue: service }]
    });
  });

  it('keeps single selection identity across refreshes and prevents duplicate rows', () => {
    const facade = TestBed.runInInjectionContext(() => new CollectionPickerFacade({
      mode: { kind: 'single', operation: 'route', allowCreate: true }
    }));

    facade.setSingleSelection('one');
    facade.load(true);

    expect(facade.collections().map(item => item.id)).toEqual(['one', 'two']);
    expect(facade.selected().ids).toEqual(['one']);
    expect(service.getPaginatedCollections).toHaveBeenCalledWith(1, 12, '', false, null);
  });

  it('represents explicit multi select-all exclusions without leaking selections', () => {
    const facade = TestBed.runInInjectionContext(() => new CollectionPickerFacade({
      mode: { kind: 'multi', operation: 'bind', moleculeId: 'molecule-1' },
      initialSelection: ['one']
    }));

    facade.selectAllVisible();
    facade.toggle('two', false);

    expect(facade.selected().selectAll).toBeTrue();
    expect(facade.selected().excludedIds).toEqual(['two']);
    expect(service.getPaginatedCollections).not.toHaveBeenCalled();
  });

  it('tears down in-flight streams and keeps caller mutations outside the picker', () => {
    const created = { id: 'three', name: 'Three' } as any;
    service.createCollection.and.returnValue(of(created));
    const facade = TestBed.runInInjectionContext(() => new CollectionPickerFacade({
      mode: { kind: 'single', operation: 'save', allowCreate: true }
    }));

    facade.create('Three').subscribe();

    expect(facade.selected().ids).toEqual(['three']);
    expect(service.createCollection).toHaveBeenCalledWith('Three');
  });
});

