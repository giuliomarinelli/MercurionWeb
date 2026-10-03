import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';

import { SearchOverlayComponent } from './search-overlay.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SearchResultComponent } from '../search-result/search-result.component';
import { MoleculeSummaryCardComponent } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.component';

describe('SearchOverlayComponent', () => {
  let component: SearchOverlayComponent;
  let fixture: ComponentFixture<SearchOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchOverlayComponent]
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

  it('closes the overlay when a ChEMBL result navigates', () => {
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
    result.componentInstance.navigated.emit();

    expect(search.isOpenedSearchOverlay()).toBeFalse();
  });

  it('closes the overlay when a saved molecule card navigates', () => {
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
    card.componentInstance.navigate.emit();

    expect(search.isOpenedSearchOverlay()).toBeFalse();
  });

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
