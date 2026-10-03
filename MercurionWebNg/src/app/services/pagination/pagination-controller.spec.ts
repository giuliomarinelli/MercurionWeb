import { of, Subject, throwError } from 'rxjs';
import { PaginationController } from './pagination-controller';
import { PageModel } from '../../Models/graphql/page.models';

describe('PaginationController', () => {
  it('models initial, append and end-of-data transitions', async () => {
    const pages: PageModel<string>[] = [
      { items: ['a'], currentPage: 1, totalPages: 2, totalItems: 2, itemCount: 1, itemsPerPage: 1 },
      { items: ['b'], currentPage: 2, totalPages: 2, totalItems: 2, itemCount: 1, itemsPerPage: 1 }
    ];
    const controller = new PaginationController<string>({
      fetch: page => of(pages[page - 1])
    });

    await controller.loadMore();
    expect(controller.items()).toEqual(['a']);
    expect(controller.loading()).toBeFalse();
    expect(controller.done()).toBeFalse();

    await controller.loadMore();
    expect(controller.items()).toEqual(['a', 'b']);
    expect(controller.done()).toBeTrue();
    expect(controller.paginationState().hasMore).toBeFalse();
  });

  it('ignores stale responses after a query reset', async () => {
    const first = new Subject<PageModel<string>>();
    const controller = new PaginationController<string>({
      fetch: (_page, query) => query ? of({
        items: ['new'], currentPage: 1, totalPages: 1, totalItems: 1, itemCount: 1, itemsPerPage: 1
      }) : first
    });

    const stale = controller.loadMore();
    controller.setQuery('new');
    expect(first.observed).toBeFalse();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.items()).toEqual(['new']);

    first.next({ items: ['old'], currentPage: 1, totalPages: 1, totalItems: 1, itemCount: 1, itemsPerPage: 1 });
    first.complete();
    await stale;
    await Promise.resolve();
    expect(controller.items()).toEqual(['new']);
  });

  it('prevents concurrent duplicate page requests', async () => {
    const response = new Subject<{ items: string[]; currentPage: number; totalPages: number; totalItems: number; itemCount: number; itemsPerPage: number }>();
    let calls = 0;
    const controller = new PaginationController<string>({
      fetch: () => { calls++; return response; }
    });

    const first = controller.loadMore();
    const second = controller.loadMore();
    expect(calls).toBe(1);
    response.next({ items: ['only-once'], currentPage: 1, totalPages: 1, totalItems: 1, itemCount: 1, itemsPerPage: 1 });
    response.complete();
    await Promise.all([first, second]);
    expect(controller.items()).toEqual(['only-once']);
  });

  it('surfaces errors and supports retry', async () => {
    let fail = true;
    const controller = new PaginationController<string>({
      fetch: () => fail
        ? (() => { fail = false; return throwError(() => new Error('failed')); })()
        : of({ items: [], currentPage: 1, totalPages: 0, totalItems: 0, itemCount: 0, itemsPerPage: 1 })
    });
    await controller.loadMore();
    expect(controller.error()).toBe('Unable to load results.');
    controller.retry();
    expect(controller.error()).toBeUndefined();
  });

  it('unsubscribes a pending request on disposal without publishing an error', async () => {
    const request = new Subject<PageModel<string>>();
    const controller = new PaginationController<string>({ fetch: () => request });
    const pending = controller.loadMore();
    expect(request.observed).toBeTrue();
    controller.dispose();
    await pending;
    expect(request.observed).toBeFalse();
    expect(controller.loading()).toBeFalse();
    expect(controller.error()).toBeUndefined();
    expect(controller.items()).toEqual([]);
  });

  it('requires an explicit retry after failure even if an observer fires again', async () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(throwError(() => new Error('offline')));
    const controller = new PaginationController<string>({ fetch });
    await controller.loadMore();
    await controller.loadMore();
    await controller.loadMore();
    expect(fetch).toHaveBeenCalledTimes(1);
    controller.retry();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not restart disposed pagination through a queued load or reset', async () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of({ items: [], currentPage: 1, totalPages: 0 }));
    const controller = new PaginationController<string>({ fetch });
    controller.dispose();
    controller.reset();
    controller.retry();
    await controller.loadMore();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('can resume suspended pagination when returning to the previous screen', async () => {
    const response = new Subject<PageModel<string>>();
    const fetch = jasmine.createSpy('fetch').and.returnValue(response);
    const controller = new PaginationController<string>({ fetch });
    const pending = controller.loadMore();
    controller.suspend();
    await pending;
    await controller.loadMore();
    expect(response.observed).toBeFalse();
    expect(fetch).toHaveBeenCalledTimes(1);
    controller.reset();
    expect(fetch).toHaveBeenCalledTimes(2);
    controller.dispose();
  });
});
