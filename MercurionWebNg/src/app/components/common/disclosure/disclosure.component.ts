import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'm-disclosure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="m-disclosure">
      <button
        type="button"
        class="m-disclosure__trigger"
        [id]="triggerId()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="panelId()"
        (click)="toggle()"
      >
        <span>{{ label() }}</span>
        <span aria-hidden="true" [class.m-disclosure__chevron--open]="expanded()">⌄</span>
      </button>
      @if (expanded()) {
        <div
          class="m-disclosure__panel"
          role="region"
          [id]="panelId()"
          [attr.aria-labelledby]="triggerId()"
        >
          <ng-content></ng-content>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .m-disclosure__trigger {
      align-items: center;
      background: transparent;
      border: 0;
      color: inherit;
      display: flex;
      font: inherit;
      justify-content: space-between;
      padding: 1rem;
      text-align: start;
      width: 100%;
    }
    .m-disclosure__trigger:focus-visible {
      outline: 3px solid rgb(99 102 241 / 0.45);
      outline-offset: -3px;
    }
    .m-disclosure__chevron--open { transform: rotate(180deg); }
  `,
})
export class DisclosureComponent {
  readonly label = input.required<string>();
  readonly expanded = input(false);
  readonly id = input('m-disclosure');
  readonly toggled = output<boolean>();

  triggerId(): string {
    return `${this.id()}-trigger`;
  }

  panelId(): string {
    return `${this.id()}-panel`;
  }

  toggle(): void {
    this.toggled.emit(!this.expanded());
  }
}
