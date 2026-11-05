# Giorno 5 — TS-01, controlli e bilancio

5 novembre 2026. **Pulizia Angular/Nest implementata e verificata localmente, in review. TS-01 complessivo non dichiarato chiuso.** Commit e push autorizzati dall’utente, nessun merge. Working tree iniziale pulito; nessuna modifica a dipendenze, lockfile, ambienti o dati applicativi.

**Seguito autorizzato:** [seconda passata e inventario completo TS-01](TS-01-QA.md). Aggiunte le aree inizialmente escluse, con altri 967 terminatori rimossi; zero candidati nel perimetro globale. Controlli preesistenti non verdi di MercurionData/catalogo documentati separatamente: la chiusura di accettazione resta aperta.

## TS-01 — Prima passata

Inventariati **1.230 file TypeScript manuali tracciati** in `MercurionWebNg` e `MercurionWebNode`, compresi test e configurazioni. Esclusi i due file GraphQL generati `src/app/generated/graphql.ts` e `schema.ts`; file ignorati, dipendenze e output non entrano nell’inventario Git.

Rimossi **15.403 terminatori in 627 file**: 338 Angular e 289 Nest. Lo strumento [typescript-semicolons.mjs](../../../scripts/typescript-semicolons.mjs) visita i token del parser TypeScript, prova le sole cancellazioni di `;` e richiede assenza di errori sintattici e identità dell’albero sintattico. Se una cancellazione cumulativa cambia l’albero, verifica i candidati singolarmente. Conserva delimitatori `for`, corpi vuoti e separatori di classe; **1.063 candidati** restano perché rimuoverli produce errori o cambia la struttura, per esempio separatori fra istruzioni o membri sulla stessa riga e protezioni ASI.

Stringhe, template, commenti e JSDoc sono esclusi dalla trasformazione. Nell’audit è stata aggiunta un’esclusione esplicita dei nodi JSDoc con una regressione dedicata; il confronto con i blob Git ha confermato che **nessun commento del repository era stato alterato**. Le righe e la formattazione restano quelle originali. L’unico diff funzionale rispetto alla trasformazione meccanica è la fixture di test notifiche descritta sotto.

Seconda scansione: **zero terminatori rimovibili** nel perimetro. Il comando è in sola lettura senza `--write`, restituisce codice 1 quando trova candidati e produce il report JSON; `--write` completa prima l’analisi e verifica che i file non siano cambiati prima di scrivere.

```powershell
node --test scripts/typescript-semicolons.test.mjs
node scripts/typescript-semicolons.mjs
```

Formatter allineati a `semi: false`. Rinominato il file Angular `.prettierc` in `.prettierrc`: il nome precedente non veniva riconosciuto da Prettier. Conservato l’override Angular HTML. Verificata la configurazione effettiva risolta da Prettier su entrambi i `src/main.ts`; nessuna riformattazione generale con Prettier.

**Confine della consegna:** non modificati MercurionData, MercurionLandingFactory, pacchetti condivisi, configurazione/suite Playwright e fixture negative degli strumenti. L’inventario esterno comprende 107 file TypeScript tracciati; 17 sono fixture degli strumenti. Le altre aree richiedono una passata distinta con i propri controlli prima di poter estendere la chiusura TS-01 all’intero repository. Non sono automaticamente marcate conformi: [F-09](FINAL-TODO.md).

## Suite completa e correzione della fixture notifiche

La prima esecuzione Angular completa ha prodotto **1.280 successi e un errore di contrasto** nella fixture del centro notifiche: il RouterTestingHarness non include lo sfondo della shell e il test dipendeva dal tema ambientale. La prova è stata estesa a chiaro e scuro, con gli sfondi del body dell’applicazione e ripristino delle classi al termine. Il primo giro della nuova variante scura ha inoltre evidenziato la misura durante la transizione dei colori dei pulsanti: ora il test attende la conclusione delle animazioni finite prima di eseguire Axe. Nessuna regola Axe disabilitata, nessun colore del prodotto modificato.

Rilancio mirato: **32 test superati**. Rilancio completo dopo l’ultima modifica: **1.282 test Angular superati**. Gli errori SelectCore/ActionOverlay della precedente esecuzione non canonica del Giorno 4 non si sono ripresentati; questo esito non dimostra una causa o correzione specifica di quei timeout.

## Verifiche finali locali

| Controllo | Esito |
| --- | --- |
| Trasformatore: testo incorporato, CRLF, JSDoc, ASI, loop, overload e sintassi non valida | 6 test superati; controllo sintattico dello script superato |
| Angular: suite completa, compilazione test/template | 1.282 test superati |
| Nest: suite unitari completa | 206 suite, 1.105 test superati |
| Nest: trasporti REST/GraphQL e Socket.IO nelle fixture E2E | 2 suite, 6 test superati; non servizi/provider esterni reali |
| Angular: lint sorgenti/template, build production | Superati; lint ripetuto sul test notifiche modificato |
| Nest: lint sorgenti/test, typecheck, build | Superati |
| Policy Angular typing, semantica interattiva e styling; Nest strictness/naming | Superate |
| Bundle iniziale, lazy boundary chimica | 957987 / 1000000 byte, 21 CommonJS; RDKit/Ketcher fuori dal main |
| Documentazione e diff | Verificati; nessuna rimozione dei separatori necessari per ottenere un risultato verde |

Il bundle iniziale ha la stessa dimensione misurata nel Giorno 4. Restano i warning indicativi CSS preesistenti. Nessun browser alternativo avviato e nessuna prova visuale nuova dedotta da questa pulizia sintattica; le evidenze runtime restano nei Giorni 1–4. Servizi e sessione dell’utente conservati.

Report e log in `C:/Users/giuli/.codex/artifacts/`: `mercurion-day5-semicolons-before.json`, `mercurion-day5-semicolons-applied.json`, `mercurion-day5-semicolons-after.json`, `mercurion-day5-transform-verification.json`, `mercurion-day5-angular-tests-final.log`, `mercurion-day5-notifications-tests.log`, `mercurion-day5-nest-tests.log`, `mercurion-day5-nest-e2e.log`, log lint/typecheck/build delle due applicazioni. Le prime esecuzioni non verdi restano conservate separatamente.

## Bilancio per la review

Il percorso molecolare reale e la sua riapertura sono documentati nel [Giorno 1](DAY-1-QA.md), le conferme distruttive nel [verbale dedicato](DESTRUCTIVE-ACTIONS-QA.md), realtime/account/supporto e compatibilità nei Giorni 2–4. Il copione B2B distingue la fixture persistita dal dataset sintetico; le immagini reali dell’account rimangono locali.

Restano i [TODO finali](FINAL-TODO.md): sessioni indipendenti/riconnessione, diagnosi 502, provider e invii reali, Safari/tastiera/zoom fisici, review accessibilità, CI dell’esatto SHA e passata TypeScript delle aree escluse. L’anomalia storica PX-09 resta non riprodotta. La review manuale estesa e l’accettazione dell’utente sono ancora aperte; nessun merge implicito e nessuna dichiarazione di CI remota verde.
