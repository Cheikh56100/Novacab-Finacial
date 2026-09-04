# NFI — intégration NOVACAB V2

- Source unique des dossiers : `public.clients` du projet Supabase NOVACAB.
- Auth : `auth.users` NOVACAB.
- Utilisateur/nom/rôle : `public.team`.
- Données NFI : uniquement les tables `nfi_*` rattachées à `client_id`.
- Suppression locale/browser du portefeuille supprimée.
- SSO NOVACAB → NFI : réception d'un code temporaire `nfi_handoff`, échange via la fonction Supabase `nfi-sso-handoff`, puis suppression du paramètre de l'URL.
- L'interface NFI a été réalignée sur l'identité NOVACAB : fond clair, sidebar blanche, bleu nuit, surfaces sobres, hiérarchie et boutons inspirés du système visuel NOVACAB.
