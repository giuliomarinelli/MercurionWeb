import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ActionFooterComponent } from './action-footer.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  standalone: true,
  imports: [ActionFooterComponent, ButtonComponent],
  template: `
    <m-action-footer>
      @if (hasSecondary) {
        <m-button action-footer-secondary variant="neutral" (pressed)="secondaryPressed = true">
          Cancel
        </m-button>
      }
      <m-button
        action-footer-primary
        [loading]="pending"
        [disabled]="disabled"
        (pressed)="primaryPressed = true"
      >
        Save
      </m-button>
    </m-action-footer>
  `,
})
class HostComponent {
  hasSecondary = true;
  pending = false;
  disabled = false;
  primaryPressed = false;
  secondaryPressed = false;
}

describe('ActionFooterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders a two-action footer with secondary focus order before primary', () => {
    const footer = fixture.debugElement.query(By.css('.m-action-footer'));
    const controls = footer.queryAll(By.css('button'));

    expect(controls.map(control => control.nativeElement.textContent.trim())).toEqual([
      'Cancel',
      'Save',
    ]);
  });

  it('supports a single primary action', () => {
    fixture.componentInstance.hasSecondary = false;
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(1);
    expect(fixture.debugElement.query(By.css('.m-action-footer__primary'))).not.toBeNull();
  });

  it('delegates pending state to the canonical primary Button', () => {
    fixture.componentInstance.pending = true;
    fixture.detectChanges();

    const primary = fixture.debugElement.queryAll(By.css('button'))[1].nativeElement;
    expect(primary.disabled).toBeTrue();
    expect(primary.getAttribute('aria-busy')).toBe('true');
    expect(primary.querySelector('.m-button__spinner')).not.toBeNull();
  });

  it('preserves disabled state without changing the footer layout', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    const primary = fixture.debugElement.queryAll(By.css('button'))[1].nativeElement;
    expect(primary.disabled).toBeTrue();
    expect(primary.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.debugElement.query(By.css('.m-action-footer__actions'))).not.toBeNull();
  });
});
