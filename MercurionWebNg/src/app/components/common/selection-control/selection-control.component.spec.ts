import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { SelectionControlComponent } from './selection-control.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SelectionControlComponent],
  template: `
    <form [formGroup]="form">
      <m-selection-control
        id="alerts"
        label="Email alerts"
        description="Receive account notifications"
        mode="switch"
        [disabled]="disabled"
        formControlName="alerts"
      />
      <m-selection-control
        id="partial"
        label="Select all"
        [indeterminate]="indeterminate"
        [checked]="checked"
      />
    </form>
  `
})
class HostComponent {
  disabled = false;
  indeterminate = true;
  checked = false;
  readonly form = new FormGroup({
    alerts: new FormControl(false, { nonNullable: true })
  });
}

describe('SelectionControlComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const controls = () =>
    fixture.nativeElement.querySelectorAll('m-selection-control input') as NodeListOf<HTMLInputElement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.form.controls.alerts.setValue(false);
    fixture.detectChanges();
  });

  it('exposes native checkbox or switch semantics and description relationships', () => {
    const control = controls()[0];

    expect(control.type).toBe('checkbox');
    expect(control.getAttribute('role')).toBe('switch');
    expect(control.getAttribute('aria-describedby')).toContain('description');
    expect(control.getAttribute('aria-checked')).toBe('false');
  });

  it('updates the caller-owned form control from mouse and keyboard activation', () => {
    const control = controls()[0];

    control.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.alerts.value).toBeTrue();

    control.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    control.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.alerts.value).toBeFalse();
  });

  it('activates from the associated label and preserves indeterminate state', () => {
    const partial = controls()[1];
    const label = partial.closest('label') as HTMLLabelElement;

    expect(partial.indeterminate).toBeTrue();
    expect(partial.getAttribute('aria-checked')).toBe('mixed');
    label.click();
    fixture.detectChanges();
    expect(partial.checked).toBeTrue();
  });

  it('does not activate while disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.form.controls.alerts.disable();
    fixture.detectChanges();

    const control = controls()[0];
    control.click();
    fixture.detectChanges();

    expect(control.disabled).toBeTrue();
    expect(fixture.componentInstance.form.controls.alerts.value).toBeFalse();
  });
});
