# Giorno 4 — Compatibilità, accessibilità e copione B2B

5 novembre 2026. **Verificato con limiti, in review.** Playwright MCP disponibile e usato tramite Chrome 157 su Windows, origine `http://localhost:8888`. Sessione autenticata e servizi avviati dall’utente conservati. Nessun invio feedback/ticket, modifica account o nuovo salvataggio molecolare in questa giornata.

## Matrice effettiva

Per ogni riga: viewport **320 e 375 × 812**, **768 e 1366 × 900**, nei temi chiaro e scuro; controllata la classe effettiva del tema dopo il cambio media e dopo il resize. Nessun overflow orizzontale del documento nelle **64 combinazioni finali**. Sono prove di layout Chrome, non dispositivi fisici né zoom del browser.

| Pagina / stato | Layout | Axe a 1366 px, entrambi i temi |
| --- | --- | --- |
| Le mie collezioni, dati reali | 8 combinazioni verificate | Nessuna violazione rilevata dopo la correzione; contrasto parzialmente incompleto |
| Le mie molecole, dati reali | 8 combinazioni verificate | Nessuna violazione rilevata; contrasto parzialmente incompleto |
| Dettaglio collezione Demo25, quattro elementi | 8 combinazioni verificate | Nessuna violazione rilevata dopo la correzione della cronologia; contrasto parzialmente incompleto |
| Dettaglio variante retry Demo25 salvata nel Giorno 1 | 8 combinazioni verificate | Nessuna violazione rilevata dopo la correzione; contrasto parzialmente incompleto |
| Editor, nuova struttura vuota | 8 combinazioni verificate | Nessuna violazione rilevata nel documento principale; contrasto parzialmente incompleto |
| Feedback, form iniziale | 8 combinazioni verificate | Nessuna violazione rilevata; contrasto e, in scuro, distinzione link/testo parzialmente incompleti |
| Supporto, elenco ticket | 8 combinazioni verificate | Nessuna violazione rilevata; attributi ARIA e contrasto con controlli incompleti residui |
| Impostazioni, panoramica | 8 combinazioni verificate | Nessuna violazione rilevata; contrasto parzialmente incompleto |

Axe 4.11 locale, tag `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; scansione del documento principale. Non è una certificazione WCAG, una prova con screen reader o una scansione completa dell’iframe Ketcher. Fra i limiti diagnostici, Axe non interpreta alcuni colori `oklch(... none)` del badge Beta; i controlli incompleti non equivalgono a controlli superati. Dati e risultati completi, comprese le misure prima delle correzioni, nel verbale locale `C:/Users/giuli/.codex/artifacts/mercurion-day4-matrix.json`.

## Correzioni osservate

- Le due liste personali avevano `aria-label` su `div` senza ruolo: aggiunto `role="group"`, mantenendo etichetta e stato busy. Il controllo ARIA non resta incompleto su questi contenitori.
- Nel dettaglio, rimosso `aria-labelledby` dall’header generico e limitata l’etichetta ARIA dei metadati al modo modifica, dove il controllo ha ruolo textbox. Titolo, etichetta e testo visibili restano disponibili in lettura; il controllo ARIA non resta incompleto su questi elementi.
- Cronologia: Axe rilevava contrasto insufficiente in tema chiaro sul messaggio vuoto e su una data, quest’ultima **3.65:1**. Sostituiti opacità e colore secondario attenuato con i token secondari esistenti dei due temi. Il successivo giro sul dettaglio collezione non rileva violazioni di contrasto. Nessuna cancellazione della cronologia per ricreare lo stato vuoto.

## Tastiera, movimento e schermate

A 375 × 812: menu laterale aperto con Invio; Shift+Tab resta nel dialogo ed Escape restituisce il focus al trigger. Ricerca aperta dal menu: focus iniziale sul campo ChEMBL, Tab resta nel pannello; Escape restituisce il focus a Cerca molecola. Chiuso poi il menu. Con `prefers-reduced-motion: reduce`, durata delle transizioni di offcanvas e contenuto misurata **0s**. Non estendere questo esito a tutte le animazioni o all’editor esterno.

Screenshot nuovamente disponibili. Ispezionati il desktop scuro delle collezioni e due ritagli della sola intestazione della fixture molecolare: desktop scuro e 375 px chiaro, con nome lungo, badge e azioni leggibili. Ritagli archiviati localmente come `mercurion-day4-detail-dark.png` e `mercurion-day4-detail-light-375.png` in `C:/Users/giuli/.codex/artifacts/`; nessuna nuova immagine dell’account inserita nel repository o pubblicata. La selezione portfolio richiede ancora review e un’inquadratura completa di struttura/analisi.

## Controlli locali e residui

- **27 test Angular**: controlli canonici di accessibilità e pagine delle due liste. **49 test Angular**: cronologia, header/metadati e layout del dettaglio. Log `mercurion-day4-focused-tests.log` e `mercurion-day4-detail-tests.log` nella cartella locale degli artefatti.
- La prima invocazione tramite npm ha perso gli argomenti e avviato la suite estesa in watch: interrotta dopo errori nei test SelectCore/ActionOverlay; non dichiarata verde. I due giri mirati sono stati eseguiti direttamente con `ng.cmd`, `--watch=false` e `--karma-config=karma.conf.js`. Il log iniziale resta `mercurion-day4-tests.log`; l’esecuzione completa della suite resta da verificare e non è sostituita dai 76 test mirati.
- Lint dei sei file modificati, build Angular production, gate bundle/lazy e validatore demo superati; **10 test demo** superati. Bundle iniziale **957987 / 1000000 byte**, 21 moduli CommonJS; warning budget CSS preesistenti conservati. Log build `mercurion-day4-build.log`.
- Errori spontanei di connessione già raccolti in F-03 restano aperti. Un timeout di navigazione e un’attesa di un nome accessibile non corrispondente sono stati recuperati; le relative attese non sono considerate prove superate.
- Safari/iPhone fisico, tastiera virtuale, zoom reale 200/400%, screen reader e verifiche incomplete Axe: [F-06/F-07](FINAL-TODO.md). Nessun esito CI remoto dedotto dai controlli locali.

Rimosse le emulazioni media, ripristinata la viewport desktop e chiusa soltanto la scheda QA; dashboard e servizi dell’utente conservati. Le due esecuzioni mirate e la build sono terminate con codice 0.

Copione [demo B2B](demo/README.md) aggiornato con le fixture persistenti effettive e i limiti del seed completo. Il seguito della scaletta è **Giorno 5 — TS-01, review e bilancio**, ancora da eseguire.
