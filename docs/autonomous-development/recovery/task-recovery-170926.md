# Attività da sbloccare

| Priorità | Task | Source   | Task bloccati | Sbloccata |
| -------: | ---: | -------- | ------------: | --------- |
|        1 | 0081 | UI-023   |         **9** | [x]       |
|        2 | 0126 | BE-012   |         **4** | [x]       |
|        3 | 0147 | BE-033   |         **4** | [x]       |
|        4 | 0179 | DATA-030 |         **4** | [x]       |
|        5 | 0214 | QA-028   |         **4** | [x]       |
|        6 | 0102 | NG-016   |         **3** | [x]       |
|        7 | 0209 | QA-023   |         **2** | [ ]       |
|        8 | 0086 | UI-028   |         **2** | [x]       |
|        9 | 0218 | QA-032   |         **2** | [ ]       |
|       10 | 0072 | UI-014   |         **0** | [ ]       |
|       11 | 0173 | DATA-024 |         **0** | [ ]       |

## Esiti recovery 2026-09-17

- `0086` / `UI-028`: `REVERTED`. Il feature-SHA `c73793fe6` ha superato la CI
  completa (`35249415806`), ma il merge-SHA `e198a0c94` ha fallito il test axe
  di contrasto Angular nel run `35250241928`. Revert `92e4b069c2` verificato
  verde dal run `35251075072`; branch `feature/UI-028` preservato e congelato.
- `0086` / `UI-028`: successivamente reintegrato in modalità interattiva dopo
  aver riprodotto e corretto sul baseline il test axe intermittente. Fix baseline
  `8d801a7ca`, run full verde `35253527693`; reintegrazione finale
  `68f7cd349` verificata dal run full verde `35254855568`, incluso il
  `Required gate`.
- `0179` / `DATA-030`: recuperata dal branch preservato e aggiornata al
  `develop` corrente. Corrette integrazione `RedisService.eval`, scrittura Lua,
  TTL/cleanup degli indici e listener keyspace; browser login/sessioni/logout
  verde 2/2. Feature `1f1d58f4c` verde nel run `35257870848`; merge
  `24bdc6fcf` verde nel run `35258693809`, entrambi con `Required gate`.
- `0214` / `QA-028`: recuperata dal branch preservato e aggiornata al
  `develop` corrente. Resa deterministica la generazione della build identity
  anche nei gate test diretti e stabilizzata la copertura del persistence
  adapter senza abbassare le soglie. Feature `24bbe7430` verde nel run
  `35262639511`; merge `4b87cb305` verde nel run `35263378446`, entrambi con
  `Required gate`, container, build, test e browser journey verdi.
- `0102` / `NG-016`: recuperata dal branch preservato, riallineata al
  `develop` corrente e integrata senza riscrivere la storia. Typecheck, lint e
  15 test mirati verdi; feature `5957783e8` verde nel run `35265369047`.
  Merge `7a83321b8`; il primo run post-merge `35266181805` ha esposto il race
  del fixture axe, corretto fix-forward da `92a176caa`. Run finale
  `35267240243` verde con `Required gate`. Gli skip obsoleti `0109`, `0110` e
  `0112` sono stati riaperti; il planner finale non segnala `staleSkips`.
