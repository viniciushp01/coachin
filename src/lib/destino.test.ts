import { describe, expect, it } from "vitest";
import { destinoDaSessao, type EstadoSessao } from "./destino";

const aluno: Extract<EstadoSessao, { tipo: "logado" }> = {
  tipo: "logado",
  papel: "aluno",
  bloqueado: false,
  nome: "Vinicius",
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
