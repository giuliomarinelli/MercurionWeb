import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActionCardComponent } from './action-card.component';
import { ActionFooterComponent } from '../action-footer/action-footer.component';

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

describe('ActionCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
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
});
