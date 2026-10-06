import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

import { TextFieldComponent } from './text-field.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TextFieldComponent],
  template: `
    <form [formGroup]="form">
      <m-text-field
        id="display-name"
        label="Display name"
        hint="Use your public name"
        [errors]="{ required: 'Display name is required' }"
        [disabled]="disabled"
        formControlName="displayName"
      >
        <span mTextFieldPrefix>$</span>
        <button type="button" mTextFieldSuffix aria-label="Clear display name">×</button>
      </m-text-field>
    </form>
  `
})
class HostComponent {
  disabled = false;
  readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: Validators.required })
  });
}

@Component({
  imports: [ReactiveFormsModule, TextFieldComponent],
  template: `
    <form [formGroup]="form">
      <m-text-field label="E-mail" formControlName="email" [errors]="{ emailTaken: 'E-mail già registrata.' }" />
    </form>
  `
})
class AsyncHostComponent {
  readonly availability = new Subject<ValidationErrors | null>();
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
      asyncValidators: () => this.availability.asObservable()
    })
  });
}

describe('TextFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('associates the stable id with its label and hint', () => {
    const input = fixture.nativeElement.querySelector('input');
    const label = fixture.nativeElement.querySelector('label');
    const hint = fixture.nativeElement.querySelector('#display-name-hint');

    expect(input.id).toBe('display-name');
    expect(input.name).toBe('displayName');
    expect(label.htmlFor).toBe('display-name');
    expect(input.getAttribute('aria-describedby')).toBe('display-name-hint');
    expect(hint.textContent).toContain('Use your public name');
    expect(fixture.nativeElement.querySelector('[mtextfieldprefix]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[mtextfieldsuffix]')).toBeTruthy();
  });

  it('propagates values through the caller-owned reactive form', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.displayName.value).toBe('Ada');
  });

  it('synchronizes silent browser autofill with the form and floating label without duplicate changes', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const changes = jasmine.createSpy('changes');
    fixture.componentInstance.form.controls.displayName.valueChanges.subscribe(changes);
    input.value = 'Ada';
    input.dispatchEvent(new AnimationEvent('animationstart', { animationName: 'cdk-text-field-autofill-start' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.displayName.value).toBe('Ada');
    expect(fixture.nativeElement.querySelector('label').style.top).toBe('0px');
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    expect(changes).toHaveBeenCalledOnceWith('Ada');
  });

  it('accepts browser changes even when no input event is dispatched', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Grace';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.displayName.value).toBe('Grace');
  });

  it('exposes invalid state and the associated error message after blur', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('display-name-error');
    expect(fixture.nativeElement.querySelector('#display-name-error')).toBeTruthy();
  });

  it('reflects disabled state without taking ownership of the form control', () => {
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.form.controls.displayName.disable();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBeTrue();
    expect(fixture.componentInstance.form.controls.displayName.disabled).toBeTrue();
  });
});

describe('TextFieldComponent asynchronous validation', () => {
  it('shows a late emailTaken result after the field loses focus', async () => {
    await TestBed.configureTestingModule({ imports: [AsyncHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AsyncHostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.value = 'taken@example.com';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    fixture.componentInstance.availability.next({ emailTaken: true });
    fixture.componentInstance.availability.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.email.hasError('emailTaken')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('E-mail già registrata.');
  });
});
