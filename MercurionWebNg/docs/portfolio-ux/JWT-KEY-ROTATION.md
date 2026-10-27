# AUTH-02 — Rotazione e revoca delle chiavi JWT

27 ottobre 2026 — implementazione incrementale. **B1a/B1b, B2 e adapter/bootstrap locale implementati, in review:** schema/port, loader e runtime firma/verifica con kid, validazione all’avvio e regressioni sintetiche; [contratto e limiti](../../../MercurionWebNode/docs/jwt-key-manifest.md). Attivazione tramite composizione esplicita oppure, in development/test, opt-in JWT_LOCAL_KEYS_CONFIG dopo [migrazione controllata](../../../MercurionWebNode/docs/jwt-local-development.md). Senza flag resta il percorso precedente; nessuna chiave reale migrata. B2 aggiunge registro/CLI e riconciliazione WS: [runbook](../../../MercurionWebNode/docs/jwt-key-operations.md). La [QA Linux/Compose isolata](../../../MercurionWebNode/docs/jwt-linux-qa.md) ha superato 27 controlli; restano provider/bootstrap VPS INF-01A, prova del deployment completo e consumer coordinati. Analisi e stima in [JWT-KEY-ROTATION-ANALYSIS.md](JWT-KEY-ROTATION-ANALYSIS.md). Riferimento: [roadmap](ROADMAP.md#auth-02--rotazione-e-revoca-delle-chiavi-jwt).

**Decisioni confermate:** revoca a caldo; una istanza Nest e una Tox21 per ambiente su VPS/Docker Compose, senza repliche; manifest persistente senza segreti su volume, aggiornato atomicamente tramite CLI e letto a caldo dai servizi; rimozione dalle room private e disconnessione dei WS con chiave revocata entro 5 secondi. Limite coperto da test sintetici e QA Linux/Compose isolata con WS/Redis reali (543 ms nell’ultima prova); misura sulla VPS finale ancora da eseguire. Stima del nucleo JWT: 4–6 giornate tecniche; esclusi nuova policy scientifica e PoC/integrazione del Secret Manager infrastrutturale.

**Coordinamento VPS:** applicare D-12–D-14 e INF-01A del [piano infrastrutturale](../../../docs/infrastructure/vps-deployment-roadmap.md). In staging/production il Secret Manager esterno conserva private RSA/HMAC; il materiale arriva a runtime e resta in memoria, senza .env/PEM persistenti, valori segreti in Compose o snapshot nel manifest. Infisical/Bitwarden sono candidati, non una scelta già fatta. Il manifest resta l’autorità di stato/revoca; la revoca e il limite WS non dipendono dalla disponibilità del provider. Contratti, outage e confine B1/PoC nell’[analisi aggiornata](JWT-KEY-ROTATION-ANALYSIS.md#coordinamento-con-secret-manager-e-bootstrap-vps).

## Obiettivo e perimetro

Gestire più versioni di chiave, scegliere quella di emissione tramite configurazione controllata e consentire rotazione ordinaria e revoca manuale. Mantenere RS256 per gli access token HTTP e WS e HS512 per gli altri token. Inserire `kid` nell'header JOSE di tutti i JWT emessi da Mercurion: è un identificatore della chiave, non un claim del payload.

L'implementazione riguarda Nest, configurazione e gestione operativa delle chiavi, contratti con i verificatori esterni e regressione dei percorsi Angular. Nessun nuovo algoritmo, modifica dei feature flag o rifacimento generale di login/MFA. L'eventuale adeguamento Tox21 richiede un intervento esplicitamente coordinato nel relativo repository: questo piano non autorizza modifiche al repository sibling.

**Impegno preliminare: medio e circoscrivibile.** La selezione tramite `kid` è concentrata nel servizio JWT, mentre distribuzione, compatibilità e revoca richiedono una prova end-to-end. Non stimare l'intervento come il solo inserimento di un header; stima nell’analisi. B1a introduce contratti e validazione; B1b collega il runtime multi-chiave attraverso sorgenti esplicite, conservando il bootstrap ordinario. Nessuna rotazione reale, accesso a materiale segreto o operazione sugli ambienti eseguita.

## Riscontri dal codice corrente

| Dominio | Firma e verifica attuali | Da preservare |
|---|---|---|
| `AccessToken` HTTP | RS256, coppia RSA dedicata, audience access | Separazione da WS e token di flusso |
| `ws_AccessToken` | RS256, seconda coppia RSA, audience WS | Separazione da HTTP |
| Altri `TokenType` | HS512, configurazione/secret specifici del tipo, audience auth | Isolamento dei diversi scopi; nessun unico secret globale |

`JwtKeysProvider` restituisce una sola coppia per ciascun dominio RSA; `JwtToolsService` la conserva al bootstrap. I segreti HS512 provengono dalle configurazioni dei singoli tipi. Senza opt-in il bootstrap continua con una sola coppia e senza kid; il runtime B1b seleziona versioni tramite kid quando composto esplicitamente o abilitato tramite adapter locale. Sono presenti controlli su algoritmo, issuer, audience, tipo di token, JTI revocato e PAT MFA corrente: restano necessari.

La configurazione attuale HS512 controlla la lunghezza testuale minima di 48 caratteri. Nel nuovo caricamento verificare materiale decodificato e requisiti crittografici: RFC 7518 richiede almeno 512 bit di chiave per HS512. Questo riscontro sul validatore non dimostra che i segreti reali siano deboli: non sono stati letti.

Nel repository Tox21, esaminato soltanto in lettura, `main.py` contiene un verificatore con singola `PUBLIC_KEY` all'avvio e RS256 con audience `mercurion-api`. **Nel sorgente locale GLOBAL_SKIP_AUTH_FLAG è True:** il percorso RPC corrente non dimostra l'applicazione della verifica/revoca. I controller scientifici Nest hanno inoltre flussi pubblici con token vuoto/omesso. Coordinare il verificatore senza attivare indiscriminatamente l'autenticazione e interrompere quei flussi; distinzione e limite di accettazione in [analisi 16K-A](JWT-KEY-ROTATION-ANALYSIS.md#4-tox21-non-può-essere-dichiarato-protetto-dalla-revoca-oggi).

## Modello proposto da validare nell'analisi

Un servizio di selezione delle chiavi condiviso dagli emettitori/verificatori Nest, basato su un registro versionato. Le chiavi appartengono a un ambiente e a un dominio d'uso; ogni record associa almeno `kid`, algoritmo, scopo, stato e riferimento al materiale crittografico. Gli identificatori non devono essere riutilizzati per materiale differente.

| Stato proposto | Può firmare | Può verificare | Utilizzo |
|---|---|---|---|
| Preparata | No | Sì, dopo distribuzione esplicita ai verificatori | Pubblicare prima di attivare il nuovo emettitore |
| Attiva | Sì | Sì | Una sola versione attiva per dominio/scopo |
| Solo verifica | No | Sì, entro la finestra concordata | Smaltire i token emessi prima della rotazione |
| Revocata | No | No | Escludere la chiave anche per token non scaduti |

Il solo stato «preparata» non basta a fidarsi di una chiave: la sua ammissione alla verifica deve derivare dalla configurazione amministrata, non dalla ricezione di un token. La rimozione del materiale dopo il periodo di verifica è un'operazione distinta dalla revoca; conservare i metadati necessari all'audit. Una chiave compromessa/revocata non va riattivata per effettuare un rollback.

**Decisioni del primo blocco:** aggiornamento a caldo, topologia singola Compose, manifest su volume e limite WS di 5 secondi confermati dall'utente. In B1 definire binding/versioni del materiale attraverso una port asincrona indipendente dal vendor, schema e compatibilità; le finestre operative per ambiente richiedono verifica prima del rollout. Il Secret Manager esterno è pianificato da VPS INF-01A, non da un nuovo servizio sulla VPS. Nessun nuovo database o endpoint JWKS pubblico richiesto dal registro; provider/bootstrap e prove reali restano gate infrastrutturali prima del rollout.

## Emissione e verifica

- L'emettitore risolve per scopo una coppia coerente di materiale e `kid`, dallo stesso snapshot del registro, e inserisce il `kid` nell'header protetto dalla firma. Una rotazione concorrente non deve abbinare il materiale vecchio all'identificatore nuovo. Zero chiavi attive, duplicati o configurazioni incoerenti devono impedire l'emissione, con errore operativo controllato.
- Il verificatore determina algoritmo e scopo ammessi dal contesto applicativo atteso; legge `kid` dall'header ancora non verificato soltanto per una lookup limitata nel registro fidato. Il valore non sceglie l'algoritmo, non diventa un percorso file e non attiva download di chiavi o URL forniti dal token.
- Rifiutare `kid` malformato, sconosciuto, di altro ambiente/scopo, revocato o con algoritmo incompatibile. Nessuna ricerca indiscriminata su tutte le chiavi e nessun passaggio automatico RSA/HMAC. Dopo la selezione, verificare firma e tutti i controlli applicativi esistenti: `iss`, `aud`, `exp`, tipo di token, sessione e revoca JTI dove previsti.
- La revoca della chiave si applica anche ai percorsi diagnostici che oggi possono ignorare scadenza o revoca del singolo JTI: questi flag non devono diventare un modo per accettare una chiave revocata. I consumer di `decodeUnsafe` non possono usare il solo contenuto decodificato come prova di validità.
- Tenere separati materiale segreto e metadati operativi. Client Angular e Tox21 ricevono soltanto ciò che serve: nessuna chiave privata RSA o secret HS512 nei bundle, nei log, in un eventuale JWKS o nei servizi che verificano soltanto RSA. Audit con `kid` e metadati autorizzati, senza token completi o contenuto delle chiavi.

## Rotazione ordinaria, revoca e sessioni

**Rotazione ordinaria:** distribuire prima la nuova chiave di verifica a tutti i consumer; verificarne la disponibilità; attivare quindi la nuova chiave di emissione; portare la precedente in sola verifica. La finestra deriva dall'ultima emissione effettiva, dal TTL massimo dei token interessati, dal clock skew e da tutti gli usi di rinnovo autorizzati. **Per HTTP il solo TTL JWT non basta:** il protocollo corrente verifica anche firme scadute per rinnovare una sessione valida; occorre coprire la massima durata delle sessioni già emesse, come dettagliato nell'analisi 16K-A. Non rimuovere una chiave finché qualche emettitore può ancora usarla; TTL e date non si ricavano fidandosi di payload non verificati.

**Revoca manuale/emergenza:** comando operativo esplicito per ambiente, dominio e `kid`, autorizzato e tracciato, con motivo e anteprima del perimetro. La revoca esclude subito la chiave nello stato autorevole e deve raggiungere tutte le istanze/cache entro un limite documentato e verificato. Se è revocata la chiave attiva, predisporre una sostituta oppure interrompere l'emissione di quel dominio; nessun fallback silenzioso su chiavi revocate. Definire comportamento durante indisponibilità o disallineamento del registro, evitando accettazione indefinita da cache obsolete. Il mezzo amministrativo implementato in B2 è la CLI con anteprima/digest e revisione attesa; nessuna nuova console grafica.

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
| 16K-B — Nest e gestione operativa | Firma/verifica multi-chiave, header `kid`, port del materiale compatibile con Secret Manager, configurazione validata, operazioni manuali e audit; B1 testabile con fixture sintetiche |
| 16K-C — Integrazione e QA | Consumer allineati, prove HTTP/WS/Tox21, gestione connessioni esistenti, regressione dei flussi HS512 e runbook di rotazione/revoca |

Usare chiavi sintetiche e test che eseguono davvero firma e verifica, oltre ai mock di orchestrazione. Coprire almeno:

- Ogni `TokenType` emette il `kid` della chiave attiva corretta e usa soltanto l'algoritmo previsto.
- Vecchi e nuovi token convivono durante la rotazione; la vecchia chiave non firma più; scadenza e fine della finestra sono rispettate.
- Token con chiave revocata, `kid` ignoto/manomesso/mancante fuori finestra, scopo errato, firma invalida o algoritmo sostituito sono rifiutati. Nessuna confusione fra coppie HTTP/WS o scopi HS512.
- Rotazioni concorrenti, revoca della chiave attiva, bootstrap con configurazione invalida, aggiornamento/cache tra istanze e consumer non aggiornati falliscono nel modo concordato.
- Compatibilità e revoca legacy; JTI/sessioni e PAT MFA continuano a funzionare. La revoca di chiave non viene saltata da `ignoreExpiration` o `skipRevocationCheck`.
- Login, rinnovo HTTP/WS, logout, recupero, attivazione, verifiche recapiti e MFA: nessun flusso HS512 dimenticato. Sessioni valide conservate durante rotazione normale; revoca d'emergenza e socket già aperti gestiti secondo la policy esplicita.

La consegna comprende test, configurazione documentata senza segreti, procedura amministrativa con tempi di propagazione verificati e limiti residui. Non dichiarare il supporto completo finché un verificatore reale mantiene una sola chiave o non applica la revoca. Il completamento locale con fake del materiale non certifica VPS INF-01A: prima di staging/production provare provider, bootstrap, non persistenza, isolamento e recovery reali.

## Sorgenti e riferimenti

- [Firma e verifica Nest](../../../MercurionWebNode/src/app_modules/auth/services/jwt-tools.service.ts), [provider RSA](../../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts), [tipi di token](../../../MercurionWebNode/src/app_modules/auth/models/enums/token-type.enum.ts), [sessioni](../../../MercurionWebNode/src/app_modules/auth/services/session.service.ts), [schema configurazione](../../../MercurionWebNode/src/config/config.schema.ts).
- Consumer esterno letto: `../MercurionTox21/main.py`, funzione `verify_jwt`; configurazione del percorso pubblico in `config.py`. Nessun file di chiavi o ambiente letto.
- [`kid`: RFC 7515 §4.1.4](https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1.4), [algoritmo associato alla chiave: RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1), [dimensione chiavi HMAC: RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2).
