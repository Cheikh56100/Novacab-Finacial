# NFI V1.3 — Interface NOVACAB

V1.3 est une refonte visuelle complète de NFI autour d'un design system clair, sobre et cohérent avec NOVACAB.

## Principes
- Interface claire et professionnelle
- Sidebar blanche et navigation proche de l'univers NOVACAB
- Bleu NFI comme accent principal
- Cartes et tableaux sobres, lisibles et aérés
- Dashboard orienté action : score, risques, dossiers prioritaires, alertes, analyses et tâches
- Responsive desktop / tablette / mobile

## Lancement
```bash
npm install
npm run dev
```

## Build production
```bash
npm run build
```

## Environnement
Copier `.env.example` vers `.env` et renseigner les mêmes variables Supabase que NOVACAB.

> Cette version conserve les services métier et la couche Supabase de la V1.2. La V1.3 porte principalement sur l'expérience et l'interface.
