# Déploiement NFI dans le projet Supabase NOVACAB

NFI utilise **uniquement le projet Supabase NOVACAB** : même URL, même clé publique et même Supabase Auth.

- `auth.users` : authentification
- `public.team` : utilisateur, rôle et `portefeuille_id`
- `public.clients` : dossier maître et `portefeuille_id`
- `public.nfi_*` : données propres à l'analyse financière NFI

## Exception métier NFI

Dans NFI, tout membre actif d'un portefeuille voit **tous les dossiers de son propre portefeuille**, même si NOVACAB lui applique une affectation fine par dossier. Cette exception est limitée aux fonctions/RLS NFI et ne modifie pas les droits de NOVACAB.

## Installation

1. Ouvrir **le projet Supabase NOVACAB**.
2. Vérifier que les migrations NOVACAB ont créé `team.auth_user_id`, `team.portefeuille_id` et `clients.portefeuille_id`.
3. Exécuter `supabase/schema.sql` dans SQL Editor.
4. Configurer NFI avec les mêmes `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` que NOVACAB.
5. Ne créer aucun second projet Supabase et aucune table NFI `profiles`, `teams` ou `companies`.
