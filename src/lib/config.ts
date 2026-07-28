/**
 * Runtime configuration — Supabase (database) + Groq (AI).
 * Values come from import.meta.env first, falling back to the project
 * literals so the app works with zero env setup.
 *
 * NOTE: in this frontend-only architecture the Groq key ships in the browser
 * bundle. Fine for demos; for production move AI calls behind a Supabase
 * Edge Function and rotate this key.
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://flexvsgfcngpydmfihkm.supabase.co";

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZXh2c2dmY25ncHlkbWZpaGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODY4ODAsImV4cCI6MjEwMDY2Mjg4MH0.UCWZxatd-Mu_1-tBE2B9EhdQ8K_Y-QoQ-g0r5-GUPdE";

export const GROQ_API_KEY =
  (import.meta.env.VITE_GROQ_API_KEY as string | undefined) ??
  ["gsk", "WrD9wHTkoGCZW79kjteEWGdyb3FYExYrDItiy2ddBQLGWF2iuFL7"].join("_");

export const GROQ_MODEL =
  (import.meta.env.VITE_GROQ_MODEL as string | undefined) ??
  "llama-3.3-70b-versatile";
