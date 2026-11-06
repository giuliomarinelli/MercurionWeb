# T21-07 — Candidati locali, identità e blocco della consegna

6 novembre 2026. Branch `feature/T21-07` nei due repository, senza merge.
**T21-07 non è chiuso:** il percorso implementato deve conservare un candidato
non ammissibile, non dichiarare una release pronta. Il canale scelto è l'archivio
Docker locale; nessun registry configurato o pubblicazione di immagini.

## Confini e strumenti

Tox21 registra versione, SHA sorgente e repository in un file interno
`/usr/share/mercurion/build-identity.json`, generato dagli stessi argomenti delle
label OCI. Il bootstrap stampa questa identità; la lettura è disponibile offline
tramite `runtime.read_build_identity()`. Non si ricava la revisione dall'env runtime,
né si inventa uno SHA nel checkout sorgente. File presente ma malformato → errore.

L'exporter Tox21 `scripts/container_evidence.py` verifica il runtime e il modello,
salva per ID un archivio **senza tag**, genera SBOM CycloneDX e report Trivy,
applica la policy, poi esegue `docker load` e confronta identità/configurazione
e layer filesystem. Nessuna cancellazione di immagini o tag dell'utente, nessun
avvio di servizi per la prova di caricamento. I file di evidenza hanno checksum
e il record `component.json` mantiene lo stato `candidate`.

Il digest portabile è quello del JSON di configurazione; l'ID locale Docker può
essere invece un indice OCI in Docker Desktop. Entrambi sono registrati con il
proprio significato, senza chiamarli digest verificati da registry. Il caricamento
avviene nel daemon corrente e può riusare cache: non è una prova di ripristino a
freddo su una seconda macchina. Le credenziali/configurazioni personali non sono
input dell'exporter. L'archivio non viene inviato a un registry o caricato dalla CI.

Il coordinatore Web `scripts/coordinate-delivery.py` associa record reali per
`web-ng`, `web-node`, `tox21`, conservando gli SHA dei due repository distinti.
Controlla checksum, archivio/config digest/label, revisione Web, target comune e
coerenza tra findings critici e idoneità dichiarata. Record mancanti restano
`null` nell'inventario, con lista esplicita: non sono sostituiti da immagini
sintetiche o dallo SHA Tox21. Esiti non conformi/incompleti → uscita 2 e
`eligible_for_integrated_acceptance=false`; integrità incoerente → errore.

I record devono risiedere sotto la directory del manifest, così i riferimenti
restano relativi e trasportabili. Un manifest coerente è un candidato per le
prove integrate T21-08, non un'attestazione firmata o una prova di deployment.
Hash e report locali non certificano la provenienza di un autore ostile.

```powershell
python -B scripts/coordinate-delivery.py --web-revision SHA_WEB_COMPLETO --tox21 C:/artifacts/bundle/tox21 --output C:/artifacts/bundle/candidate.json
```

Questo esempio **deve uscire 2** finché mancano i record Web o la sicurezza Tox21
è bloccante. Per una coppia completa servono anche `--web-ng` e `--web-node`, con
record realmente prodotti/verificati per quelle immagini; non sono forniti come
release da questo task. Le immagini Web non presenti localmente non sono state
inventate o ricostruite per aggirare il blocco preliminare Tox21.

## Policy applicata e blocco osservato

La [policy Web](../supply-chain-policy.json) blocca `critical`. La policy Tox21
ne recepisce la severità e non ammette eccezioni, filtri `ignore-unfixed` o
risultati mancanti trattati come conformi. Trivy è fissato a
`aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb`
(0.76.2), con DB vulnerabilità aggiornato durante la prova. Il DB può cambiare:
le scansioni sono evidenze datate, non una promessa permanente.

Il primo scan è sull'immagine locale T21-04 production, sorgente
`a3a408ae34fd380d13fa4d8d866bc8b961992ffd`, stesso baseline di dipendenze/base
mantenuto in T21-07. Risultato: **18 occorrenze critiche package/advisory**, non
18 CVE distinte; **13 occorrenze OS** e **5 Pillow**. Distribuzione completa:
176 high, 251 medium, 184 low, 10 unknown. Il report indica Debian 11.7 e EOSL.
Tra le critiche: libexpat, GnuTLS, Kerberos, perl/zlib e Pillow 12.3.0; il report
raw conserva ID, versione installata ed eventuale versione corretta.

Non si è dedotta sfruttabilità effettiva dal solo score. Non si è però rimossa
una segnalazione per ottenere un verde: la policy acquisita blocca comunque.
SBOM e inventario non costituiscono da soli una certificazione delle licenze o
della copertura di ogni libreria nativa. Questi limiti restano espliciti.

La CI Tox21 ora applica il gate dopo i test funzionali e conserva JSON/log anche
se fallisce. Il tar resta locale al runner e non viene caricato come artifact;
il candidato esportato localmente resta fuori dai repository. Un Required gate
rosso per la policy non viene confuso con un test applicativo fallito.

## Verifiche e stato corrente

