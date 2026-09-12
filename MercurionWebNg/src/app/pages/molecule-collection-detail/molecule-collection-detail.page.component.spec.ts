import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionDetailPageComponent } from './molecule-collection-detail.page.component';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { signal } from '@angular/core';

describe('MoleculeCollectionDetailComponent', () => {
  let component: MoleculeCollectionDetailPageComponent;
  let fixture: ComponentFixture<MoleculeCollectionDetailPageComponent>;

  beforeEach(async () => {
    const facade = {
      collectionId: signal('collection-1'),
      collectionName: signal('Test collection'),
      search: signal(''),
      items: signal([]),
      loading: signal(false),
      error: signal(false),
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
      loadMore: jasmine.createSpy()
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
});
