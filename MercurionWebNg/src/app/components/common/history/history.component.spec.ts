import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { HistoryComponent } from './history.component';
import { HistoryService } from '../../../services/history.service';
import { of, Subject, throwError } from 'rxjs';
import type { HistoryDTOExt } from '../../../Models/history.models';
import type { PageModel } from '@mercurion/rest-contracts';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts';
import { HistoryContextService } from '../../../services/context/history-context.service';
import { ScrollContextService } from '../../../services/context/scroll-context.service';

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
    expect(fixture.componentInstance.loading()).toBeFalse();
    await fixture.componentInstance.loadMore();
    expect(getHistory).toHaveBeenCalledTimes(1);
    getHistory.and.returnValue(of({ items: [], currentPage: 1, totalPages: 0 }));
    await fixture.componentInstance.retry();
    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.serverError()).toBeFalse();
  });

  it('renders the next-page spinner from a sentinel callback without forcing change detection', async () => {
    let intersect!: () => void
    spyOn(window, 'IntersectionObserver').and.callFake(function (callback) {
      const observer = {
        observe: (target: Element) => {
          intersect = () => callback([{
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: performance.now(),
          }], observer)
        },
        disconnect: () => undefined,
      } as IntersectionObserver
      return observer
    })
    const first: HistoryDTOExt = {
      id: 'first', itemId: 'first', itemName: 'Prima attività',
      itemEntity: 'molecule_collection_items', flagIds: '{}',
      touchedAt: utcInstantFromEpochMs(Date.parse('2026-10-29T09:00:00Z')),
      selected: signal(false),
    }
    const nextPage = new Subject<PageModel<HistoryDTOExt>>()
    getHistory.and.returnValues(
      of({ items: [first], currentPage: 1, totalPages: 2 }),
      nextPage
    )
    fixture.autoDetectChanges()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).toBeNull()
    intersect()
    await fixture.whenStable()
    expect(getHistory).toHaveBeenCalledWith(2, 25)
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('m-history-item')).not.toBeNull()
    nextPage.next({
      items: [], currentPage: 2, totalPages: 2,
      itemCount: 0, totalItems: 1, itemsPerPage: 25,
    })
    nextPage.complete()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).toBeNull()
  })

  it('restores the current route selection when history is recreated after expanding the rail', () => {
    spyOn(TestBed.inject(ActivatedRoute).root.snapshot.paramMap, 'get')
      .and.callFake(key => key === 'molId' ? 'saved-molecule-id' : null);
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.selectedItemId()).toBe('saved-molecule-id');
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

  it('observes the whole navigation root and disconnects when the rail removes history', fakeAsync(() => {
    const disconnect = jasmine.createSpy('disconnect');
    const observe = jasmine.createSpy('observe');
    let observerRoot: Element | Document | null | undefined;
    spyOn(window, 'IntersectionObserver').and.callFake(function (_callback, options) {
      observerRoot = options?.root;
      return { observe, disconnect } as unknown as IntersectionObserver;
    });
    getHistory.and.returnValue(of({ items: [], currentPage: 1, totalPages: 0 }));
    const navigation = document.createElement('nav');
    navigation.style.overflowY = 'auto';
    document.body.appendChild(navigation);
    navigation.appendChild(fixture.nativeElement);
    try {
      fixture.detectChanges();
      tick(100);
      expect(observerRoot).toBe(navigation);
      expect(observe).toHaveBeenCalledTimes(1);
      expect(getHistory).toHaveBeenCalledOnceWith(1, 25);
      fixture.destroy();
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      navigation.remove();
    }
  }));

  it('scrolls only the navigation after a clicked history item is moved to the rendered head', async () => {
    const item = (id: string): HistoryDTOExt => ({
      id, itemId: id, itemName: id, itemEntity: 'molecule_collection_items', flagIds: '{}',
      touchedAt: utcInstantFromEpochMs(Date.parse('2026-10-23T10:00:00Z')), selected: signal(false)
    });
    const first = item('first');
    const selected = item('selected');
    const update = signal<HistoryDTOExt | null>(null);
    spyOn(TestBed.inject(HistoryContextService), 'newHistoryItem').and.callFake(update);
    const scroll = spyOn(TestBed.inject(ScrollContextService), 'smoothToTop');
    getHistory.and.returnValue(of({ items: [], currentPage: 1, totalPages: 0 }));
    const navigation = document.createElement('nav');
    navigation.style.overflowY = 'auto';
    document.body.appendChild(navigation);
    navigation.appendChild(fixture.nativeElement);
    try {
      fixture.componentInstance.items.set([first, selected]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.handleItemClick('selected');
      fixture.detectChanges();
      expect(scroll).not.toHaveBeenCalled();
      scroll.and.callFake(host => {
        expect(host?.nativeElement).toBe(navigation);
        expect(navigation.querySelector('m-history-item a')?.textContent).toContain('selected');
      });
      update.set(selected);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      expect(scroll).toHaveBeenCalledTimes(1);

      // An unrelated refresh may prepend another item without moving the panel.
      update.set(first);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      expect(scroll).toHaveBeenCalledTimes(1);
    } finally {
      fixture.destroy();
      navigation.remove();
    }
  });
});
