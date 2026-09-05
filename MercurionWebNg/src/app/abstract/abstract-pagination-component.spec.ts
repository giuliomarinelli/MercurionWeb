import { AbstractPaginationComponent } from './abstract-pagination-component';
import { of } from 'rxjs';
import { PageModel } from '../Models/graphql/page.models';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

@Component({ template: '' })
class TestPaginationComponent extends AbstractPaginationComponent<string> {
  protected fetch$(): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): import('rxjs').Observable<PageModel<string>>;
  protected fetch$(): import('rxjs').Observable<PageModel<string>> {
    return of({ items: [], itemCount: 0, totalItems: 0, itemsPerPage: 0, totalPages: 0, currentPage: 1 });
  }

  protected doQuery(): void { /* noop for test */ }
  protected doClear(): void { /* noop for test */ }
}

describe('AbstractPaginationComponent', () => {
  it('should create an instance', () => {
    const component = TestBed.createComponent(TestPaginationComponent).componentInstance;
    expect(component).toBeTruthy();
  });
});