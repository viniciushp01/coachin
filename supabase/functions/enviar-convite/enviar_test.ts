import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { enviarConvite, type Mensagem, type Servicos } from "./enviar.ts";

const APP_URL = "https://coachin.vercel.app";
const TOKEN = "tok-secreto-123";

const RESERVA_ALUNO = { kind: "student", email: "ana@email.com", inviter_name: "Carlos Almeida" };
const RESERVA_PROFESSOR = { kind: "teacher", email: "bia@email.com", inviter_name: "Admin" };

/** Serviços falsos: guardam as mensagens; cada teste troca só o que precisa. */
function servicos(trocas: Partial<Servicos> = {}) {
  const enviadas: Mensagem[] = [];
  const reservas: string[] = [];
  const s: Servicos = {
    reservar: (token) => {
      reservas.push(token);
      return Promise.resolve(RESERVA_ALUNO);
    },
    enviar: (m) => {
      enviadas.push(m);
      return Promise.resolve();
    },
    ...trocas,
  };
  return { s, enviadas, reservas };
}

/** Roda `fn` guardando tudo o que foi para o console. */
async function comLog<T>(fn: () => Promise<T>): Promise<{ r: T; log: string }> {
  const linhas: string[] = [];
  const originais = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };
  const guardar = (...a: unknown[]) => linhas.push(a.map((x) => Deno.inspect(x)).join(" "));
  Object.assign(console, { log: guardar, error: guardar, warn: guardar, info: guardar });
  try {
    return { r: await fn(), log: linhas.join("\n") };
  } finally {
    Object.assign(console, originais);
  }
}

Deno.test("aluno: envia ao e-mail do convite, com o texto da regra 136", async () => {
  const { s, enviadas, reservas } = servicos();
  const r = await enviarConvite({ token: TOKEN }, s, APP_URL);
  assertEquals(r, { status: 200, corpo: { ok: true } });
  assertEquals(reservas, [TOKEN]);
  assertEquals(enviadas.length, 1);
  const m = enviadas[0];
  assertEquals(m.para, "ana@email.com");
  assertEquals(m.assunto, "Carlos Almeida convidou você para o Coach In");
  assertStringIncludes(m.texto, "Carlos Almeida quer montar seus treinos no Coach In.");
  assertStringIncludes(m.texto, "O link vale por 7 dias e só pode ser usado uma vez.");
  assertStringIncludes(m.texto, "Se você não esperava este convite, pode ignorar esta mensagem.");
  assertStringIncludes(m.texto, `${APP_URL}/convite/${TOKEN}`);
  assertStringIncludes(m.html, `href="${APP_URL}/convite/${TOKEN}"`);
  assertStringIncludes(m.html, ">Abrir convite</a>");
});

Deno.test("professor: assunto, corpo e botão da regra 136, sem 'Prof.' (regra 144)", async () => {
  const { s, enviadas } = servicos({ reservar: () => Promise.resolve(RESERVA_PROFESSOR) });
  const r = await enviarConvite({ token: TOKEN }, s, APP_URL);
  assertEquals(r.status, 200);
  const m = enviadas[0];
  assertEquals(m.para, "bia@email.com");
  assertEquals(m.assunto, "Seu acesso de professor no Coach In");
  assertStringIncludes(m.texto, "Você recebeu um convite para usar o Coach In como professor.");
  assertStringIncludes(m.texto, "O link vale por 1 dia e só pode ser usado uma vez.");
  assertStringIncludes(m.html, ">Ativar acesso</a>");
  assert(!/Prof\.|Profa\./.test(m.texto + m.html));
});

Deno.test("URL e e-mail enviados pelo app são ignorados (regras 138 e 140)", async () => {
  const { s, enviadas } = servicos();
  await enviarConvite(
    {
      token: TOKEN,
      url: "https://golpe.example/x",
      link: "https://golpe.example",
      email: "x@golpe.example",
    },
    s,
    APP_URL,
  );
  const m = enviadas[0];
  assertEquals(m.para, "ana@email.com");
  assert(!(m.texto + m.html).includes("golpe.example"));
});

Deno.test("APP_URL com barra no fim não dobra a barra; token vai codificado", async () => {
  const { s, enviadas } = servicos();
  await enviarConvite({ token: "a/b c" }, s, `${APP_URL}/`);
  assertStringIncludes(enviadas[0].texto, `${APP_URL}/convite/a%2Fb%20c`);
});

