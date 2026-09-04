# NFI V1.2 — passage en production NOVACAB

## Ce qui a été fait

- Authentification Supabase commune avec NOVACAB.
- Création automatique du profil NFI à la première connexion, avec reprise du rôle depuis `public.team.auth_user_id`.
- Chargement des sociétés, exercices, profils, affectations et accès confidentiels depuis Supabase.
- Sauvegarde des imports FEC dans `companies` + `company_exercises`.
- Affectation automatique du créateur d'un nouveau dossier.
- Rapprochement NOVACAB conservé par SIREN et enrichi d'un identifiant `novacab_client_id` quand l'export le fournit.
- Bouton **Ouvrir NFI** dans la fiche client NOVACAB, avec ouverture directe du dossier par identifiant NOVACAB/SIREN.
- Déconnexion NFI.
- Mode local conservé comme secours lorsque Supabase n'est pas configuré.

## Important

Le build n'a pas pu être exécuté dans l'environnement de travail car l'installation npm des dépendances a dépassé le délai disponible. Le code et les fichiers de configuration ont été préparés ; il faut donc faire `npm install` puis `npm run build` sur ta machine/CI.

## Déploiement

1. Dans le projet NFI : `npm install`.
2. Définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les mêmes valeurs que NOVACAB.
3. Exécuter `supabase/schema.sql` puis `supabase/NFI-PRODUCTION-BRIDGE.sql` dans le même projet Supabase.
4. Déployer NFI.
5. Dans NOVACAB, définir `VITE_NFI_URL` vers l'URL de NFI puis redéployer NOVACAB.
6. Tester avec un compte réel NOVACAB : connexion NFI, dossier, import FEC, affectation, confidentialité, puis bouton **Ouvrir NFI**.
