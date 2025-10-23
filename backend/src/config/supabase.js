import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Validações para facilitar diagnóstico local
if (!supabaseUrl || !/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)) {
  console.error(
    "[Supabase] SUPABASE_URL ausente ou inválida. Exemplo esperado: https://xxxx.supabase.co"
  );
}
if (!supabaseKey || !supabaseKey.includes("service_role")) {
  console.error(
    "[Supabase] SUPABASE_SERVICE_KEY ausente ou possivelmente incorreta. Use a chave service_role (NÃO a anon)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
