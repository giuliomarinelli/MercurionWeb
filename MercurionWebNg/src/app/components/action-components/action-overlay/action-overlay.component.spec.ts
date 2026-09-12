import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionOverlayComponent } from './action-overlay.component';
import { ACTION_REGISTRY } from './action-overlay.registry';
import type { ActiveActionScope } from '../../../Models/action/action-overlay.models';

describe('CollectionSaveOverlayComponent', () => {
  let component: ActionOverlayComponent;
  let fixture: ComponentFixture<ActionOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps one exhaustive definition for every active action scope', () => {
    const scopes: ActiveActionScope[] = [
      'MoleculeCollectionItemSave',
      'AddMoleculesToCollection',
      'CreateCollection',
      'BindCollectionsToMolecule',
      'SensitiveDataChange',
      'EssentialProfileRegistryEdit',
      'TicketDetail',
      'NewTicket',
      'SelectCollectionThenRoute'
    ];

    expect(Object.keys(ACTION_REGISTRY).sort()).toEqual([...scopes].sort());
    scopes.forEach((scope) => {
      expect(ACTION_REGISTRY[scope].label).toBeTruthy();
      expect(ACTION_REGISTRY[scope].load).toEqual(jasmine.any(Function));
    });
  });
});
