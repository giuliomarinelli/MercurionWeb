import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('adds a toast with its message, variant, duration, and generated id', () => {
    const id = service.trigger('hello', 'success', 1000);

    expect(service.messages()).toEqual([
      jasmine.objectContaining({
        id,
        message: 'hello',
        variant: 'success',
        durationMs: 1000,
      }),
    ]);
  });

  it('prepends newer toasts to the current messages', () => {
    service.trigger('first', 'error', 0);
    service.trigger('second', 'warn', 0);

    expect(service.messages().map(({ message }) => message)).toEqual(['second', 'first']);
  });

  it('auto-dismisses a toast after its requested duration', () => {
    const id = service.trigger('hello', 'error', 1000);

    jasmine.clock().tick(999);
    expect(service.messages().some((toast) => toast.id === id)).toBeTrue();

    jasmine.clock().tick(1);
    expect(service.messages()).toEqual([]);
  });

  it('close(id) removes only the requested toast and cancels its timer', () => {
    const firstId = service.trigger('first', 'error', 1000);
    const secondId = service.trigger('second', 'success', 2000);

    service.close(firstId);
    jasmine.clock().tick(1000);

    expect(service.messages().map(({ id }) => id)).toEqual([secondId]);
  });

  it('does not schedule an auto-dismiss timer for a non-positive duration', () => {
    service.trigger('hello', 'warn', 0);

    jasmine.clock().tick(5000);

    expect(service.messages()).toHaveSize(1);
  });

  it('ngOnDestroy clears pending timers', () => {
    service.trigger('hello', 'error', 5000);
    service.ngOnDestroy();

    jasmine.clock().tick(5000);

    expect(service.messages()).toHaveSize(1);
  });
});
