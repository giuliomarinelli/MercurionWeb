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
    service.open('AddMoleculesToCollection');
    tick(10);
    tick(500);

    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'AddMoleculesToCollection' }));
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
  }));

  it('models submit results and ignores repeated or stale result events', fakeAsync(() => {
    service.open('CreateCollection');
    tick(10);
    service.beginSubmit();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'submitting' }));
    service.beginSubmit();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'submitting' }));
    service.submitFailed();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'failed' }));
    service.submitSucceeded();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'failed' }));
    service.beginSubmit();
    service.submitSucceeded();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'succeeded' }));
  }));

  it('cancels a pending submission and accepts a new action without stale state', fakeAsync(() => {
    service.open('CreateCollection');
    tick(10);
    service.beginSubmit();
    service.cancel();
    service.open('TicketDetail');
    tick(10);

    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));
    service.submitSucceeded();
    expect(service.state()).toEqual(jasmine.objectContaining({ phase: 'active', scope: 'TicketDetail' }));
  }));
});
