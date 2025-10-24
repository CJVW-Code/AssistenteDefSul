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

export const supabase = createClient(supabaseUrl, supabaseKey);
