import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'm-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="main-container leading-7">
      <header>
        <h1 class="h1-underline">Informativa sulla Privacy di Mercurion</h1>
        <p><strong>Ultimo aggiornamento:</strong> {{ lastUpdated }}</p>
      </header>

      <section aria-label="Introduzione">
        <p>
          La presente Privacy Policy descrive le modalità con cui Mercurion (di seguito “Applicazione” o “Servizio”)
          raccoglie, utilizza e protegge i dati personali degli utenti, nel rispetto del
          <strong>Regolamento (UE) 2016/679 (“GDPR”)</strong>.
          Mercurion è progettata secondo principi di <strong>minimizzazione dei dati</strong>, <strong>sicurezza</strong> e
          <strong>trasparenza</strong>.
        </p>
      </section>

      <section aria-label="Titolare del trattamento">
        <h2 class="h2">1. Titolare del trattamento</h2>
        <p>
          <span class="inline-block mb-2">Il Titolare del trattamento dei Dati è:</span><br />
          <strong>{{ dataControllerName }}</strong><br />
          <strong>Sede:</strong> {{ dataControllerLocation }}<br />
          <strong>Email di contatto:&nbsp;&nbsp;</strong>
          <a class="a" [href]="'mailto:' + dataControllerEmail">{{ dataControllerEmail }}</a><br />
          <strong>PEC:&nbsp;&nbsp;</strong>
          <span class="font-semibold">{{ dataControllerPec }}</span>
        </p>
        <p>
          Per qualunque richiesta relativa al trattamento dei dati personali è possibile contattare il Titolare ai recapiti indicati.
        </p>
      </section>

      <section aria-label="Tipologie di dati trattati">
        <h2 class="h2">2. Tipologie di dati trattati</h2>
        <p>
          L’Applicazione tratta esclusivamente i dati strettamente necessari al funzionamento del Servizio.
          L’Applicazione <strong>non</strong> esercita alcun trattamento dati a scopo di profilazione o marketing,
          neanche in forma anonimizzata o pseudonimizzata.
        </p>

        <h3 class="h3">2.1 Dati forniti dall’utente</h3>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            <strong>Dati necessari (obbligatori)</strong> per la creazione e gestione dell’account:
            <em>indirizzo email, nome, cognome</em>.
          </li>
          <li>
            <strong>Dati facoltativi</strong> (forniti solo se l’utente lo desidera):
            <em>genere e impiego</em>. Se non forniti, il Servizio resta utilizzabile.
          </li>
          <li>
            <strong>Credenziali di autenticazione:</strong> password memorizzata esclusivamente in forma hashata con tecnologia
            Argon2id associata a pepper.
          </li>
          <li>
            <strong>Eventuali dati inseriti volontariamente</strong> all’interno dell’Applicazione (es. contenuti, note, preferenze, ecc.).
          </li>
        </ul>

        <h3 class="h3">2.2 Dati tecnici e di utilizzo</h3>
        <p>Durante l’uso del Servizio possono essere raccolti automaticamente:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>indirizzo IP</li>
          <li>user agent del browser</li>
          <li>informazioni tecniche relative al dispositivo e al sistema operativo</li>
          <li>
            informazioni tecniche del dispositivo utilizzate per creare un identificatore di sicurezza (device trust) al solo fine di
            rilevare accessi sospetti e proteggere l’account (es. attivazione del secondo fattore di autenticazione). Tali informazioni
            non sono utilizzate per marketing o profilazione, non sono condivise con terze parti e sono trattate secondo principi di
            minimizzazione e conservate solo per il tempo necessario alla sicurezza dell’account.
          </li>
          <li>log di accesso e di sistema (es. eventi tecnici, errori, sicurezza)</li>
        </ul>
      </section>

      <section aria-label="Finalità del trattamento">
        <h2 class="h2">3. Finalità del trattamento</h2>
        <p>I dati personali sono trattati per le seguenti finalità:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>fornire il Servizio e consentire l’accesso all’account utente</li>
          <li>garantire il corretto funzionamento tecnico dell’Applicazione</li>
          <li>prevenire abusi, accessi non autorizzati e attività fraudolente</li>
          <li>garantire la sicurezza dell’infrastruttura</li>
          <li>adempiere ad obblighi di legge</li>
        </ul>

        <p>
          <strong>Dati facoltativi (genere e impiego):</strong> se forniti, sono usati esclusivamente per completare il profilo utente
          e migliorare l’esperienza d’uso <em>all’interno</em> dell’Applicazione. Non sono usati per marketing o profilazione.
        </p>
      </section>

      <section aria-label="Base giuridica">
        <h2 class="h2">4. Base giuridica del trattamento</h2>
        <p>Il trattamento dei dati personali si basa su:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            <strong>Esecuzione di un contratto</strong> o misure precontrattuali (art. 6, par. 1, lett. b GDPR) – per i dati necessari
            all’erogazione del Servizio.
          </li>
          <li>
            <strong>Adempimento di obblighi legali</strong> (art. 6, par. 1, lett. c GDPR) – ove applicabile.
          </li>
          <li>
            <strong>Legittimo interesse</strong> del Titolare (art. 6, par. 1, lett. f GDPR) – sicurezza, prevenzione abusi e corretto
            funzionamento del Servizio.
          </li>
          <li>
            <strong>Consenso</strong> (art. 6, par. 1, lett. a GDPR) – limitatamente ai <em>dati facoltativi</em> forniti volontariamente
            dall’utente (genere e impiego), revocabile in qualsiasi momento rimuovendo tali dati dal profilo o contattando il Titolare.
          </li>
        </ul>
      </section>

      <section aria-label="Conservazione">
        <h2 class="h2">5. Conservazione dei dati</h2>
        <p>I dati personali sono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            <strong>Dati dell’account:</strong> per tutta la durata dell’account dell’utente. In caso di cancellazione dell’account,
            i dati sono eliminati o anonimizzati entro <strong>{{ accountDeletionGraceDays }} giorni</strong>, salvo obblighi di legge.
          </li>
          <li>
            <strong>Log tecnici e di sicurezza:</strong> conservati per <strong>{{ logRetentionDays }} giorni</strong>, salvo necessità di
            estensione in caso di incidenti di sicurezza o richieste delle autorità competenti.
          </li>
          <li>
            <strong>Backup:</strong> conservati per un massimo di <strong>{{ backupRetentionDays }} giorni</strong> per garantire
            l’integrità del sistema, quindi sovrascritti/eliminati.
          </li>
        </ul>
        <p>Al termine dei periodi di conservazione, i dati vengono cancellati o resi anonimi.</p>
      </section>

      <section aria-label="Cookie">
        <h2 class="h2">6. Cookie e tecnologie analoghe</h2>
        <p>
          L’Applicazione utilizza esclusivamente <strong>cookie tecnici</strong> strettamente necessari al funzionamento del Servizio,
          inclusi cookie di sessione e di sicurezza, e cookie utilizzati da servizi di protezione dell’infrastruttura (es. Cloudflare).
          Tutti i cookie sono impostati, ove possibile, con attributo <code>SameSite=Strict</code>.
        </p>
        <p>
          Non vengono utilizzati cookie di profilazione, cookie di marketing o strumenti di tracciamento a fini pubblicitari.
          Per tali motivi <strong>non è richiesto alcun consenso preventivo</strong> e <strong>non</strong> viene utilizzato alcun banner
          di accettazione dei cookie.
        </p>
      </section>

      <section aria-label="Fornitori terzi">
        <h2 class="h2">7. Fornitori e servizi di terze parti</h2>
        <p>L’Applicazione si avvale esclusivamente di fornitori tecnici necessari al funzionamento del Servizio, tra cui:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li><strong>Cloudflare</strong> (CDN e sicurezza, prevenzione abusi e attacchi)</li>
          <li><strong>Hosting provider</strong> (infrastruttura server e storage) – <em>{{ hostingProviderName }}</em></li>
          <li>
            <strong>Provider email</strong> per comunicazioni transazionali/di servizio (se applicabile) –
            <em>{{ emailProviderName }}</em>
          </li>
        </ul>
        <p>
          Tali soggetti trattano dati personali solo nella misura necessaria all’erogazione dei rispettivi servizi e nel rispetto della
          normativa applicabile. L’elenco aggiornato dei fornitori/Responsabili del trattamento può essere richiesto al Titolare.
        </p>
      </section>

      <section aria-label="Trasferimenti extra UE">
        <h2 class="h2">8. Trasferimenti verso paesi extra UE/SEE</h2>
        <p>
          Alcuni fornitori tecnici possono trattare dati anche al di fuori dell’Unione Europea/SEE. In tali casi, i trasferimenti
          avvengono nel rispetto del GDPR e mediante garanzie adeguate, quali (ove applicabili)
          <strong>Clausole Contrattuali Standard (SCC)</strong> e/o altre misure previste dalla normativa.
        </p>
      </section>

      <section aria-label="Diritti dell'utente">
        <h2 class="h2">9. Diritti dell’utente</h2>
        <p>Gli utenti possono esercitare i diritti previsti dal GDPR, tra cui:</p>
        <ul class="list-disc pl-6 mt-4">
          <li>accesso ai propri dati personali</li>
          <li>rettifica o aggiornamento</li>
          <li>cancellazione (“diritto all’oblio”)</li>
          <li>limitazione del trattamento</li>
          <li>opposizione al trattamento</li>
          <li>portabilità dei dati</li>
        </ul>
        <p class="mt-8">
          Le richieste possono essere inviate all’indirizzo email del Titolare:
          <a [href]="'mailto:' + dataControllerEmail">{{ dataControllerEmail }}</a>.
          Il Titolare risponderà entro i termini di legge.
        </p>
        <p>
          L’utente ha inoltre il diritto di proporre reclamo al <strong>Garante per la protezione dei dati personali</strong>
          o all’autorità di controllo competente.
        </p>
      </section>

      <section aria-label="Modifiche policy">
        <h2 class="h2">10. Modifiche alla presente informativa</h2>
        <p>
          Il Titolare si riserva il diritto di modificare la presente Privacy Policy in qualunque momento.
          Le modifiche saranno pubblicate su questa pagina con indicazione della data di aggiornamento.
        </p>
      </section>
    </section>
  `
})
export class PrivacyPageComponent {
  // Meta
  lastUpdated = '29/12/2025'

  // Data controller
  dataControllerName = 'Giulio Marinelli'
  dataControllerLocation = 'Italia'
  dataControllerEmail = 'mercurion.app@gmail.com'
  dataControllerPec = 'giuliomarinelli25@pec.it'

  // Retention (tweak these)
  accountDeletionGraceDays = 30
  logRetentionDays = 30
  backupRetentionDays = 30

  // Providers (optional but nice to be explicit)
  hostingProviderName = 'Google Cloud Platform'
  emailProviderName = 'Non ancora definito (servizio email non attivo al momento)'
}
