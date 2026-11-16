# ReleaseNotes (jsonb) – Mappa dell’oggetto finale

Questa pagina descrive **la struttura finale del JSON** che finisce nel campo `release_notes` (PostgreSQL `jsonb`) e mostra **la relazione** tra:

- JSON salvato nel DB
- interfacce TypeScript:
  - `ReleaseNoteHeader`
  - `ReleaseChanges`, `ReleaseChangeItem`, `ReleaseOpsNotes`, `ReleaseCompatibility`
  - `ReleaseNotes` (che estende `ReleaseNoteHeader`)

> Nota: JSON “puro” non supporta commenti. Qui uso una **versione commentata** (stile `jsonc`) solo per spiegare la mappa.  
> Nel DB salverai lo stesso oggetto **senza commenti**.

---

## Vista d’insieme

- **Header** (obbligatorio): identità della release
- **Body** (opzionale ma consigliato): cambiamenti, note operative, compatibilità
- **Extra** (opzionale): estensioni future senza rompere lo schema

Radice oggetto: `ReleaseNotes`

---

## Mappa ad albero (shape)

- `title: string`  
- `summary: string`  
- `audience: 'internal' | 'users' | 'mixed'`  
- `risk: 'low' | 'medium' | 'high'`  
- `type: 'beta' | 'prod'`  
- `date: number` (unix ms)

- `changes?: ReleaseChanges`
  - `added?: ReleaseChangeItem[]`
  - `changed?: ReleaseChangeItem[]`
  - `fixed?: ReleaseChangeItem[]`
  - `deprecated?: ReleaseChangeItem[]`
  - `removed?: ReleaseChangeItem[]`
  - `security?: ReleaseChangeItem[]`

- `ops?: ReleaseOpsNotes`
  - `deployNotes?: string`
  - `migration?: { required: boolean, notes?: string | null }`
  - `rollback?: { safe: boolean, notes?: string | null }`
  - `config?: { key: string, action: 'add'|'update'|'remove', notes?: string | null }[]`

- `compatibility?: ReleaseCompatibility`
  - `api?: { minClientVersion?: string, notes?: string | null }`
  - `db?: { requiresMigration?: boolean, notes?: string | null }`
  - `breakingChanges?: { text: string, mitigation?: string | null }[]`

- `extra?: Record<string, unknown> | null`

---

## Esempio completo (JSONB commentato)

```jsonc
{
  // ReleaseNoteHeader
  "title": "Session lifecycle hardening",
  "summary": "Migliorata la gestione scadenza sessione e sync dello stato client.",
  "audience": "mixed",
  "risk": "medium",
  "type": "beta",
  "date": 1766707200000,

  // ReleaseNotes.changes?: ReleaseChanges
  "changes": {
    // ReleaseChanges.added?: ReleaseChangeItem[]
    "added": [
      {
        // ReleaseChangeItem
        "text": "Emette evento 'session-expired' verso i client connessi.",
        "scope": "auth",          // ReleaseScope
        "breaking": false,
        "refs": {
          // ReleaseChangeRef (tutto opzionale)
          "issues": ["#214"],
          "pr": ["#988"],
          "docs": ["DOC-12"]
        }
      }
    ],

    // ReleaseChanges.fixed?: ReleaseChangeItem[]
    "fixed": [
      {
        "text": "Evita stato login stale dopo TTL Redis.",
        "scope": "auth",
        "breaking": false
      }
    ]

    // Sezioni non presenti = undefined (semplicemente non esistono nel JSON)
    // "changed": [],
    // "deprecated": [],
    // "removed": [],
    // "security": []
  },

  // ReleaseNotes.ops?: ReleaseOpsNotes
  "ops": {
    "deployNotes": "Nessuno step speciale. Verificare log websocket post-deploy.",

    "migration": {
      "required": false,
      "notes": null
    },

    "rollback": {
      "safe": true,
      "notes": "Rollback safe: nessun backfill dati."
    },

    "config": [
      {
        "key": "SESSION_EXPIRED_EVENT_ENABLED",
        "action": "add",
        "notes": "Default true in staging"
      }
    ]
  },

  // ReleaseNotes.compatibility?: ReleaseCompatibility
  "compatibility": {
    "api": {
      "minClientVersion": "1.7.0",
      "notes": "Il client deve gestire l'evento session-expired."
    },
    "db": {
      "requiresMigration": false,
      "notes": null
    },
    "breakingChanges": []
  },

  // ReleaseNotes.extra?: Record<string, unknown> | null
  "extra": null
}
```

---

## “DB-ready” (lo stesso esempio senza commenti)

Questo è **esattamente** ciò che finirebbe in `jsonb`:

```json
{
  "title": "Session lifecycle hardening",
  "summary": "Migliorata la gestione scadenza sessione e sync dello stato client.",
  "audience": "mixed",
  "risk": "medium",
  "type": "beta",
  "date": 1766707200000,
  "changes": {
    "added": [
      {
        "text": "Emette evento 'session-expired' verso i client connessi.",
        "scope": "auth",
        "breaking": false,
        "refs": {
          "issues": ["#214"],
          "pr": ["#988"],
          "docs": ["DOC-12"]
        }
      }
    ],
    "fixed": [
      {
        "text": "Evita stato login stale dopo TTL Redis.",
        "scope": "auth",
        "breaking": false
      }
    ]
  },
  "ops": {
    "deployNotes": "Nessuno step speciale. Verificare log websocket post-deploy.",
    "migration": {
      "required": false,
      "notes": null
    },
    "rollback": {
      "safe": true,
      "notes": "Rollback safe: nessun backfill dati."
    },
    "config": [
      {
        "key": "SESSION_EXPIRED_EVENT_ENABLED",
        "action": "add",
        "notes": "Default true in staging"
      }
    ]
  },
  "compatibility": {
    "api": {
      "minClientVersion": "1.7.0",
      "notes": "Il client deve gestire l'evento session-expired."
    },
    "db": {
      "requiresMigration": false,
      "notes": null
    },
    "breakingChanges": []
  },
  "extra": null
}
```

---

## Note pratiche di coerenza (super brevi)

- Se `type = 'prod'` e `risk = 'high'`, è buona pratica valorizzare almeno:
  - `compatibility.breakingChanges` (anche solo 1 item)
  - `ops.rollback`
- Se non hai nulla da dire, **ometti** il blocco (lascia `undefined`) invece di mettere oggetti vuoti, a meno che ti serva esplicitamente distinguere “vuoto” da “assente”.
