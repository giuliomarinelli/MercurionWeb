# Blocco 17 — Registrazione e recupero

27 ottobre 2026. **Revisionato dopo le regressioni segnalate; in review manuale.**

**Aggiornamento SSO dopo lo smoke test dell'utente:** grafica ripristinata dall'utente al solo spinner. Su successiva autorizzazione sono stati corretti esclusivamente i casi limite della logica: callback incompleto o malformato verso `/404-not-found`, come già previsto per gli input non validi; errore del fingerprint verso il redirect SSO esistente `/login?err=sso_failed&provider=…`; callback differiti ignorati dopo distruzione, senza cancellare il percorso di ritorno di una pagina successiva. Impedita anche la ripartenza dell'animazione da una microtask dopo l'uscita.

Il template originale è identico, verificato mediante confronto esatto e SHA-256 `61c9a45fc702a514802e16772241a8f6db7d373b174fda3cdff137ab450635e4`. Nessuna card, heading, form o nuova regola di stile. I test conservano i casi di successo/ritorno alla destinazione richiesta e verificano esplicitamente il solo spinner nello stato pendente. Il test di contenimento riconosce sia `<main>` sia `[role="main"]`; la fixture dello spinner non raccoglie un fingerprint reale.

**Verifica mirata corrente:** 45 test SSO/layout/accessibilità canonica superati; typecheck/template e lint superati. Nessun login esterno reale eseguito. Il precedente esito di 124 test è storico e precede il rollback. Le vecchie descrizioni della card e degli avvisi SSO non rappresentano più la versione corrente.

## Correzione del precedente esito

I precedenti 117 test e le misure di contenimento non certificavano la fedeltà grafica. Potevano passare con una spunta disallineata o senza le icone originali. La precedente presentazione dell'esito era troppo ampia; questo rapporto la sostituisce. Le vecchie evidenze restano conservate, senza essere trattate come approvazione del design.

## Revisione del worktree

Controllati i sei componenti, i relativi test, lo stile condiviso e la documentazione non committati. Il piccolo intervento manuale dell'utente in `pm-select.component.ts` è rimasto identico, verificato mediante SHA-256. In `account-flow.css` è stata conservata la formattazione dell'utente ed eliminato soltanto il blocco della checkbox difettosa.

- **Checkbox:** riquadro originale da 16 px, spunta SVG originale da 14 px nello stesso contenitore locale, superfici originarie light/dark, pointer e focus solo da tastiera. Native checkbox e collegamenti legali conservati; corretta la punteggiatura. Styling con Tailwind 4.
- **Icone:** nessuno dei 12 tracciati SVG presenti nei template originali di HEAD è stato rimosso. Conferme con check-circle, informazioni, avviso, account, assistenza e accesso verificati nei rispettivi stati. Avviso del recupero nuovamente nell'intestazione anche allo stato conclusivo. Icone accanto al testo nelle card larghe; eliminata la compressione involontaria da 64 a circa 51 px.
- **Ciclo di vita:** focus/scroll della registrazione differiti ignorati dopo distruzione. La protezione del redirect SSO è stata ripristinata su autorizzazione dell’utente, conservando il solo spinner. Anche la pulizia differita del frammento non opera su una pagina successiva.
- **Codice:** template/test leggibili, senza terminatori TypeScript opzionali nei file di questo intervento. Nessuna riscrittura del resto degli stili.

## Test che proteggono il comportamento

Le geometrie sono misurate in Chrome Headless con CSS reali a 320×568, 375×320, 768×720 e 1280×800. Gli stati selezionati nelle fixture di layout servono a verificare la presentazione; test distinti percorrono invii e risposte simulate.

- Checkbox attivata tramite click nativo della fixture: binding, due temi, colore/alpha effettivi, dimensioni, centratura della spunta entro 0,5 px, tracciato e assenza di una seconda spunta CSS. Label, informative e placeholder verificati.
- Tracciati di riferimento congelati dal codice originale, indipendenti dai template modificati; presenza visibile, dimensioni e distanza dal testo controllate. Il semplice contenimento orizzontale non basta più.
- Reset password: invio dal form realmente autorizzato, campi e pulsanti disabilitati, successo solo dopo risposta, singolo redirect da errore e sua cancellazione all'uscita. Eliminati test che sostituivano dipendenze private o fabbricavano timer senza passare dal flusso reale.
- Conferma registrazione con icona e focus; uscita prima delle microtask; recupero senza credenziali obbligatorie nella risposta; richieste pendenti, challenge fresche, validazione, errori e link incompleti.

| Evidenza | Esito |
|---|---|
| Prima della correzione checkbox | **5 test falliti**: dimensione, centratura e punteggiatura |
| Prima della protezione SSO | **1 test fallito** per navigazione dopo distruzione; rilevato anche NG0911 nella conferma registrazione |
| Controllo dimensioni icone | **4 test falliti** per compressione nelle card larghe |
| Suite finale | **124 test superati**, incluse regressioni login/MFA, select e accessibilità canonica |
| Typecheck/template e lint mirato | Superati |
| Styling e fixture negative, colori e token | Superati; non equivalgono a una verifica del contrasto di ogni singolo controllo |
| Production build e gate bundle/lazy | Superati; iniziale **949.715 / 1.000.000 byte**. Warning preesistenti su budget iniziale/editor/collezioni, soglie invariate |

## Verifica browser e limiti

Computer Use su Chrome, `http://localhost:8888`, sessione anonima: registrazione light desktop e mobile, dark mobile, select aperta con placeholder ed Escape, focus della checkbox non selezionata (16 px, outline 2 px, nessuna box-shadow). Richiesta password light/dark e recupero account dark osservati su mobile. Prima del rollback SSO, stati senza token di reset, attivazione e SSO verificati nei due temi a 375×812: avviso visibile, azione di uscita, nessun form e nessun overflow orizzontale. Le catture sono verificate separatamente dalle misure DOM.

Checked/unchecked e conferme finali sono verificati nelle fixture isolate; nessuna accettazione di informative o modifica di credenziali reali. Le prove sintetiche non certificano invio e-mail, token reali, provider SSO, Safari fisico/tastiera o password manager. Questi percorsi restano da verificare manualmente con account autorizzati. Il blocco non è dichiarato accettato né pronto al merge sulla sola base dei test.

Artefatti: `C:/Users/giuli/.codex/artifacts/mercurion-account-17-2026-10-27/worktree-review/`. Backup precedente, log red/green, audit SVG, catture e misure dei link incompleti. Le catture full-page con header sticky ricomposto non sono utilizzate come prova della posizione dell'header; per il focus valgono quelle del viewport.

Nessun commit, staging, modifica backend/flag/segreti o arresto dei processi dell'utente. Dashboard resta il prossimo blocco dopo la review di questo intervento.
