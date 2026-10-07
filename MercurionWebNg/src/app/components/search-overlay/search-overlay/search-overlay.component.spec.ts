import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import { Subject } from 'rxjs';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';

import { SearchOverlayComponent } from './search-overlay.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SearchResultComponent } from '../search-result/search-result.component';
import { MoleculeSummaryCardComponent } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.component';
import { HeaderComponent } from '../../common/header/header.component';
import { InAppNotificationService } from '../../../services/in-app-notification.service';
import { Helpers } from '../../../helpers';
import { Router } from '@angular/router';

describe('SearchOverlayComponent', () => {
  let component: SearchOverlayComponent;
  let fixture: ComponentFixture<SearchOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchOverlayComponent, HeaderComponent],
      providers: [{ provide: InAppNotificationService, useValue: {
        unreadCount: signal(0), catchUpCount: signal(0),
        dismissCatchUp: jasmine.createSpy(), acknowledgeCatchUpPresented: jasmine.createSpy()
      } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('disconnects the IntersectionObserver on destroy (no leaked observer)', () => {
    const observer = (component as any).observer as IntersectionObserver | undefined;
    expect(observer).toBeTruthy();

    const disconnectSpy = spyOn(observer as IntersectionObserver, 'disconnect').and.callThrough();

    fixture.destroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes any pending chembl/my-molecules search subscription on destroy', () => {
    const c = component as any;
    c.chemblSub = { unsubscribe: jasmine.createSpy('unsubscribeChembl') };
    c.mySub = { unsubscribe: jasmine.createSpy('unsubscribeMy') };

    fixture.destroy();

    expect(c.chemblSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(c.mySub.unsubscribe).toHaveBeenCalledTimes(1);
  });

  function openSidebar(): ComponentFixture<HeaderComponent> {
    const header = TestBed.createComponent(HeaderComponent);
    header.detectChanges();
    (header.nativeElement.querySelector('button[aria-label="Apri o chiudi menu laterale"]') as HTMLButtonElement).click();
    header.detectChanges();
    expect(header.componentInstance['offCanvasMenuOpen']()).toBeTrue();
    return header;
  }

  it('closes search and sidebar on a ChEMBL card click even without a new route', fakeAsync(() => {
    const header = openSidebar();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(false);
    const search = TestBed.inject(SearchContextService);
    search.open();
    fixture.detectChanges();
    component.chemblResults.set([{
      id: 1,
      smiles: 'C',
      preferredName: 'Test molecule',
      synonyms: []
    } as any]);
    fixture.detectChanges();

    const result = fixture.debugElement.query(By.directive(SearchResultComponent));
    expect(result).toBeTruthy();
    (result.nativeElement.querySelector('a') as HTMLAnchorElement).click();
    header.detectChanges();
    flushMicrotasks();
    header.detectChanges();

    expect(search.isOpenedSearchOverlay()).toBeFalse();
    expect(header.componentInstance['offCanvasMenuOpen']()).toBeFalse();
    tick(350);
    header.destroy();
  }));

  it('closes search and sidebar on a saved card click even without a new route', fakeAsync(() => {
    const header = openSidebar();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(false);
    const search = TestBed.inject(SearchContextService);
    search.open();
    fixture.detectChanges();
    component['_viewMode'].set('my');
    component.myItems.set([{
      id: 'saved-1',
      type: 'custom',
      name: 'Saved molecule',
      syn: '',
      smiles: 'C',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      touchedAt: Date.now(),
      triggerDisappear: signal(false),
      collapse: signal(false)
    }]);
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(MoleculeSummaryCardComponent));
    expect(card).toBeTruthy();
    (card.nativeElement.querySelector('a') as HTMLAnchorElement).click();
    header.detectChanges();
    flushMicrotasks();
    header.detectChanges();

    expect(search.isOpenedSearchOverlay()).toBeFalse();
    expect(header.componentInstance['offCanvasMenuOpen']()).toBeFalse();
    tick(350);
    header.destroy();
  }));

  it('preserves the sidebar when the user dismisses search without choosing a result', fakeAsync(() => {
    const header = openSidebar();
    const search = TestBed.inject(SearchContextService);
    search.open();
    fixture.detectChanges();
    component.close();
    header.detectChanges();
    flushMicrotasks();
    expect(header.componentInstance['offCanvasMenuOpen']()).toBeTrue();
    tick(350);
    header.destroy();
  }));

  it('does not rearm pagination after an error or a radio change', async () => {
    const search = TestBed.inject(SearchContextService);
    const request = new Subject<any>();
    const fetch = spyOn(TestBed.inject(MoleculeCollectionItemService), 'getAllPaginatedItems').and.returnValue(request);
    search.open();
    fixture.detectChanges();
    const observe = spyOn(component['observer']!, 'observe').and.callThrough();
    component.handleViewClick('my');
    fixture.detectChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
    request.error(new Error('Request failed'));
    await Promise.resolve();
    fixture.detectChanges();
    expect(observe).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);

    component.handleViewClick('chembl');
    fixture.detectChanges();
    expect(component['_viewMode']()).toBe('chembl');
    expect(observe).not.toHaveBeenCalled();
  });
  it('cancels an old request immediately when the query is cleared', fakeAsync(() => {
    const request = new Subject<any>();
    spyOn(TestBed.inject(MoleculeSearchService), 'searchMolecule').and.returnValue(request);
    component.handleQuery('aspirin');
    expect(request.observed).toBeTrue();
    component.handleInput('');
    expect(request.observed).toBeFalse();
    request.next([{ id: 1 }]);
    tick(350);
    expect(component.chemblResults()).toEqual([]);
    expect(component.loading()).toBeFalse();
  }));

  it('debounces typing and cancels the timer when Enter submits', fakeAsync(() => {
    const fetch = spyOn(TestBed.inject(MoleculeSearchService), 'searchMolecule').and.returnValue(new Subject());
    component.handleInput('asp');
    tick(150);
    component.handleInput('aspirin');
    tick(150);
    expect(fetch).not.toHaveBeenCalled();
    component.handleQuery('aspirin');
    tick(350);
    expect(fetch).toHaveBeenCalledOnceWith('aspirin', 100);
  }));

  it('keeps loaded molecules visible and retries the failed next page without duplicates', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    const retry = new Subject<any>();
    const fetch = spyOn(TestBed.inject(MoleculeCollectionItemService), 'getAllPaginatedItems').and.returnValues(first, second, retry);
    const card = {
      id: 'saved-1', type: 'custom' as const, name: 'Saved molecule', syn: '', smiles: 'C',
      createdAt: 0, updatedAt: 0, touchedAt: 0, triggerDisappear: signal(false), collapse: signal(false)
    };
    spyOn(Helpers, 'moleculeClientToCardConverter').and.returnValue(card);
    TestBed.inject(SearchContextService).open();
    fixture.detectChanges();
    component.handleViewClick('my');
    first.next({ items: [{}], currentPage: 1, totalPages: 3 });
    component['loadNextMyPage']();
    second.error(new Error('Offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-molecule-summary-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('caricare altre');
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    expect(fetch.calls.allArgs()).toEqual([[1, 7, ''], [2, 7, ''], [2, 7, '']]);
    retry.next({ items: [{}], currentPage: 2, totalPages: 3 });
    expect(component.myItems().length).toBe(1);
  });

  it('cancels a pending debounce on dismissal', fakeAsync(() => {
    const fetch = spyOn(TestBed.inject(MoleculeSearchService), 'searchMolecule').and.returnValue(new Subject());
    TestBed.inject(SearchContextService).open();
    fixture.detectChanges();
    component.handleInput('aspirin');
    component.close();
    fixture.detectChanges();
    tick(350);
    expect(fetch).not.toHaveBeenCalled();
  }));

  it('preserves working space when only the visual viewport shrinks above a keyboard', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    const previousStyles = document.documentElement.style.cssText;
    const layoutHeight = window.innerHeight;
    const visual = { width: 375, height: 350, offsetTop: 60, offsetLeft: 0, scale: 1 };
    try {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual });
      window.dispatchEvent(new Event('resize'));
      await Promise.resolve();
      TestBed.inject(SearchContextService).open();
      fixture.detectChanges();
      await Promise.resolve();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const results = component['scrollRoot']().nativeElement;
      const input = dialog.querySelector('input[type="search"]') as HTMLInputElement;
      const close = dialog.querySelector('button[aria-label="Chiudi ricerca molecolare"]') as HTMLElement;
      expect(window.innerHeight).toBe(layoutHeight);
      expect(dialog.getBoundingClientRect().top).toBeCloseTo(60, 0);
      expect(results.clientHeight).toBeGreaterThanOrEqual(175);
      expect(parseFloat(getComputedStyle(input).fontSize)).toBeGreaterThanOrEqual(16);
      expect(close.getBoundingClientRect().left).toBeGreaterThanOrEqual(input.getBoundingClientRect().right);
      expect(getComputedStyle(dialog.querySelector('h2')!).display).toBe('none');
      visual.height = 700;
      window.dispatchEvent(new Event('resize'));
      await Promise.resolve();
      fixture.detectChanges();
      expect(getComputedStyle(dialog.querySelector('h2')!).display).not.toBe('none');
    } finally {
      if (original) Object.defineProperty(window, 'visualViewport', original);
      else Reflect.deleteProperty(window, 'visualViewport');
      window.dispatchEvent(new Event('resize'));
      await Promise.resolve();
      document.documentElement.style.cssText = previousStyles;
    }
  });

});
