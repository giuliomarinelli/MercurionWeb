import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';

import { SearchOverlayComponent } from './search-overlay.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SearchResultComponent } from '../search-result/search-result.component';
import { MoleculeSummaryCardComponent } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.component';
import { HeaderComponent } from '../../common/header/header.component';
import { InAppNotificationService } from '../../../services/in-app-notification.service';
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
});
