import { createClient } from "@supabase/supabase-js";

// IMPORTANT : NFI utilise EXACTEMENT les mêmes variables d'environnement
// que NOVACAB. Il n'existe aucun projet Supabase NFI séparé.
const url = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export const supabaseReady = Boolean(supabase);

export function supabaseConfig() {
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
    architecture: "NOVACAB_SUPABASE_SHARED"
  };
}

// Tables maîtresses : NOVACAB.
// Tables NFI : uniquement les données analytiques, toujours rattachées à clients.id.
export const nfiTables = {
  novacabClients: "clients",
  novacabTeam: "team",
  exercises: "nfi_exercises",
  fecImports: "nfi_fec_imports",
  confidentialAccess: "nfi_confidential_access",
  analyses: "nfi_financial_analyses",
  forecasts: "nfi_forecasts",
  benchmarks: "nfi_market_benchmarks"
};
