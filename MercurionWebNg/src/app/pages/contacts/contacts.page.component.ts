import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { UserContextService } from '../../services/context/user-context.service'

@Component({
  selector: 'm-contacts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="main-container leading-7" role="main" aria-labelledby="contacts-heading">
      <header>
        <h1 id="contacts-heading" class="h1-underline">Contatti</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Per supporto, segnalazioni e richieste relative a privacy o dati personali.
        </p>
      </header>
      @if (userContext.isLoggedIn()) {
        <section class="mt-4" aria-label="Supporto con ticket">
          <h2 class="h2 -mb-2">Supporto con ticket</h2>
          <p>
            Avendo effettuato l’accesso, puoi aprire un ticket di supporto dall<a class="a" routerLink="/help">’area dedicata</a>.
          </p>
        </section>
      }
      <section class="mt-4" aria-label="Contatto email">
        <h2 class="h2 pb-0">Email</h2>
        <p class="mt-3">
          Scrivici a:
          <a class="a" href="mailto:mercurion.app@gmail.com"><strong>mercurion.app@gmail.com</strong></a>
        </p>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Indica nel messaggio: oggetto, descrizione breve, e se possibile screenshot o dettagli utili.
        </p>
      </section>

      <section class="mt-4" aria-label="PEC">
        <h2 class="h2 pb-0">PEC</h2>
        <p class="mt-3">
          Per comunicazioni formali puoi usare la PEC:
          <strong class="font-mono text-sm">giuliomarinelli25@pec.it</strong>
        </p>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          (Consigliata per richieste legali o comunicazioni ufficiali.)
        </p>
      </section>
      <hr class="my-12 border-slate-300 dark:border-slate-700" />

      <section aria-label="Link utili">
        <div class="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-x-0 gap-y-4 md:gap-4 flex-col md:flex-row">
          <p>Link utili:</p>
          <p class="flex items-center gap-x-0 gap-y-1 md:gap-4 flex-col md:flex-row">
            <a class="a" routerLink="/privacy">Informativa sulla Privacy</a>
            <span>·</span>
            <a class="a" routerLink="/terms-and-policies">Termini di Servizio</a>
            <span>·</span>
            <a class="a" routerLink="/terms-and-policies" fragment="aup">Politica di Utilizzo Accettabile</a>
          </p>
        </div>
      </section>
    </section>
  `
})
export class ContactsPageComponent {

  protected readonly userContext = inject(UserContextService)

}
