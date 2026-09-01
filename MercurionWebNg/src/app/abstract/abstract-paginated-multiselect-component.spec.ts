import { AbstractPaginatedMultiselectComponent } from './abstract-paginated-multiselect-component';
import { of } from 'rxjs';
import { PageModel } from '../Models/graphql/page.models';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

@Component({ template: '' })
class TestPaginatedMultiselectComponent extends AbstractPaginatedMultiselectComponent<string> {
  protected fetch$(): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(): import('rxjs').Observable<PageModel<string>> {
    return of({ items: [], itemCount: 0, totalItems: 0, itemsPerPage: 0, totalPages: 0, currentPage: 1 });
  }
  protected doQuery(): void { /* noop */ }
  protected doClear(): void { /* noop */ }
}

describe('AbstractPaginatedMultiselectComponent', () => {
  it('should create an instance', () => {
    const component = TestBed.createComponent(TestPaginatedMultiselectComponent).componentInstance
    expect(component).toBeTruthy();
  });
});
