# NFI V3.1 — déploiement dans le projet Supabase NOVACAB

## Règle absolue
NFI n'a pas de projet Supabase propre. Utiliser exclusivement le projet déjà utilisé par NOVACAB.

## Ordre
1. Ouvrir le projet Supabase NOVACAB.
2. Exécuter `supabase/schema.sql` dans SQL Editor.
3. Vérifier que les tables `nfi_*` existent.
4. Vérifier que le compte de test possède une ligne active dans `public.team` avec `auth_user_id` et `portefeuille_id`.
5. Configurer NFI avec exactement les mêmes `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` que NOVACAB.
6. Connecter NFI avec un compte NOVACAB existant.

## Contrôle attendu
Après connexion, NFI doit automatiquement afficher tous les dossiers dont `clients.portefeuille_id` correspond au `team.portefeuille_id` de l'utilisateur connecté.

L'affectation individuelle `accesDossier` de NOVACAB ne réduit pas la visibilité dans NFI : c'est l'exception métier NFI prévue pour les comparaisons et benchmarks.

## Sécurité
- Cabinet A ne voit jamais les données NFI du cabinet B.
- Les droits dossier de NOVACAB restent inchangés dans NOVACAB.
- NFI ne crée pas de `profiles`, `teams` ou `companies` parallèles.
- La suppression depuis NFI ne supprime jamais `public.clients`.
