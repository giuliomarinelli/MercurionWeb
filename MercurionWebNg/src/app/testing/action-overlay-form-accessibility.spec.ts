import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionFooterComponent } from '../components/common/action-footer/action-footer.component';
import { ButtonComponent } from '../components/common/button/button.component';
import { DialogShellComponent } from '../components/common/dialog-shell/dialog-shell.component';
import { SelectCoreComponent } from '../components/common/select-core/select-core.component';
import { TextFieldComponent } from '../components/common/text-field/text-field.component';
import { TextareaComponent } from '../components/common/textarea/textarea.component';
import {
  blockingViolations,
  formatAxeViolations,
  runAxe,
} from './accessibility-test.helpers.spec';
import { queryByRole } from './component-test-helpers.spec';

interface SelectItem {
  id: string;
  label: string;
}

@Component({
  standalone: true,
  imports: [
    ActionFooterComponent,
    ButtonComponent,
    DialogShellComponent,
    ReactiveFormsModule,
    SelectCoreComponent,
    TextFieldComponent,
    TextareaComponent,
  ],
  template: `
    <main
      aria-label="Action overlay accessibility fixture"
      style="background: #ffffff; color: #11141d; --color-control-primary: #4338ca; --color-control-primary-hover: #3730a3; --color-surface-secondary: #e2e8f0; --color-border: #94a3b8; --color-on-surface-main: #11141d"
    >
      <form [formGroup]="form" (submit)="$event.preventDefault()">
      <m-text-field
        id="action-name"
        label="Action name"
        [errors]="{ required: 'Action name is required' }"
        [required]="true"
        formControlName="name"
      />
      <m-textarea
        id="action-notes"
        label="Notes"
        hint="Optional notes"
        formControlName="notes"
      />
      <m-select-core
        id="action-collection"
        [items]="items"
        [displayFn]="displayItem"
        [valueFn]="valueItem"
        label="Collection"
        [required]="true"
        [invalid]="collectionInvalid"
        error="Choose a collection"
      />
      </form>
      <button #opener type="button" (click)="dialogOpen = true">Open action</button>

      @if (dialogOpen) {
        <m-dialog-shell
          [mounted]="true"
          [open]="true"
          label="Save action"
          (dismissed)="dialogOpen = false"
        >
          <m-action-footer>
            <m-button
              action-footer-secondary
              variant="neutral"
              (pressed)="cancelled = true; dialogOpen = false"
            >
              Cancel
            </m-button>
            <m-button
              action-footer-primary
              [loading]="pending"
              [disabled]="disabled"
              (pressed)="confirm()"
            >
              Confirm
            </m-button>
          </m-action-footer>
        </m-dialog-shell>
      }
    </main>
  `,
})
class ActionOverlayFormFixtureComponent {
  dialogOpen = false;
  pending = false;
  disabled = false;
  collectionInvalid = false;
  confirmed = 0;
  cancelled = false;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    notes: new FormControl('', { nonNullable: true }),
  });
  readonly items: SelectItem[] = [
    { id: 'one', label: 'First collection' },
    { id: 'two', label: 'Second collection' },
  ];
  readonly displayItem = (item: SelectItem): string => item.label;
  readonly valueItem = (item: SelectItem): string => item.id;

  confirm(): void {
    this.confirmed += 1;
    this.pending = true;
  }
}

describe('action overlay and form accessibility behavior', () => {
  let fixture: ComponentFixture<ActionOverlayFormFixtureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionOverlayFormFixtureComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionOverlayFormFixtureComponent);
    fixture.detectChanges();
  });

  function element<T extends HTMLElement>(role: string, name?: string): T {
    return queryByRole<T>(fixture.nativeElement, role, name);
  }

  async function expectNoBlockingViolations(): Promise<void> {
    const results = await runAxe(fixture.nativeElement, {
      resultTypes: ['violations'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(formatAxeViolations(blockingViolations(results))).toBe('');
  }

  async function openAction(): Promise<HTMLElement> {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return element<HTMLElement>('dialog');
  }

  it('opens with modal semantics, captures focus, closes on Escape and restores the opener', async () => {
    const opener = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    opener.focus();
    const dialog = await openAction();

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Save action');
    expect(dialog.contains(document.activeElement)).toBeTrue();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.dialogOpen).toBeFalse();
    expect(document.activeElement).toBe(opener);
  });

  it('keeps confirm to one command while loading and does not activate disabled actions', async () => {
    await openAction();
    const confirm = element<HTMLButtonElement>('button', 'Confirm');

    confirm.click();
    fixture.detectChanges();
    confirm.click();
    expect(fixture.componentInstance.confirmed).toBe(1);
    expect(confirm.disabled).toBeTrue();
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    expect(confirm.getAttribute('aria-disabled')).toBe('true');

    fixture.componentInstance.pending = false;
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    confirm.click();
    expect(fixture.componentInstance.confirmed).toBe(1);
  });

  it('supports semantic cancel activation and form validation associations', async () => {
    await openAction();
    const input = fixture.nativeElement.querySelector('m-text-field input#action-name') as HTMLInputElement;
    fixture.componentInstance.form.controls.name.markAsTouched();
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('action-name-error');
    expect(fixture.nativeElement.querySelector('#action-name-error')?.textContent).toContain(
      'Action name is required',
    );

    const textarea = fixture.nativeElement.querySelector('m-textarea textarea#action-notes') as HTMLTextAreaElement;
    expect(textarea.getAttribute('aria-describedby')).toBe('action-notes-hint');
    const combobox = element<HTMLInputElement>('combobox');
    expect(combobox.getAttribute('aria-required')).toBe('true');
    expect(fixture.nativeElement.querySelector('label[for="action-collection"]')?.textContent)
      .toContain('Collection');

    const cancel = element<HTMLButtonElement>('button', 'Cancel');
    cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    cancel.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    cancel.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cancelled).toBeTrue();
  });

  it('passes automated accessibility checks for normal, invalid, disabled and modal states', async () => {
    await expectNoBlockingViolations();

    fixture.componentInstance.collectionInvalid = true;
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    await expectNoBlockingViolations();

    await openAction();
    await expectNoBlockingViolations();

    document.body.classList.add('dark');
    try {
      await expectNoBlockingViolations();
    } finally {
      document.body.classList.remove('dark');
    }
  });
});
