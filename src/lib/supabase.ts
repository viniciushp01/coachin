import { createClient } from "@supabase/supabase-js";
import type { Database } from "@db/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chave) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copie .env.example para .env.local.",
  );
}

/**
 * Cliente único do Supabase, tipado com o banco.
 * Regra do desenho: o app só LÊ tabelas por aqui; toda escrita usa `rpc()` de ./rpc.
 */
export const supabase = createClient<Database>(url, chave, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Links de confirmar e-mail e redefinir senha voltam para o app com a sessão na URL.
    detectSessionInUrl: true,
  },
});
