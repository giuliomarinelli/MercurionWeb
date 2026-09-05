import { TestBed } from '@angular/core/testing';

import { ToastContext } from '../Models/toast.models';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    service.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  (['success', 'warn', 'error'] satisfies ToastContext[]).forEach((context) => {
    it(`exposes an immutable ${context} toast state through the compatible public API`, () => {
      service.trigger(`${context} message`, context, 1000);

      expect(service.state()).toEqual({
        phase: 'entering',
        notification: {
          message: `${context} message`,
          context
        }
      });
      expect(service.show()).toBeTrue();
      expect(service.slideIn()).toBeFalse();
      expect(service.message()).toBe(`${context} message`);
      expect(service.context()).toBe(context);
    });
  });

  it('slides in after 30ms and auto-dismisses after the requested duration', () => {
    service.trigger('hello', 'success', 1000);
    expect(service.show()).toBeTrue();
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(30);
    expect(service.slideIn()).toBeTrue();

    jasmine.clock().tick(970);
    expect(service.slideIn()).toBeFalse();
    expect(service.show()).toBeTrue();
    expect(service.state().phase).toBe('leaving');

    jasmine.clock().tick(300);
    expect(service.show()).toBeFalse();
    expect(service.message()).toBe('');
    expect(service.context()).toBe('error');
  });

  it('manual close cancels pending timers and permits a new toast after the exit transition', () => {
    service.trigger('hello', 'error', 5000);
    service.close();

    jasmine.clock().tick(30);
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(270);
    expect(service.show()).toBeFalse();

    service.trigger('again', 'success', 5000);
    jasmine.clock().tick(4700);
    expect(service.show()).toBeTrue();
    expect(service.message()).toBe('again');
  });

  it('does not replace an active toast or reset its timeout', () => {
    service.trigger('first', 'error', 1000);
    jasmine.clock().tick(30);
    expect(service.message()).toBe('first');

    service.trigger('second', 'success', 5000);
    expect(service.message()).toBe('first');
    expect(service.context()).toBe('error');

    jasmine.clock().tick(970);
    expect(service.state().phase).toBe('leaving');
  });

  it('ngOnDestroy clears every pending timer', () => {
    service.trigger('hello', 'error', 5000);
    service.ngOnDestroy();

    jasmine.clock().tick(30);
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(5000);
    expect(service.show()).toBeTrue();
    expect(service.state().phase).toBe('entering');
  });
});