import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PageState, PageStateComponent } from './page-state.component';

@Component({
  standalone: true,
  imports: [PageStateComponent],
  template: `
    <m-page-state
      [state]="state"
      [loadingTemplate]="useLoadingTemplate"
      (retry)="retryCount = retryCount + 1"
    >
      <div pageStateLoading data-testid="loading-skeleton">Skeleton</div>
      <article pageStateContent data-testid="content">Fresh content</article>
    </m-page-state>
  `,
})
class HostComponent {
  state: PageState<{ id: number }> = { kind: 'loading' };
  useLoadingTemplate = false;
  retryCount = 0;
}

describe('PageStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function section(): HTMLElement {
    return fixture.debugElement.query(By.css('.m-page-state')).nativeElement;
  }

  it('renders loading with polite status semantics and the default spinner', () => {
    expect(section().getAttribute('role')).toBe('status');
    expect(section().getAttribute('aria-live')).toBe('polite');
    expect(section().getAttribute('aria-busy')).toBe('true');
    expect(section().querySelector('m-classic-spinner')).not.toBeNull();
  });

  it('supports a projected loading skeleton without coupling to a feature service', () => {
    host.useLoadingTemplate = true;
    fixture.detectChanges();
    expect(section().querySelector('[data-testid="loading-skeleton"]')).not.toBeNull();
    expect(section().querySelector('m-classic-spinner')).toBeNull();
  });

  it('renders the empty state with consistent public semantics', () => {
    host.state = {
      kind: 'empty',
      title: 'No molecules',
      message: 'Create a molecule to get started.',
    };
    fixture.detectChanges();
    expect(section().getAttribute('role')).toBe('status');
    expect(section().textContent).toContain('No molecules');
    expect(section().textContent).toContain('Create a molecule to get started.');
  });

  it('renders only the safe error message as an alert', () => {
    host.state = { kind: 'error', message: 'The molecule list could not be loaded.' };
    fixture.detectChanges();
    expect(section().getAttribute('role')).toBe('alert');
    expect(section().getAttribute('aria-live')).toBe('assertive');
    expect(section().textContent).toContain('The molecule list could not be loaded.');
    expect(section().querySelector('m-button')).toBeNull();
  });

  it('renders an accessible caller-owned retry action', () => {
    host.state = {
      kind: 'retry',
      title: 'Connection lost',
      message: 'Check your connection and try again.',
      actionLabel: 'Retry loading',
    };
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    expect(section().getAttribute('role')).toBe('alert');
    expect(button.textContent).toContain('Retry loading');
    button.click();
    expect(host.retryCount).toBe(1);
  });

  it('projects content only for the content state and does not leak stale content', () => {
    host.state = { kind: 'content', data: { id: 1 } };
    fixture.detectChanges();
    expect(section().querySelector('[data-testid="content"]')).not.toBeNull();

    host.state = { kind: 'empty' };
    fixture.detectChanges();
    expect(section().querySelector('[data-testid="content"]')).toBeNull();

    host.state = { kind: 'error', message: 'No longer available.' };
    fixture.detectChanges();
    expect(section().querySelector('[data-testid="content"]')).toBeNull();
  });
});
