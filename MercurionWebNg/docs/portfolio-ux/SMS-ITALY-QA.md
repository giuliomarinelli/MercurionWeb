# INF-02 — Destinatari SMS italiani

27 ottobre 2026. **Implementato, in review.** Twilio resta il provider; l’utente richiede esclusivamente numeri italiani con prefisso +39 perché il sender alfanumerico è abilitato soltanto per l’Italia. Il porting a SMS Hosting rimane superato.

## Perimetro

- Nel workflow Aggiungi/Modifica telefono, select originale e bandiera conservate; unico valore Italia +39, controllo disabilitato anche nel form reattivo. L’identificativo dell’Italia viene letto dalla risposta del catalogo, senza dipendere dal precedente ID fisso per la selezione finale.
- Contenitore focalizzabile con tooltip PrimeNG su focus/hover, stile già usato dall’app e spiegazione visibile anche senza tooltip. Il workflow invia sempre +39 come prefisso.
- Settings, Termini e Privacy dichiarano il vincolo sui numeri italiani. Nessuna nuova dichiarazione sull’identità della ditta o sull’esatto alias: i dati definitivi vanno confermati prima del deployment.
- `ChangePhoneDTO` ammette solo +39, conservando trim e validazione del numero nazionale. Il kernel rifiuta altri prefissi anche nelle chiamate dirette prima di intervenire sullo stato del cambio telefono.
- `SmsSenderService` controlla ogni destinatario prima di contattare Twilio, inclusi quelli già salvati e gli SMS di notifica. Per i destinatari non supportati restituisce un errore applicativo 422 con spiegazione pubblica priva del numero; la validazione DTO HTTP restituisce 400.
- `TWILIO_FROM` resta il mittente effettivo e può contenere l’alias configurato. `TWILIO_NUMBER`, inutilizzato dal servizio, diventa facoltativo per compatibilità con la configurazione precedente. Non sono stati letti o modificati file env, credenziali o impostazioni dell’account Twilio.

Nessuna migrazione automatica dei numeri, modifica delle strategie MFA, nuova generazione/verifica dei codici, retry dell’invio o nuova dipendenza. I tracciati SVG di workflow (24) e pannello contatti (4) sono stati confrontati con HEAD e restano identici. Il select condiviso non è stato modificato.

## Test e controlli

Baseline mirata: 9 test Nest e 23 Angular superati. Finale backend: **46 test in quattro suite**. Verificati ValidationPipe reale, rifiuto dei prefissi esteri, controllo prima della chiamata al client Twilio, sender alfanumerico, propagazione dei guasti senza retry, presentazione dell’errore in produzione e configurazione senza TWILIO_NUMBER.

La prova prima dei fix backend ha prodotto **10 fallimenti e 11 successi**: prefissi esteri accettati e destinatari non supportati passati al client del provider. Il client è simulato: nessun SMS inviato durante questi test.

La suite Angular (**44 test**, inclusi 7 canonici) esercita inizializzazione e submit del workflow reale con trasporto simulato: Italia con ID diverso da quello storico, bandiera, select bloccata, spiegazione persistente, tooltip da focus/hover e payload +39. Inclusi test esistenti di Settings, select, workflow e pagine informative. La prova browser ha rilevato un tooltip privo della superficie prevista; un test aggiunto per la classe e il background falliva prima della correzione. Verificato anche il body bloccato dopo uno scroll: il tooltip usa positionStyle="fixed" per evitare che l’offset negativo del body venga applicato due volte. Il test geometrico falliva prima del fix. Il primo tentativo di test frontend aveva invece un mock incompleto del facade: non è classificato come prova di un difetto del prodotto.

Comandi mirati, dalle rispettive directory:

```powershell
# MercurionWebNode
..\node_modules\.bin\jest.cmd --config ./jest.config.js --runInBand --runTestsByPath src/app_modules/auth/models/dto/change-phone.cls.dto.spec.ts src/app_modules/notification/services/sms-sender/sms-sender.service.spec.ts src/app_modules/auth/application/account-flow-kernel.spec.ts src/config/config-schema.spec.ts

# MercurionWebNg
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/components/action-components/sensitive-data-change/*.spec.ts --include=src/app/pages/settings/*.spec.ts --include=src/app/components/common/pm-select/pm-select.component.spec.ts --include=src/app/pages/privacy/privacy.page.component.spec.ts --include=src/app/pages/terms-and-policies/terms-and-policies.page.component.spec.ts
```

