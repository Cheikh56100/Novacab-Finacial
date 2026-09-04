# NFI — NOVACAB Financial Intelligence V1.2

V0.7 ajoute les exports professionnels du portefeuille et des analyses.

## Lancer

```bash
npm install
npm run dev
```

## Vérifier la production

```bash
npm run build
```

## Exports

- **Excel dossier** : fiche société, analyse annuelle et synthèse NFI.
- **Excel portefeuille** : toutes les sociétés accessibles et synthèse portefeuille.
- **PDF dossier** : rapport imprimable A4 avec score, KPI, évolution et diagnostic.
- **PDF portefeuille** : liste des dossiers accessibles et indicateurs principaux.

Le bouton PDF ouvre la fenêtre d'impression du navigateur : choisir **Enregistrer au format PDF**.

> Les contrôles d'accès restent une simulation locale dans cette version. La sécurité de production devra être portée par la base de données/RLS et le serveur.

## NFI V1.2 — mode production NOVACAB

NFI peut maintenant utiliser le même projet Supabase que NOVACAB : authentification commune, dossiers/exercices persistants, affectations et confidentialité via RLS.

1. Installer les dépendances : `npm install`.
2. Copier `.env.example` vers `.env` et renseigner les deux variables Supabase.
3. Dans le même projet Supabase que NOVACAB, exécuter `supabase/schema.sql`, puis `supabase/NFI-PRODUCTION-BRIDGE.sql`.
4. Créer/valider les comptes utilisateurs dans NOVACAB. NFI reprend leur rôle à la première connexion.
5. Connecter NOVACAB dans NFI avec l'export « Informations générales » pour le premier rapprochement SIREN/NAF/portefeuille.

En production, le navigateur ne doit plus être considéré comme la source de vérité : Supabase devient la source de vérité NFI. Le mode local reste disponible si les variables Supabase ne sont pas configurées.


## NFI V2.4 — périmètre produit

NFI est le moteur d'analyse financière de NOVACAB. NOVACAB sert de passerelle d'authentification et de métadonnées (nom, SIREN, code APE/NAF, secteur, dossier, cabinet). Les données financières sont importées dans NFI via FEC.

Un cabinet partage son portefeuille NFI entre ses collaborateurs : chaque utilisateur authentifié via NOVACAB retrouve les dossiers du cabinet auxquels il a droit. Les comparaisons financières ne sont activées que pour les dossiers ayant au moins un exercice FEC analysé.

Fonctions volontairement limitées à : analyse société, analyse sectorielle, comparaisons société/société et société/secteur, avec interprétation individuelle et globale.

Déploiement cible : GitHub + Netlify + Supabase. Ne jamais mettre de clé service Supabase dans le frontend.


## NFI intégré à NOVACAB — architecture V2.8

**Principe obligatoire : NFI utilise le projet Supabase de NOVACAB. Aucun second projet Supabase NFI n'est nécessaire.**

### Source de vérité

Les données suivantes restent exclusivement gérées par NOVACAB :

- `auth.users` : authentification
- `team` : collaborateurs, rôles et `auth_user_id`
- `portefeuilles` : cabinets/portefeuilles
- `clients` : dossiers clients

NFI ajoute uniquement ses données analytiques :

- `nfi_exercises`
- `nfi_fec_imports`
- `nfi_confidential_access`
- `nfi_financial_analyses`
- `nfi_forecasts`
- `nfi_market_benchmarks`

Les données NFI sont toutes rattachées à `clients.id`. NFI ne crée donc plus de deuxième registre `companies`, ni de deuxième `profiles` ou `teams`.

### Migration

Dans le projet Supabase **NOVACAB**, après les migrations de sécurité NOVACAB, exécuter :

```text
supabase/schema.sql
```

Le fichier `NFI-PRODUCTION-BRIDGE.sql` est désormais conservé uniquement comme notice de compatibilité : **ne pas l'utiliser pour recréer l'ancien modèle NFI**.

### Variables d'environnement

Le site NFI doit recevoir exactement les mêmes :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

que NOVACAB.

### Connexion

NFI utilise directement la session Supabase existante et retrouve le collaborateur dans `team.auth_user_id`. Il ne crée plus de `profiles` NFI.

### Important

L'ancien connecteur « Importer un export Novacab » n'est plus requis pour synchroniser les dossiers : NFI lit directement `clients` et `team` dans le même projet Supabase.

Un export Excel peut toujours être utilisé comme format d'échange lorsqu'il est nécessaire, mais il ne constitue plus le mécanisme de liaison entre NOVACAB et NFI.


## Référentiel sectoriel et marché — V3.2

- Le module Analyse sectorielle affiche désormais les **88 secteurs NAF** du catalogue, même lorsqu'aucune société n'est encore analysée.
- Les KPI cabinet (Q1 / médiane / Q3) sont calculés automatiquement dès qu'un secteur contient des exercices financiers exploitables.
- Un référentiel marché public Banque de France / FIBEN 2024 est intégré pour un périmètre élargi de divisions sectorielles (avec 13 divisions/références documentées).
- Les ratios Banque de France dont la définition diffère des KPI NFI sont affichés comme **indicateurs BDF distincts** ; NFI ne fabrique pas de conversion trompeuse.
- Source : Banque de France, Fascicules d'indicateurs sectoriels, base FIBEN, données 2024.
