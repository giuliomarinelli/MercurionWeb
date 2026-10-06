import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { CreateCollectionComponent } from './create-collection.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';

describe('CreateCollectionComponent', () => {
  let component: CreateCollectionComponent;
  let fixture: ComponentFixture<CreateCollectionComponent>;
  let request: Subject<unknown>;
  let create: jasmine.Spy;
  const overlay = { session: () => ({ id: 42 }), close: jasmine.createSpy('close'), beginSubmit: jasmine.createSpy('beginSubmit'), submitSucceeded: jasmine.createSpy('submitSucceeded'), submitFailed: jasmine.createSpy('submitFailed') };
  const invalidation = { publish: jasmine.createSpy('publish') };
  const toast = { trigger: jasmine.createSpy('trigger') };
  beforeEach(async () => {
    request = new Subject();
    create = jasmine.createSpy('createManyCollections').and.returnValue(request);
    overlay.close.calls.reset();
    invalidation.publish.calls.reset();
    toast.trigger.calls.reset();
    await TestBed.configureTestingModule({ imports: [CreateCollectionComponent], providers: [
      { provide: ActionOverlayContextService, useValue: overlay },
      { provide: MoleculeCollectionService, useValue: { createManyCollections: create } },
      { provide: ToastService, useValue: toast },
      { provide: DomainInvalidationService, useValue: invalidation }
    ] }).compileComponents();
    fixture = TestBed.createComponent(CreateCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('updates duplicate feedback when a queued name is removed', () => {
    component.onAddNewName('Riferimenti');
    component.nameControl.setValue('Riferimenti');
    expect(component.validation().code).toBe('duplicate');
    component.removeChip('Riferimenti');
    expect(component.canAddName()).toBeTrue();
    expect(component.validation().message).toBeNull();
  });
  it('keeps the draft idle and all description references present', () => {
    component.onAddNewName('Riferimenti');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section.m-action-card').getAttribute('aria-busy')).toBeNull();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.getAttribute('aria-describedby')!.split(' ').forEach(id => expect(fixture.nativeElement.querySelector('#' + id)).not.toBeNull());
  });
  it('locks edits and prevents repeated submissions while pending', () => {
    component.onAddNewName('Riferimenti');
    component.doSubmit();
    component.doSubmit();
    component.onAddNewName('Altra');
    component.removeChip('Riferimenti');
    component.clearChips();
    component.close();
    fixture.detectChanges();
    expect(create).toHaveBeenCalledOnceWith(['Riferimenti']);
    expect(component.selectedChips()).toEqual(['Riferimenti']);
    expect(component.nameControl.disabled).toBeTrue();
    expect(overlay.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('section.m-action-card').getAttribute('aria-busy')).toBe('true');
  });
  it('does not discard a name that has not been added to the list', () => {
    component.onAddNewName('Riferimenti');
    component.nameControl.setValue('Da aggiungere');
    component.doSubmit();
    expect(create).not.toHaveBeenCalled();
    expect(component.name()).toBe('Da aggiungere');
  });
  it('preserves names after an error and allows retry', () => {
    component.onAddNewName('Riferimenti');
    component.doSubmit();
    request.error(new Error('network'));
    fixture.detectChanges();
    expect(overlay.close).not.toHaveBeenCalled();
    expect(component.selectedChips()).toEqual(['Riferimenti']);
    expect(component.nameControl.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('I nomi sono conservati');
    create.and.returnValue(new Subject());
    component.doSubmit();
    expect(create.calls.count()).toBe(2);
    expect(component.submissionError()).toBe('');
  });
  it('invalidates collections and closes the correct session after success', () => {
    component.onAddNewName('Riferimenti');
    component.doSubmit();
    request.next({});
    expect(invalidation.publish).toHaveBeenCalledOnceWith({ domain: 'molecule-collection', action: 'created' });
    expect(overlay.close).toHaveBeenCalledOnceWith(42);
    expect(toast.trigger).toHaveBeenCalledOnceWith('Collezione creata con successo.', 'success', 3000);
  });
});
