import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase do lado do servidor com chave de service role (ignora RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
