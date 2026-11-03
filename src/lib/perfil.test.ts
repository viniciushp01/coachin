import { describe, expect, it } from "vitest";
import {
  esquemaDoPerfil,
  formatarTelefone,
  lerData,
  lerMedida,
  mascararData,
  telefoneDoServidor,
  telefoneParaServidor,
} from "./perfil";

describe("lerData (dd/mm/aaaa)", () => {
  it("converte para a data ISO", () => {
    expect(lerData("15/03/1995")).toBe("1995-03-15");
    expect(lerData(" 1/2/2001 ")).toBe("2001-02-01");
  });

  it("recusa data que não existe ou fora do formato", () => {
    expect(lerData("31/02/2000")).toBeNull();
    expect(lerData("2000-02-01")).toBeNull();
    expect(lerData("")).toBeNull();
  });
});

describe("mascararData (regra 141)", () => {
  it("põe as barras sozinho enquanto a pessoa digita", () => {
    expect(mascararData("1")).toBe("1");
    expect(mascararData("150")).toBe("15/0");
    expect(mascararData("15031995")).toBe("15/03/1995");
    expect(mascararData("15/03/19955")).toBe("15/03/1995");
  });

  it("ignora o que não é dígito", () => {
    expect(mascararData("15-03")).toBe("15/03");
    expect(mascararData("")).toBe("");
  });
});

describe("lerMedida (altura e peso)", () => {
  it("aceita vírgula ou ponto e a unidade no fim", () => {
    expect(lerMedida("1,78")).toBe(1.78);
    expect(lerMedida("1.78 m")).toBe(1.78);
    expect(lerMedida("78,5 kg")).toBe(78.5);
  });

  it("vazio ou texto não é medida", () => {
    expect(lerMedida("")).toBeNull();
    expect(lerMedida("alto")).toBeNull();
  });
});

describe("telefone (regra 108)", () => {
  it("+55 com DDD vira o padrão internacional", () => {
    expect(telefoneParaServidor("+55", "(31) 98765-4321")).toBe("+5531987654321");
    expect(telefoneParaServidor("+55", "31 3456-7890")).toBe("+553134567890");
  });

  it("+55 sem DDD ou incompleto é inválido", () => {
    expect(telefoneParaServidor("+55", "98765-4321")).toBeNull();
    expect(telefoneParaServidor("+55", "(31) 98765-43")).toBeNull();
    expect(telefoneParaServidor("+55", "")).toBeNull();
  });

  it("outro país: até 15 dígitos no total", () => {
    expect(telefoneParaServidor("+351", "912 345 678")).toBe("+351912345678");
    expect(telefoneParaServidor("+1", "123")).toBeNull();
  });

  it("formata o número brasileiro enquanto digita", () => {
    expect(formatarTelefone("+55", "31987654321")).toBe("(31) 98765-4321");
    expect(formatarTelefone("+55", "3134567890")).toBe("(31) 3456-7890");
    expect(formatarTelefone("+55", "319")).toBe("(31) 9");
    expect(formatarTelefone("+351", "912345678")).toBe("912345678");
  });

  it("separa o telefone do cadastro em código e número (regra 109)", () => {
    expect(telefoneDoServidor("+5531987654321")).toEqual({
      codigo: "+55",
      numero: "(31) 98765-4321",
    });
    expect(telefoneDoServidor("+351912345678")).toEqual({ codigo: "+351", numero: "912345678" });
    expect(telefoneDoServidor(null)).toEqual({ codigo: "+55", numero: "" });
  });
});

describe("esquemaDoPerfil (regras 85 e 99)", () => {
  const hoje = "2026-10-29";
  const valido = {
    nome: "Ana",
    nascimento: "15/03/1995",
    codigoPais: "+55",
    telefone: "(31) 98765-4321",
    altura: "1,65",
    peso: "60",
    restricoes: "",
  };

  it("perfil válido vira os argumentos de save_student_profile", () => {
    expect(esquemaDoPerfil(hoje).parse(valido)).toEqual({
      p_full_name: "Ana",
      p_birth_date: "1995-03-15",
      p_phone: "+5531987654321",
      p_height_m: 1.65,
      p_weight_kg: 60,
      p_restrictions: "",
    });
  });

  it("cada campo com o erro da regra 85", () => {
    const resultado = esquemaDoPerfil(hoje).safeParse({
      ...valido,
      nome: "  ",
      nascimento: "15/03/2031",
      telefone: "(31) 98765-43",
      altura: "3,80",
      peso: "5",
    });
    expect(resultado.success).toBe(false);
    const erros = Object.fromEntries(
      (resultado.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
    );
    expect(erros).toEqual({
      nome: "Digite seu nome.",
      nascimento: "Essa data ainda não chegou. Confira o nascimento.",
      telefone: "Digite um telefone com DDD, como (31) 91234-5678.",
      altura: "Digite uma altura entre 1,00 m e 2,50 m.",
      peso: "Digite um peso entre 20 kg e 300 kg.",
    });
  });

  const erroDoNascimento = (nascimento: string) =>
    esquemaDoPerfil(hoje).safeParse({ ...valido, nascimento }).error?.issues[0]?.message;

  it("nascimento hoje é válido", () => {
    expect(esquemaDoPerfil(hoje).safeParse({ ...valido, nascimento: "29/10/2026" }).success).toBe(
      true,
    );
  });

  it("vazio ou incompleto pede a data (regra 141)", () => {
    expect(erroDoNascimento("")).toBe("Digite a data de nascimento, como 15/03/1995.");
    expect(erroDoNascimento("15/03")).toBe("Digite a data de nascimento, como 15/03/1995.");
  });

  it("data que não existe ou anterior a 1900 (regra 141)", () => {
    expect(erroDoNascimento("31/02/2000")).toBe("Essa data não existe. Confira o dia e o mês.");
    expect(erroDoNascimento("30/02/2000")).toBe("Essa data não existe. Confira o dia e o mês.");
    expect(erroDoNascimento("31/12/1899")).toBe("Essa data não existe. Confira o dia e o mês.");
    expect(erroDoNascimento("01/01/1900")).toBeUndefined();
  });

  it("no futuro (regra 85)", () => {
    expect(erroDoNascimento("30/10/2026")).toBe(
      "Essa data ainda não chegou. Confira o nascimento.",
    );
  });

  it("restrições é opcional e tem as pontas aparadas", () => {
    expect(
      esquemaDoPerfil(hoje).parse({ ...valido, restricoes: "  dor no ombro " }).p_restrictions,
    ).toBe("dor no ombro");
  });
});
