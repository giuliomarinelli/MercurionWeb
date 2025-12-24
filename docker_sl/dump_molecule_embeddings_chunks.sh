#!/usr/bin/env bash
set -euo pipefail

CONTAINER="pg_sl"
DB="mercurion"
DB_USER="app"
TABLE="public.molecule_embeddings"
OUTDIR="/c/Temp/molecule_emb_chunks"

export PGPASSWORD="rootpassword"

# presi da:
#   SELECT min(molregno), max(molregno) FROM public.molecule_embeddings;
MIN=1
MAX=3284111

CHUNKS=50   # ~24GiB / 50 ≈ ~500MiB a chunk

mkdir -p "$OUTDIR"

if (( MAX < MIN )); then
  echo "ERRORE: MAX < MIN (MIN=$MIN, MAX=$MAX)" >&2
  exit 1
fi

COUNT=$(( MAX - MIN + 1 ))
STEP=$(( (COUNT + CHUNKS - 1) / CHUNKS ))   # ceil(COUNT / CHUNKS)

if (( STEP <= 0 )); then
  echo "ERRORE: STEP non valido (STEP=$STEP)" >&2
  exit 1
fi

echo "MIN=$MIN MAX=$MAX COUNT=$COUNT STEP=$STEP"

for (( i=0; i<CHUNKS; i++ )); do
  START=$(( MIN + i*STEP ))
  # se siamo oltre MAX, non ha senso creare altri chunk
  if (( START > MAX )); then
    break
  fi

  END=$(( START + STEP ))

  if (( i == CHUNKS-1 || END > MAX )); then
    # ultimo chunk: prendiamo tutto da START in poi
    WHERE="molregno >= ${START}"
  else
    WHERE="molregno >= ${START} AND molregno < ${END}"
  fi

  FILE=$(printf "%s/molecule_embeddings-%03d.sql" "$OUTDIR" "$i")
  TMPDATA="$FILE.data"

  echo ">> Chunk $i -> $FILE"
  echo "   WHERE $WHERE"

  # query COPY server-side, output su STDOUT (solo dati, formato COPY text)
  SQL=$(cat <<EOF
COPY (
  SELECT stable_uuid,
         molregno,
         smiles,
         embedding,
         embedding_model,
         updated_at,
         preferred_name
  FROM ${TABLE}
  WHERE ${WHERE}
  ORDER BY molregno
) TO STDOUT;
EOF
)

  # dump dei dati dal container su file .data
  docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
    psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB" -c "$SQL" > "$TMPDATA"

  # costruzione dello .sql importabile
  {
    echo '\set ON_ERROR_STOP on'
    echo 'BEGIN;'
    echo 'COPY public.molecule_embeddings (stable_uuid, molregno, smiles, embedding, embedding_model, updated_at, preferred_name) FROM stdin;'
    cat "$TMPDATA"
    echo '\.'
    echo 'COMMIT;'
  } > "$FILE"

  rm -f "$TMPDATA"
done

echo ">> Finito. File generati in: $OUTDIR"
