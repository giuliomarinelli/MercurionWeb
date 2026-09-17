# Attività da sbloccare

| Priorità | Task | Source   | Task bloccati | Sbloccata |
| -------: | ---: | -------- | ------------: | --------- |
|        1 | 0081 | UI-023   |         **9** | [x]       |
|        2 | 0126 | BE-012   |         **4** | [x]       |
|        3 | 0147 | BE-033   |         **4** | [x]       |
|        4 | 0179 | DATA-030 |         **4** | [ ]       |
|        5 | 0214 | QA-028   |         **4** | [ ]       |
|        6 | 0102 | NG-016   |         **3** | [ ]       |
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
