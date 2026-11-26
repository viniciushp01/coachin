import { describe, expect, it, vi } from "vitest";
import { agendarAtualizacao } from "./atualizacaoDoApp";

function montar(caminhoInicial: string) {
  let caminho = caminhoInicial;
  const ouvintes = new Set<() => void>();
  const aplicar = vi.fn();
  agendarAtualizacao({
    caminhoAtual: () => caminho,
    aoMudarDeTela: (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    aplicar,
  });
  const irPara = (novo: string) => {
    caminho = novo;
    for (const ouvir of [...ouvintes]) ouvir();
  };
  return { aplicar, irPara, ouvintes };
}

describe("agendarAtualizacao (regra 177)", () => {
  it("fora do treino, aplica a versão nova na hora", () => {
    const { aplicar } = montar("/confirmar-email");

    expect(aplicar).toHaveBeenCalledTimes(1);
  });

  it("na ficha, treinando, espera: não recarrega no meio do treino", () => {
    const { aplicar, irPara } = montar("/aluno/ficha/dia-1");

    expect(aplicar).not.toHaveBeenCalled();
    irPara("/aluno/ficha/dia-2");
    expect(aplicar).not.toHaveBeenCalled();
  });

  it("ao sair da ficha, aplica uma vez só e para de ouvir", () => {
    const { aplicar, irPara, ouvintes } = montar("/aluno/ficha/dia-1");

    irPara("/aluno");
    irPara("/aluno/historico");

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(ouvintes.size).toBe(0);
  });
});
