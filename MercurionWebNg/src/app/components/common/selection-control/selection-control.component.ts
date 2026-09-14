import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

export type SelectionControlMode = 'checkbox' | 'switch';

let nextGeneratedId = 0;

@Component({
  selector: 'm-selection-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label
      class="m-selection-control"
      [class.m-selection-control--switch]="mode() === 'switch'"
      [class.m-selection-control--disabled]="isDisabled()"
    >
      <input
        #control
        class="m-selection-control__input"
        type="checkbox"
        [attr.id]="controlId()"
        [attr.name]="name() || null"
        [attr.role]="mode() === 'switch' ? 'switch' : null"
        [checked]="value()"
        [indeterminate]="indeterminate()"
        [disabled]="isDisabled()"
        [attr.aria-checked]="ariaChecked()"
        [attr.aria-describedby]="descriptionId()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-required]="required() ? 'true' : null"
        (change)="onChangeEvent($event)"
        (blur)="onBlur()"
      />
      <span class="m-selection-control__visual" aria-hidden="true">
        <span class="m-selection-control__mark"></span>
      </span>
      <span class="m-selection-control__content">
        <span class="m-selection-control__label">{{ label() }}</span>
        @if (description()) {
          <span class="m-selection-control__description" [attr.id]="descriptionId()">
            {{ description() }}
          </span>
        }
      </span>
    </label>
  `,
  styles: `
    :host {
      display: block;
    }

    .m-selection-control {
      align-items: flex-start;
      color: #0f172a;
      cursor: pointer;
      display: inline-flex;
      gap: 0.625rem;
      line-height: 1.35;
      position: relative;
      user-select: none;
    }

    .m-selection-control__input {
      block-size: 1px;
      inline-size: 1px;
      opacity: 0;
      position: absolute;
    }

    .m-selection-control__visual {
      align-items: center;
      background: #fff;
      border: 2px solid #64748b;
      border-radius: 0.3rem;
      display: inline-flex;
      flex: 0 0 auto;
      height: 1.25rem;
      justify-content: center;
      margin-top: 0.05rem;
      transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      width: 1.25rem;
    }

    .m-selection-control__mark {
      background: transparent;
      clip-path: polygon(14% 44%, 0 59%, 39% 100%, 100% 21%, 84% 8%, 38% 68%);
      height: 0.75rem;
      width: 0.75rem;
    }

    .m-selection-control__content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .m-selection-control__label {
      font-weight: 500;
    }

    .m-selection-control__description {
      color: #475569;
      font-size: 0.875rem;
    }

    .m-selection-control__input:checked + .m-selection-control__visual,
    .m-selection-control__input:indeterminate + .m-selection-control__visual {
      background: #4f46e5;
      border-color: #4f46e5;
    }

    .m-selection-control__input:checked + .m-selection-control__visual .m-selection-control__mark {
      background: #fff;
    }

    .m-selection-control__input:indeterminate + .m-selection-control__visual .m-selection-control__mark {
      background: #fff;
      clip-path: none;
      height: 0.15rem;
      width: 0.65rem;
    }

    .m-selection-control__input:focus-visible + .m-selection-control__visual {
      box-shadow: 0 0 0 3px rgb(99 102 241 / 0.35);
    }

    .m-selection-control--switch .m-selection-control__visual {
      background: #cbd5e1;
      border: 0;
      border-radius: 9999px;
      height: 1.5rem;
      justify-content: flex-start;
      padding: 0.2rem;
      width: 2.75rem;
    }

    .m-selection-control--switch .m-selection-control__mark {
      background: #fff;
      border-radius: 9999px;
      clip-path: none;
      height: 1.1rem;
      transform: translateX(0);
      transition: transform 150ms ease;
      width: 1.1rem;
    }

    .m-selection-control--switch .m-selection-control__input:checked + .m-selection-control__visual {
      background: #4f46e5;
    }

    .m-selection-control--switch .m-selection-control__input:checked + .m-selection-control__visual .m-selection-control__mark {
      transform: translateX(1.25rem);
    }

    .m-selection-control--disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    :host-context(.dark) .m-selection-control {
      color: #f8fafc;
    }

    :host-context(.dark) .m-selection-control__visual {
      background: #1e293b;
      border-color: #94a3b8;
    }

    :host-context(.dark) .m-selection-control__description {
      color: #cbd5e1;
    }

    :host-context(.dark) .m-selection-control--switch .m-selection-control__visual {
      background: #475569;
      border: 0;
    }
  `
})
export class SelectionControlComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly id = input<string>();
  readonly name = input<string>();
  readonly mode = input<SelectionControlMode>('checkbox');
  readonly checked = input(false);
  readonly indeterminate = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly ariaLabel = input<string>();
  readonly changed = output<boolean>();

  readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');
  readonly ngControl = inject(NgControl, { self: true, optional: true });

  readonly value = signal(false);
  private disabledByForm = false;
  private readonly generatedId = `m-selection-control-${++nextGeneratedId}`;
  private onModelChange: (value: boolean) => void = () => undefined;
  private onModelTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      if (!this.ngControl) {
        this.value.set(this.checked());
      }
    });
  }

  controlId(): string {
    return this.id() || this.generatedId;
  }

  descriptionId(): string | null {
    return this.description() ? `${this.controlId()}-description` : null;
  }

  ariaChecked(): 'true' | 'false' | 'mixed' {
    return this.indeterminate() ? 'mixed' : this.value() ? 'true' : 'false';
  }

  isDisabled(): boolean {
    return this.disabled() || this.disabledByForm || Boolean(this.ngControl?.control?.disabled);
  }

  writeValue(value: unknown): void {
    this.value.set(Boolean(value));
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onModelChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onModelTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm = isDisabled;
  }

  onChangeEvent(event: Event): void {
    if (this.isDisabled()) return;

    const checked = (event.target as HTMLInputElement).checked;
    this.value.set(checked);
    this.onModelChange(checked);
    this.changed.emit(checked);
  }

  onBlur(): void {
    this.onModelTouched();
  }

  focus(): void {
    this.control().nativeElement.focus();
  }
}
