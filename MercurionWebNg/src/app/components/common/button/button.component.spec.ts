import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ButtonComponent } from './button.component';

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
    </form>
  `,
})
class HostComponent {
  variant = 'primary' as const;
  size = 'md' as const;
  loading = false;
  disabled = false;
  pressed = false;
  submitted = false;
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
    const button = fixture.debugElement.query(By.css('button')).nativeElement;
    expect(button.classList).toContain('m-button__control--primary');
    expect(button.classList).toContain('m-button__control--md');
    expect(button.type).toBe('submit');
  });

  it('keeps the native control disabled and busy while loading', () => {
    const host = fixture.componentInstance;
    host.loading = true;
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button')).nativeElement;
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.m-button__spinner')).not.toBeNull();
  });

  it('does not submit when the default type is used', () => {
    const button = fixture.debugElement.query(By.css('button')).nativeElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitted).toBeTrue();
  });
});
