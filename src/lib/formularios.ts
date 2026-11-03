import { z } from "zod";
import { MENSAGENS } from "./erros";

/**
 * Campos compartilhados pelos formulários (react-hook-form + zod, ADR 0001).
 * As mensagens são as de produto, em pt-BR; cada tela monta o seu `z.object` com estes campos.
 */

/** E-mail: tira os espaços das pontas; vazio ou mal formado dá o mesmo erro. */
export const email = z.string().trim().pipe(z.email(MENSAGENS.email_invalid));

const SENHA_FRACA = "A senha precisa ter pelo menos 8 caracteres, com letras e números."; // [produto] regra 78

/** Senha nova ("Criar acesso" e "Criar nova senha"): 8+ caracteres, com letras e números (regra 78). */
export const senhaNova = z
  .string()
  .refine((valor) => valor.length >= 8 && /\p{L}/u.test(valor) && /\d/.test(valor), SENHA_FRACA);

/** Dica que fica sob o campo de senha nova (regra 78). */
export const DICA_SENHA_NOVA = "Mínimo de 8 caracteres, com letras e números."; // [produto] regra 78

/** Senha do Login: não valida força, só exige que seja digitada. */
export const senhaDoLogin = z.string().min(1, "Digite sua senha.");