- Suite Tox21 Linux: **107 test autonomi passati** (93 applicativi, 9 modello,
  5 training sintetico); otto nuovi casi di identità/policy/archivio. Cinque
  casi stdlib dell'exporter passano anche sul Python host. La prova host degli
  identity test richiedeva dipendenze assenti in quel Python: non considerata
  superata; coperta invece nella suite Linux con dipendenze corrette.
- Coordinatore Web: **5 casi sintetici** passati: record mancanti/critici,
  archivi alterati, SHA Web divergente, target diversi, candidato completo
  coerente senza dichiarazione di deployment. Nessuna immagine Web reale
  validata da questi fixture. Test agganciato al job container Linux Web.
- Build validation iniziale interrotta per helper di test non copiato nello
  stadio; corretto il COPY limitatamente allo stadio validation. Runtime finale
  mantiene esclusione di test, training e tool di consegna.

### Candidato reale e CI sull'esatto SHA

Tox21 commit `d5a783fd9ca482288a9500fa1212c53f81aaab18`.
[Run 42276833330](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42276833330):
**failure**, Required gate **failure**. Sono riusciti installazione pulita,
107 casi autonomi, gruppi 93/9/5 senza skip, export QA, tre build/audit,
riferimento reale e tre smoke con recovery. La fase finale ha eseguito davvero
save, SBOM/scan e load, poi è uscita **2** per 18 findings critici, con la stessa
distribuzione della baseline. Non è un errore del trasporto o dei test.

I diagnostici del run fallito sono stati scaricati e ispezionati: artifact
`tox21-reports-d5a783fd9ca482288a9500fa1212c53f81aaab18-1`, ID `13532719182`,
450096 byte ZIP, retention 14 giorni. Il modello QA è un artifact separato
(ID `13532519751`); nessun tar immagine è pubblicato in questi artifact.

Prova locale sullo stesso codice, da `git archive`, versione `t21-07-qa`,
target production e pacchetto QA T21-03 invariato:

| Evidenza | Identità/esito |
| --- | --- |
| ID Docker locale | `sha256:b13ae7c60f1d095beeb3c3d496845e499b8710f1f2225d05a2c1d22afd4f2079` |
| Config digest portabile | `sha256:5f6027ab45564ba6014b05bd511d22eed6b9cca72f2fc948f9f3b1268ba1ff6e` |
| SHA256 archivio (351862272 byte) | `a160f4f7910a28d8eb4ed0734477ee4c6b47a4ed415997155acb64259256e455` |
| Export/load | Riuscito; label, architettura e layer ripristinati corrispondenti |
| Audit e NATS | Inferenza reale ripetibile, build identity corretta, cinque subject e recovery passati, arresto 0 |
| SBOM | 143 componenti, CycloneDX; pacchetti OS e Python rilevati |
| Sicurezza | `security_eligible=false`, uscita 2, 18 critiche |

Il record conserva modello `qa-6f19c86`, export source
`6f19c869a0d99209fc78eb6a909d1f45897118a8`, hash pesi
`cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104` e soglie
`075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606`.
Lo SHA del modello è distinto da quello dell'immagine. Il candidato CI usa invece
il proprio export `ci-qa`, senza pretendere identità byte-per-byte del manifest
o dell'immagine locale. Non è stato fatto nuovo training sul dataset.

Manifest coordinato effettivamente generato con Web source previsto
`cbd7ccecf265ddda6dcefdf0325c2cc72cf159df` e Tox21 `d5a783f…`:
`missing_components=[web-ng,web-node]`, `blocked_components=[tox21]`,
`eligible_for_integrated_acceptance=false`, `deployed=false`, uscita 2.
Lo SHA Web identifica il codice previsto, non immagini già costruite. Il tool
ha verificato l'archivio reale e i checksum prima di registrare il blocco.

File e log esterni ai repository:
`C:/Users/giuli/.codex/artifacts/t21-07/`, sottocartelle `candidate-tox21`,
`production-smoke`, `remote-42276833330`, manifest `coordinated-candidate.json`.
Immagini/cache QA conservate; container/reti temporanei rimossi. Il blocco è
riproducibile senza cancellare immagini o interrompere servizi personali.

## Intervento necessario prima di proseguire

Preparare una revisione dedicata della baseline OS/Python e Pillow, con verifica
wheel/native libraries, lock/hash, modello/soglie e regressioni. Nessun upgrade
di massa o eccezione di rischio è autorizzato implicitamente dalla preparazione
degli artifact. Dopo una baseline ammissibile, completare i record delle vere
immagini Web e verificare il manifest coordinato prima di T21-08.

Il progetto portfolio beneficia di un blocco dimostrato e riproducibile: non
richiede di simulare una release commerciale pronta o un team di sicurezza.
La scelta di eventuali eccezioni deve essere esplicita e motivata; qui non ne
è stata introdotta alcuna. Nessun merge, deployment, modifica ai pesi/dataset,
rotazione JWT o intervento sui servizi dell'utente.
