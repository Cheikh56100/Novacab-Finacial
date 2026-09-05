# NOVACAB Insight

Intelligence financière de NOVACAB : analyse FEC, cockpit, indicateurs, benchmark et rapport client.

## Développement
```bash
npm install
npm run dev
```

## Build Netlify
- Build command: `npm run build`
- Publish directory: `dist`

Les identifiants techniques historiques `nfi_*` et `nfi-sso-handoff` sont conservés pour compatibilité avec Supabase et l'intégration NOVACAB.


## Multi-cabinets — NOVACAB Insight
Insight supporte désormais un utilisateur membre de plusieurs cabinets via plusieurs lignes actives dans `public.team` partageant le même `auth_user_id`.
- Le périmètre Insight est l'union des `portefeuille_id` accessibles à l'utilisateur.
- Le sélecteur permet d'afficher un cabinet, plusieurs cabinets ou tous les cabinets.
- Le benchmark inter-cabinets compare les médianes des dossiers analysés.
- Les droits NOVACAB des autres modules ne sont pas élargis.
- À appliquer dans Supabase : `supabase/20260905_nfi_multi_cabinets.sql`.
