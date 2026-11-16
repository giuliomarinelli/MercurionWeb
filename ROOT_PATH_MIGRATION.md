# Migrazione della SPA da `/m` a `/`

## Contratto di routing

Il gateway deve inoltrare alla SPA tutto ciò che non appartiene a uno dei
namespace riservati:

- `/api` e `/api/**` → MercurionWebNode
- `/socket.io` e `/socket.io/**` → MercurionWebNode
- `/health`, `/robots.txt`, `/sitemap.xml`, `/og/mercurion-og.png` → MercurionWebNode
- `/ketcher` e `/ketcher/**` → MercurionWebNg con gli header dedicati
- `/_edge-errors/**` → asset locali delle pagine di errore nginx
- `/.well-known` e `/.well-known/**` → riservati; finché non sono configurati
  rispondono `404`
- ogni altro percorso → MercurionWebNg

Le callback frontend come `/oauth2/callback`, `/account/activate` e
`/admin/maintenance/:token` appartengono alla SPA. Le callback backend restano
sotto `/api`.

## Compatibilità temporanea con `/m`

Il vecchio gateway restituiva un `301` da `/` a `/m/`. Alcuni client possono
averlo memorizzato: attivare subito il redirect permanente inverso creerebbe un
loop.

Per il rollout, le location legacy `/m` e `/m/**` rimuovono il prefisso solo
verso l'upstream. Prima del bootstrap Angular, `src/index.html` aggiorna la URL
con `history.replaceState`, senza una nuova richiesta di rete e preservando
query string e hash.

Quando i log non mostrano più traffico legacy significativo, questa
compatibilità può essere rimossa in una seconda release:

1. sostituire le location `/m` con redirect permanenti al percorso root
   equivalente;
2. rimuovere lo script transitorio da `MercurionWebNg/src/index.html`;
3. rimuovere la normalizzazione legacy dei valori `redirect_to` da
   `MercurionWebNg/src/app/app.component.ts`.

## Configurazione esterna

La variabile del backend deve indicare la root frontend, senza `/m` e senza
slash finale:

```dotenv
APP_USER_ACTIVATION_ORIGIN=https://mercurion.app
```

Il valore va aggiornato anche nel Secret Kubernetes `mercurion-web-node-env`
o nel secret manager usato dall'ambiente di destinazione; il file
`env/.env.example` non modifica i deployment esistenti.

Frontend, gateway e Secret backend vanno rilasciati come un unico cutover
coordinato. Prima di chiudere il rollout verificare almeno root/deep-link,
callback di autenticazione, API, Socket.IO, Ketcher, asset statici, sitemap e
pagine di errore.
