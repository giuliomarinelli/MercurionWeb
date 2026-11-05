# Blocco 15A — Home e benvenuto

25 ottobre 2026. **Implementato, in review.** Il blocco 15B su welcome e screenshot resta separato.

## Risultato

- Composizione centrata con pittogramma esistente, cornice molecolare SVG decorativa, nome, tagline e azioni. Gradienti statici discreti nei due temi, basati sui token esistenti; nessuna dipendenza aggiunta.
- Nome leggibile come un unico titolo accessibile; SVG e lettere decorative esclusi dall’albero accessibile. Conservati i tre collegamenti a welcome, login e registrazione. Descrizione sintetica ricavata dalle funzionalità già presentate in welcome, senza nuove promesse o riscrittura commerciale.
- Introduzione finita di un secondo: pittogramma 650 ms, lettere entro 815 ms, cornice 1.000 ms. Le CTA sono sempre visibili e utilizzabili: nessun delay o animazione sui link. Prima, il template configurava 8.250 ms di attesa più 650 ms per le CTA; questo dato precedente è statico, non una misura browser.
- `AppShellFacade.markHomePresented()` registra il valore esatto `'true'` tramite BrowserStorageRegistry quando viene presentata la home anonima. La lettura iniziale rimane una fotografia per la singola istanza: scrivere il flag non interrompe l’introduzione corrente. Nessuna scrittura durante ripristino sessione o stato autenticato; conservato anche il precedente marking sulle route welcome/login/register. Gli utenti già marcati saltano l’introduzione.
- Animazioni abilitate soltanto con `prefers-reduced-motion: no-preference`; stato statico completo nel caso reduce. Nessun timer applicativo o scroll aggiunto. Logo con dimensioni riservate, azioni in griglia e documento ancora proprietario dello scroll.

## Verifica locale

Baseline: 26 test superati. Risultato finale: **33 test superati** fra HomePageComponent e AppShellFacade, inclusi persistenza, valori non esattamente `'true'`, ripristino sessione, azioni immediate e geometria prima/dopo animazione. Prove con iframe a 320×568, 375×812, 639×320, 640×375 e 1440×900.

Typecheck/template Angular, ESLint mirato, policy typing/styling/semantica, build production e gate bundle/lazy riusciti. Bundle iniziale: **952.733 byte / 1.000.000**. Restano i warning precedenti del budget indicativo iniziale e dei CSS editor/create-collection/add-molecules; nessuna soglia modificata.

## Verifica browser

Chrome tramite Playwright su localhost:8888, runtime esistenti riutilizzati. Il logout è stato eseguito dall’utente; nessuna modifica delle sue credenziali. Usata e poi chiusa soltanto la scheda creata per le prove.

- 18 combinazioni nei due temi: 320×568, 375×812, 639×320, 640×375, 767×375, 768×375, 1024×768, 1280×768, 1440×900. Nessun overflow orizzontale; azioni contenute, alte almeno 50 px. A 640 px il primo testo può andare su due righe: la riga mantiene altezza uniforme di 74 px.
- Primo ingresso simulato rimuovendo temporaneamente soltanto il flag di presentazione: CTA con opacity 1 già al primo campione; rettangoli invariati dopo 1,2 s. Campione desktop intorno a 436 ms dalla navigazione; campioni telefono fra 462 e 770 ms. Tempi locali di sviluppo, senza throttling: non sono benchmark o Core Web Vitals di produzione. Durata massima effettiva delle animazioni: 1.000 ms.
- Reload prima di visitare le tre destinazioni e nuova scheda: nessun replay. Il flag torna `'true'` dopo ogni prova, senza toccare altri dati storage. Riavvio completo del browser non eseguito, per preservare le finestre dell’utente.
- Reduced motion verificato con media query effettivamente attiva: zero animazioni, tutte le lettere e CTA visibili. L’emulazione del tool si azzera al reload: la preferenza è stata quindi applicata e verificata sulla pagina montata. La prova con preferenza nativa attiva già prima del caricamento resta da confermare sul dispositivo.
- Tab percorre Scopri Mercurion → Accedi → Registrati, con outline di 3 px. Enter apre correttamente le tre destinazioni; il ritorno alla home non riavvia l’introduzione. Nessun modulo inviato o account creato.
- Viewport bassa 639×320: il documento scorre e Tab rende visibile Registrati (scroll 207,5 px, link a y=237,9–287,9). Nessun pannello interno che nasconda le azioni.
- Screenshot finali di desktop e telefono nei due temi ispezionati. Nessuna variazione delle coordinate delle CTA durante l’ingresso. Un campione di avvio ha registrato uno shift minimo di circa 0,000432 con sorgenti nel footer della shell iniziale, prima che la route home lo rimuova; un campione successivo non ha registrato shift. Non si dichiara CLS zero dell’intera applicazione: il seguito shell è registrato in PX-01.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-home-15a-2026-10-25/` — screenshot finali, misure browser e log. Non disponibile una cattura browser della versione precedente: il confronto iniziale si basa sul sorgente e sui test baseline. Emulazioni rimosse e viewport ripristinata a 1600×775 prima di chiudere la scheda.

## Review residua

Review estetica manuale, Safari fisico e preferenza nativa reduced motion; riapertura completa del browser. Il ripristino della sessione autenticata e il redirect dashboard sono coperti dai test esistenti della facade, senza nuovo login browser in questo blocco. Nessuna CI remota o operazione Git eseguita.

Prossimo blocco: **15B — Welcome e screenshot aggiornati**. La definizione del segmento clienti resta necessaria per una successiva riscrittura sostanziale del messaggio commerciale.
