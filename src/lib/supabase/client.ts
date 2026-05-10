import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "../runtime-auth";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
