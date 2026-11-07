# T21-11 — Override JWT per singolo servizio (pianificato)

Requisito dell'owner, 7 novembre 2026. Implementazione su `feature/T21-11`
nei due repository, senza merge. Sono preservati il default globale pubblico,
il formato PEM e i contratti NATS. Vedi [verbale e prove](tox21-service-auth-qa.md).

Ogni servizio avrà un flag ternario indipendente, con precedenza sul globale:

| Valore | Globale allow-all (skip auth) | Globale con JWT obbligatorio |
| --- | --- | --- |
| `allow` | Autorizza senza richiedere JWT | Autorizza senza richiedere JWT |
| `require-jwt` | Richiede JWT valido; rifiuta token assente o non valido | Richiede JWT valido; rifiuta token assente o non valido |
| `disabled` oppure flag omesso | Eredita allow-all | Eredita JWT obbligatorio |

L'owner ha approvato `require-jwt` al posto della grafia della prima proposta;
il vecchio valore non viene accettato come alias. Si verifica la validita del
JWT (firma, scadenza e audience), non soltanto la sua presenza.

`disabled` significa **override disattivato**, non servizio disabilitato e non
accesso negato. Il default deve essere applicato centralmente anche quando la
configurazione non menziona il servizio; nessuna duplicazione di fallback negli
handler. Il globale oggi denominato tutto-o-nulla determina se tutte le richieste
richiedono JWT: non nega indiscriminatamente anche i token validi.

I cinque controlli sono distinti, non un unico flag RDKit:

| Servizio | Subject base esistente |
| --- | --- |
| Inferenza | `inference.tox21.smiles` |
| Descrittori RDKit | `rdkit_api.get_molecule_properties` |
| Canonicalizzazione RDKit | `rdkit_api.to_canonical_smiles` |
| Equivalenza strutturale RDKit | `rdkit_api.are_same_structure` |
| Nome IUPAC PubChemPy | `pcp_api.get_iupac_name_from_smiles` |

Il prefisso NATS dell'ambiente non cambia. Payload, envelope, errori di dominio,
inferenza e validazione degli input restano obbligatori anche con `allow`.
Autorizzare senza JWT non significa accettare richieste malformate.

## Configurazione approvata

Una variabile per servizio: `AUTH_INFERENCE`, `AUTH_RDKIT_PROPERTIES`,
`AUTH_RDKIT_CANONICAL_SMILES`, `AUTH_RDKIT_SAME_STRUCTURE`,
`AUTH_PUBCHEM_IUPAC_NAME`. I tre valori ammessi sono esatti e minuscoli.
Variabile assente: default Pydantic `disabled`. Variabile presente vuota,
con spazi, null o valore estraneo: errore di validazione che blocca il bootstrap
prima di PEM, modello e connessione NATS. Nessuna normalizzazione permissiva.
Le policy vengono risolte una volta al bootstrap; una modifica richiede riavvio.

Compose inoltra i valori con `${AUTH_INFERENCE-disabled}` e analoghi:
il singolo meno conserva il valore vuoto, che deve fallire nel worker.
Gli override con JWT richiedono un mount read-only del PEM pubblico e
`JWT_PUBLIC_KEY_PATH`; nessun percorso o materiale reale scelto automaticamente.

## Vincoli implementativi

- Risolvere prima la policy effettiva per ogni handler; questa deve governare
  sia la richiesta del token nello schema Pydantic sia la verifica JWT, evitando
  che il bypass globale annulli l'override locale o viceversa.
- Caricare il PEM pubblico RS256 se almeno un servizio richiede effettivamente
  JWT. Non subordinare tutti i servizi `allow` al solo valore del globale;
  la decisione di bootstrap deve considerare le cinque policy risolte.
- Conservare auth stateless JWT esistente e audience, senza introdurre ruoli,
  ACL del broker, key rotation o nuovi endpoint per gestire i flag.
- Valori non riconosciuti non devono diventare un'autorizzazione silenziosa.
  Null e stringhe vuote sono invalidi; solo l'assenza usa `disabled`.

## Accettazione

Testare tutte le combinazioni dei tre stati con entrambi i valori globali,
per tutti e cinque gli handler, includendo flag omesso, JWT assente, valido,
scaduto, firma/audience errate e richiesta malformata. Verificare esplicitamente
`allow` sopra globale restrittivo e JWT obbligatorio sopra globale permissivo.
Copertura di configurazioni miste e bootstrap del PEM; contratti Web invariati.
Concludere con smoke NATS isolato sulle policy miste, senza provider PubChem
reale come dipendenza obbligatoria. Non è un prerequisito della baseline attuale.
