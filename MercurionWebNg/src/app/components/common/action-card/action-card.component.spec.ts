import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActionCardComponent } from './action-card.component';
import { ActionFooterComponent } from '../action-footer/action-footer.component';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

@Component({
  standalone: true,
  imports: [ActionCardComponent, ActionFooterComponent],
  template: `
    <m-action-card
      size="wide"
      labelledBy="card-title"
      closeLabel="Close card"
      (closed)="closed = true">
      <h2 action-card-title id="card-title">Projected title</h2>
      <div action-card-body>Projected body</div>
      <m-action-footer action-card-footer>
        <button action-footer-primary>Continue</button>
      </m-action-footer>
    </m-action-card>
  `,
})
class HostComponent {
  closed = false;
}

@Component({
  standalone: true,
  imports: [ActionCardComponent, ActionFooterComponent, DialogShellComponent],
  template: `
    <m-dialog-shell [mounted]="true" [open]="true" panelVariant="action" backdropVariant="action" label="Layout test">
      <div class="m-overlay-screen" style="display: flex; align-items: center; justify-content: center">
        <m-action-card labelledBy="layout-title">
          <h2 action-card-title id="layout-title">Layout test</h2>
          <div action-card-body><div style="height: 1200px">Long content</div></div>
          <m-action-footer action-card-footer><button action-footer-primary>Continue</button></m-action-footer>
        </m-action-card>
      </div>
    </m-dialog-shell>
  `,
})
class LayoutHostComponent {}

describe('ActionCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, LayoutHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('projects title, body and footer content without dialog semantics', () => {
    const card = fixture.debugElement.query(By.css('.m-action-card'));
    expect(card.query(By.css('#card-title')).nativeElement.textContent).toContain('Projected title');
    expect(card.query(By.css('[action-card-body]')).nativeElement.textContent).toContain('Projected body');
    expect(card.query(By.css('.m-action-footer'))).not.toBeNull();
    expect(card.nativeElement.getAttribute('role')).toBeNull();
    expect(card.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the canonical close control and finite responsive size class', () => {
    const card = fixture.debugElement.query(By.css('.m-action-card')).nativeElement;
    expect(card.classList.contains('m-action-card--wide')).toBeTrue();
    expect(fixture.debugElement.query(By.css('button[aria-label="Close card"]'))).not.toBeNull();
  });

  it('emits when the close control is pressed', () => {
    fixture.debugElement.query(By.css('button[aria-label="Close card"]')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBeTrue();
  });

  it('keeps the footer reachable while long action content scrolls', () => {
    const layout = TestBed.createComponent(LayoutHostComponent);
    layout.detectChanges();

    const card = layout.nativeElement.querySelector('.m-action-card') as HTMLElement;
    const body = layout.nativeElement.querySelector('.m-action-card__body') as HTMLElement;
    const footer = layout.nativeElement.querySelector('.m-action-footer') as HTMLElement;
    expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    expect(getComputedStyle(card).scrollPaddingBlockEnd).toBe('0px');
    if (getComputedStyle(body).overflowY === 'auto') {
      expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1);
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    } else {
      // Mobile/short dialogs scroll the card, rather than its body.
      expect(card.scrollHeight).toBeGreaterThan(card.clientHeight);
      card.scrollTop = card.scrollHeight;
      expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(card.getBoundingClientRect().bottom + 1);
    }

    layout.destroy();
  });
});
