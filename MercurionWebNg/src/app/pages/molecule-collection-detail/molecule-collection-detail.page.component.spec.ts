import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionDetailPageComponent } from './molecule-collection-detail.page.component';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { signal } from '@angular/core';

describe('MoleculeCollectionDetailComponent', () => {
  let component: MoleculeCollectionDetailPageComponent;
  let fixture: ComponentFixture<MoleculeCollectionDetailPageComponent>;

  beforeEach(async () => {
    const facade = {
      renamePending: signal(false), renameError: signal(''), renameRevision: signal(0),
      actionPending: signal(false), actionError: signal(''), retryCollection: jasmine.createSpy(),
      collectionId: signal('collection-1'),
      collectionName: signal('Test collection'),
      search: signal(''),
      items: signal([]),
      loading: signal(false),
      error: signal(false),
      pageError: signal(undefined),
      done: signal(true),
      state: signal('empty'),
      renameCollection: jasmine.createSpy(),
      duplicateCollection: jasmine.createSpy(),
      deleteCollection: jasmine.createSpy(),
      addToCollection: jasmine.createSpy(),
      setSearch: jasmine.createSpy(),
      clearSearch: jasmine.createSpy(),
      deleteItem: jasmine.createSpy(),
      removeItem: jasmine.createSpy(),
      loadMore: jasmine.createSpy(),
      retryPage: jasmine.createSpy()
    };
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionDetailPageComponent]
    }).overrideComponent(MoleculeCollectionDetailPageComponent, {
      set: { providers: [{ provide: MoleculeCollectionDetailFacade, useValue: facade }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('requires an explicit confirmation and cancel never deletes', () => {
    component.ask('collection'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('presenti soltanto in questa collezione');
    expect(component.facade.deleteCollection).not.toHaveBeenCalled();
    component.cancelConfirmation();
    expect(component.confirmation()).toBeNull();
    expect(component.facade.deleteCollection).not.toHaveBeenCalled();
  });
  it('keeps the confirmation available when a mutation fails', async () => {
    (component.facade.deleteCollection as jasmine.Spy).and.resolveTo(false);
    component.ask('collection'); await component.confirm();
    expect(component.confirmation()).not.toBeNull();
  });
  it('dismisses only after successful mutation', async () => {
    (component.facade.deleteCollection as jasmine.Spy).and.resolveTo(true);
    component.ask('collection'); await component.confirm();
    expect(component.confirmation()).toBeNull();
  });
});
