import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { HistoryComponent } from './history.component';
import { HistoryService } from '../../../services/history.service';
import { of, Subject, throwError } from 'rxjs';
import type { HistoryDTOExt } from '../../../Models/history.models';
import type { PageModel } from '@mercurion/rest-contracts';

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

    fixture.componentRef.setInput('triggerDelete', true);
    fixture.detectChanges();
    tick(); // flush the queued microtask that schedules the 600ms clear-history timeout

    tick(300);
    itemsSetSpy.calls.reset();

    // second trigger before the first 600ms window elapses: must reset, not stack, the timer
    fixture.componentRef.setInput('triggerDelete', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('triggerDelete', true);
    fixture.detectChanges();
    tick();

    tick(300);
    // if the timer had not been reset, the first (t=0) trigger would have fired by t=600 (300+300)
    expect(itemsSetSpy).not.toHaveBeenCalled();

    tick(300);
    expect(itemsSetSpy).toHaveBeenCalledTimes(1);
  }));
});

describe('HistoryComponent request lifecycle', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let getHistory: jasmine.Spy;

  beforeEach(() => {
    getHistory = jasmine.createSpy('getHistory');
    TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [{ provide: HistoryService, useValue: { getHistory } }]
    });
    fixture = TestBed.createComponent(HistoryComponent);
  });

  it('settles a failed request and blocks automatic retries from the sentinel', async () => {
    getHistory.and.returnValue(throwError(() => new Error('offline')));
    await expectAsync(fixture.componentInstance.loadMore()).toBeResolved();
    expect(fixture.componentInstance.serverError()).toBeTrue();
    expect(fixture.componentInstance.loading).toBeFalse();
    await fixture.componentInstance.loadMore();
    expect(getHistory).toHaveBeenCalledTimes(1);
    getHistory.and.returnValue(of({ items: [], currentPage: 1, totalPages: 0 }));
    await fixture.componentInstance.retry();
    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.serverError()).toBeFalse();
  });

  it('cancels history loading and refuses a queued load after destruction', async () => {
    const response = new Subject<PageModel<HistoryDTOExt>>();
    getHistory.and.returnValue(response);
    const pending = fixture.componentInstance.loadMore();
    expect(response.observed).toBeTrue();
    fixture.destroy();
    await pending;
    await fixture.componentInstance.loadMore();
    expect(response.observed).toBeFalse();
    expect(getHistory).toHaveBeenCalledTimes(1);
  });
});
