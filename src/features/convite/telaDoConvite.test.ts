import { describe, expect, it } from "vitest";
import type { EstadoSessao } from "@/lib/destino";
import {
  lerPrevia,
  telaDoConvite,
  telaDoErroDoConvite,
  telaDoErroDoConviteDeProfessor,
  type PreviaDoConvite,
} from "./telaDoConvite";

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
  email: "ana@exemplo.com",
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
      email: "ana@exemplo.com",
    });
  });

  it("logado com professor: Trocar de professor?, com o atual e o novo (regra 98)", () => {
    expect(telaDoConvite(valido, { ...aluno, temProfessor: true }, "Marina Souza")).toEqual({
      tela: "trocar",
      professor: "Carlos Almeida",
      professorAtual: "Marina Souza",
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

describe("telaDoConvite · convite de professor (regras 93 e 97)", () => {
  const professor: PreviaDoConvite = {
    estado: "valido",
    tipo: "professor",
    professor: "Admin",
    email: "ana@exemplo.com",
    temConta: true,
  };

  it("deslogado, e-mail com conta: Você já tem uma conta, com o e-mail do convite", () => {
    expect(telaDoConvite(professor, anonimo)).toEqual({
      tela: "professor_ja_tem_conta",
      email: "ana@exemplo.com",
    });
  });

  it("deslogado, e-mail sem conta: Ative seu acesso (próximo ticket)", () => {
    expect(telaDoConvite({ ...professor, temConta: false }, anonimo)).toEqual({
      tela: "ative_seu_acesso",
      email: "ana@exemplo.com",
    });
  });

  it("logado na conta do convite: direto em Ativar acesso de professor? (regra 97)", () => {
    expect(telaDoConvite(professor, aluno)).toEqual({ tela: "ativar_professor" });
    expect(telaDoConvite({ ...professor, email: "Ana@Exemplo.com" }, aluno)).toEqual({
      tela: "ativar_professor",
    });
  });

  it("logado em outra conta: Este convite é para outra conta, com o e-mail da sessão", () => {
    expect(telaDoConvite({ ...professor, email: "carlos@exemplo.com" }, aluno)).toEqual({
      tela: "outra_conta",
      email: "ana@exemplo.com",
    });
  });

  it("vencido, usado, substituído ou recusado: Este link não vale mais (do professor)", () => {
    for (const estado of ["expirado", "usado", "substituido", "recusado"] as const) {
      expect(telaDoConvite({ ...professor, estado }, aluno)).toEqual({
        tela: "professor_nao_vale_mais",
      });
      expect(telaDoConvite({ ...professor, estado }, anonimo)).toEqual({
        tela: "professor_nao_vale_mais",
      });
    }
  });
});

describe("telaDoErroDoConvite (o convite mudou com a tela aberta)", () => {
  it("vencido ou recusado: Este convite expirou (regras 48 e 132)", () => {
    expect(telaDoErroDoConvite("invite_expired", "Carlos")).toEqual({
      tela: "expirado",
      professor: "Carlos",
    });
    expect(telaDoErroDoConvite("invite_declined", "Carlos")).toEqual({
      tela: "expirado",
      professor: "Carlos",
    });
  });

  it("usado, substituído ou desconhecido têm tela própria", () => {
    expect(telaDoErroDoConvite("invite_used", "Carlos")).toEqual({ tela: "usado" });
    expect(telaDoErroDoConvite("invite_replaced", "Carlos")).toEqual({ tela: "nao_vale_mais" });
    expect(telaDoErroDoConvite("invite_invalid", "Carlos")).toEqual({ tela: "nao_vale_mais" });
  });

  it("os demais erros ficam para o toast", () => {
    expect(telaDoErroDoConvite("sem_conexao", "Carlos")).toBeNull();
    expect(telaDoErroDoConvite("teacher_unavailable", "Carlos")).toBeNull();
  });
});

describe("telaDoErroDoConviteDeProfessor", () => {
  it("convite que mudou (vencido, recusado, usado, substituído): Este link não vale mais", () => {
    for (const codigo of [
      "invite_expired",
      "invite_declined",
      "invite_used",
      "invite_replaced",
      "invite_invalid",
    ]) {
      expect(telaDoErroDoConviteDeProfessor(codigo)).toEqual({ tela: "professor_nao_vale_mais" });
    }
  });

  it("os demais erros ficam para o toast (ex.: email_mismatch, sem conexão)", () => {
    expect(telaDoErroDoConviteDeProfessor("email_mismatch")).toBeNull();
    expect(telaDoErroDoConviteDeProfessor("sem_conexao")).toBeNull();
  });
});
