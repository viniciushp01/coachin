import { guardarConvite } from "./conviteGuardado";

/**
 * Convite que viaja no endereço (`?convite=`) para sobreviver à confirmação do e-mail em outro
 * navegador ou app, onde o `localStorage` do aparelho original não existe (regra 172). O token
 * nunca é logado nem mostrado; só passa pelo endereço até ser guardado de novo no Login.
 */
const FORMATO = /^[a-z0-9]{1,128}$/;

/** O token da busca, ou `undefined` se faltar ou não tiver o formato de um token de convite. */
export function conviteDaBusca(busca: Record<string, unknown>): string | undefined {
  const { convite } = busca;
  return typeof convite === "string" && FORMATO.test(convite) ? convite : undefined;
}

/** Guarda de novo o convite que veio no endereço; sem token válido, não mexe em nada. */
export function guardarConviteDaBusca(busca: Record<string, unknown>) {
  const token = conviteDaBusca(busca);
  if (token) guardarConvite(token);
}
