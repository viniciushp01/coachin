import { describe, expect, it } from "vitest";
import { dataCurta, estadoDoConvite } from "./conviteDoAluno";

const agora = new Date("2026-10-29T12:00:00Z");
const base = {
  id: "i1",
  status: "pending" as const,
  expires_at: "2026-11-03T12:00:00Z",
  created_at: "2026-10-27T12:00:00Z",
  declined_at: null,
};

describe("estadoDoConvite (regras 55, 58 e 102)", () => {
  it("pendente dentro da validade", () => {
    expect(estadoDoConvite(base, agora)).toBe("pendente");
  });

  it("pendente com a validade vencida vira expirado", () => {
    expect(estadoDoConvite({ ...base, expires_at: "2026-10-28T12:00:00Z" }, agora)).toBe(
      "expirado",
    );
  });

  it("recusado, usado e substituído vêm do status", () => {
    expect(estadoDoConvite({ ...base, status: "declined" }, agora)).toBe("recusado");
    expect(estadoDoConvite({ ...base, status: "accepted" }, agora)).toBe("usado");
    expect(estadoDoConvite({ ...base, status: "replaced" }, agora)).toBe("substituido");
  });
});

describe("dataCurta", () => {
  it("dd/mm no fuso do aparelho", () => {
    expect(dataCurta("2026-11-03T12:00:00Z")).toBe("03/11");
  });
});
