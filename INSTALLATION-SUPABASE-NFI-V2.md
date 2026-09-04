# Installation Supabase — NFI V2

IMPORTANT : ne pas coller tous les fichiers dans le SQL Editor.

## 1. SQL Editor Supabase

Coller/exécuter UNIQUEMENT :
- `supabase/20260904_nfi_sso_handoff.sql`
- `supabase/20260904_nfi_personal_workspace.sql`

Ces deux fichiers sont du SQL pur.

## 2. Edge Function Supabase

Le fichier TypeScript :
`../Novacab-main/supabase/functions/nfi-sso-handoff/index.ts`

est le code d'une Edge Function. Il NE DOIT PAS être collé dans le SQL Editor.

Il doit être déployé comme fonction Supabase nommée `nfi-sso-handoff`.

## 3. Fichiers Markdown

Les fichiers `.md` sont uniquement de la documentation. Ils NE DOIVENT PAS être collés dans le SQL Editor.

## 4. Variables NFI

NFI doit utiliser le même projet Supabase que NOVACAB :
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 5. Deux types de comptes

- Compte NOVACAB : le profil `public.team` rattache l'utilisateur au portefeuille et NFI charge uniquement les dossiers autorisés.
- Compte personnel NFI : aucun profil `public.team`, donc aucune donnée NOVACAB n'est chargée. Les sociétés importées sont stockées dans `nfi_personal_*` avec RLS sur `auth.uid()`.
