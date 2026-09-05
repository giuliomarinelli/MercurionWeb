import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clears any pending clear-history timeout on destroy (no stale mutation after teardown)', () => {
    const c = component as any;
    jasmine.clock().install();
    try {
      const itemsSetSpy = spyOn(component.items, 'set').and.callThrough();
      c.deleteTimeoutId = setTimeout(() => c.items.set([]), 600);

      fixture.destroy();
      jasmine.clock().tick(600);

      expect(itemsSetSpy).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('a rapid second triggerDelete resets the pending clear-history timer instead of firing it twice', fakeAsync(() => {
    const itemsSetSpy = spyOn(component.items, 'set').and.callThrough();

    component.triggerDelete = true;
    fixture.detectChanges();
    tick(); // flush the queued microtask that schedules the 600ms clear-history timeout

    tick(300);
    itemsSetSpy.calls.reset();

    // second trigger before the first 600ms window elapses: must reset, not stack, the timer
    component.triggerDelete = true;
    fixture.detectChanges();
    tick();

    tick(300);
    // if the timer had not been reset, the first (t=0) trigger would have fired by t=600 (300+300)
    expect(itemsSetSpy).not.toHaveBeenCalled();

    tick(300);
    expect(itemsSetSpy).toHaveBeenCalledTimes(1);
  }));
});