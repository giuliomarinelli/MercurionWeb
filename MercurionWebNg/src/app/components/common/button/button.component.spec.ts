import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ButtonComponent, ButtonSize, ButtonVariant } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <form (submit)="$event.preventDefault(); submitted = true">
      <m-button
        [variant]="variant"
        [size]="size"
        [loading]="loading"
        [disabled]="disabled"
        type="submit"
        (pressed)="pressed = true"
      >
        Save
      </m-button>
      <m-button (pressed)="defaultPressed = true">Cancel</m-button>
    </form>
  `,
})
class HostComponent {
  variant: ButtonVariant = 'primary';
  size: ButtonSize = 'md';
  loading = false;
  disabled = false;
  pressed = false;
  submitted = false;
  defaultPressed = false;
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders typed variant and size classes', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    expect(button.classList).toContain('m-button__control--primary');
    expect(button.classList).toContain('m-button__control--md');
    expect(button.type).toBe('submit');
  });

  it('keeps the native control disabled and busy while loading', () => {
    const host = fixture.componentInstance;
    host.loading = true;
    fixture.detectChanges();
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    const width = button.getBoundingClientRect().width;
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.m-button__spinner')).not.toBeNull();
    expect(button.getBoundingClientRect().width).toBe(width);
  });

  it('does not submit when the default type is used', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[1].nativeElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.defaultPressed).toBeTrue();
    expect(fixture.componentInstance.submitted).toBeFalse();
  });

  it('renders every typed variant and size', () => {
    const host = fixture.componentInstance;
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    const variants = ['primary', 'secondary', 'destructive', 'neutral', 'ghost', 'outline'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const variant of variants) {
      host.variant = variant;
      fixture.detectChanges();
      expect(button.classList).toContain(`m-button__control--${variant}`);
    }
    for (const size of sizes) {
      host.size = size;
      fixture.detectChanges();
      expect(button.classList).toContain(`m-button__control--${size}`);
    }
  });
});
