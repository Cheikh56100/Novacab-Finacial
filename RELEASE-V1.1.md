# NFI V1.1 — Version de consolidation

## Principales améliorations
- moteur FEC renforcé et contrôle qualité débit/crédit ;
- exercices multiples ;
- CA/EBE/résultat/trésorerie/dette/equity ;
- reconstruction indicative du BFR et FRNG ;
- clients, stocks, fournisseurs et autres postes d'exploitation ;
- ratios complémentaires ;
- analyse approfondie visible dans la fiche société ;
- interprétations en phrases métier ;
- préparation Supabase avec RLS et `current_team_id()` ;
- exports PDF/Excel conservés ;
- architecture compatible Netlify.

## Limite volontaire
Les indicateurs reconstruits depuis un FEC sont signalés comme indicatifs lorsque les informations disponibles ne permettent pas de reconstituer avec certitude un bilan de clôture complet. Ils doivent être rapprochés des états financiers du dossier avant diffusion au dirigeant.

## Déploiement
```bash
npm install
npm run build
```
Puis déployer `dist` sur Netlify.

Pour Supabase, exécuter `supabase/schema.sql` dans le SQL Editor et renseigner les variables Vite.
