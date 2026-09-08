import { BrowserResourceOwner } from './browser-resource-owner.util'

describe('BrowserResourceOwner', () => {
  let rafCallbacks: Array<(t: number) => void>
  let rafHandle: number

  beforeEach(() => {
    jasmine.clock().install();
    rafCallbacks = [];
    rafHandle = 0;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb as any);
      return ++rafHandle;
    });
    spyOn(window, 'cancelAnimationFrame').and.callFake(() => { /* no-op tracking not required */ });
  });

  afterEach(() => jasmine.clock().uninstall());

  function flushRaf(time = 0): void {
    const pending = rafCallbacks.splice(0, rafCallbacks.length);
    pending.forEach(cb => cb(time));
  }

  it('should be created', () => {
    expect(new BrowserResourceOwner()).toBeTruthy();
  });

  it('cancels a pending timeout on dispose and never invokes the callback', () => {
    const owner = new BrowserResourceOwner();
    const cb = jasmine.createSpy('cb');
    owner.setTimeout(cb, 100);

    owner.dispose();
    jasmine.clock().tick(200);

    expect(cb).not.toHaveBeenCalled();
    expect(owner.isDisposed).toBeTrue();
  });

  it('cancels a pending interval on dispose and never invokes the callback again', () => {
    const owner = new BrowserResourceOwner();
    const cb = jasmine.createSpy('cb');
    owner.setInterval(cb, 50);

    jasmine.clock().tick(120);
    expect(cb).toHaveBeenCalledTimes(2);

    owner.dispose();
    jasmine.clock().tick(500);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending requestAnimationFrame on dispose and never invokes the callback', () => {
    const owner = new BrowserResourceOwner();
    const cb = jasmine.createSpy('cb');
    owner.requestAnimationFrame(cb);

    owner.dispose();
    flushRaf();

    expect(cb).not.toHaveBeenCalled();
  });

  it('does not schedule new timers/RAF once disposed', () => {
    const owner = new BrowserResourceOwner();
    owner.dispose();

    const timeoutCb = jasmine.createSpy('timeoutCb');
    const rafCb = jasmine.createSpy('rafCb');
    owner.setTimeout(timeoutCb, 0);
    owner.requestAnimationFrame(rafCb);

    jasmine.clock().tick(100);
    flushRaf();

    expect(timeoutCb).not.toHaveBeenCalled();
    expect(rafCb).not.toHaveBeenCalled();
  });

  it('removes a tracked event listener on dispose and stops receiving events', () => {
    const owner = new BrowserResourceOwner();
    const handler = jasmine.createSpy('handler');
    owner.addEventListener(window, 'resize', handler);

    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);

    owner.dispose();
    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('bounds waitForCondition and calls onExhausted instead of polling forever', () => {
    const owner = new BrowserResourceOwner();
    const onReady = jasmine.createSpy('onReady');
    const onExhausted = jasmine.createSpy('onExhausted');

    owner.waitForCondition(() => false, onReady, { maxAttempts: 3, onExhausted });

    // Drain well past the bounded attempt count; no infinite scheduling can occur.
    for (let i = 0; i < 5; i++) flushRaf();

    expect(onReady).not.toHaveBeenCalled();
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.length).toBe(0);
  });

  it('waitForCondition resolves as soon as the predicate becomes truthy', () => {
    const owner = new BrowserResourceOwner();
    let ready = false;
    const onReady = jasmine.createSpy('onReady');

    owner.waitForCondition(() => (ready ? 'target' : false), onReady, { maxAttempts: 10 });

    flushRaf();
    expect(onReady).not.toHaveBeenCalled();

    ready = true;
    flushRaf();

    expect(onReady).toHaveBeenCalledWith('target');
    expect(rafCallbacks.length).toBe(0);
  });

  it('a disposed/superseded owner never mutates state from a stale callback', () => {
    const owner = new BrowserResourceOwner();
    const state = { value: 0 };

    owner.setTimeout(() => { state.value = 1; }, 10);
    owner.requestAnimationFrame(() => { state.value = 2; });

    owner.dispose();
    jasmine.clock().tick(50);
    flushRaf();

    expect(state.value).toBe(0);
  });
});