Typecheck/template e lint dei file modificati, styling con fixture negative e build Nest verificati. Finale Angular: 44 test superati e build production/gate bundle/lazy riusciti, iniziale 951.620 byte su 1.000.000. Il warning Angular sul binding disabled ridondante è stato eliminato: lo stato è governato dal FormControl e dal ControlValueAccessor esistente. La build Angular richiede `--stats-json` per eseguire poi i gate bundle/lazy; il primo tentativo senza quel parametro compilava ma non forniva l’artefatto necessario al gate. Warning preesistenti dei budget CSS e dell’iniziale da 500 kB conservati, nessuna soglia modificata.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-sms-italy-2026-10-27/`. Catture di sviluppo da anonimizzare prima di pubblicarle nel portfolio. Browser finale Chrome autenticato via Computer Use su localhost:8888: overlay Modifica telefono a 1280×900 e 375×812, entrambi i temi, screenshot ispezionati. Select realmente disabilitata, bandiera e +39 presenti, spiegazione visibile e tooltip con focus tastiera. In tutte e quattro le misure il bordo inferiore del tooltip coincide con il bordo superiore del contenitore focalizzato anche con body fissato a -156 / -297,5 px; nessun overflow orizzontale. Hover coperto dal test della direttiva, non certificato come prova manuale touch. Nessun errore console catturato. Tema automatico e viewport originale ripristinati, scheda di verifica chiusa.

Prova supplementare a 375×320: contenuto scorrevole e footer presenti, ma la misura immediata del campo focalizzato e la cattura successiva non rappresentano lo stesso stato di scroll/focus. Questa prova non certifica la gestione della tastiera o la permanenza del campo in vista; approfondimento nel blocco 19 e su Safari fisico. Cattura conservata come osservazione, non come evidenza di accettazione.

Prove principali: desktop-dark.png, desktop-light.png, mobile-dark.png, mobile-light.png, browser-measurements.json e log dei test/build. desktop-focus-before-fix.png e i log tooltip-red / tooltip-position-red documentano i difetti corretti. Nessun processo headless residuo al controllo dopo le suite; runtime dell’utente preservati. Nessuna CI remota o operazione Git eseguite.

## Accettazione residua

- **Prova reale in sviluppo superata, confermata dall’utente il 27 ottobre dopo l’aggiornamento delle credenziali Twilio.** Prova diretta eseguita dall’utente; nessun invio eseguito dall’agente. Percorso preciso, verifiche del mittente e dettaglio del risultato non acquisiti separatamente: non estendere questo esito a tutti i flussi OTP/MFA, staging o produzione.
- Eventuali account preesistenti con numeri esteri non sono convertiti o modificati: il controllo centralizzato ne blocca gli invii. La loro gestione va verificata esplicitamente prima del rilascio, senza disattivare MFA automaticamente.
- Identità della ditta, alias effettivo e attribuzione pubblica Mercurion–ditta–sender prima del deployment, secondo la roadmap VPS. Questa annotazione non certifica conformità legale o regolatoria.
- Safari fisico, intero blocco 19 / Settings, CI remota e review manuale restano distinti da questo intervento circoscritto.


## Correzioni successive al merge delle policy — 27 ottobre

**Select del telefono:** corrette altezza, allineamento, spessore e colore del bordo rispetto al floating input. Rimossi l’outline permanente e il bordo da 2 px del select in questo form. Label esterna su una riga di griglia comune: anche quando va a capo, i controlli affiancati rimangono allineati. Altezza 52 px, bordo normale 1 px e bordo di focus tastiera 2 px. Bandiera, freccia, select disabilitata, tooltip e vincolo +39 conservati; classi Tailwind circoscritte al form, nessuna modifica al componente select condiviso.

**Stato Settings dopo aggiunta/modifica/rimozione:** l’overlay pubblicava già profile/changed locale alla chiusura; SettingsAccountFacade lo ignorava perché accettava soltanto remote=true. Ora rilegge il profilo anche per l’evento locale e conserva il pannello durante il refresh. Il banner di sincronizzazione resta riservato agli eventi remoti. SettingsSecurityFacade ascolta anche la chiusura locale per riallineare l’eventuale disattivazione della MFA SMS dopo la rimozione del numero. Richieste di lettura e microtask protetti alla distruzione della pagina. Nessun tick globale, reload della pagina o modifica delle regole backend.

**Prove:** 59 test mirati superati, inclusi 7 canonici, poi 15 test della sicurezza rieseguiti dopo il posizionamento finale del cleanup RxJS (sottoinsieme, non da sommare). Test geometrici con CSS reale a 375/640/768/1280 px nei due temi, per Aggiungi e Modifica: altezza, bordi, allineamento, centratura della bandiera e overflow. Otto casi geometrici fallivano prima del fix; il log iniziale contiene anche un errore di isolamento del test sullo scroll, corretto senza considerarlo un difetto del prodotto. La prova di stato prima del fix lasciava nel pannello «Non aggiunto» dopo l’evento locale; dopo il fix il template reale passa assente → presente → modificato → assente attraverso risposte simulate. Coperti invalidazioni remote e distruzione con richiesta pendente; MFA SMS riallineata dopo rimozione simulata.

Typecheck/template, lint, styling/fixture negative, build production e gate bundle/lazy riusciti. Iniziale 952.698 / 1.000.000 byte; soglie invariate. Browser Chrome autenticato a 375/640/1280 px: misure di select/input da 52 px, bordi normali da 1 px con identico colore, allineamento esatto sulle colonne e nessun overflow. Controllati entrambi i temi e focus tastiera sul prefisso (bordo da 2 px). Catture finali ispezionate. I test delle mutazioni usano trasporti simulati; l’agente non ha aggiunto o cancellato numeri reali né inviato SMS. Le prove non sostituiscono la QA fisica Safari o l’intero blocco 19.

Artefatti aggiuntivi: sottocartella regressions/ con screenshot, misure browser e log prima/dopo. Policy appena integrate dall’utente, DTO +39, credenziali e dati account non modificati. Nessuna operazione Git eseguita in questo intervento.
