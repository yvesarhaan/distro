import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tlfryajateewgjlxthwk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZnJ5YWphdGVld2dqbHh0aHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjgxNDcsImV4cCI6MjEwMjcwNDE0N30.ODJxT8CVUOUmiwh1kwZ3p1JW8bmx7ERUIRXsLuzrra0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
