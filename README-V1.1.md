# NFI V0.9 — Intelligence & Prévisionnel

- Interprétation financière en phrases métier.
- Prévisionnel recommandé selon la situation de la société.
- Profils : redressement/trésorerie, prudent, croissance maîtrisée, développement maîtrisé.
- Hypothèses modifiables et scénario recalculé en temps réel.
- Avertissement lorsque la projection conduit à une trésorerie négative.
- Base conservée pour les exports PDF/Excel, le FEC et les portefeuilles.

Le prévisionnel est une aide à la décision et non une recommandation comptable ou financière définitive : les hypothèses doivent être validées par le professionnel.

# NFI V1.1 — Consolidation & Supabase

Cette version consolide le moteur financier et prépare la migration de la simulation locale vers Supabase.

## Contrôle FEC
Le moteur vérifie les colonnes CompteNum/Compte, Debit, Credit et Date, détecte les exercices, contrôle l'équilibre débit/crédit et conserve un objet `quality` par import.

## Indicateurs
Le moteur expose CA, EBE, résultat, trésorerie, dette, capitaux propres, FRNG/BFR reconstruits, clients, stocks, fournisseurs et ratios complémentaires. Les indicateurs de bilan reconstruits à partir des comptes disponibles doivent être considérés comme indicatifs lorsque le FEC ne permet pas de reconstituer un bilan de clôture complet.

## Supabase
Le fichier `supabase/schema.sql` prépare les tables, fonctions et politiques RLS pour les profils, équipes, sociétés, exercices, FEC, affectations, confidentialité, analyses et prévisionnels. La fonction `public.current_team_id()` est incluse pour éviter l'erreur SQL rencontrée précédemment.

## Lancement
```bash
npm install
npm run dev
npm run build
```

Pour connecter Supabase, renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`, puis appliquer `supabase/schema.sql` dans le SQL Editor Supabase.
