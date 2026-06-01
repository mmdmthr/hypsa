import { createClient } from "@supabase/supabase-js";

// Use import.meta.env (Astro/Vite standard) instead of process.env
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
