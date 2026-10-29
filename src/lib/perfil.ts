import { z } from "zod";
import { CODIGOS_PAIS } from "@/ui/codigosPais";
import { MENSAGENS } from "./erros";

/**
 * Perfil do aluno (regras 49, 85, 99 e 108): conversões do que a pessoa digita para o que
 * `save_student_profile` recebe. Usado no passo 2 do primeiro acesso e, depois, em "Editar dados".
 */

/** Sem regra de produto para data vazia ou impossível (a regra 85 só fala da data futura). */
export const DATA_INVALIDA = "Digite a data de nascimento, como 15/03/1995."; // proposta

/** "dd/mm/aaaa" → "aaaa-mm-dd", ou nulo se a data não existe. */
export function lerData(texto: string): string | null {
  const partes = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** "1,78 m", "78.5 kg" → número; vírgula ou ponto, com ou sem unidade. */
export function lerMedida(texto: string): number | null {
  const limpo = texto
    .trim()
    .replace(/\s*(m|kg)$/i, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  return Number(limpo);
}

const digitos = (texto: string) => texto.replace(/\D/g, "");

/**
 * Código do país + número digitado → padrão internacional (`+5531987654321`), ou nulo.
 * Brasil: DDD + 8 ou 9 dígitos. Outros países: até 15 dígitos no total (padrão do banco).
 */
export function telefoneParaServidor(codigo: string, numero: string): string | null {
  const d = digitos(numero);
  if (codigo === "+55") return /^[1-9]\d(9\d{8}|\d{8})$/.test(d) ? `+55${d}` : null;
  const total = digitos(codigo).length + d.length;
  return d.length > 0 && total >= 10 && total <= 15 ? `${codigo}${d}` : null;
}

/** Número brasileiro como "(31) 98765-4321" enquanto a pessoa digita; outros países, só dígitos. */
export function formatarTelefone(codigo: string, numero: string): string {
  const d = digitos(numero);
  if (codigo !== "+55") return d.slice(0, 15);
  const n = d.slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : "";
  const ddd = `(${n.slice(0, 2)}) `;
  const resto = n.slice(2);
  if (resto.length <= 4) return ddd + resto;
  const corte = resto.length === 9 ? 5 : 4;
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Telefone guardado (`+5531…`) → código do país e número para o campo (regra 109). */
export function telefoneDoServidor(telefone: string | null): { codigo: string; numero: string } {
  if (!telefone) return { codigo: "+55", numero: "" };
  // O código mais longo primeiro, para "+351" não virar "+35" + "1…".
  const codigo =
    [...CODIGOS_PAIS].sort((a, b) => b.length - a.length).find((c) => telefone.startsWith(c)) ??
    "+55";
  return { codigo, numero: formatarTelefone(codigo, telefone.slice(codigo.length)) };
}

/** Formulário do perfil → argumentos de `save_student_profile`, com os erros da regra 85. */
export function esquemaDoPerfil(hoje: string) {
  return z
    .object({
      nome: z.string(),
      nascimento: z.string(),
      codigoPais: z.string(),
      telefone: z.string(),
      altura: z.string(),
      peso: z.string(),
      restricoes: z.string(),
    })
    .transform((v, ctx) => {
      const erro = (campo: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [campo], message });
      const nome = v.nome.trim();
      const nascimento = lerData(v.nascimento);
      const telefone = telefoneParaServidor(v.codigoPais, v.telefone);
      const altura = lerMedida(v.altura);
      const peso = lerMedida(v.peso);
      if (!nome) erro("nome", MENSAGENS.name_required);
      if (!nascimento) erro("nascimento", DATA_INVALIDA);
      else if (nascimento > hoje) erro("nascimento", MENSAGENS.birth_date_invalid);
      if (!telefone) erro("telefone", MENSAGENS.phone_invalid);
      if (altura === null || altura < 1 || altura > 2.5) erro("altura", MENSAGENS.height_invalid);
      if (peso === null || peso < 20 || peso > 300) erro("peso", MENSAGENS.weight_invalid);
      if (!nascimento || !telefone || altura === null || peso === null) return z.NEVER;
      return {
        p_full_name: nome,
        p_birth_date: nascimento,
        p_phone: telefone,
        p_height_m: altura,
        p_weight_kg: peso,
        p_restrictions: v.restricoes.trim(),
      };
    });
}
