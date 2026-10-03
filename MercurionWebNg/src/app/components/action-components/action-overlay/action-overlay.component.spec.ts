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
    const panel = fixture.nativeElement.querySelector('[role="dialog"] > div > div') as HTMLElement;
    expect(panel.classList).toContain('bg-transparent');
    expect(panel.classList).toContain('overflow-visible');
  });

  it('exposes loading and error states for a failed action load', async () => {
    let rejectLoad!: (error: unknown) => void;
    spyOn(ACTION_REGISTRY.CreateCollection, 'load').and.returnValue(
      new Promise<never>((_, reject) => {
        rejectLoad = reject;
      }),
    );

    context.open('CreateCollection');
    await new Promise(resolve => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('m-progress-indicator')).not.toBeNull();

    rejectLoad(new Error('load failed'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Impossibile caricare questa azione');
  });

  it('keeps the mounted action when only the session phase changes', async () => {
    const load = spyOn(ACTION_REGISTRY.CreateCollection, 'load').and.resolveTo(TestActionComponent);
    const session = context.open('CreateCollection');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const action = fixture.nativeElement.querySelector('m-test-action');
    context.beginSubmit(session);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-test-action')).toBe(action);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous action visible until the next action finishes loading', async () => {
    spyOn(ACTION_REGISTRY.CreateCollection, 'load').and.resolveTo(TestActionComponent);
    context.open('CreateCollection');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    let resolveLoad!: (component: typeof TestActionComponent) => void;
    spyOn(ACTION_REGISTRY.SelectCollectionThenRoute, 'load').and.returnValue(new Promise(resolve => {
      resolveLoad = resolve;
    }));
    context.switchToScope('SelectCollectionThenRoute', { importFromChembl: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-test-action')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Caricamento azione');
    resolveLoad(TestActionComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('m-test-action').length).toBe(1);
  });
});
