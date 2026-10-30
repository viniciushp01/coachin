/**
 * Base HTTP das Edge Functions: CORS para o app (Vercel e localhost) e respostas em JSON.
 * Erros seguem o padrão do banco: o campo `error` leva um código curto, traduzido em
 * src/lib/erros.ts (um teste de lá confere a tradução).
 */

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/**
 * Função chamada com POST e corpo JSON. Responde ao preflight do navegador, recusa outros
 * métodos e corpo ilegível, e nunca deixa uma exceção virar resposta sem CORS.
 */
export function postJson(
  tratar: (corpo: unknown, req: Request) => Promise<{ status: number; corpo: unknown }>,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ error: "invalid_arguments" }, 405);
    let corpo: unknown;
    try {
      corpo = await req.json();
    } catch {
      return json({ error: "invalid_arguments" }, 400);
    }
    try {
      const r = await tratar(corpo, req);
      return json(r.corpo, r.status);
    } catch (erro) {
      console.error(erro);
      return json({ error: "erro_desconhecido" }, 500);
    }
  };
}
