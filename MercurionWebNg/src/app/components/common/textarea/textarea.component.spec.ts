import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { TextareaComponent } from './textarea.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TextareaComponent],
  template: `
    <form [formGroup]="form">
      <m-textarea
        id="description"
        label="Description"
        hint="Describe the item"
        [errors]="{ required: 'Description is required' }"
        [maxLength]="20"
        [showCount]="true"
        [disabled]="disabled"
        resizeMode="none"
        formControlName="description"
      />
    </form>
  `
})
class HostComponent {
  disabled = false;

  readonly form = new FormGroup({
    description: new FormControl('', { nonNullable: true, validators: Validators.required })
  });
}

describe('TextareaComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('associates the label, hint and count with the textarea', () => {
    const textarea = fixture.nativeElement.querySelector('textarea');
    const label = fixture.nativeElement.querySelector('label');
    const hint = fixture.nativeElement.querySelector('#description-hint');
    const count = fixture.nativeElement.querySelector('#description-count');

    expect(textarea.id).toBe('description');
    expect(label.htmlFor).toBe('description');
    expect(textarea.getAttribute('aria-describedby')).toBe('description-hint description-count');
    expect(hint.textContent).toContain('Describe the item');
    expect(count.textContent.trim()).toBe('0 / 20');
    expect(textarea.classList.contains('resize-none')).toBeTrue();
  });

  it('propagates values and presents the derived character count', () => {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');

    textarea.value = 'A short description';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.description.value).toBe('A short description');
    expect(fixture.nativeElement.querySelector('#description-count').textContent.trim()).toBe('19 / 20');
  });

  it('exposes invalid state and the associated error after blur', () => {
    const textarea = fixture.nativeElement.querySelector('textarea');

    textarea.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toBe('description-error description-count');
    expect(fixture.nativeElement.querySelector('#description-error').textContent).toContain(
      'Description is required'
    );
  });

  it('reflects disabled state without taking ownership of the form control', () => {
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.form.controls.description.disable();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea.disabled).toBeTrue();
    expect(fixture.componentInstance.form.controls.description.disabled).toBeTrue();
  });
});
