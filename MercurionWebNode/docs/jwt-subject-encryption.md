# Cifratura dell'identificativo utente nei JWT

## Contratto del claim `sub`

Nei JWT emessi dal backend Mercurion, `sub` contiene un identificativo utente
cifrato e opaco. Non contiene lo `userId` in chiaro. Il backend mantiene lo
`userId` originale per query, autorizzazioni e logica di dominio; i client
trattano `sub` come un valore opaco e non lo interpretano come UUID.

Il backend firma il token con il valore prodotto da
`SecurityService.encryptUserId`. Dopo aver verificato firma, tipo e validità del
token, i componenti backend recuperano l'identificativo originale tramite
`SecurityService.decryptUserId` prima di usarlo. Tutti i JWT applicativi passano
da `JwtToolsService.generateToken`.

## Protezione applicata

`SecurityService` cifra lo UUID UTF-8 con AES-256-GCM. Per ogni cifratura genera
un IV casuale di 12 byte; il valore esadecimale inserito in `sub` concatena IV,
tag di autenticazione da 16 byte e testo cifrato. L'IV casuale fa sì che token
diversi per lo stesso utente abbiano valori `sub` differenti.

Il JWT rimane firmato ma non è cifrato nel suo complesso: gli altri claim sono
leggibili da chi possiede il token. La cifratura di `sub` protegge lo `userId`
in chiaro, ma non sostituisce la verifica della firma, la validazione della
sessione o i controlli di autorizzazione.

## Configurazione e gestione della chiave

`APP_USER_ID_AES_ENCRYPTION_SECRET` è obbligatorio. La validazione richiede un
segreto Base64 valido che decodifichi ad almeno 32 byte. Per AES-256 il backend
usa i primi 32 byte decodificati come chiave; byte aggiuntivi non aumentano la
dimensione della chiave AES. Il segreto deve essere conservato solo nelle
configurazioni server e mantenuto uguale tra le istanze che emettono o
decifrano token.

La rotazione della chiave rende non decifrabili i `sub` cifrati con la chiave
precedente. Va quindi coordinata con la scadenza o revoca dei token esistenti e
con l'eventuale supporto temporaneo a più chiavi, se introdotto in futuro.
Non riutilizzare `APP_AES_SECRET`: la chiave per gli identificativi utente è
separata intenzionalmente.

## Compatibilità

I JWT precedenti a questo cambio contengono lo `userId` in chiaro nel claim
`sub` e non sono compatibili con la decifratura corrente. Dopo il rilascio, i
client devono ottenere nuovi token tramite il flusso di autenticazione. Non
aggiungere fallback che interpreti un `sub` non decifrabile come UUID in chiaro:
ciò reintrodurrebbe il vecchio contratto e renderebbe ambiguo il confine di
fiducia.
