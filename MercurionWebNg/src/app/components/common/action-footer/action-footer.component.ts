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
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .m-action-footer__secondary,
    .m-action-footer__primary {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .m-action-footer__secondary {
      margin-right: auto;
    }

    @media (max-width: 767px) {
      .m-action-footer {
        padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
      }

      .m-action-footer__actions {
        align-items: stretch;
        flex-direction: column;
        gap: 0.5rem;
      }

      .m-action-footer__secondary,
      .m-action-footer__primary {
        align-items: stretch;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0;
        width: 100%;
      }
    }

    :host-context(.dark) .m-action-footer {
      background: rgb(30 41 59 / 0.6);
      border-top-color: rgb(51 65 85);
    }
  `,
})
export class ActionFooterComponent {}
