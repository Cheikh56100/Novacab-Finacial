# NFI + NOVACAB — architecture définitive

NFI est une application cliente du **projet Supabase NOVACAB**. Il n'existe pas de second projet Supabase NFI.

| Besoin | Source |
|---|---|
| Authentification | `auth.users` NOVACAB |
| Utilisateur / rôle | `public.team` NOVACAB |
| Cabinet | `team.portefeuille_id` |
| Dossier / société | `public.clients` NOVACAB |
| Données financières | tables `public.nfi_*` |

Tous les membres actifs d'un même `portefeuille_id` voient tous les dossiers de ce portefeuille dans NFI. La règle ne change aucun droit dans NOVACAB.


## V3.2 — règle définitive
- Le projet Supabase de NOVACAB est l'unique backend partagé.
- NFI ne possède pas de table parallèle pour les utilisateurs, cabinets ou sociétés.
- `public.clients` est la source de vérité des dossiers.
- Tous les membres actifs d'un même `portefeuille_id` voient tous ses dossiers dans NFI.
- Cette exception ne modifie pas les RLS ni les droits de l'application NOVACAB.
- Un FEC ne peut être importé que sur un dossier NOVACAB existant ; le SIREN du FEC est contrôlé lorsqu'il est détectable.
