import { supabase } from "@/lib/supabase";
import { urlDoApp } from "./urlDoApp";

/**
 * Pede o link de "Esqueci a senha" (regra 50). A hora do pedido vai no endereço de volta:
 * é ela que separa link vencido de link já usado na volta (`situacaoDoLink`).
 */
export function pedirLinkDeSenha(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: urlDoApp(`/nova-senha?pedido=${Date.now()}`),
  });
}
