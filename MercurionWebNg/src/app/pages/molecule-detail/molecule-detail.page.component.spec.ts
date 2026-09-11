import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { MoleculeDetailPageComponent } from './molecule-detail.page.component';
import { MoleculeDetailFacade } from './molecule-detail.facade';
import { UserContextService } from '../../services/context/user-context.service';
import { TypeGuardsService } from '../../services/type-guards.service';
import { DesignService } from '../../services/design.service';

describe('MoleculeDetailComponent', () => {
  let component: MoleculeDetailPageComponent;
  let fixture: ComponentFixture<MoleculeDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailPageComponent],
      providers: [
        {
          provide: MoleculeDetailFacade,
          useValue: {
            molecule$: of(null),
            loading: signal(false),
            error: signal(false),
            similar: signal([]),
            collectionId: signal(''),
            collectionName: signal(null),
            currentId: signal(''),
            save: jasmine.createSpy('save'),
            delete: jasmine.createSpy('delete'),
            bindCollections: jasmine.createSpy('bindCollections')
          }
        },
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
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeDetailPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
