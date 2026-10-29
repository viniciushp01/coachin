import { assertEquals } from "jsr:@std/assert@1";
import { postJson } from "./http.ts";

const eco = postJson((corpo) => Promise.resolve({ status: 201, corpo: { recebi: corpo } }));
const URL_FN = "http://local/fn";

Deno.test("responde ao preflight com CORS", async () => {
  const r = await eco(new Request(URL_FN, { method: "OPTIONS" }));
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "*");
  await r.body?.cancel();
});

Deno.test("passa o corpo JSON e devolve status e corpo com CORS", async () => {
  const r = await eco(new Request(URL_FN, { method: "POST", body: '{"a":1}' }));
  assertEquals(r.status, 201);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(await r.json(), { recebi: { a: 1 } });
});

Deno.test("recusa outro método e corpo que não é JSON", async () => {
  const get = await eco(new Request(URL_FN));
  assertEquals([get.status, await get.json()], [405, { error: "invalid_arguments" }]);
  const ruim = await eco(new Request(URL_FN, { method: "POST", body: "{" }));
  assertEquals([ruim.status, await ruim.json()], [400, { error: "invalid_arguments" }]);
});

Deno.test("exceção vira erro_desconhecido com CORS", async () => {
  const quebra = postJson(() => Promise.reject(new Error("x")));
  const r = await quebra(new Request(URL_FN, { method: "POST", body: "{}" }));
  assertEquals([r.status, await r.json()], [500, { error: "erro_desconhecido" }]);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "*");
});
