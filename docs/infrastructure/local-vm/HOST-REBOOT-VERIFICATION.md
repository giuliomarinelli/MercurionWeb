# Verifica dopo il riavvio Windows — M-08

Procedura operativa italiana per verificare la persistenza della rete statica.
Non avvia lo stack applicativo e non chiude le prove LAN o IPv6 ancora aperte.
Ogni comando va eseguito separatamente. Le credenziali restano nel terminale
dell'owner; i report diagnostici restano fuori da Git.

## 1. Punto di ripresa prima del riavvio

Il 9 novembre 2026 l'owner ha arrestato ordinatamente Ubuntu con
`sudo shutdown -h now` e confermato la VM Spenta. L'inventario amministrativo
successivo, acquisito alle **13:54:44 UTC**, è completo:

```text
C:\Users\giuli\.codex\artifacts\inf-vm-02\static-network\f356baf862e948debb26e21190a69241\inventory.json
```

| Dato | Baseline prima del riavvio |
| --- | --- |
| Ultimo avvio Windows, UTC | `2026-11-08T13:18:49.5Z` |
| VM | `Mercurion-Server`, `Off` |
| Avvio/arresto automatici | `StartIfRunning` / `Save`, ritardo 0 |
| vNIC | `Scheda di rete`, MAC `00155D00DD01`, una sola |
| Switch | `Mercurion-Internal`, tipo Internal |
| IP host attivo | `10.203.240.1/24`, Preferred, Manual |
| IP host PersistentStore | `10.203.240.1/24`, Manual |
| Profilo Windows dello switch | Public |
| ACL | zero semplici, 19 estese DnsHttps |
| WinNAT | `Mercurion-NAT`, `10.203.240.0/24`, attivo |
| Mapping statici NAT | zero |
| Forwarding e weak-host host | Disabled nelle interfacce inventariate |
| RemoteAccess | Stopped |
| Docker Desktop | contesto locale `desktop-linux` interrogabile; bridge e `spectralume_network` presenti |

Kaspersky era stato confermato Pubblica dall'owner prima di questa raccolta;
il collector non legge la categoria Kaspersky. Dopo il riavvio va controllata
di nuovo nella UI sulla voce `10.203.240.1/24`.

HNS riporta ancora per Mercurion-Internal il metadato `172.23.112.0/20`,
diverso dall'indirizzo e dalla route host effettivi. La discrepanza è già
documentata: non resettare HNS, WSL o Default Switch per uniformarla.
Gli indici delle interfacce possono cambiare; confrontare identità, IP e policy.

## 2. Riavviare Windows

1. Salvare documenti, modifiche IDE e lavoro negli altri programmi. Il riavvio
   interrompe anche processi di sviluppo, WSL e Docker Desktop.
2. Verificare che Mercurion-Server sia ancora **Spenta**, non Salvata.
   Le impostazioni Hyper-V rimangono invariate; l'arresto preventivo evita
   che la prova dipenda dal ripristino di una VM salvata.
3. Usare **Start → Arresta → Riavvia il sistema**. Non serve un comando
   forzato e non usare l'arresto ibrido come sostituto della prova.
4. Al nuovo accesso Windows lasciare inizialmente la VM spenta. Non creare
   nuovamente switch, NAT, indirizzi o ACL.

## 3. Rileggere l'host prima di avviare Ubuntu

Da PowerShell amministrativa:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1
```

Conservare il nuovo percorso. Confrontare con la baseline del punto 1 e
verificare che `hostBoot.LastBootUpTimeUtc` sia cambiato. Una sezione
`unavailable` non è un controllo passato: distinguere servizi ancora in avvio
da configurazioni mancanti. Se Docker Desktop non parte automaticamente,
avviarlo normalmente e raccogliere un nuovo inventario quando è pronto.
L'elenco delle reti prova la risposta del daemon, non il funzionamento di
tutte le applicazioni WSL/Docker.

Poi, come comando separato, sempre amministrativo:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
```

Attesi `settingsReadbackVerified=true`, `internetEgressEnabled=true`,
`isolationAccepted=false`. Verify controlla anche il contesto NAT/profilo;
non modifica la configurazione. Il conteggio di 19 regole da solo non basta.

Aprire Kaspersky e verificare **Rete pubblica** sulla voce esatta
`10.203.240.1/24 (vEthernet (Mercurion-Internal))`. Il profilo Windows Public
è un dato distinto. Se identità, policy, NAT o classificazione differiscono,
tenere la VM spenta e riportare l'esito prima di qualsiasi correzione.

## 4. Avviare il guest e verificare la rete

Dopo il confronto positivo, avviare normalmente la VM da Hyper-V e sbloccare
LUKS dalla console. Da PowerShell normale:

```powershell
ssh mercurion-server
```

Alias atteso `10.203.240.10`. Un avviso di chiave diversa richiede diagnosi:
non cancellare known_hosts. Impronta ED25519 già fidata:
`SHA256:9IFgVd7PcpL7F9lBGIuKF6SDZRQvjQ4zKoUsCqtbd68`.
Nella shell Ubuntu eseguire separatamente:

```sh
ip -brief address show eth0
```

```sh
ip -4 route show default
```

Attesi eth0 UP con `10.203.240.10/24` e default via `10.203.240.1`.
`Get-VMNetworkAdapter.IPAddresses` vuoto non sostituisce questa verifica.

## 5. Ripetere le prove pertinenti

Con il guest pronto, da PowerShell normale eseguire prima lo smoke egress:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-EgressProbe.ps1
```

Esito atteso DNS/HTTPS IPv4 riuscito da guest e due bridge, pulizia senza
errori. Dopo aver esaminato il report, eseguire separatamente:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-PrivatePortProbe.ps1
```

Attesi nove percorsi non raggiungibili con controlli positivi e correlazione
validi, cleanup senza errori. Il wrapper rilegge l'indirizzo DNS ICS corrente:
il Default Switch può cambiare subnet senza modificare la rete statica Mercurion.
In caso di fallimento conservare i report; niente retry automatici o apertura
dei filtri per ottenere un esito verde.

Registrare nuovi run, confronto prima/dopo e verifica Kaspersky nel diario e
in ACCEPTANCE. A-28/A-29 restano aperti finché queste evidenze non sono raccolte;
LAN/altre origini e IPv6 restano prove separate (A-30). Non riprendere ancora
il deployment applicativo o dedurre un'accettazione complessiva.

## Riferimenti

- [Microsoft: AutomaticStartAction e AutomaticStopAction](https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vm?view=windowsserver2025-ps).
- [Microsoft: Restart esegue un avvio completo, distinto da Fast Startup](https://learn.microsoft.com/en-us/troubleshoot/windows-client/setup-upgrade-and-drivers/fast-startup-causes-system-hibernation-shutdown-fail).
- [Migrazione statica e recupero](STATIC-NETWORK-MIGRATION.md).
- [Porte private: metodo e limiti](PRIVATE-PORT-PROBES.md).
