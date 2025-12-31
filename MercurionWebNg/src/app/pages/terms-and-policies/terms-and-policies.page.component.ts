import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject
} from '@angular/core'
import { RouterLink, ActivatedRoute } from '@angular/router'
import { Subscription, startWith } from 'rxjs'
import { AppContextService } from '../../services/context/app-context.service'

@Component({
  selector: 'm-terms-and-policies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="main-container leading-7" role="main" aria-labelledby="terms-heading">
      <!-- TERMINI DI SERVIZIO -->
      <header #termsHeader id="terms">
        <h1 id="terms-heading" class="h1-underline">Termini di Servizio di Mercurion</h1>
        <p><strong>Ultimo aggiornamento:</strong> {{ lastUpdated }}</p>
      </header>

      <section aria-label="Introduzione Termini di Servizio">
        <p>
          Le presenti Condizioni Generali di Utilizzo (di seguito <strong>"Termini di Servizio"</strong> o semplicemente
          <strong>"Termini"</strong>) disciplinano l’accesso e l’utilizzo dell’applicazione web Mercurion (di seguito
          <strong>"Applicazione"</strong> o <strong>"Servizio"</strong>).
        </p>
        <p class="mt-4">
          Utilizzando Mercurion, l’utente dichiara di aver letto, compreso e accettato i presenti Termini di Servizio e
          l’<a class="a" routerLink="/privacy"><strong>Informativa sulla Privacy</strong></a> relativa al trattamento dei dati personali.
        </p>
      </section>

      <section aria-label="Oggetto del servizio">
        <h2 class="h2">1. Oggetto del Servizio</h2>
        <p>
          Mercurion è una piattaforma software che consente di organizzare, gestire e analizzare dati e progetti tecnici,
          con particolare attenzione all’ambito chimico e molecolare. Il Servizio è destinato a utenti maggiorenni e a
          scopi professionali, di studio o di ricerca.
        </p>
        <p class="mt-4">
          Mercurion non fornisce consulenza medica, farmaceutica, regolatoria o legale. Le informazioni e i dati trattati
          tramite il Servizio non devono essere utilizzati come unico elemento per assumere decisioni cliniche,
          regolatorie o di sicurezza senza un’adeguata validazione e il coinvolgimento di professionisti qualificati.
        </p>
      </section>

      <section aria-label="Registrazione e requisiti">
        <h2 class="h2">2. Registrazione dell’account e requisiti dell’utente</h2>
        <p>
          Per utilizzare il Servizio è necessario creare un account fornendo dati veritieri, completi e aggiornati. Con la
          registrazione l’utente dichiara e garantisce che:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>ha compiuto almeno 18 anni</li>
          <li>non utilizza il Servizio per conto di terzi senza autorizzazione</li>
          <li>non si spaccia per un’altra persona o ente</li>
        </ul>
        <p>
          L’utente è responsabile dell’accuratezza delle informazioni fornite e del loro aggiornamento, ove necessario.
        </p>
      </section>

      <section aria-label="Sicurezza account">
        <h2 class="h2">3. Sicurezza dell’account</h2>
        <p>
          L’utente è responsabile della riservatezza delle proprie credenziali di accesso e di ogni attività svolta tramite
          il proprio account. È vietato condividere deliberatamente le credenziali con terzi o consentire l’uso del proprio
          account ad altre persone.
        </p>
        <p class="mt-4">
          Il Titolare adotta misure di sicurezza tecniche e organizzative, tra cui l’hash delle password con Argon2id e
          meccanismi di device trust e, ove disponibili, autenticazione a più fattori. L’utente si impegna a:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>scegliere una password robusta e mantenerla segreta</li>
          <li>non disattivare o aggirare i sistemi di sicurezza del Servizio</li>
          <li>informare tempestivamente il Titolare in caso di accessi sospetti o non autorizzati</li>
        </ul>
        <p>
          In presenza di sospetto abuso o compromissione dell’account, il Titolare potrà sospendere temporaneamente
          l’accesso per effettuare verifiche di sicurezza.
        </p>
      </section>

      <section aria-label="Licenza d uso">
        <h2 class="h2">4. Licenza d’uso del Servizio</h2>
        <p>
          Fermo restando ogni diritto di proprietà intellettuale del Titolare, all’utente è concessa una
          <strong>licenza d’uso limitata, non esclusiva, non trasferibile e revocabile</strong> a utilizzare Mercurion
          secondo i presenti Termini.
        </p>
        <p class="mt-4">È espressamente vietato, salvo quanto consentito dalla legge inderogabile:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>concedere in sub-licenza, affittare, vendere, rivendere o distribuire il Servizio a terzi</li>
          <li>aggirare le limitazioni tecniche o i meccanismi di controllo dell’Applicazione</li>
          <li>effettuare reverse engineering del codice, salvo nei limiti consentiti dalla legge</li>
          <li>
            utilizzare il Servizio per sviluppare o addestrare un servizio concorrente copiando in modo sistematico
            funzionalità, struttura o interfaccia.
          </li>
        </ul>
        <p>
          Il Servizio può essere offerto in forma gratuita o a pagamento. L’eventuale introduzione di piani a pagamento
          o cambiamenti sostanziali delle condizioni economiche sarà comunicata all’utente con congruo preavviso.
        </p>
      </section>

      <section aria-label="Contenuti utente">
        <h2 class="h2">5. Contenuti caricati dall’utente</h2>
        <p>
          L’utente mantiene la piena titolarità e responsabilità sui dati e sui contenuti caricati, importati o generati
          tramite il Servizio (es. progetti, dataset, collezioni molecolari, note, file).
        </p>
        <p class="mt-4">
          Caricando contenuti su Mercurion, l’utente concede al Titolare una <strong>licenza limitata</strong>, non
          esclusiva e revocabile, a memorizzarli, elaborarli e visualizzarli nella misura strettamente necessaria per
          fornire il Servizio e adempiere agli obblighi di legge.
        </p>
        <p class="mt-4">
          I contenuti dell’utente non sono utilizzati per finalità di marketing o profilazione e non vengono utilizzati
          per addestrare modelli di terze parti, salvo diverso e specifico consenso espresso dall’utente e adeguato
          aggiornamento dei presenti Termini.
        </p>
        <p class="mt-4">
          L’utente garantisce di avere tutti i diritti necessari per caricare e trattare tali contenuti tramite Mercurion
          e si impegna a non violare diritti di terzi (tra cui diritti d’autore, segreti industriali o contratti di
          riservatezza).
        </p>
      </section>

      <section aria-label="Uso consentito">
        <h2 class="h2">6. Uso consentito del Servizio</h2>
        <p>
          L’utente si impegna a utilizzare Mercurion nel rispetto della legge, dei presenti Termini di Servizio e della
          <strong>Politica di Utilizzo Accettabile</strong> riportata nella seconda parte di questa pagina.
        </p>
        <p class="mt-4">
          Qualsiasi utilizzo in violazione dei presenti Termini o della Politica di Utilizzo Accettabile potrà comportare
          la sospensione o la chiusura dell’account, oltre ad eventuali azioni legali ove necessario.
        </p>
      </section>

      <section aria-label="Disponibilita e modifiche">
        <h2 class="h2">7. Disponibilità, modifiche e manutenzione del Servizio</h2>
        <p>
          Mercurion è fornito secondo il principio <em>"così com’è" e "come disponibile"</em>. Il Titolare potrà in ogni
          momento modificare, aggiornare, limitare o interrompere, in tutto o in parte, il Servizio o singole
          funzionalità, per motivi tecnici, operativi o di sicurezza.
        </p>
        <p class="mt-4">
          Il Titolare si impegna, per quanto ragionevolmente possibile, a evitare interruzioni prolungate del Servizio
          e ad effettuare gli interventi di manutenzione privilegiando fasce orarie che riducano l’impatto sugli utenti.
          Tuttavia non è garantita la disponibilità continua o priva di errori dell’Applicazione.
        </p>
      </section>

      <section aria-label="Esclusione di garanzie">
        <h2 class="h2">8. Esclusione di garanzie</h2>
        <p>
          Nei limiti consentiti dalla legge applicabile, il Servizio è fornito senza garanzie espresse o implicite di
          alcun tipo, incluse, a titolo esemplificativo, le garanzie di idoneità a uno scopo specifico, continuità del
          servizio, accuratezza o affidabilità dei risultati.
        </p>
        <p class="mt-4">
          L’utente comprende e accetta che ogni uso di Mercurion, inclusa l’interpretazione di dati, calcoli o output
          generati tramite l’Applicazione, avviene sotto la propria esclusiva responsabilità e previa verifica critica
          e, ove necessario, sperimentale.
        </p>
      </section>

      <section aria-label="Limitazione responsabilita">
        <h2 class="h2">9. Limitazione di responsabilità</h2>
        <p>
          Nei limiti massimi consentiti dalla legge, il Titolare non potrà essere ritenuto responsabile per:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>danni indiretti, incidentali, consequenziali o perdita di profitti</li>
          <li>perdita o corruzione di dati non imputabile a dolo o colpa grave</li>
          <li>
            decisioni tecniche, scientifiche, cliniche o regolatorie adottate dall’utente sulla base di dati o
            informazioni trattate tramite il Servizio senza adeguata verifica e competenza professionale
          </li>
          <li>uso del Servizio in contesti ad alto rischio non espressamente previsti o autorizzati.</li>
        </ul>
        <p>
          Nessuna disposizione dei presenti Termini esclude o limita la responsabilità del Titolare nei casi in cui ciò
          non sia consentito dalla legge applicabile.
        </p>
      </section>

      <section aria-label="Proprieta intellettuale">
        <h2 class="h2">10. Proprietà intellettuale</h2>
        <p>
          Il nome <strong>"Mercurion"</strong>, il relativo logo, l’interfaccia utente, il codice sorgente, le
          architetture software e ogni altro elemento distintivo dell’Applicazione sono e restano di esclusiva proprietà
          del Titolare o dei rispettivi licenzianti.
        </p>
        <p class="mt-4">
          È vietato utilizzare marchi, loghi o altri segni distintivi di Mercurion in modo tale da generare confusione
          circa l’origine del Servizio o l’esistenza di rapporti di affiliazione o sponsorizzazione non autorizzati.
        </p>
      </section>

      <section aria-label="Sospensione e chiusura">
        <h2 class="h2">11. Sospensione e chiusura dell’account</h2>
        <p>
          L’utente può richiedere in qualsiasi momento la chiusura del proprio account secondo le modalità indicate
          nell’Applicazione o contattando il Titolare ai recapiti forniti.
        </p>
        <p class="mt-4">
          Il Titolare si riserva inoltre la facoltà di sospendere o chiudere l’account dell’utente, con o senza preavviso,
          in caso di:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>violazioni gravi o ripetute dei presenti Termini o della Politica di Utilizzo Accettabile</li>
          <li>attività fraudolente, abusive o che mettano a rischio la sicurezza del Servizio o di altri utenti</li>
          <li>obblighi derivanti da legge, regolamenti o ordini delle autorità competenti</li>
        </ul>
        <p>
          In caso di chiusura dell’account, il trattamento e la conservazione dei dati seguiranno quanto descritto
          nell’<a class="a" routerLink="/privacy">Informativa sulla Privacy di Mercurion</a>.
        </p>
      </section>

      <section aria-label="Modifiche ai termini">
        <h2 class="h2">12. Modifiche ai Termini di Servizio</h2>
        <p>
          Il Titolare si riserva il diritto di modificare o aggiornare in qualsiasi momento i presenti Termini di
          Servizio, ad esempio per adeguamenti tecnici, normativi o di sicurezza.
        </p>
        <p class="mt-4">
          Le modifiche saranno pubblicate su questa pagina con indicazione della data di aggiornamento. L’uso continuato
          del Servizio successivamente alla pubblicazione delle modifiche costituisce accettazione delle nuove condizioni.
        </p>
      </section>

      <section aria-label="Legge applicabile e foro competente">
        <h2 class="h2">13. Legge applicabile e foro competente</h2>
        <p>
          I presenti Termini di Servizio sono regolati dalla <strong>legge italiana</strong>, fatto salvo l’eventuale
          applicazione di norme imperative di tutela del consumatore, ove applicabili.
        </p>
        <p class="mt-4">
          Per ogni controversia relativa alla validità, interpretazione o esecuzione dei presenti Termini sarà competente
          in via esclusiva il foro del luogo di residenza o domicilio del Titolare, salvo diversa previsione imperativa
          della legge applicabile.
        </p>
      </section>

      <section aria-label="Collegamento informativa privacy">
        <h2 class="h2">14. Informativa sulla Privacy</h2>
        <p>
          Per informazioni dettagliate sul trattamento dei dati personali degli utenti, inclusi diritti, finalità e
          modalità del trattamento, si rinvia all’<strong><a class="a" routerLink="/privacy">Informativa sulla Privacy di Mercurion</a></strong>, disponibile
          nell’apposita sezione dell’Applicazione.
        </p>
      </section>

      <!-- SEPARATORE TRA TERMINI E POLITICHE DI UTILIZZO -->
      <hr class="my-12 border-slate-300 dark:border-slate-700" />

      <!-- POLITICA DI UTILIZZO ACCETTABILE -->
      <header #aupHeader id="aup">
        <h2 class="h1-sm">Politica di Utilizzo Accettabile di Mercurion</h2>
      </header>

      <section aria-label="Introduzione politica utilizzo">
        <p>
          La presente <strong>Politica di Utilizzo Accettabile</strong> (di seguito <strong>"AUP"</strong>) definisce i
          comportamenti consentiti e quelli vietati nell’utilizzo di Mercurion. Lo scopo è tutelare la sicurezza
          dell’Applicazione, dei dati e degli altri utenti, nonché garantire il rispetto delle leggi vigenti.
        </p>
        <p class="mt-4">
          L’utilizzo del Servizio implica l’accettazione della presente AUP, oltre che dei Termini di Servizio.
        </p>
      </section>

      <section aria-label="Principi generali utilizzo">
        <h2 class="h2">1. Principi generali di utilizzo</h2>
        <p>
          L’utente si impegna a utilizzare Mercurion in modo lecito, responsabile e conforme alla destinazione d’uso del
          Servizio, evitando qualsiasi comportamento che possa:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>violare diritti di terzi</li>
          <li>compromettere la sicurezza o la disponibilità dell’Applicazione</li>
          <li>determinare danni, anche potenziali, ad altri utenti o al Titolare</li>
        </ul>
      </section>

      <section aria-label="Sicurezza e integrita tecnica">
        <h2 class="h2">2. Sicurezza e integrità tecnica</h2>
        <p>È espressamente vietato utilizzare Mercurion per:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>tentare di aggirare sistemi di autenticazione o di sicurezza</li>
          <li>
            accedere, o tentare di accedere, a dati, account o risorse di altri utenti senza autorizzazione
          </li>
          <li>
            eseguire attività di scanning, probing, vulnerability assessment o penetration test non autorizzati
            sull’infrastruttura di Mercurion
          </li>
          <li>
            caricare, trasmettere o distribuire codice malevolo, malware, virus, trojan, ransomware o altri strumenti
            informatici dannosi
          </li>
          <li>
            porre in essere attacchi di tipo denial-of-service (DoS, DDoS) o altre attività che possano degradare le
            prestazioni del Servizio
          </li>
        </ul>
      </section>

      <section aria-label="Uso illecito o non autorizzato dei contenuti">
        <h2 class="h2">3. Uso illecito o non autorizzato dei contenuti</h2>
        <p>È vietato utilizzare Mercurion per caricare, archiviare o trattare contenuti che:</p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            violino diritti di proprietà intellettuale, segreti industriali o accordi di riservatezza di terzi
          </li>
          <li>
            includano dati o informazioni che l’utente non è legittimato a utilizzare o trasferire all’interno di Mercurion
          </li>
          <li>
            costituiscano materiale illecito secondo la normativa applicabile o che supportino attività criminali o
            fraudolente
          </li>
        </ul>
      </section>

      <section aria-label="Ambito chimico e scientifico">
        <h2 class="h2">4. Attività vietate in ambito chimico e scientifico</h2>
        <p>
          Mercurion è pensato per supportare attività lecite di ricerca, sviluppo e analisi in ambito chimico e
          molecolare. È severamente vietato utilizzare il Servizio per:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>
            progettare, sviluppare o ottimizzare sostanze chimiche o miscele destinate a scopi vietati dal diritto
            internazionale o dalla normativa applicabile (ad esempio armi chimiche o agenti tossici per uso bellico)
          </li>
          <li>
            supportare sperimentazioni o attività che violino normative di sicurezza, ambientali, etiche o sanitarie
          </li>
          <li>
            eludere requisiti regolatori o di sicurezza relativi alla gestione di sostanze pericolose o soggette a
            controllo
          </li>
        </ul>
      </section>

      <section aria-label="Uso eccessivo o anomalo delle risorse">
        <h2 class="h2">5. Uso eccessivo o anomalo delle risorse</h2>
        <p>
          L’utente si impegna a non utilizzare il Servizio in modo tale da sovraccaricare o compromettere l’infrastruttura
          o l’esperienza d’uso di altri utenti. È vietato, a titolo esemplificativo:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>automatizzare richieste massicce verso il Servizio aggirando eventuali limiti tecnici o di rate</li>
          <li>
            utilizzare script o strumenti automatici per esportare o replicare in blocco dati, interfacce o funzionalità
            dell’Applicazione
          </li>
          <li>
            aggirare i limiti previsti da eventuali piani di utilizzo o funzioni sperimentali (beta) messi a disposizione
            dal Titolare
          </li>
        </ul>
      </section>

      <section aria-label="Segnalazioni e misure">
        <h2 class="h2">6. Segnalazioni e misure in caso di violazione</h2>
        <p>
          Il Titolare può monitorare l’utilizzo del Servizio nella misura strettamente necessaria a garantire la sicurezza
          dell’infrastruttura, prevenire abusi e adempiere agli obblighi di legge, nel rispetto dell’<a class="a" routerLink="/privacy">Informativa sulla
          Privacy</a>.
        </p>
        <p class="mt-4">
          In caso di violazione, anche sospetta, della presente AUP, il Titolare potrà adottare una o più delle seguenti
          misure, a sua ragionevole discrezione:
        </p>
        <ul class="list-disc pl-6 mt-4 mb-4">
          <li>invio di avvisi o richieste di chiarimento all’utente</li>
          <li>sospensione temporanea dell’accesso al Servizio</li>
          <li>limitazione di specifiche funzionalità o risorse</li>
          <li>chiusura dell’account in caso di violazioni gravi o reiterate</li>
          <li>segnalazione alle autorità competenti, ove previsto dalla legge</li>
        </ul>
        <p>
          L’utente è invitato a segnalare eventuali abusi o utilizzi sospetti del Servizio contattando il Titolare
          all’indirizzo email indicato nei Termini di Servizio.
        </p>
      </section>

      <section aria-label="Aggiornamenti AUP">
        <h2 class="h2">7. Aggiornamenti della Politica di Utilizzo Accettabile</h2>
        <p>
          Il Titolare può aggiornare periodicamente la presente Politica di Utilizzo Accettabile per motivi tecnici, di
          sicurezza, normativi o organizzativi.
        </p>
        <p class="mt-4">
          Le modifiche saranno pubblicate su questa pagina con indicazione della data di aggiornamento. L’utilizzo
          continuato del Servizio successivamente alla pubblicazione delle modifiche costituisce accettazione della
          versione aggiornata della presente AUP.
        </p>
      </section>
    </main>
  `
})
export class TermsAndPoliciesPageComponent implements AfterViewInit, OnDestroy {
  lastUpdated = '29/12/2025'

  private readonly route = inject(ActivatedRoute)
  private readonly appContext = inject(AppContextService)

  @ViewChild('termsHeader') termsHeaderRef!: ElementRef<HTMLElement>
  @ViewChild('aupHeader') aupHeaderRef!: ElementRef<HTMLElement>

  private scrollRootRef?: ElementRef<HTMLElement>
  private fragmentSub?: Subscription
  private viewReady = false
  private pendingFragment: string | null = null

  constructor() {
    effect(() => {
      const rootRef = this.appContext.globalScollRootRef()
      if (!rootRef) return

      this.scrollRootRef = rootRef

      if (this.viewReady && this.pendingFragment !== null) {
        const frag = this.pendingFragment
        this.pendingFragment = null
        queueMicrotask(() => this.applyFragment(frag))
      }
    })
  }

  ngAfterViewInit(): void {
    this.viewReady = true
    this.appContext.notifyRequestGlobalScrollRootRefTick()

    this.fragmentSub = this.route.fragment
      .pipe(startWith(this.route.snapshot.fragment))
      .subscribe(frag => {
        if (!this.scrollRootRef) {
          this.pendingFragment = frag ?? null
          return
        }
        this.applyFragment(frag)
      })

    if (this.scrollRootRef && this.pendingFragment !== null) {
      const frag = this.pendingFragment
      this.pendingFragment = null
      queueMicrotask(() => this.applyFragment(frag))
    }
  }

  ngOnDestroy(): void {
    this.fragmentSub?.unsubscribe()
  }

  private applyFragment(frag: string | null | undefined): void {
    if (!this.scrollRootRef) return

    // aspetta che l'altezza dell'header sia disponibile per evitare offset errati
    const hh = this.appContext.headerHeight()
    if (hh <= 0) {
      requestAnimationFrame(() => this.applyFragment(frag))
      return
    }

    // due fasi: rAF per layout stabilizzato, setTimeout per lasciare finire lo scroll restoration del router
    requestAnimationFrame(() => {
      setTimeout(() => {
        const rootEl = this.scrollRootRef!.nativeElement
        const headerOffset = Math.max(0, hh) + 10

        let targetEl: HTMLElement | null = null

        if (!frag || frag === 'terms') {
          targetEl = this.termsHeaderRef?.nativeElement ?? null
        } else if (frag === 'aup') {
          targetEl = this.aupHeaderRef?.nativeElement ?? null
        } else {
          targetEl = this.termsHeaderRef?.nativeElement ?? null
        }

        if (!targetEl) return

        const y = Math.max(0, this.appContext.getScrollYRelativeToRoot(targetEl, rootEl) - headerOffset)
        this.appContext.smoothTo(this.scrollRootRef, y, 240)
      }, 20)
    })
  }

}
