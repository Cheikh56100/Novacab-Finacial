# Architecture NFI

- `src/services/financialEngine.js`: moteur déterministe, indépendant de l'UI.
- `src/data/naf.js`: 732 codes NAF / 88 secteurs issus du fichier Excel fourni.
- `src/data/demo.js`: sociétés et benchmarks de démonstration.
- `src/components/Benchmark.jsx`: comparaison société vs secteur + société vs société.
- `src/components/Import.jsx`: import local FEC/CSV/XLSX.
- `src/components/Scenarios.jsx`: simulation de scénarios.
- À terme : `supabase/` pour les sociétés, exercices, imports, benchmark et droits.
- À terme : API NOVACAB pour ouvrir NFI depuis un dossier et synchroniser `team_id`, `client_id`, utilisateur et droits.


## Accès NFI par portefeuille

NFI utilise l'authentification et l'identité NOVACAB (`auth.users` + `team`).
Contrairement à la visibilité fine des dossiers dans NOVACAB, NFI applique une exception métier : tout membre actif d'un portefeuille voit tous les dossiers de ce portefeuille dans NFI. Cette exception est implémentée côté Supabase via `nfi_list_clients`, `nfi_get_client` et `nfi_can_access_client`. Elle ne modifie aucune RLS ni permission des tables métier NOVACAB.

Ainsi :
- NOVACAB conserve ses droits dossier habituels ;
- NFI bénéficie d'une visibilité portefeuille complète pour les comparaisons et benchmarks ;
- un utilisateur ne peut jamais sortir de son portefeuille ;
- aucun second projet Supabase ni second annuaire utilisateur n'est créé.

## V3.1 — synchronisation automatique
NFI ne nécessite plus d'import Excel Novacab pour découvrir les dossiers. Une fois connecté au même projet Supabase, il récupère le portefeuille de l'utilisateur via `public.team` et liste automatiquement tous les `public.clients` de ce portefeuille. L'import Excel Novacab est conservé uniquement comme outil complémentaire/legacy.
