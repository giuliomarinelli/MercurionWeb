import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('ActionOverlayContextService', () => {
  let service: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionOverlayContextService);
  });

  it('opens only after its animation delay and closes through the animation lifecycle', fakeAsync(() => {
    service.open('CreateCollection');
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'opening', scope: 'CreateCollection' }));
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeFalse();

    tick(10);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'CreateCollection' }));
    expect(service.isVisible()).toBeTrue();

    service.close();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'closing', scope: 'CreateCollection' }));
    tick(300);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'settling', scope: 'CreateCollection' }));
    expect(service.isMounted()).toBeFalse();
    tick(200);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'closed' }));
    expect(service.scope()).toBe('');
  }));

  it('cancels stale close timers when a new scope opens', fakeAsync(() => {
    service.open('CreateCollection');
    tick(10);
    service.close();
    tick(100);
    service.open('AddMoleculesToCollection', { collectionId: 'col-1', redirectToCollectionPath: false, importFromChembl: false });
    tick(10);
    tick(500);

    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'AddMoleculesToCollection' }));
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
  }));

  it('models submit results and ignores repeated or stale result events', fakeAsync(() => {
    const id = service.open('CreateCollection');
    tick(10);
    service.beginSubmit(id);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'submitting' }));
    service.beginSubmit(id);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'submitting' }));
    service.submitFailed(id);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'failed' }));
    service.submitSucceeded(id);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'failed' }));
    service.beginSubmit(id);
    service.submitSucceeded(id);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'succeeded' }));
  }));

  it('cancels a pending submission and accepts a new action without stale state', fakeAsync(() => {
    const firstId = service.open('CreateCollection');
    tick(10);
    service.beginSubmit(firstId);
    service.cancel(firstId);
    const secondId = service.open('TicketDetail', { ticketId: 't-1', innerScope: 'User' });
    tick(10);

    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));
    service.submitSucceeded(secondId);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));
  }));

  it('gives every open a fresh session id and typed immutable input even for the same scope', fakeAsync(() => {
    const first = service.open('BindCollectionsToMolecule', { moleculeId: 'mol-1' });
    tick(10);
    expect(service.session('BindCollectionsToMolecule')).toEqual({
      id: first,
      scope: 'BindCollectionsToMolecule',
      input: { moleculeId: 'mol-1' }
    });

    service.close(first);
    tick(500);

    const second = service.open('BindCollectionsToMolecule', { moleculeId: 'mol-2' });
    tick(10);

    expect(second).not.toBe(first);
    expect(service.session('BindCollectionsToMolecule')).toEqual({
      id: second,
      scope: 'BindCollectionsToMolecule',
      input: { moleculeId: 'mol-2' }
    });
  }));

  it('never leaks a previous opening payload/pending/result state into a later opening', fakeAsync(() => {
    const first = service.open('SensitiveDataChange', { innerScope: 'ChangeEmail' });
    tick(10);
    service.beginSubmit(first);
    service.submitFailed(first);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'failed', scope: 'SensitiveDataChange' }));

    service.close(first);
    tick(500);

    const second = service.open('SensitiveDataChange', { innerScope: 'ChangePassword' });
    tick(10);

    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'SensitiveDataChange' }));
    expect(service.session('SensitiveDataChange')?.input).toEqual({ innerScope: 'ChangePassword' });
  }));

  it('rejects a late close/result from a stale session id and keeps the current session intact', fakeAsync(() => {
    const staleId = service.open('CreateCollection');
    tick(10);
    service.beginSubmit(staleId);

    // The user cancels before the in-flight request settles; a new, unrelated action opens.
    service.cancel(staleId);
    const currentId = service.open('TicketDetail', { ticketId: 't-9', innerScope: 'Support' });
    tick(10);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));

    // Late completion belonging to the stale session must not mutate the current one.
    service.submitSucceeded(staleId);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));

    service.close(staleId);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));

    // The real owner of the current session can still close it.
    service.close(currentId);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'closing', scope: 'TicketDetail' }));
  }));

  it('rejects a stale beginSubmit from a session whose generation has already moved on', fakeAsync(() => {
    const first = service.open('CreateCollection');
    tick(10);
    service.close(first);
    const second = service.open('CreateCollection');
    tick(10);

    // A delayed action bound to the first (already-closed) session tries to submit.
    service.beginSubmit(first);
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'CreateCollection', generation: second }));
  }));
});
