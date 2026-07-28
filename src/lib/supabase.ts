import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Unwrap a supabase-js response, throwing on error (React Query surfaces it). */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
