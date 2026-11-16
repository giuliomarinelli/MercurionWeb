# T21-11 — Autenticazione JWT per servizio

7 novembre 2026. Branch `feature/T21-11` separati in Web e Tox21, nessun merge.
Modello salvato, soglie e dipendenze preservati. Baseline: Web `e55c5c3e`,
Tox21 `bc980c9`, integrati dall'owner prima dell'intervento.

## Comportamento

L'owner ha approvato i valori `allow`, `require-jwt`, `disabled` e cinque
variabili distinte nella [specifica aggiornata](tox21-service-auth-plan.md).
Omissione usa il default Pydantic `disabled`; valore vuoto, null, con spazi,
maiuscolo o sconosciuto impedisce il bootstrap. Diagnostica limitata ai nomi
dei campi. Non si introduce una variabile che cambia il globale esistente.

Le policy effettive vengono risolte al bootstrap, con override sul globale,
e governano sia obbligatorietà del token sia verifica JWT. Il PEM pubblico
RSA viene letto se almeno un servizio richiede JWT; cinque override `allow`
evitano la lettura anche con globale restrittivo. Un PEM necessario ma non
valido blocca l'avvio prima di modello e broker, senza bypass.

Compose Tox21 e Compose Web preview/production inoltrano i flag opzionali.
L'interpolazione usa il singolo meno: default soltanto per variabile assente,
senza trasformare un valore vuoto esplicito in autorizzazione ereditata.
PEM e relativo mount restano input dell'operatore quando abilita la protezione.
Nessuna nuova chiave, ACL, ruolo, rotazione o configurazione reale inserita.

## Prove

- Tox21: **131 test in ordine normale e 131 in ordine inverso**, senza skip,
  in ambiente Linux CPU già disponibile, rete disabilitata, sorgenti/test
  candidati montati in sola lettura. Include tutte le combinazioni di cinque
  servizi, due globali, flag omesso e tre valori, payload diretto/envelope,
  JWT reale sintetico valido, scaduto, firma/audience errate e malformato.
  Schema malformato respinto anche con `allow`; operazioni non invocate dopo
  un rifiuto auth. Default, precedenza dotenv/processo e bootstrap PEM coperti.
- Web: risoluzione Compose preview/production, default dei cinque flag,
  configurazione mista e conservazione di valori vuoti/invalidi verificati.
  Gate deployment: quattro overlay, venti artefatti e fixture negative passati.
  Nessun servizio avviato da questi controlli di configurazione.
- Il nuovo smoke `scripts/smoke_auth.py` esegue worker reale, NATS interno e
  PEM generati per la prova; due round per ciascun globale con policy miste,
  inferenza/RDKit reali e PubChem limitato a SMILES invalido prima del provider.
  Verifica anche rifiuto CLI di flag invalido/vuoto, arresto e cleanup.
  È un passo obbligatorio della CI Tox21, con report anche in caso di errore.

I risultati locali non sostituiscono il Required gate sull'esatto SHA candidato.
Le CI e lo smoke reale vengono verificati separatamente prima della consegna;
log e report locali in `C:/Users/giuli/.codex/artifacts/t21-11/`.

## Limiti e integrazione

Nessun cambiamento a consumer, subject, envelope o forme delle risposte Web.
I consumer che non inviano token vengono respinti se l'operatore protegge il
servizio; non viene introdotto un inoltro automatico delle credenziali utente.
Il default senza flag conserva il comportamento precedente.

Il globale restrittivo nello smoke viene impostato soltanto dal harness sul
modulo: il default distribuito resta `GLOBAL_SKIP_AUTH_FLAG=True`. Le prove
unitarie sostituiscono le operazioni scientifiche; lo smoke reale le distingue
esplicitamente. Nessun provider PubChem live, flusso HTTP/browser completo,
riavvio dei servizi personali, pubblicazione immagini o deployment.

Integrare Tox21 prima di configurare un qualsiasi `require-jwt`; Web aggiunge
l'inoltro Compose e la documentazione. Entrambi i branch restano all'owner.
