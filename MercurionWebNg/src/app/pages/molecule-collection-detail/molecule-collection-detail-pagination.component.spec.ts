import { TestBed } from '@angular/core/testing';
import { MoleculeCollectionDetailPaginationComponent } from './molecule-collection-detail-pagination.component';

describe('Collection detail feedback', () => {
  it('uses the same normal-flow skeleton stack with the collection removal action', () => {
    const fixture = TestBed.createComponent(MoleculeCollectionDetailPaginationComponent);
    fixture.componentRef.setInput('loading', true); fixture.detectChanges();
    const stack = fixture.nativeElement.querySelector('.m-list-skeletons') as HTMLElement;
    expect(stack.children.length).toBe(5);
    expect(getComputedStyle(stack).gap).toBe('12px');
    expect(getComputedStyle(stack).position).toBe('static');
    expect(fixture.nativeElement.textContent).not.toContain('vuota');
  });
  it('distinguishes an empty collection from a search with no matches', () => {
    const fixture = TestBed.createComponent(MoleculeCollectionDetailPaginationComponent);
    fixture.componentRef.setInput('empty', true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aggiungi molecole');
    fixture.componentRef.setInput('search', 'missing'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nessuna corrispondenza');
    expect(fixture.nativeElement.textContent).toContain('Cancella ricerca');
  });
  it('provides a localized retry and a manual load fallback', () => {
    const fixture = TestBed.createComponent(MoleculeCollectionDetailPaginationComponent);
    const retry = jasmine.createSpy(); const load = jasmine.createSpy();
    fixture.componentInstance.retry.subscribe(retry); fixture.componentInstance.loadMore.subscribe(load);
    fixture.componentRef.setInput('error', 'Impossibile caricare'); fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('error', undefined); fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click(); expect(load).toHaveBeenCalledTimes(1);
  });
});
