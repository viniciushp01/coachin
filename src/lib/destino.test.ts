import { describe, expect, it } from "vitest";
import { destinoDaRaiz, destinoDaSessao, type EstadoSessao } from "./destino";

const aluno: Extract<EstadoSessao, { tipo: "logado" }> = {
  tipo: "logado",
  papel: "aluno",
  bloqueado: false,
  nome: "Vinicius",
  email: "vinicius@exemplo.com",
  temProfessor: true,
  avisoAceito: true,
  perfilConcluido: true,
};

describe("destinoDaSessao", () => {
  it("sem sessão vai para entrar", () => {
    expect(destinoDaSessao({ tipo: "anonimo" })).toBe("/entrar");
  });

  it("cada papel vai para a sua área", () => {
    expect(destinoDaSessao({ ...aluno, papel: "admin" })).toBe("/admin");
    expect(destinoDaSessao({ ...aluno, papel: "professor" })).toBe("/professor");
    expect(destinoDaSessao(aluno)).toBe("/aluno");
  });

  it("bloqueado vence o papel (regras 95 e 119)", () => {
    expect(destinoDaSessao({ ...aluno, papel: "professor", bloqueado: true })).toBe("/bloqueado");
    expect(destinoDaSessao({ ...aluno, bloqueado: true })).toBe("/bloqueado");
    expect(destinoDaSessao({ ...aluno, temProfessor: false, bloqueado: true })).toBe("/bloqueado");
  });

  it("aluno sem vínculo ativo vê a tela sem professor (regra 90)", () => {
    expect(
      destinoDaSessao({
        ...aluno,
        temProfessor: false,
        avisoAceito: false,
        perfilConcluido: false,
      }),
    ).toBe("/sem-professor");
  });

  it("aluno com vínculo e perfil incompleto retoma o primeiro acesso (regras 49 e 86)", () => {
    expect(destinoDaSessao({ ...aluno, avisoAceito: false, perfilConcluido: false })).toBe(
      "/primeiro-acesso",
    );
    expect(destinoDaSessao({ ...aluno, perfilConcluido: false })).toBe("/primeiro-acesso");
  });

  it("perfil e vínculo não mudam o destino de professor e administrador", () => {
    const semNada = { temProfessor: false, avisoAceito: false, perfilConcluido: false };
    expect(destinoDaSessao({ ...aluno, ...semNada, papel: "professor" })).toBe("/professor");
    expect(destinoDaSessao({ ...aluno, ...semNada, papel: "admin" })).toBe("/admin");
  });
});

describe("destinoDaRaiz (convite guardado no aparelho)", () => {
  it("sem convite guardado, segue o destino do papel", () => {
    expect(destinoDaRaiz(aluno, null)).toEqual({ to: "/aluno" });
    expect(destinoDaRaiz({ tipo: "anonimo" }, null)).toEqual({ to: "/entrar" });
  });

  it("logado com convite guardado volta ao convite, em qualquer papel (regras 79 e 134)", () => {
    const semProfessor = { ...aluno, temProfessor: false };
    expect(destinoDaRaiz(semProfessor, "tok")).toEqual({
      to: "/convite/$token",
      params: { token: "tok" },
    });
    expect(destinoDaRaiz({ ...aluno, papel: "professor" }, "tok")).toEqual({
      to: "/convite/$token",
      params: { token: "tok" },
    });
  });

  it("sem sessão ou bloqueado, o convite guardado espera (regras 95 e 119)", () => {
    expect(destinoDaRaiz({ tipo: "anonimo" }, "tok")).toEqual({ to: "/entrar" });
    expect(destinoDaRaiz({ ...aluno, bloqueado: true }, "tok")).toEqual({ to: "/bloqueado" });
  });
});
