import { createClient } from "@supabase/supabase-js";

/*
 * NOVACAB ↔ NFI : les deux applications utilisent le MÊME projet Supabase.
 * Ne jamais mettre la service_role key dans VITE_*.
 */
const DEFAULT_URL = "https://ybewryneaksqhtlagvxk.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZXdyeW5lYWtzcWh0bGFndnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODk2OTYsImV4cCI6MjEwMjM2NTY5Nn0.13uLZry9ivPwFZSJy7a362SSvr6U1HIl_WjkbJO93PY";

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim();
const url = rawUrl.replace(/^https:\/\/https:\/\//i, "https://");
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).trim();

if (/^https:\/\/https:\/\//i.test(rawUrl)) {
  console.warn("[NFI] VITE_SUPABASE_URL contenait https://https:// ; correction automatique appliquée.");
}

export const supabaseConfig = {
  url,
  anonKey,
  configured: Boolean(url && anonKey),
};

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export const supabaseReady = Boolean(supabase);
