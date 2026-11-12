# Ripresa operativa — 12 novembre 2026

**Vincolo prioritario:** le versioni server VM devono coincidere con lo
sviluppo definito in `docker_sl/docker-compose.yml` e relativo Dockerfile
PostgreSQL. Divergenze effettive documentate in
[SERVICE-VERSION-PARITY.md](SERVICE-VERSION-PARITY.md), incluse versione del
pacchetto pgvector e versione nel catalogo DB. Non avviare restore su una
baseline divergente e non aggiornare lo sviluppo o declassare i volumi per
forzare la parità senza piano. La readiness positiva non chiude questo requisito.

**Pausa dati:** l'owner sta recuperando da archivio RAR i chunk degli embedding
nella propria directory privata. Non avviare trasferimenti o restore prima
della sua conferma. Nel frattempo sono autorizzate analisi e proposta:
[schema SQL, Meili e tool scope](DATA-BOOTSTRAP-PLAN.md). Tool scope ancora da
implementare; nessuna chiave letta o esposta e nessun privilegio modificato.

**Punto corrente:** verifica applicativa conclusa con verificationId
`51f087181cb34ec3ad4ace23ec9e53fe`: backend, frontend e RPC Tox21 tutti true,
stessi quattro container, senza nuovi avvii o modifiche al database. Forward
Nginx attivo e landing visualizzata dall'owner su `http://localhost:18888`.
Procedura nelle [sezioni 7–8](APPLICATION-BOOTSTRAP.md#7-riprendere-soltanto-la-verifica-dei-container-esistenti).
Il controllo console/network tramite Playwright non è stato acquisito.
Non ripetere bootstrap/schema. ChEMBL e embedding rimangono nella fase
successiva: inventariare dump/chunk prima di trasferimento e restore.

L'owner riprende il lavoro con obiettivo staging funzionante e documentazione
passo passo di ogni operazione. Ha confermato che la VM è stata spenta o
riavviata. La pausa precedente è terminata; i segreti tmpfs non vanno presunti
presenti. Prima delle API key e del bootstrap applicativo seguire
[COLD-RECOVERY.md](COLD-RECOVERY.md): inventario della release e dei quattro
server concluso con inspectionId 8606c6dead7f4b32976e15371f840a5f. Il
recupero dei quattro server è ora confermato dalla verifica
`d2cfff6e2a204c27ac3362f4d9e59fbf`: sei controlli true, server attivi e stessi
volumi. Due chiavi client Meili a 90 giorni ora create; prossimo passo: applicazioni private. La policy
Cloudflare Access è predisposta su `preview.mercurion.app`; non attesta ancora
il collegamento del tunnel o il funzionamento applicativo. Nessun merge.

**Aggiornamento:** il recupero owner attemptId
`1250bedb66bb4415be4dea909207077e` ha avviato i quattro server ma la readiness
è terminata in timeout. Non rieseguire prepare/receive/start. Corretto il probe
NATS e predisposta la sola verifica nella sezione 4.4 di COLD-RECOVERY.md;
verifica owner successiva passed con tutti i sei controlli, senza nuovi avvii
o modifiche. Meili è a `172.18.0.2`; chiavi client create con successo. Le ricevute originali
fallite restano conservate.

**Chiavi Meili completate:** owner riporta MEILI_CLIENT_KEYS_READY, due UID
applicativi, 90 giorni, quattro negazioni 403 e nessun altro campo modificato.
Non ripetere il provisioning. Prossimo task: bootstrap applicativo privato.

**Preparazione VM-045:** seguire [APPLICATION-BOOTSTRAP.md](APPLICATION-BOOTSTRAP.md).
Gli export correnti sono sotto `.codex/artifacts/inf-vm-04/vm045-applications`
nel profilo dell'owner. Launcher e controlli sono versionati; nessuna esecuzione
VM del nuovo bootstrap ancora attestata. Il pacchetto `ready` deve essere
assemblato da helper committati e la CI esatta verificata prima della consegna.
Tox21 aggiornata nei soli pacchetti OS, scansione strict a zero; codice e modello
invariati. La ripartenza unificata delle applicazioni rimane un task successivo.

## Consegna precedente, conservata come storico

# Pausa operativa — fine giornata 11 novembre 2026

**Istruzione esplicita dell'owner:** stop alle operazioni infrastrutturali per
oggi; comando API key rimandato al giorno successivo, con tunnel aperto.
Il lavoro successivo autorizzato in questa sessione è soltanto documentare e
conservare in Git l'intero percorso. Non continuare consegna di segreti,
avvii, reboot, rete, Cloudflare o operazioni Meili durante la pausa.

## Punto di ripresa del 12 novembre

1. Leggere [RUNBOOK.md](RUNBOOK.md), sezione 12, e
   [EXECUTION-RECORD.md](EXECUTION-RECORD.md).
2. VM-043 **conclusa**: run 6c3e72e2e4064b71bd3bbffcff4d629c, quattro server,
   roundtrip/readiness positivi, nessuna porta pubblicata. Non ripetere bootstrap,
   ResumePublicCopy, generazione file o riparazione AES.
3. VM-044 indici **conclusa**: logs_staging/security_logs_staging e coppia
   production creati, primaryKey id, task 0–3 verificati. Non ricrearli.
4. API key **non eseguite**: owner ha scelto validita 90 giorni. Salvare e chiudere
   il file privato nell'editor; con tunnel disponibile usare il comando versionato:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-PreviewMeiliClientKeys.ps1 -Expiry 90Days
   ```

   Il vecchio comando sotto .codex/artifacts era una copia pubblica della stessa
   procedura; non eseguire entrambe le copie. Il sorgente stabile e nel repository.
5. Master/passphrase/sudo solo nel terminale dell'owner. Non leggere il suo
   configuration.json o dotenv/PEM da una sessione agente. Attendere la ricevuta
   MEILI_CLIENT_KEYS_READY prima di dichiarare compilate/valide le chiavi.
6. Se la VM ha perso tmpfs per reboot/arresto, non procedere come se i bind fossero
   ancora pronti: cold recovery dei server reali ancora aperta (runbook sezione 13).

Provider reali e riparazione iniziale AES sono gia confermati. Dropbox/GitHub/
LinkedIn inutilizzati usano placeholder non vuoti; chiavi Meili client ancora
in attesa. Hostname preview.mercurion.app, applicazioni e DNS/tunnel pubblico
ancora non attivati. H-05/A-05/A-30 restano parziali.

Branch operativi Web feature/infra-vm-docker-engine-architecture e Tox21
feature/infra-vm-nats-client-auth; nessun merge autonomo. Preservare il preesistente
scripts/infrastructure/__pycache__. La revisione delle immagini Web e d227dbf4,
Tox21 d506101; strumenti di ripresa SCP ca14b03d con Required gate verde.
Revisioni e limiti completi nel registro; non ricostruire lo stato dalla vecchia
cronologia seguente. Gli strumenti/documenti promossi hanno la loro CI corrente.

## Materiale storico, non istruzioni per la ripresa attuale

## Snapshot storico della pausa del 10 novembre

Le sezioni seguenti descrivono lo stato **prima** della ripresa dell'11
novembre; decisioni aperte e modifiche non validate sono superate dal punto
di ripresa sopra e da PREVIEW-BOOTSTRAP.md.

**Pausa esplicita dell'owner: «riprendiamo domani».** Nessuna attività
in background o operazione VM da continuare durante la pausa.

## Ultima milestone conclusa

VM-041 verificata: Tox21/NATS reali sulla VM, load/save con digest coerenti,
tre lifecycle RPC, nove negazioni NATS, tre stop e cleanup senza errori.
Report recuperato separatamente dopo chiusura del primo SCP, senza
rieseguire il pilot. [Procedura ed evidenze](TOX21-VM-PILOT.md).

Web operativo: `feature/infra-vm-docker-engine-architecture`, SHA
`f3c4c4873e05f7e152d01ae2ecc5a869630ef7e8`, pubblicato.
[CI full 42880413194](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42880413194)
verde, Required gate incluso. Tox21 operativo invariato:
`feature/infra-vm-nats-client-auth`, SHA
`d506101ec27c985ef4ddb280266bfcdc4b6bf1c4`, CI 42858304379 verde.
Nessun merge autorizzato all'agente; continuare dai branch operativi.

## Lavoro avviato verso lo stack preview (VM-042)

**Modifiche locali non ancora committate o validate dopo gli ultimi edit:**

- `MercurionWebNode/Dockerfile`: staging usa le dipendenze runtime già
  preparate per production e solo i package compilati; rimozione degli
  artefatti TypeScript/map e label esplicite dell'ambiente.
- `MercurionWebNg/Dockerfile`: label ambiente sui tre target.
- `scripts/export-web-container.py`: target staging/production esplicito,
  default production conservato; controlli di coerenza label/APP_ENV e
  verifica della presenza del launcher bootstrap Nest nell'audit.
- `scripts/test-coordinate-delivery.py`: due nuovi test per staging e
  impossibilità di scambiare target/frontend privi di provenienza.

Il precedente gate verde certifica f3c4c487, non questi edit. Nessuna nuova
CI o build Web eseguita; nessun container applicativo o servizio VM avviato
in questo task. Non dichiarare la preview pronta. Il `__pycache__` non
tracciato in `scripts/infrastructure` era già presente: preservarlo.

## Scansioni delle dipendenze infrastrutturali

Artefatti esterni a Git:

```text
C:/Users/giuli/.codex/artifacts/inf-vm-04/vm042-preview/
  initial-postgres/{image.tar,vulnerabilities.json,summary.json}
  initial-redis/{image.tar,vulnerabilities.json,summary.json}
  initial-meilisearch/{image.tar,vulnerabilities.json,summary.json}
  scan-initial-services.py
```

Scan Trivy fissato per digest, nessun ignore o esclusione di gravità:

| Immagine locale precedente | Finding (occorrenze, non CVE uniche) | Esito |
| --- | ---: | --- |
| PostgreSQL 16/pgvector `0d00971a33d0…` | 872 | Respinta |
| Redis `4521b581dbdd…` | 327 | Respinta |
| Meilisearch `8cd411ba5d9e…` | 62 | Respinta |

Le scansioni sono terminate. Nessuna immagine respinta trasferita alla VM.
Non riutilizzare i container o volumi di sviluppo per il nuovo deployment.
La policy strict resta invariata: tutte le gravità bloccano, senza deroghe.

Consultato anche l'indice ufficiale Wolfi: disponibili PostgreSQL 16 e
Meilisearch; il pacchetto pgvector per 16 osservato è vecchio rispetto a
quello per 18. È solo inventario, **nessuna migrazione a PostgreSQL 18 o
scelta alternativa di Redis approvata**. Selezionare e scansionare runtime
compatibili mantenendo PostgreSQL 16/pgvector e i contratti concordati.

## Decisione ancora da ricevere

È stato chiesto all'owner come gestire il primo bootstrap dei provider:
valori reali preparati dall'owner in un file locale, oppure primo collaudo
isolato con valori sintetici e provider rimandati. La risposta ricevuta è
la pausa, **non** una scelta fra le due opzioni. Non inferire un consenso
dal valore preselezionato della domanda.

Non leggere dotenv/PEM/credenziali personali o chiedere valori in chat.
SSH, passphrase e sudo restano nel terminale dell'owner. I segreti interni
per preview devono essere distinti da produzione e dai dati di sviluppo.

## Ripresa operativa

1. Rileggere questo checkpoint e verificare le modifiche dell'owner prima
   di riprendere gli edit. Conservare la base operativa e il lavoro locale.
2. Verificare i nuovi test dell'exporter e completare la scansione strict
   anche degli artefatti Web staging nel workflow: oggi gli export/scan
   completi sono registrati solo per i target production.
3. Risolvere le immagini infrastrutturali respinte, predisporre manifest
   reali e bootstrap riusando i contratti esistenti. Acquisire la scelta
   sui provider senza ripetere audit già disponibili.
4. Procedere per la milestone preview, con prove locali proporzionate e
   una CI finale per il blocco coerente. Non frammentare ogni ricevuta in
   un nuovo ciclo completo; conservare le evidenze fuori da Git.

H-05/A-05/A-30 e il tunnel pubblico restano separati e aperti. Nessun cambio
a firewall/ACL/router, Cloudflare, produzione o merge implicito.
