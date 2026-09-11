import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  IconButtonComponent,
  IconButtonSize,
  IconButtonVariant,
} from './icon-button.component';

@Component({
  standalone: true,
  imports: [IconButtonComponent],
  template: `
    <m-icon-button
      [ariaLabel]="label"
      [ariaLabelledby]="labelledby"
      [ariaDescribedby]="describedby"
      icon="close"
      [size]="size"
      [variant]="variant"
      [disabled]="disabled"
      (pressed)="pressed = true"
    >
    </m-icon-button>
  `,
})
class HostComponent {
  label = 'Close panel';
  labelledby = '';
  describedby = 'panel-status';
  size: IconButtonSize = 'md';
  variant: IconButtonVariant = 'ghost';
  disabled = false;
  pressed = false;
}

describe('IconButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders a native button with an explicit accessible name', () => {
    const button = fixture.debugElement.query(By.css('button')).nativeElement;

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Close panel');
    expect(button.getAttribute('aria-describedby')).toBe('panel-status');
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('activates from the native keyboard click path', () => {
    const button = fixture.debugElement.query(By.css('button')).nativeElement;

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pressed).toBeTrue();
  });

  it('keeps disabled controls native and inactive', () => {
    const host = fixture.componentInstance;
    host.disabled = true;
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button')).nativeElement;

    button.click();
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(host.pressed).toBeFalse();
  });

  it('maps every supported variant and size to finite classes', () => {
    const host = fixture.componentInstance;
    const button = fixture.debugElement.query(By.css('button')).nativeElement;

    const variants = {
      ghost: 'bg-transparent',
      neutral: 'bg-slate-200',
      destructive: 'bg-red-600',
      outline: 'border-indigo-500',
    } as const;
    for (const variant of Object.keys(variants) as Array<keyof typeof variants>) {
      host.variant = variant;
      fixture.detectChanges();
      expect(button.classList).toContain(variants[variant]);
    }

    for (const size of ['sm', 'md', 'lg'] as const) {
      host.size = size;
      fixture.detectChanges();
      expect(button.classList).toContain(`size-${size === 'sm' ? '8' : size === 'md' ? '10' : '12'}`);
    }
  });
});
