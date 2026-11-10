# Supply-chain security

`docs/supply-chain-policy.json` contiene la policy versionata. Dal 10 novembre
2026, per indicazione esplicita dell'owner, la versione 2 è **strict**:
qualsiasi vulnerabilità segnalata blocca, indipendentemente dalla gravità e
anche quando identificata solo da GHSA. Nessuna eccezione per CVE, severità,
pacchetto, finding suppressed o assenza di una versione corretta.

`npm run ci:supply-chain` controlla tutti i `package-lock.json` tracciati:
workspace root, MercurionData e MercurionLandingFactory, includendo dipendenze
runtime, sviluppo, opzionali e peer. Blocca INFO/LOW/MODERATE/HIGH/CRITICAL,
report incompleti/incoerenti, severità sconosciute ed errori dello scanner.
I report di audit sono conservati anche quando il gate rifiuta le dipendenze.
La stessa regola zero finding vale per le immagini e per la rivalutazione degli
archivi coordinati: una precedente approvazione con finding non critici non
può essere riutilizzata come approvazione strict.

Restano i controlli su segreti tracciati (valori oscurati), Action immutabili,
licenze e identità degli artefatti. [Diagnosi, verifiche e priorità di rientro](infrastructure/security-strict-2026-11-10.md).

CI produces a CycloneDX workspace SBOM and a release-candidate manifest bound
to the lockfile, build version, and exact Git revision. The existing production
container gate separately produces and scans the final Nest image SBOM by image
digest. GitHub Actions attests the release-candidate manifest using its
short-lived OIDC identity and Sigstore, then verifies it against this repository
and `.github/workflows/ci.yml`. Nothing is deployed or published.

Vulnerability exceptions are forbidden by policy v2. Existing license metadata
exceptions are separate and do not authorize vulnerable packages.
Secret findings must be handled by the owner without copying the value into
logs, reports, issues, or exceptions.
