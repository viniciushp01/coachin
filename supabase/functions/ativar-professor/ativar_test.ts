import { assertEquals } from "jsr:@std/assert@1";
import { ativarProfessor, type Servicos } from "./ativar.ts";

const PREVIA_VALIDA = {
  state: "valid",
  kind: "teacher",
  email: "carlos@email.com",
  account_exists: false,
};

/** Serviços falsos: registram as chamadas; cada teste troca só o que precisa. */
function servicos(trocas: Partial<Servicos> = {}) {
  const chamadas: string[] = [];
  const s: Servicos = {
    lerPrevia: (token) => {
      chamadas.push(`previa ${token}`);
      return Promise.resolve(PREVIA_VALIDA);
    },
    criarUsuario: (email, senha) => {
      chamadas.push(`criar ${email} ${senha}`);
      return Promise.resolve({ id: "u-1" });
    },
    aceitarConvite: (email, _senha, token) => {
      chamadas.push(`aceitar ${email} ${token}`);
      return Promise.resolve(null);
    },
    apagarUsuario: (id) => {
      chamadas.push(`apagar ${id}`);
      return Promise.resolve();
    },
    ...trocas,
  };
  return { s, chamadas };
}

const ENTRADA = { token: "tok-1", senha: "senha123" };

Deno.test("convite válido: cria a conta com o e-mail do convite e aceita", async () => {
  const { s, chamadas } = servicos();
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 200, corpo: { ok: true, email: "carlos@email.com" } });
  assertEquals(chamadas, [
    "previa tok-1",
    "criar carlos@email.com senha123",
    "aceitar carlos@email.com tok-1",
  ]);
});

Deno.test("entrada sem token ou senha é invalid_arguments, sem chamar nada", async () => {
  for (const entrada of [null, "x", {}, { token: "t" }, { token: 1, senha: "senha123" }]) {
    const { s, chamadas } = servicos();
    const r = await ativarProfessor(entrada, s);
    assertEquals(r, { status: 400, corpo: { error: "invalid_arguments" } });
    assertEquals(chamadas, []);
  }
});

Deno.test("senha fraca (regra 78) é weak_password, sem chamar nada", async () => {
  for (const senha of ["abc123", "somenteletras", "12345678"]) {
    const { s, chamadas } = servicos();
    const r = await ativarProfessor({ token: "tok-1", senha }, s);
    assertEquals(r, { status: 400, corpo: { error: "weak_password" } });
    assertEquals(chamadas, []);
  }
});

Deno.test("convite fora de validade não cria conta", async () => {
  const casos = [
    [{ state: "invalid" }, "invite_invalid"],
    [{ ...PREVIA_VALIDA, state: "expired" }, "invite_expired"],
    [{ ...PREVIA_VALIDA, state: "used" }, "invite_used"],
    [{ ...PREVIA_VALIDA, state: "replaced" }, "invite_replaced"],
    [{ ...PREVIA_VALIDA, state: "declined" }, "invite_declined"],
    [{ ...PREVIA_VALIDA, kind: "student" }, "invite_invalid"],
    [{ ...PREVIA_VALIDA, email: null }, "invite_invalid"],
    [null, "invite_invalid"],
  ] as const;
  for (const [previa, codigo] of casos) {
    const { s, chamadas } = servicos({ lerPrevia: () => Promise.resolve(previa) });
    const r = await ativarProfessor(ENTRADA, s);
    assertEquals(r, { status: 409, corpo: { error: codigo } }, codigo);
    assertEquals(chamadas, [], codigo);
  }
});

Deno.test("e-mail que já tem conta é email_has_account", async () => {
  const { s, chamadas } = servicos({
    lerPrevia: () => Promise.resolve({ ...PREVIA_VALIDA, account_exists: true }),
  });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 409, corpo: { error: "email_has_account" } });
  assertEquals(chamadas, []);
});

Deno.test("e-mail que ganhou conta no meio do caminho é email_has_account", async () => {
  for (const erro of ["email_exists", "user_already_exists"]) {
    const { s, chamadas } = servicos({ criarUsuario: () => Promise.resolve({ erro }) });
    const r = await ativarProfessor(ENTRADA, s);
    assertEquals(r, { status: 409, corpo: { error: "email_has_account" } });
    assertEquals(chamadas, ["previa tok-1"]);
  }
});

Deno.test("senha recusada pelo Auth é weak_password", async () => {
  const { s } = servicos({ criarUsuario: () => Promise.resolve({ erro: "weak_password" }) });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 400, corpo: { error: "weak_password" } });
});

Deno.test("outra falha ao criar a conta é erro_desconhecido", async () => {
  const { s } = servicos({ criarUsuario: () => Promise.resolve({ erro: "unexpected_failure" }) });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
});

Deno.test("falha no aceite desfaz a conta e devolve o código do banco", async () => {
  const { s, chamadas } = servicos({
    aceitarConvite: () => Promise.resolve({ erro: "invite_used" }),
  });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 409, corpo: { error: "invite_used" } });
  assertEquals(chamadas.at(-1), "apagar u-1");
});

Deno.test("exceção no aceite também desfaz a conta", async () => {
  const { s, chamadas } = servicos({
    aceitarConvite: () => Promise.reject(new Error("rede caiu")),
  });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
  assertEquals(chamadas.at(-1), "apagar u-1");
});

Deno.test("código estranho do aceite vira erro_desconhecido (e desfaz a conta)", async () => {
  const { s, chamadas } = servicos({
    aceitarConvite: () => Promise.resolve({ erro: "duplicate key value violates unique" }),
  });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
  assertEquals(chamadas.at(-1), "apagar u-1");
});

Deno.test("falha ao desfazer a conta não esconde o erro do aceite", async () => {
  const { s } = servicos({
    aceitarConvite: () => Promise.resolve({ erro: "invite_expired" }),
    apagarUsuario: () => Promise.reject(new Error("fora do ar")),
  });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 409, corpo: { error: "invite_expired" } });
});

Deno.test("falha ao ler o convite é erro_desconhecido, sem criar conta", async () => {
  const { s, chamadas } = servicos({ lerPrevia: () => Promise.reject(new Error("x")) });
  const r = await ativarProfessor(ENTRADA, s);
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
  assertEquals(chamadas, []);
});
