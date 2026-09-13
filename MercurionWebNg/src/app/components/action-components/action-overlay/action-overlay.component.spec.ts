import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionOverlayComponent } from './action-overlay.component';
import { ACTION_REGISTRY } from './action-overlay.registry';
import type { ActiveActionScope } from '../../../Models/action/action-overlay.models';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';

@Component({ selector: 'm-test-action', template: 'Azione caricata' })
class TestActionComponent {}

describe('CollectionSaveOverlayComponent', () => {
  let component: ActionOverlayComponent;
  let fixture: ComponentFixture<ActionOverlayComponent>;
  let context: ActionOverlayContextService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionOverlayComponent);
    component = fixture.componentInstance;
    context = TestBed.inject(ActionOverlayContextService);
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

  it('renders a lazy action through the ViewContainerRef host', async () => {
    spyOn(ACTION_REGISTRY.CreateCollection, 'load').and.resolveTo(TestActionComponent);

    context.open('CreateCollection');
    expect(() => fixture.detectChanges()).not.toThrow();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('m-test-action')?.textContent).toContain('Azione caricata');
  });
});
