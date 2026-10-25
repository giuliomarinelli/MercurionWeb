# AUTH-02 — Rotazione e revoca delle chiavi JWT

25 ottobre 2026 — piano architetturale, da implementare. Riferimento: [roadmap](ROADMAP.md#auth-02--rotazione-e-revoca-delle-chiavi-jwt).

## Obiettivo e perimetro

Gestire più versioni di chiave, scegliere quella di emissione tramite configurazione controllata e consentire rotazione ordinaria e revoca manuale. Mantenere RS256 per gli access token HTTP e WS e HS512 per gli altri token. Inserire `kid` nell'header JOSE di tutti i JWT emessi da Mercurion: è un identificatore della chiave, non un claim del payload.

L'implementazione riguarda Nest, configurazione e gestione operativa delle chiavi, contratti con i verificatori esterni e regressione dei percorsi Angular. Nessun nuovo algoritmo, modifica dei feature flag o rifacimento generale di login/MFA. L'eventuale adeguamento Tox21 richiede un intervento esplicitamente coordinato nel relativo repository: questo piano non autorizza modifiche al repository sibling.

**Impegno preliminare: medio e circoscrivibile.** La selezione tramite `kid` è concentrata nel servizio JWT, mentre distribuzione, compatibilità e revoca richiedono una prova end-to-end. Non stimare l'intervento come il solo inserimento di un header; produrre la stima dopo il primo blocco di analisi. Nessuna modifica applicativa, rotazione reale, accesso a materiale segreto o operazione sugli ambienti viene eseguita da questo documento.

## Riscontri dal codice corrente

| Dominio | Firma e verifica attuali | Da preservare |
|---|---|---|
| `AccessToken` HTTP | RS256, coppia RSA dedicata, audience access | Separazione da WS e token di flusso |
| `ws_AccessToken` | RS256, seconda coppia RSA, audience WS | Separazione da HTTP |
| Altri `TokenType` | HS512, configurazione/secret specifici del tipo, audience auth | Isolamento dei diversi scopi; nessun unico secret globale |

`JwtKeysProvider` restituisce una sola coppia per ciascun dominio RSA; `JwtToolsService` la conserva al bootstrap. I segreti HS512 provengono dalle configurazioni dei singoli tipi. Firma e verifica non selezionano versioni tramite `kid`; esiste già un TODO per la rotazione. Sono presenti controlli su algoritmo, issuer, audience, tipo di token, JTI revocato e PAT MFA corrente: restano necessari.

La configurazione attuale HS512 controlla la lunghezza testuale minima di 48 caratteri. Nel nuovo caricamento verificare materiale decodificato e requisiti crittografici: RFC 7518 richiede almeno 512 bit di chiave per HS512. Questo riscontro sul validatore non dimostra che i segreti reali siano deboli: non sono stati letti.

Nel repository Tox21, esaminato soltanto in lettura, `main.py` carica una singola `PUBLIC_KEY` all'avvio e verifica RS256 con audience `mercurion-api`. Va censito come consumatore della chiave HTTP e coinvolto nel rollout. L'inventario deve cercare anche eventuali altri verificatori e chiamate dirette alle librerie JWT.

## Modello proposto da validare nell'analisi

Un servizio di selezione delle chiavi condiviso dagli emettitori/verificatori Nest, basato su un registro versionato. Le chiavi appartengono a un ambiente e a un dominio d'uso; ogni record associa almeno `kid`, algoritmo, scopo, stato e riferimento al materiale crittografico. Gli identificatori non devono essere riutilizzati per materiale differente.

| Stato proposto | Può firmare | Può verificare | Utilizzo |
|---|---|---|---|
| Preparata | No | Sì, dopo distribuzione esplicita ai verificatori | Pubblicare prima di attivare il nuovo emettitore |
| Attiva | Sì | Sì | Una sola versione attiva per dominio/scopo |
| Solo verifica | No | Sì, entro la finestra concordata | Smaltire i token emessi prima della rotazione |
| Revocata | No | No | Escludere la chiave anche per token non scaduti |

Il solo stato «preparata» non basta a fidarsi di una chiave: la sua ammissione alla verifica deve derivare dalla configurazione amministrata, non dalla ricezione di un token. La rimozione del materiale dopo il periodo di verifica è un'operazione distinta dalla revoca; conservare i metadati necessari all'audit. Una chiave compromessa/revocata non va riattivata per effettuare un rollback.

**Decisioni da chiudere nel primo blocco:** fonte autorevole dei metadati e dello stato di revoca, conservazione dei segreti, aggiornamento a caldo oppure procedura di riavvio coordinata, numero di istanze/verificatori e tempo massimo di propagazione. Riutilizzare infrastruttura e gestione dei segreti esistenti quando adeguate; nessun obbligo introdotto qui di aggiungere KMS, database, servizio esterno o endpoint JWKS pubblico.

## Emissione e verifica

- L'emettitore risolve per scopo una coppia coerente di materiale e `kid`, dallo stesso snapshot del registro, e inserisce il `kid` nell'header protetto dalla firma. Una rotazione concorrente non deve abbinare il materiale vecchio all'identificatore nuovo. Zero chiavi attive, duplicati o configurazioni incoerenti devono impedire l'emissione, con errore operativo controllato.
- Il verificatore determina algoritmo e scopo ammessi dal contesto applicativo atteso; legge `kid` dall'header ancora non verificato soltanto per una lookup limitata nel registro fidato. Il valore non sceglie l'algoritmo, non diventa un percorso file e non attiva download di chiavi o URL forniti dal token.
- Rifiutare `kid` malformato, sconosciuto, di altro ambiente/scopo, revocato o con algoritmo incompatibile. Nessuna ricerca indiscriminata su tutte le chiavi e nessun passaggio automatico RSA/HMAC. Dopo la selezione, verificare firma e tutti i controlli applicativi esistenti: `iss`, `aud`, `exp`, tipo di token, sessione e revoca JTI dove previsti.
- La revoca della chiave si applica anche ai percorsi diagnostici che oggi possono ignorare scadenza o revoca del singolo JTI: questi flag non devono diventare un modo per accettare una chiave revocata. I consumer di `decodeUnsafe` non possono usare il solo contenuto decodificato come prova di validità.
- Tenere separati materiale segreto e metadati operativi. Client Angular e Tox21 ricevono soltanto ciò che serve: nessuna chiave privata RSA o secret HS512 nei bundle, nei log, in un eventuale JWKS o nei servizi che verificano soltanto RSA. Audit con `kid` e metadati autorizzati, senza token completi o contenuto delle chiavi.

## Rotazione ordinaria, revoca e sessioni

**Rotazione ordinaria:** distribuire prima la nuova chiave di verifica a tutti i consumer; verificarne la disponibilità; attivare quindi la nuova chiave di emissione; portare la precedente in sola verifica. La finestra di mantenimento deriva dall'ultima emissione effettiva con la vecchia chiave, dal TTL massimo configurato dei token interessati e dal clock skew ammesso. Non rimuovere una chiave finché qualche emettitore può ancora usarla; TTL e date non si ricavano fidandosi di payload non verificati.

**Revoca manuale/emergenza:** comando operativo esplicito per ambiente, dominio e `kid`, autorizzato e tracciato, con motivo e anteprima del perimetro. La revoca esclude subito la chiave nello stato autorevole e deve raggiungere tutte le istanze/cache entro un limite documentato e verificato. Se è revocata la chiave attiva, predisporre una sostituta oppure interrompere l'emissione di quel dominio; nessun fallback silenzioso su chiavi revocate. Definire comportamento durante indisponibilità o disallineamento del registro, evitando accettazione indefinita da cache obsolete. Il mezzo amministrativo concreto, per esempio CLI/runbook o controllo interno già esistente, è da scegliere; una nuova console grafica non è necessaria al primo perimetro.

Revocare una chiave invalida l'intera classe di JWT firmati con quella versione; revocare un JTI o una sessione resta un'azione distinta. La normale rotazione non deve terminare sessioni Redis valide. Per una compromissione, definire esplicitamente se invalidare anche sessioni o altri artefatti: non assumere che cambiare chiave revochi automaticamente tutto lo stato dell'account, né che una sessione associata a un JWT compromesso possa sempre essere riutilizzata per il rinnovo.

Inventariare handshake WS, controlli durante la connessione, rinnovo e riconnessione: escludere una chiave dalla verifica non interrompe da solo un socket già autenticato. Stabilire e provare il comportamento dei collegamenti esistenti in caso di revoca, senza attendere una riconnessione spontanea se il requisito è l'esclusione immediata. Coordinare HTTP, WS e richieste scientifiche verso Tox21, preservando i flussi autorizzati di rinnovo.

## Compatibilità e rollout

1. Censire tutti i firmatari/verificatori, domini HS512, TTL, clock skew, ambienti e topologia; chiudere le decisioni operative e la stima.
2. Introdurre nei verificatori il registro e il supporto `kid`, distribuendo le chiavi necessarie prima di aggiornare l'emissione. Coordinare Tox21 con un'attività separata; nessuna rotazione completa del dominio HTTP se il consumer rimane a chiave singola.
3. Definire una finestra di transizione per i token esistenti senza `kid`: mapping esplicito alla sola vecchia chiave del dominio atteso e data di fine, oppure invalidazione/riautenticazione concordata. `kid` presente ma sconosciuto non deve mai usare il fallback legacy. Anche la chiave legacy deve essere revocabile.
4. Emettere JWT con `kid` su tutti i tipi, osservare il funzionamento e provare una rotazione con vecchia/nuova versione concorrenti. Terminata la finestra legacy, richiedere sempre `kid`.
5. Provare revoca manuale, propagazione, rollback sicuro della configurazione e smaltimento delle chiavi obsolete. Separare prove con chiavi sintetiche dall'applicazione della procedura sugli ambienti reali; non ruotare segreti reali durante una semplice verifica di layout.

## Blocchi di lavoro e accettazione

| Blocco | Risultato verificabile |
|---|---|
| 16K-A — Architettura | Inventario completo, modello/autorità del registro, policy legacy e revoca, contratto Tox21, piano di distribuzione e stima |
| 16K-B — Nest e gestione operativa | Firma/verifica multi-chiave per ogni tipo di token, header `kid`, configurazione validata, operazioni manuali e audit |
| 16K-C — Integrazione e QA | Consumer allineati, prove HTTP/WS/Tox21, gestione connessioni esistenti, regressione dei flussi HS512 e runbook di rotazione/revoca |

Usare chiavi sintetiche e test che eseguono davvero firma e verifica, oltre ai mock di orchestrazione. Coprire almeno:

- Ogni `TokenType` emette il `kid` della chiave attiva corretta e usa soltanto l'algoritmo previsto.
- Vecchi e nuovi token convivono durante la rotazione; la vecchia chiave non firma più; scadenza e fine della finestra sono rispettate.
- Token con chiave revocata, `kid` ignoto/manomesso/mancante fuori finestra, scopo errato, firma invalida o algoritmo sostituito sono rifiutati. Nessuna confusione fra coppie HTTP/WS o scopi HS512.
- Rotazioni concorrenti, revoca della chiave attiva, bootstrap con configurazione invalida, aggiornamento/cache tra istanze e consumer non aggiornati falliscono nel modo concordato.
- Compatibilità e revoca legacy; JTI/sessioni e PAT MFA continuano a funzionare. La revoca di chiave non viene saltata da `ignoreExpiration` o `skipRevocationCheck`.
- Login, rinnovo HTTP/WS, logout, recupero, attivazione, verifiche recapiti e MFA: nessun flusso HS512 dimenticato. Sessioni valide conservate durante rotazione normale; revoca d'emergenza e socket già aperti gestiti secondo la policy esplicita.

La consegna comprende test, configurazione documentata senza segreti, procedura amministrativa con tempi di propagazione verificati e limiti residui. Non dichiarare il supporto completo finché un verificatore reale mantiene una sola chiave o non applica la revoca.

## Sorgenti e riferimenti

- [Firma e verifica Nest](../../../MercurionWebNode/src/app_modules/auth/services/jwt-tools.service.ts), [provider RSA](../../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts), [tipi di token](../../../MercurionWebNode/src/app_modules/auth/models/enums/token-type.enum.ts), [sessioni](../../../MercurionWebNode/src/app_modules/auth/services/session.service.ts), [schema configurazione](../../../MercurionWebNode/src/config/config.schema.ts).
- Consumer esterno letto: `../MercurionTox21/main.py`, funzione `verify_jwt`; configurazione del percorso pubblico in `config.py`. Nessun file di chiavi o ambiente letto.
- [`kid`: RFC 7515 §4.1.4](https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1.4), [algoritmo associato alla chiave: RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1), [dimensione chiavi HMAC: RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2).
