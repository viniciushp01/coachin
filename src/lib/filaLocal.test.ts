import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "./erros";
import {
  consumirDescarte,
  enfileirar,
  enviarFila,
  guardarCopia,
  lerCopia,
  listarFila,
  reiniciarConexao,
  type ItemDaFila,
} from "./filaLocal";

const marcar = (diaId: string) => ({ tipo: "marcar", diaId, feitoEm: "2026-11-05" }) as const;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  reiniciarConexao();
});

describe("fila local (regra 116)", () => {
  it("guarda a hora da ação e um id único por item", async () => {
    const a = await enfileirar("c1", marcar("d1"), new Date("2026-11-05T10:00:00Z"));
    const b = await enfileirar("c1", marcar("d1"), new Date("2026-11-05T10:01:00Z"));
    expect(a.criadoEm).toBe("2026-11-05T10:00:00.000Z");
    expect(a.id).not.toBe(b.id);
  });

  it("envia em ordem e esvazia a fila", async () => {
    await enfileirar("c1", marcar("d1"));
    await enfileirar("c1", { tipo: "desfazer", diaId: "d1", feitoEm: "2026-11-05" });
    await enfileirar("c1", marcar("d1"));
    const ordem: string[] = [];
    const r = await enviarFila("c1", (i) => {
      ordem.push(i.acao.tipo);
      return Promise.resolve();
    });
    expect(ordem).toEqual(["marcar", "desfazer", "marcar"]);
    expect(r).toMatchObject({ parou: false, descartados: [] });
    expect(r.enviados).toHaveLength(3);
    expect(await listarFila("c1")).toEqual([]);
  });

  it("falha de rede para o envio e mantém o item que falhou e os seguintes", async () => {
    for (const d of ["d1", "d2", "d3"]) await enfileirar("c1", marcar(d));
    const r = await enviarFila("c1", (i) =>
      i.acao.tipo === "marcar" && i.acao.diaId === "d2"
        ? Promise.reject(new ErroApp("sem_conexao"))
        : Promise.resolve(),
    );
    expect(r.parou).toBe(true);
    expect(r.enviados).toHaveLength(1);
    const sobra = await listarFila("c1");
    expect(sobra.map((i) => i.acao)).toEqual([marcar("d2"), marcar("d3")]);
  });

  it("reenvia o mesmo id depois da falha (idempotência no banco)", async () => {
    await enfileirar("c1", marcar("d1"));
    const vistos: string[] = [];
    await enviarFila("c1", (i) => {
      vistos.push(i.id);
      return Promise.reject(new ErroApp("sem_conexao"));
    });
    await enviarFila("c1", (i) => {
      vistos.push(i.id);
      return Promise.resolve();
    });
    expect(vistos).toHaveLength(2);
    expect(vistos[0]).toBe(vistos[1]);
    expect(await listarFila("c1")).toEqual([]);
  });

  it("erro de regra descarta só aquele item e segue", async () => {
    const a = await enfileirar("c1", marcar("d1"));
    await enfileirar("c1", marcar("d2"));
    const r = await enviarFila("c1", (i: ItemDaFila) =>
      i.seq === a.seq ? Promise.reject(new ErroApp("day_removed")) : Promise.resolve(),
    );
    expect(r.parou).toBe(false);
    expect(r.enviados).toHaveLength(1);
    expect(r.descartados).toHaveLength(1);
    expect(r.descartados[0]?.erro.codigo).toBe("day_removed");
    expect(consumirDescarte(a.seq)?.codigo).toBe("day_removed");
    expect(consumirDescarte(a.seq)).toBeNull();
    expect(await listarFila("c1")).toEqual([]);
  });

  it("servidor fora do ar e sessão vencida também seguram a fila", async () => {
    await enfileirar("c1", marcar("d1"));
    for (const codigo of ["erro_desconhecido", "not_authenticated"] as const) {
      const r = await enviarFila("c1", () => Promise.reject(new ErroApp(codigo)));
      expect(r.parou).toBe(true);
    }
    expect(await listarFila("c1")).toHaveLength(1);
  });

  it("tempo esgotado conta como sem conexão", async () => {
    await enfileirar("c1", marcar("d1"));
    const r = await enviarFila("c1", () => new Promise(() => undefined), 10);
    expect(r.parou).toBe(true);
    expect(await listarFila("c1")).toHaveLength(1);
  });

  it("cada conta envia só os próprios itens (a fila fica ao sair)", async () => {
    await enfileirar("c1", marcar("d1"));
    await enfileirar("c2", marcar("d9"));
    const enviado = vi.fn(() => Promise.resolve());
    await enviarFila("c2", enviado);
    expect(enviado).toHaveBeenCalledTimes(1);
    expect(await listarFila("c1")).toHaveLength(1);
    expect(await listarFila("c2")).toEqual([]);
  });

  it("dois envios ao mesmo tempo não mandam o mesmo item duas vezes", async () => {
    await enfileirar("c1", marcar("d1"));
    const executar = vi.fn(() => new Promise<void>((ok) => setTimeout(ok, 20)));
    await Promise.all([enviarFila("c1", executar), enviarFila("c1", executar)]);
    expect(executar).toHaveBeenCalledTimes(1);
  });

  it("guarda e lê a cópia do treino por conta", async () => {
    await guardarCopia("c1", { nome: "Treino A" });
    expect(await lerCopia("c1")).toEqual({ nome: "Treino A" });
    expect(await lerCopia("c2")).toBeNull();
  });
});
