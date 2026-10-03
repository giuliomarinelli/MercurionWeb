import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, of } from 'rxjs';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';

import { AddMoleculesToCollectionComponent } from './add-molecules-to-collection.component';

describe('AddMoleculesToCollectionComponent', () => {
  let component: AddMoleculesToCollectionComponent;
  let fixture: ComponentFixture<AddMoleculesToCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMoleculesToCollectionComponent],
      providers: [
        { provide: AddMoleculesToCollectionContextService, useValue: {
          collectionId: signal('collection-1'), importFromChembl: signal(false)
        } },
        { provide: MoleculeCollectionService, useValue: {
          getCollectionById: () => of({ id: 'collection-1', name: 'Test' })
        } },
        { provide: MoleculeCollectionItemService, useValue: {
          getAllPaginatedItems: () => NEVER
        } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMoleculesToCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets selection once per radio change without tracking the rows it resets', fakeAsync(() => {
    flushMicrotasks();
    const reset = spyOn(component, 'clearSelections').and.callThrough();
    component.methodControl.setValue('chembl');
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    expect(component.method()).toBe('chembl');
    expect(reset).toHaveBeenCalledTimes(1);

    component.multiselectItems.set([]);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    expect(reset).toHaveBeenCalledTimes(1);

    component.methodControl.setValue('my');
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    expect(reset).toHaveBeenCalledTimes(2);
  }));
});