Deno.test("nome de quem convidou é escapado no HTML", async () => {
  const { s, enviadas } = servicos({
    reservar: () => Promise.resolve({ ...RESERVA_ALUNO, inviter_name: '<b>"Zé"</b>' }),
  });
  await enviarConvite({ token: TOKEN }, s, APP_URL);
  assertStringIncludes(enviadas[0].html, "&lt;b&gt;&quot;Zé&quot;&lt;/b&gt;");
  assert(!enviadas[0].html.includes("<b>"));
});

Deno.test("entrada sem token é invalid_arguments, sem chamar nada", async () => {
  for (const entrada of [null, "x", {}, { token: "" }, { token: 1 }]) {
    const { s, enviadas, reservas } = servicos();
    const r = await enviarConvite(entrada, s, APP_URL);
    assertEquals(r, { status: 400, corpo: { error: "invalid_arguments" } });
    assertEquals([reservas, enviadas], [[], []]);
  }
});

Deno.test(
  "banco recusa (outra pessoa, não pendente, 60 s): repassa o código e não envia",
  async () => {
    const casos: [string, number][] = [
      ["forbidden", 403],
      ["invite_not_found", 404],
      ["invite_used", 409],
      ["invite_replaced", 409],
      ["invite_expired", 409],
      ["invite_declined", 409],
      ["invite_no_email", 409],
      ["too_many_emails", 429],
    ];
    for (const [codigo, status] of casos) {
      const { s, enviadas } = servicos({ reservar: () => Promise.reject(new Error(codigo)) });
      const r = await enviarConvite({ token: TOKEN }, s, APP_URL);
      assertEquals(r, { status, corpo: { error: codigo } }, codigo);
      assertEquals(enviadas, []);
    }
  },
);

Deno.test("erro inesperado do banco é erro_desconhecido", async () => {
  const { s } = servicos({ reservar: () => Promise.reject(new Error("connection reset by peer")) });
  const { r } = await comLog(() => enviarConvite({ token: TOKEN }, s, APP_URL));
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
});

Deno.test("falha do SMTP é email_send_failed; limite do provedor é too_many_emails", async () => {
  const falha = servicos({ enviar: () => Promise.reject(new Error("ECONNREFUSED")) });
  const r1 = await comLog(() => enviarConvite({ token: TOKEN }, falha.s, APP_URL));
  assertEquals(r1.r, { status: 502, corpo: { error: "email_send_failed" } });

  const limite = servicos({
    enviar: () => Promise.reject(new Error("421 4.7.0 Too many messages, rate limit exceeded")),
  });
  const r2 = await comLog(() => enviarConvite({ token: TOKEN }, limite.s, APP_URL));
  assertEquals(r2.r, { status: 429, corpo: { error: "too_many_emails" } });
});

Deno.test("o token não aparece em log, nem quando o SMTP ou o banco falham", async () => {
  const cenarios: Partial<Servicos>[] = [
    {},
    { enviar: (m) => Promise.reject(new Error(`falhou ao enviar ${m.texto}`)) },
    { reservar: (t) => Promise.reject(new Error(`erro com ${t}`)) },
  ];
  for (const trocas of cenarios) {
    const { s } = servicos(trocas);
    const { log } = await comLog(() => enviarConvite({ token: TOKEN }, s, APP_URL));
    assert(!log.includes(TOKEN), log);
  }
});

Deno.test("nome de quem convidou vai numa linha só, com até 60 caracteres", async () => {
  const longo = `Carlos\n\tAlmeida ${"x".repeat(100)}`;
  const { s, enviadas } = servicos({
    reservar: () => Promise.resolve({ ...RESERVA_ALUNO, inviter_name: longo }),
  });
  await enviarConvite({ token: TOKEN }, s, APP_URL);
  const nome = enviadas[0].assunto.replace(" convidou você para o Coach In", "");
  assert(nome.startsWith("Carlos Almeida x"));
  assertEquals(nome.length, 60);
});

Deno.test("sem APP_URL: erro sem reservar o envio (o intervalo não é gasto)", async () => {
  const { s, reservas, enviadas } = servicos();
  const { r } = await comLog(() => enviarConvite({ token: TOKEN }, s, ""));
  assertEquals(r, { status: 500, corpo: { error: "erro_desconhecido" } });
  assertEquals([reservas, enviadas], [[], []]);
});
