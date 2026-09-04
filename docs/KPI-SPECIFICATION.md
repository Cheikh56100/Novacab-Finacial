# NFI — Spécification KPI V2.5

NFI est un moteur d'analyse financière alimenté par les FEC importés dans NFI. Les métadonnées de société (nom, SIREN, APE/NAF, secteur, identifiant Novacab et cabinet) proviennent de la passerelle Novacab.

## KPI de référence

| KPI | Calcul NFI | Unité |
|---|---|---|
| CA | somme des produits des comptes 70–75 | € |
| EBE | CA – achats 60 – services/charges externes 61–62 – personnel 64 – impôts/taxes d'exploitation 63 | € |
| REX | EBE – dotations 68 | € |
| Valeur ajoutée | CA – achats 60 – charges externes 61–62 | € |
| KP | soldes des comptes 10–14 | € |
| BFR | créances d'exploitation + stocks + autres créances – dettes fournisseurs + autres dettes d'exploitation | € |
| Gearing | dette financière / capitaux propres | x |
| ROE | résultat net / capitaux propres | % |
| ROCE | REX / (capitaux propres + dette financière – trésorerie) | % |
| Liquidité | actifs circulants / passifs circulants | % |
| TMG | (CA – achats 60) / CA | % |
| Diff. TMG secteur | TMG société – TMG médian du secteur | points |

## Règles d'interprétation

- Chaque KPI est affiché avec sa valeur et une interprétation dédiée.
- En comparaison, NFI affiche la valeur société, la médiane sectorielle, l'écart et un signal favorable/neutre/défavorable.
- Le BFR et le gearing sont interprétés dans le sens inverse : une valeur plus faible est généralement favorable, toutes choses égales par ailleurs.
- Une population sectorielle inférieure à 3 sociétés est présentée comme indicative.
- Les valeurs absolues (€) sont utiles pour comparer des sociétés de taille proche ; pour des sociétés de tailles très différentes, NFI doit privilégier les ratios et marges dans l'interprétation.
- Le TMG est calculé directement depuis le FEC importé ; sa définition est donc déterministe dans NFI et ne dépend pas d'une donnée fournie par Novacab.

## Qualité des données

NFI doit signaler les exercices sans données suffisantes, les écritures sans compte et les FEC non équilibrés. Une analyse ne doit jamais être bloquée uniquement par l'absence d'un KPI secondaire : la valeur manquante est affichée comme indisponible et exclue des comparaisons concernées.


## Référence marché
NFI prévoit une référence publique Banque de France/FIBEN. Les médianes Q2 et quartiles Q1/Q3 ne sont affichés que lorsque la définition du ratio est comparable au KPI NFI. Les données 2024 actuellement embarquées couvrent les secteurs Construction de bâtiments (41), Restauration (56), Commerce de détail (47) et Sièges sociaux / conseil de gestion (70). Source : fascicules sectoriels Banque de France.
