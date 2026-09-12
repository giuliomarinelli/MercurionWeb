import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PaginationComponent } from './pagination.component';
import { PaginationState } from '../../../Models/graphql/page.models';

@Component({
  standalone: true,
  imports: [PaginationComponent],
  template: `
    <m-pagination
      [state]="state"
      (pageChange)="selectedPage = $event"
      (loadMoreRequested)="loads = loads + 1"
      (retry)="retries = retries + 1" />
  `,
})
class HostComponent {
  state: PaginationState = {
    mode: 'page',
    currentPage: 2,
    totalPages: 3,
    pending: false,
  };
  selectedPage?: number;
  loads = 0;
  retries = 0;
}

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders first, middle and last page controls with accessible names', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.map(button => button.nativeElement.getAttribute('aria-label'))).toEqual([
      'Previous page', 'Page 1', 'Page 2', 'Page 3', 'Next page',
    ]);
    expect(buttons[0].nativeElement.disabled).toBeFalse();
    expect(buttons[4].nativeElement.disabled).toBeFalse();
    expect(buttons[2].nativeElement.getAttribute('aria-current')).toBe('page');
  });

  it('emits navigation only for enabled pages and blocks pending activation', () => {
    fixture.debugElement.queryAll(By.css('button'))[3].nativeElement.click();
    expect(host.selectedPage).toBe(3);
    host.state = { ...host.state, pending: true };
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('button'))[4].nativeElement.click();
    expect(host.selectedPage).toBe(3);
  });

  it('handles load-more pending, terminal, error and retry states', () => {
    host.state = { mode: 'infinite', hasMore: true, pending: false };
    fixture.detectChanges();
    fixture.debugElement.query(By.css('button')).nativeElement.click();
    expect(host.loads).toBe(1);

    host.state = { mode: 'infinite', hasMore: true, pending: true };
    fixture.detectChanges();
    fixture.debugElement.query(By.css('button')).nativeElement.click();
    expect(host.loads).toBe(1);

    host.state = { mode: 'infinite', hasMore: false, pending: false };
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('End of results');

    host.state = { mode: 'infinite', hasMore: true, pending: false, error: 'Could not load results' };
    fixture.detectChanges();
    fixture.debugElement.query(By.css('button')).nativeElement.click();
    expect(host.retries).toBe(1);
  });
});
