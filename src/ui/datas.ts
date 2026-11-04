// Datas de calendário como texto "aaaa-mm-dd", sem hora e sem fuso: quem chama decide o que é "hoje".
// Comparar duas datas nesse formato com < e > já dá a ordem certa.

/** "2026-11-03" → "03/11/2026". */
export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export type Mes = { ano: number; mes: number };

/** Mês de uma data; `mes` vai de 1 a 12. */
export function mesDe(iso: string): Mes {
  return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
}

export function somarMeses({ ano, mes }: Mes, delta: number): Mes {
  const data = new Date(Date.UTC(ano, mes - 1 + delta, 1));
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 };
}

/** "outubro de 2026". */
export function nomeDoMes({ ano, mes }: Mes) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
}

export function diasNoMes({ ano, mes }: Mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Quantas casas ficam vazias antes do dia 1 numa semana que começa na segunda. */
export function casasAntesDoDia1({ ano, mes }: Mes) {
  return (new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay() + 6) % 7;
}

export function dataIso({ ano, mes }: Mes, dia: number) {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
