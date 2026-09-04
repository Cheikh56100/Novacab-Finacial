# NFI V0.8 — FEC Intelligence & Benchmark

## Nouveautés
- Import FEC multi-exercices : regroupement automatique des écritures par année.
- Validation des colonnes essentielles du FEC et avertissements.
- Reconstitution CA, EBE, résultat, trésorerie, dette, BFR, capitaux propres.
- Fiche société à valider après import : raison sociale, SIREN, NAF et secteur.
- Détection automatique du secteur depuis le référentiel NAF lorsqu'un code NAF est saisi.
- Diagnostic NFI automatique : croissance, rentabilité, dette, BFR, trésorerie.
- Benchmark interne par secteur à partir des sociétés présentes dans la base.
- Si le benchmark interne est insuffisant, le référentiel de démonstration reste utilisé à titre indicatif.
- Export Excel enrichi avec un onglet Diagnostic.
- Dashboard pluriannuel CA + EBE.

## Installation
```bash
npm install
npm run dev
```
Avant publication :
```bash
npm run build
```

Les droits et données sont encore stockés localement dans cette version de démonstration. Pour la production cabinet, la V0.9 doit brancher l'organisation et la confidentialité sur une vraie base avec contrôle d'accès côté serveur.
