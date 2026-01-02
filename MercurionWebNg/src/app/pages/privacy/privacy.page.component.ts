import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'm-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <main class="main-container leading-7" role="main" aria-labelledby="privacy-heading">
      <header>
        <h1 id="privacy-heading" class="h1-underline">Informativa sulla Privacy di Mercurion</h1>
        <p><strong>Ultimo aggiornamento:</strong> {{ lastUpdated }}</p>
      </header>

      <section aria-label="Introduzione">
        <p>
          La presente Privacy Policy descrive le modalità con cui Mercurion (di seguito “Applicazione” o “Servizio”)
          raccoglie, utilizza e protegge i dati personali degli utenti, nel rispetto del
          <strong>Regolamento (UE) 2016/679 (“GDPR”)</strong>.
          Mercurion è progettata secondo principi di <strong>minimizzazione dei dati</strong>,
          <strong>sicurezza</strong> e <strong>trasparenza</strong>.
        </p>
      </section>

      <section aria-label="Titolare del trattamento">
        <h2 class="h2">1. Titolare del trattamento</h2>
        <p>
          <strong>{{ dataControllerName }}</strong><br />
          <strong>Sede:</strong> {{ dataControllerLocation }}<br />
          <strong>Email di contatto:</strong>
          <a class="a" [href]="'mailto:' + dataControllerEmail">{{ dataControllerEmail }}</a><br />
          <strong>PEC:</strong> {{ dataControllerPec }}
        </p>
      </section>

      <section aria-label="Tipologie di dati trattati">
        <h2 class="h2">2. Tipologie di dati trattati</h2>
        <p>
          L’Applicazione tratta esclusivamente i dati strettamente necessari al funzionamento del Servizio.
          Non vengono effettuati trattamenti a fini di marketing, profilazione o pubblicità,
          neppure in forma anonimizzata o pseudonimizzata.
        </p>

        <h3 class="h3">2.1 Dati forniti dall’utente</h3>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            <strong>Dati obbligatori:</strong> indirizzo email, nome e cognome.
          </li>

          <li>
            <strong>Dati facoltativi:</strong> genere e impiego, utilizzati esclusivamente per il completamento del profilo utente.
          </li>

          <li>
            <strong>Credenziali di autenticazione:</strong> password memorizzata esclusivamente in forma hashata
            mediante algoritmo Argon2id con pepper.
          </li>

          <li>
            <strong>Numero di telefono (facoltativo):</strong>
            fornito solo se l’utente desidera abilitare funzionalità aggiuntive di sicurezza.
            Il numero è utilizzato esclusivamente per:
            <ul class="list-disc pl-6 mt-2">
              <li>invio di codici di accesso temporanei (OTP) o verifiche aggiuntive;</li>
              <li>notifiche di sicurezza rilevanti (es. accessi sospetti, eventi critici dell’account);</li>
              <li>eventuali procedure di recupero dell’account.</li>
            </ul>
            Il numero <strong>non</strong> è utilizzato per marketing, comunicazioni promozionali o profilazione
            e <strong>non</strong> è ceduto a terzi per finalità commerciali.
            Il conferimento è facoltativo e la mancata fornitura non pregiudica l’uso del Servizio.
          </li>

          <li>
            <strong>Comunicazioni via email:</strong>
            l’indirizzo email è utilizzato esclusivamente per comunicazioni transazionali e di sicurezza,
            quali verifica dell’account, recupero password, codici di accesso, avvisi di sicurezza
            e notifiche relative a modifiche rilevanti dell’account.
            <strong>Non</strong> vengono inviate newsletter o comunicazioni di marketing.
          </li>

          <li>
            <strong>Dati inseriti volontariamente:</strong> contenuti, note e informazioni fornite dall’utente
            durante l’uso dell’Applicazione.
          </li>
        </ul>

        <h3 class="h3">2.2 Dati tecnici e di utilizzo</h3>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>indirizzo IP</li>
          <li>user agent del browser</li>
          <li>informazioni tecniche su dispositivo e sistema operativo</li>
          <li>
            identificatori tecnici di sicurezza (device trust) utilizzati esclusivamente
            per prevenzione abusi e protezione dell’account
          </li>
          <li>log di accesso e di sistema</li>
        </ul>
      </section>

      <section aria-label="Finalità del trattamento">
        <h2 class="h2">3. Finalità del trattamento</h2>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>erogazione del Servizio e gestione dell’account</li>
          <li>sicurezza, prevenzione abusi e accessi non autorizzati</li>
          <li>invio di email e SMS di sicurezza (codici di accesso, notifiche critiche)</li>
          <li>adempimento di obblighi di legge</li>
        </ul>
      </section>

      <section aria-label="Base giuridica">
        <h2 class="h2">4. Base giuridica del trattamento</h2>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>esecuzione del contratto (art. 6.1.b GDPR)</li>
          <li>adempimento di obblighi legali (art. 6.1.c GDPR)</li>
          <li>legittimo interesse alla sicurezza del Servizio (art. 6.1.f GDPR)</li>
          <li>
            consenso dell’utente limitatamente ai dati facoltativi
            (numero di telefono per notifiche di sicurezza)
          </li>
        </ul>
      </section>

      <section aria-label="Conservazione">
        <h2 class="h2">5. Conservazione dei dati</h2>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            <strong>Dati dell’account:</strong> conservati fino alla cancellazione dell’account
            e rimossi entro {{ accountDeletionGraceDays }} giorni.
          </li>
          <li>
            <strong>Numero di telefono:</strong> conservato finché presente nel profilo utente
            e rimosso entro {{ accountDeletionGraceDays }} giorni dalla cancellazione o rimozione.
          </li>
          <li>
            <strong>Log tecnici e di sicurezza:</strong> conservati per {{ logRetentionDays }} giorni.
          </li>
          <li>
            <strong>Backup:</strong> conservati per {{ backupRetentionDays }} giorni.
          </li>
        </ul>
      </section>

      <section aria-label="Cookie">
        <h2 class="h2">6. Cookie</h2>
        <p>
          Sono utilizzati esclusivamente cookie tecnici e di sicurezza.
          Non sono utilizzati cookie di profilazione o marketing
          e non è richiesto alcun consenso preventivo.
        </p>
      </section>

      <section aria-label="Fornitori terzi">
        <h2 class="h2">7. Fornitori terzi</h2>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li><strong>Cloudflare</strong> – CDN e sicurezza</li>
          <li><strong>Hosting provider:</strong> {{ hostingProviderName }}</li>
          <li><strong>Provider email transazionali:</strong> {{ emailProviderName }}</li>
          <li><strong>Provider SMS:</strong> {{ smsProviderName }}</li>
        </ul>
      </section>

      <section aria-label="Diritti dell'utente">
        <h2 class="h2">8. Diritti dell’utente</h2>
        <p>
          L’utente può esercitare i diritti previsti dal GDPR (accesso, rettifica,
          cancellazione, limitazione, opposizione e portabilità)
          contattando il Titolare all’indirizzo:
          <a class="a" [href]="'mailto:' + dataControllerEmail">{{ dataControllerEmail }}</a>.
        </p>
      </section>

      <section aria-label="Modifiche policy">
        <h2 class="h2">9. Modifiche</h2>
        <p>
          Il Titolare si riserva il diritto di modificare la presente informativa.
          Le modifiche saranno pubblicate su questa pagina.
        </p>
      </section>
    </main>
  `
})
export class PrivacyPageComponent {
  lastUpdated = '02/01/2026'

  dataControllerName = 'Giulio Marinelli'
  dataControllerLocation = 'Italia'
  dataControllerEmail = 'mercurion.app@gmail.com'
  dataControllerPec = 'giuliomarinelli25@pec.it'

  accountDeletionGraceDays = 30
  logRetentionDays = 30
  backupRetentionDays = 30

  hostingProviderName = 'Google Cloud Platform'
  emailProviderName = 'Gmail'
  smsProviderName = 'Twilio'
}
