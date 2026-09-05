import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://ybewryneaksqhtlagvxk.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZXdyeW5lYWtzcWh0bGFndnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODk2OTYsImV4cCI6MjEwMjM2NTY5Nn0.13uLZry9ivPwFZSJy7a362SSvr6U1HIl_WjkbJO93PY";
const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim();
function normalizeSupabaseUrl(value){
  let v=String(value||"").trim().replace(/^https:\/\/https:\/\//i,"https://");
  try { const u=new URL(v); return /^https?:$/.test(u.protocol) ? `${u.protocol}//${u.host}` : DEFAULT_URL; }
  catch { return DEFAULT_URL; }
}
const url = normalizeSupabaseUrl(rawUrl);
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).trim();
export const supabase = url && anonKey ? createClient(url, anonKey, { auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true} }) : null;
export const supabaseReady = Boolean(supabase);
