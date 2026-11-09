# M-05 — ACL della vNIC Mercurion, prima fase SSH-only

9 novembre 2026. Script preparato e testato localmente con API Hyper-V simulate;
**nessuna ACL reale applicata dall'agente**. VM spenta dichiarata dall'owner.
La rete interna nuova è Pubblica in Kaspersky secondo screenshot; il codice
non può attestare la GUI del firewall. Questo passo non avvia o sposta la VM.

## Scelta di fase

Prima si recupera solo SSH host interno → guest, con risposte stateful.
Non si apre ancora l'egress pubblico: DNS, HTTPS e ogni connessione iniziata
dal guest rimangono negati. NAT/provider e possibili percorsi WAN/hairpin verso
LAN verranno verificati prima delle aperture successive. Nessuno stack reale
deve essere avviato sulla base di questa sola configurazione.

## Script e prerequisiti

[Entrypoint](../../../scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1),
[libreria](../../../scripts/infrastructure/MercurionVmAcl.ps1),
[test](../../../scripts/infrastructure/Test-MercurionVmNetworkAcl.ps1).
PowerShell 5.1 amministrativa; VM esatta `Mercurion-Server`, unica vNIC con
MAC `00155D00DD01`. Apply richiede VM **Off**, nuovo switch **Internal** e
`10.203.240.1/24` attivo **Preferred** sul relativo adattatore host.
Nessuna modifica a switch, IP, NAT, servizi, Kaspersky o Netplan.

Modalità predefinita `Plan`: solo letture e piano, nessun file o regola creati.
`Verify`: legge e richiede la corrispondenza esatta della policy. Per applicare:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Apply
```

Non avviare o ricollegare la VM durante l'operazione. Riportare ricevuta finale
e percorso snapshot, oppure errore; non ripetere automaticamente dopo un errore.
Se è già configurata esattamente, Apply controlla i prerequisiti e restituisce
`alreadyConfigured=true` senza nuovi snapshot o scritture.

## Sequenza e regole

1. Identifica la sola vNIC prevista; rifiuta più adattatori, MAC/switch inattesi,
   VM accesa, IP host non operativo o priorità ACL incompatibili.
2. Salva ACL originali e identità adattatore in directory GUID sotto
   `.codex/artifacts/inf-vm-02/static-network/acl`, file `before.json`.
   Fallimento del salvataggio impedisce ogni scrittura ACL.
3. Aggiunge e rilegge due deny temporanei ANY, inbound/outbound, peso 10000.
4. Rimuove le sole ACL della vNIC identificata, prima semplici poi estese;
   non usa nomi wildcard o modifiche globali. Installa la policy seguente.
5. Verifica set completo, assenza di ACL semplici/allow aggiuntivi e presenza
   delle due guardie. Solo dopo rimuove le guardie, poi rilegge il set finale.

| Regole finali | Peso | Risultato |
| --- | --- | --- |
| Deny inbound/outbound ANY | 10 | Tutto chiuso salvo eccezione esplicita |
| Deny IPv6 inbound/outbound | 900 | IPv6 completamente negato |
| Allow inbound TCP stateful | 300 | Solo `10.203.240.1/32` → `10.203.240.10/32`, porta locale 22, idle timeout 3600 s |
| Nove deny outbound | 201–209 | Prefissi privati/locali/multicast/riservati elencati nella guida |

Totale finale: **14 ACL estese, zero semplici, un solo allow**, nessun allow
outbound. Le risposte SSH dipendono dalla regola stateful. La ricevuta
`settingsReadbackVerified=true` verifica impostazioni lette, non pacchetti:
`isolationAccepted=false` resta sempre esplicito. Per questa fase le guardie
non si sovrappongono a regole legittime di peso uguale/superiore; stato parziale
con guardie già presenti richiede diagnosi prima di un nuovo Apply.

## Fallimenti e recupero

Nessun rollback automatico ai vecchi allow e nessuna ripartenza automatica.
Se l'errore avviene dopo la conferma delle guardie e prima del loro rilascio,
restano i deny; se avviene durante il rilascio/verifica finale, il programma
tenta di reinstallarli ma non ne garantisce il successo in presenza di errori
API. Anche un errore precoce può lasciare una sola guardia. Lasciare la VM Off,
conservare report e messaggio, controllare da console; mai dichiarare isolamento.

Modalità di recupero esplicita, sempre VM Off:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Quarantine
```

Aggiunge/verifica solo i due deny temporanei dopo snapshot, senza rimuovere
la policy presente; rifiuta regole di priorità superiore. Non ripristina né
importa automaticamente snapshot arbitrari. La ricostruzione della policy da
backup richiede review dell'errore: il precedente allow puntava già a un IP
host obsoleto. Non eliminare guardie per tentativi e non disattivare firewall.

## Evidenze locali

```powershell
powershell -NoProfile -File scripts/infrastructure/Test-MercurionVmNetworkAcl.ps1
```

**16 scenari passati** su PowerShell 5.1 con tutti i comandi Hyper-V/rete
sostituiti da funzioni locali: piano senza scritture; preflight VM/MAC/numero
NIC/switch/IP; errore snapshot; priorità incompatibile; ordine guardie prima
delle rimozioni; unico allow SSH e zero egress; idempotenza; errore durante
installazione, avvio VM concorrente, verifica finale fallita, allow extra,
errore seconda guardia e quarantena. Nessuna rete reale mutata dai test.
Entrypoint Plan reale senza elevazione rifiutato da Hyper-V, senza scritture.
La compatibilità reale dei cmdlet/readback va verificata dal primo Apply
dell'owner; non è prova di isolamento o CI remota.

## Dopo Apply

Tenere la VM spenta e ancora sul vecchio switch finché non è verificata la
ricevuta. Poi passare a M-06: collegamento protetto, avvio/LUKS da console,
configurazione statica e SSH. Con questa policy il vecchio DHCP non funziona:
la console è necessaria finché il guest non usa l'IP statico previsto.
NAT/Internet e prove di rete restano successivi, non aprire egress per rendere
verde uno smoke che richiede ancora quella fase.
