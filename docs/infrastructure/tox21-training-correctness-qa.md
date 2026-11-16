# T21-10 — Correttezza della pipeline locale di training

7 novembre 2026. Prima fase T21-10: test su dati sintetici e controlli degli
input; nessun nuovo addestramento completo o certificazione scientifica.
Branch `feature/T21-10` nei due repository; nessun merge eseguito.

## Vincoli e intervento

Il contratto è fissato in Tox21 `docs/training-contract.md` prima dei controlli:
split casuale per righe invariato, label ordinate, nessuna imputazione,
calibrazione sul validation set e checkpoint selezionato, runtime senza training.

- Gli split sono riproducibili con lo stesso seed, disgiunti e completi per
  identità di riga; test con colonne CSV riordinate verificano l'allineamento.
  Non dimostrano separazione di molecole duplicate/scaffold o generalizzazione.
- SMILES invalidi/mancanti vengono omessi prima della conversione. Label
  mancanti o non binarie sulle righe mantenute, input vuoto e frazioni di split
  invalide falliscono prima della scrittura degli array. Nessuna label ignota
  viene trasformata in negativo.
- I loader rifiutano array vuoti, non binari o di dimensioni incompatibili,
  disabilitano pickle e leggono solo train/validation. Architettura e ordine
  delle dodici label restano invariati.
- La ricerca delle soglie mantiene griglia, F1 macro, confronto stretto,
  prima soluzione ottimale e fallback esistenti. Test espliciti coprono label
  costanti, uguaglianza alla soglia e probabilità non finite/fuori intervallo.
  F1 di una label costante non è una dimostrazione di qualità; AUC senza entrambe
  le classi resta non definita.
- Early stopping: delta, pazienza, reset del contatore e contenuto dei pesi
  salvati. Loss non finita respinta senza sostituire un buon checkpoint.
- La prova con due piccole epoche arriva ora all'export: checksum dei pesi e
  soglie comuni/per-label coincidono con il checkpoint scelto, non con l'ultima
  epoca. File test deliberatamente illeggibili non vengono consumati dall'export.

Non modificati dati, pesi, soglie storiche, lockfile, auth, contratti NATS o
contenuto ammesso nelle immagini finali. Nessuna modifica al runtime Web.

## Evidenze locali

Baseline pulite e allineate ai rispettivi remoti dopo l'integrazione dell'owner:
Web `fb89701dbe25509190943556f740c61fcf37bfc4`, Tox21
`a99754c9e61051036153d3676b7ef5d568b0c1bc`.
Il gate Tox21 applicativo/container sulla baseline è verde nel
[run 42360144406](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42360144406).
Web ha il Required gate verde sull'esatto SHA nel
[run 42370113567](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42370113567)
con percorso duplicate: la CI completa precedente sullo stesso SHA rimane
[42364559532, tentativo 2](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42364559532/attempts/2).

La prima esecuzione delle 14 nuove prove ha riprodotto 22 subtest falliti e
cinque errori prima delle correzioni. Alla consegna locale: **21 test training**,
**123 totali in ordine normale e 123 in ordine inverso**, senza skip. I conteggi
si sovrappongono. Ambiente Linux CPU bloccato già disponibile, rete disabilitata,
sorgenti/test candidati montati in sola lettura, file sintetici temporanei.
Report e log locali: `C:/Users/giuli/.codex/artifacts/t21-10/`.

Il commit implementativo Tox21 è `bc980c9` su `feature/T21-10`; la CI remota
del candidato è separata da questi risultati locali e va verificata sull'esatto
SHA prima dell'integrazione. Nessuna installazione host o riavvio di servizi
dell'utente. Nessun deployment o aggiornamento del modello storico.

## Residui espliciti

La fase di correttezza non chiude la valutazione scientifica di un nuovo
modello: richiederà training locale autorizzato, provenienza di dati/split,
seed/configurazione/librerie/checkpoint, metriche per-label e aggregate sul
test set riservato e criteri motivati prima del confronto. Nessun punteggio
viene inventato o migliorato cambiando opportunisticamente lo split.

T21-11 resta un task successivo da autorizzare. I residui HTTP/browser,
PubChem live, deployment VM e l'intermittenza del test layout Angular osservata
in T21-08 restano separati e non sono risolti da questa suite.
