import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { UserContextService } from '../../services/context/user-context.service'
import { ButtonComponent } from '../../components/common/button/button.component'

@Component({
  selector: 'm-contacts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent],
  template: `
    <section class="main-container text-on-surface-main" aria-labelledby="contacts-heading">
      <header class="mb-6">
        <h1 id="contacts-heading" class="h1-underline">Contatti</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-on-surface-secondary">Scegli il canale più adatto per assistenza, segnalazioni e richieste sui tuoi dati personali.</p>
      </header>
      <div class="grid min-w-0 gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-token-border bg-surface-elevated p-5 text-on-surface-main sm:p-6" aria-labelledby="contacts-support">
          <h2 id="contacts-support" class="text-lg font-semibold">Supporto con ticket</h2>
          <p class="text-sm leading-6 text-on-surface-secondary">Per un problema nell’applicazione, apri una richiesta: potrai seguire la conversazione e le risposte nell’area Supporto.</p>
          @if (userContext.isLoggedIn()) {
            <m-button variant="outline" routerLink="/help">Vai al supporto</m-button>
            <p class="text-sm">Hai un suggerimento? <a class="a underline underline-offset-4" routerLink="/feedback">Lascia un feedback</a>.</p>
          } @else {
            <m-button variant="outline" routerLink="/login" [queryParams]="{ redirect_to: '/help' }">Accedi per aprire un ticket</m-button>
            <p class="text-sm text-on-surface-secondary">Se non hai un account, puoi scriverci via email.</p>
          }
        </section>
        <section class="min-w-0 space-y-3 rounded-2xl border border-token-border bg-surface-elevated p-5 text-on-surface-main sm:p-6" aria-labelledby="contacts-email">
          <h2 id="contacts-email" class="text-lg font-semibold">Email</h2>
          <a class="a underline underline-offset-4 inline-block py-2 font-semibold [overflow-wrap:anywhere]" href="mailto:mercurion.app@gmail.com">mercurion.app@gmail.com</a>
          <p class="text-sm leading-6 text-on-surface-secondary">Indica un oggetto e una breve descrizione. Se utili, aggiungi screenshot o passaggi per riprodurre il problema. Non inviare password o codici di sicurezza.</p>
        </section>
        <section class="min-w-0 space-y-3 rounded-2xl border border-token-border bg-surface-elevated p-5 text-on-surface-main sm:p-6 lg:col-span-2" aria-labelledby="contacts-pec">
          <h2 id="contacts-pec" class="text-lg font-semibold">PEC</h2>
          <p class="text-sm leading-6 text-on-surface-secondary">Per comunicazioni formali, richieste legali o comunicazioni ufficiali:</p>
          <a class="a underline underline-offset-4 inline-block py-2 font-mono text-sm [overflow-wrap:anywhere]" href="mailto:giuliomarinelli25@pec.it">giuliomarinelli25@pec.it</a>
        </section>
      </div>
      <nav class="mt-8 border-t border-token-border pt-5" aria-label="Documenti e policy">
        <ul class="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          <li><a class="a underline underline-offset-4 inline-flex min-h-11 items-center" routerLink="/privacy">Informativa sulla Privacy</a></li>
          <li><a class="a underline underline-offset-4 inline-flex min-h-11 items-center" routerLink="/terms-and-policies">Termini di Servizio</a></li>
          <li><a class="a underline underline-offset-4 inline-flex min-h-11 items-center" routerLink="/terms-and-policies" fragment="aup">Politica di Utilizzo Accettabile</a></li>
        </ul>
      </nav>
    </section>
  `,
})
export class ContactsPageComponent {
  protected readonly userContext = inject(UserContextService)
}
