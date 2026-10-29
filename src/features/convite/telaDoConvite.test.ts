import { describe, expect, it } from "vitest";
import type { EstadoSessao } from "@/lib/destino";
import { lerPrevia, telaDoConvite, type PreviaDoConvite } from "./telaDoConvite";

const valido: PreviaDoConvite = {
  estado: "valido",
  tipo: "aluno",
  professor: "Carlos Almeida",
  email: null,
  temConta: null,
};

const anonimo: EstadoSessao = { tipo: "anonimo" };
const aluno: EstadoSessao = {
  tipo: "logado",
  papel: "aluno",
  bloqueado: false,
  nome: "Ana",
  temProfessor: false,
  avisoAceito: false,
  perfilConcluido: false,
};

describe("lerPrevia (resposta de get_invite_preview)", () => {
  it("traduz o convite válido de aluno", () => {
    expect(
      lerPrevia({
        state: "valid",
        kind: "student",
        inviter_name: "Carlos Almeida",
        invitee_name: "Ana",
        email: "ana@exemplo.com",
        account_exists: true,
        expires_at: "2026-11-05T12:00:00Z",
      }),
    ).toEqual({
      estado: "valido",
      tipo: "aluno",
      professor: "Carlos Almeida",
      email: "ana@exemplo.com",
      temConta: true,
    });
  });

  it("traduz os outros estados e o tipo professor", () => {
    const base = {
      kind: "teacher",
      inviter_name: "Admin",
      email: "p@x.com",
      account_exists: false,
    };
    expect(lerPrevia({ ...base, state: "expired" })).toMatchObject({
      estado: "expirado",
      tipo: "professor",
    });
    expect(lerPrevia({ ...base, state: "used" })).toMatchObject({ estado: "usado" });
    expect(lerPrevia({ ...base, state: "replaced" })).toMatchObject({ estado: "substituido" });
    expect(lerPrevia({ ...base, state: "declined" })).toMatchObject({ estado: "recusado" });
  });

  it("token desconhecido ou resposta estranha vira inválido", () => {
    expect(lerPrevia({ state: "invalid" })).toEqual({ estado: "invalido" });
    expect(lerPrevia(null)).toEqual({ estado: "invalido" });
    expect(lerPrevia({ state: "outro", kind: "student" })).toEqual({ estado: "invalido" });
  });
});

describe("telaDoConvite · convite de aluno", () => {
  it("válido e deslogado: convite com Criar meu acesso (regra 48)", () => {
    expect(telaDoConvite(valido, anonimo)).toEqual({
      tela: "valido",
      professor: "Carlos Almeida",
      email: null,
    });
  });

  it("válido, deslogado e o e-mail do cadastro já tem conta: Você já tem uma conta (regra 79)", () => {
    expect(telaDoConvite({ ...valido, email: "ana@exemplo.com", temConta: true }, anonimo)).toEqual(
      { tela: "ja_tem_conta", professor: "Carlos Almeida", email: "ana@exemplo.com" },
    );
  });

  it("válido com e-mail sem conta: convite com o e-mail para preencher (regra 46)", () => {
    expect(
      telaDoConvite({ ...valido, email: "ana@exemplo.com", temConta: false }, anonimo),
    ).toEqual({ tela: "valido", professor: "Carlos Almeida", email: "ana@exemplo.com" });
  });

  it("válido e logado: segue para vincular (regra 97)", () => {
    expect(telaDoConvite(valido, aluno)).toEqual({
      tela: "vincular",
      professor: "Carlos Almeida",
    });
  });

  it("expirado, com o nome do professor (regra 48)", () => {
    expect(telaDoConvite({ ...valido, estado: "expirado" }, anonimo)).toEqual({
      tela: "expirado",
      professor: "Carlos Almeida",
    });
  });

  it("recusado e aberto de novo: a mesma tela de expirado (regra 132)", () => {
    expect(telaDoConvite({ ...valido, estado: "recusado" }, aluno)).toEqual({
      tela: "expirado",
      professor: "Carlos Almeida",
    });
  });

  it("já usado (regra 48)", () => {
    expect(telaDoConvite({ ...valido, estado: "usado" }, anonimo)).toEqual({ tela: "usado" });
  });

  it("substituído por reenvio ou inválido: Este link não vale mais (regra 82)", () => {
    expect(telaDoConvite({ ...valido, estado: "substituido" }, anonimo)).toEqual({
      tela: "nao_vale_mais",
    });
    expect(telaDoConvite({ estado: "invalido" }, aluno)).toEqual({ tela: "nao_vale_mais" });
  });
});

describe("telaDoConvite · convite de professor", () => {
  it("fica para a entrada do professor (#49)", () => {
    expect(telaDoConvite({ ...valido, tipo: "professor" }, anonimo)).toEqual({
      tela: "professor",
    });
  });
});
