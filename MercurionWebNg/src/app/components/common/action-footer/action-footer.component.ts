import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'm-action-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="m-action-footer" role="group" aria-label="Azioni">
      <div class="m-action-footer__actions">
        <div class="m-action-footer__secondary">
          <ng-content select="[action-footer-secondary]" />
        </div>
        <div class="m-action-footer__primary">
          <ng-content select="[action-footer-primary]" />
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      flex: 0 0 auto;
    }

    .m-action-footer {
      background: rgb(248 250 252 / 0.6);
      border-top: 1px solid rgb(226 232 240);
      border-radius: 0 0 1rem 1rem;
      padding: 1rem 1.5rem calc(1rem + env(safe-area-inset-bottom, 0px));
    }

    .m-action-footer__actions {
      align-items: center;
      display: flex;
      flex-wrap: nowrap;
      gap: clamp(0.5rem, 1.5vw, 1rem);
      justify-content: flex-end;
    }

    .m-action-footer__secondary,
    .m-action-footer__primary {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: clamp(0.5rem, 1.5vw, 1rem);
    }

    .m-action-footer__secondary {
      min-width: 0;
    }

    .m-action-footer__primary {
      flex-shrink: 0;
    }

    @media (max-width: 767px) {
      .m-action-footer {
        padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
      }

      .m-action-footer__actions {
        align-items: stretch;
        flex-direction: column-reverse;
        gap: 0.5rem;
      }

      .m-action-footer__secondary,
      .m-action-footer__primary {
        align-items: stretch;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
      }

      .m-action-footer__secondary:empty {
        display: none;
      }
    }

    :host-context(.m-dialog--compact) {
      position: sticky;
      bottom: 0;
      z-index: 2;
      background: var(--m-color-surface-elevated);
    }
    /* If both bars cannot fit, let every control be reached by scrolling. */
    :host-context(.m-dialog--short) { position: static; }

    :host-context(.m-dialog--compact) .m-action-footer {
      padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
    }

    :host-context(.m-dialog--compact) .m-action-footer__actions {
      align-items: center;
      flex-direction: row;
      flex-wrap: wrap;
    }

    :host-context(.m-dialog--compact) .m-action-footer__secondary,
    :host-context(.m-dialog--compact) .m-action-footer__primary {
      align-items: center;
      flex-direction: row;
      flex-wrap: wrap;
      min-width: 0;
      width: auto;
    }

    :host-context(.dark) .m-action-footer {
      background: rgb(30 41 59 / 0.6);
      border-top-color: rgb(51 65 85);
    }
  `,
})
export class ActionFooterComponent {}
