import { AbstractPaginationComponent } from './abstract-pagination-component';
import { of } from 'rxjs';
import { PageModel } from '../Models/graphql/page.models';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

@Component({ template: '' })
class TestPaginationComponent extends AbstractPaginationComponent<string> {
  nextPage: PageModel<string> = { items: [], itemCount: 0, totalItems: 0, itemsPerPage: 25, totalPages: 0, currentPage: 1 };

  protected fetch$(): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(): import('rxjs').Observable<PageModel<string>> {
    return of(this.nextPage);
  }

  loadNext(): Promise<void> { return this.loadMore(); }
  hasMore(): boolean { return this.paginationState().hasMore; }

  protected doQuery(): void { /* noop for test */ }
  protected doClear(): void { /* noop for test */ }
}

describe('AbstractPaginationComponent', () => {
  it('should create an instance', () => {
    const component = TestBed.createComponent(TestPaginationComponent).componentInstance;
    expect(component).toBeTruthy();
  });

  it('reaches the terminal state from page metadata without fetching an empty page', async () => {
    const component = TestBed.createComponent(TestPaginationComponent).componentInstance;
    component.nextPage = {
      items: ['item-1'],
      itemCount: 1,
      totalItems: 1,
      itemsPerPage: 25,
      totalPages: 1,
      currentPage: 1,
    };

    await component.loadNext();

    expect(component.hasMore()).toBeFalse();
  });
});
