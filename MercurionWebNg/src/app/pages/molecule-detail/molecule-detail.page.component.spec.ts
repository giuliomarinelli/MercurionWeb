import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

import { MoleculeDetailPageComponent } from './molecule-detail.page.component';
import { MoleculeDetailFacade } from './molecule-detail.facade';
import { UserContextService } from '../../services/context/user-context.service';
import { TypeGuardsService } from '../../services/type-guards.service';
import { DesignService } from '../../services/design.service';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';

describe('MoleculeDetailComponent', () => {
  let component: MoleculeDetailPageComponent;
  let fixture: ComponentFixture<MoleculeDetailPageComponent>;
  let similar: WritableSignal<MoleculeSearchResult[]>;
  let currentId: WritableSignal<string>;
  let loading: WritableSignal<boolean>;

  beforeEach(async () => {
    similar = signal<MoleculeSearchResult[]>([]);
    currentId = signal('first-molecule');
    loading = signal(false);
    const facade = {
      molecule$: of(null),
      loading,
      error: signal(false),
      similar,
      similarLoading: signal(false),
      collectionId: signal(''),
      collectionName: signal(null),
      currentId,
      save: jasmine.createSpy('save'),
      delete: jasmine.createSpy('delete'),
      bindCollections: jasmine.createSpy('bindCollections')
    };
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailPageComponent],
      providers: [
        { provide: UserContextService, useValue: { isLoggedIn: () => false } },
        {
          provide: TypeGuardsService,
          useValue: {
            isSystemMolecule: () => false,
            isChemblMolecule: () => false,
            isCustomMolecule: () => false
          }
        },
        {
          provide: DesignService,
          useValue: {
            maxBk: () => signal(false),
            minBk: () => signal(false)
          }
        }
      ]
    })
    .overrideComponent(MoleculeDetailPageComponent, {
      set: {
        providers: [{ provide: MoleculeDetailFacade, useValue: facade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('derives the visible similar molecules without mutating the facade source', () => {
    const known = { known: true } as MoleculeSearchResult;
    const unknown = { known: false } as MoleculeSearchResult;
    similar.set([known, unknown]);

    expect(component.similarMols()).toEqual([known]);
    expect(similar()).toEqual([known, unknown]);

    component.onlyKnown.setValue(false);

    expect(component.similarMols()).toEqual([known, unknown]);
    expect(similar()).toEqual([known, unknown]);
  });

  it('resets the filter on a new molecule while preserving the choice during the current fetch', () => {
    component.onlyKnown.setValue(false);
    fixture.detectChanges();
    expect(component.onlyKnownSig()).toBeFalse();

    loading.set(true);
    fixture.detectChanges();
    loading.set(false);
    fixture.detectChanges();
    expect(component.onlyKnownSig()).toBeFalse();

    currentId.set('second-molecule');
    fixture.detectChanges();
    expect(component.onlyKnown.value).toBeTrue();
    expect(component.onlyKnownSig()).toBeTrue();

    component.onlyKnown.setValue(false);
    fixture.detectChanges();
    expect(component.onlyKnownSig()).toBeFalse();
  });
});
