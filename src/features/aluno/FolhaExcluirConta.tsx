import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { Button, Sheet, useToast } from "@/ui";
import { excluirMinhaConta } from "./dadosAbas";

/**
 * Folha "Excluir sua conta?" (regra 120; Figma "Perfil · 4"). Sem vermelho: "Manter minha conta" é o
 * botão principal e "Excluir conta", o de contorno. Exige conexão (regra 116): sem ela a folha
 * vira "Sem conexão" e nada é alterado. Ao confirmar, volta ao Login com o toast "Conta excluída.".
 */
export function FolhaExcluirConta({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const [semConexao, setSemConexao] = useState(false);

  function fechar() {
    setSemConexao(false);
    aoFechar();
  }

  async function excluir() {
    setOcupado(true);
    try {
      await excluirMinhaConta();
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      if (erro.codigo === "sem_conexao") setSemConexao(true);
      else mostrarToast("error", erro.message);
      setOcupado(false);
      return;
    }
    mostrarToast("success", "Conta excluída.");
    await navegar({ to: "/entrar", replace: true });
  }

  if (semConexao) {
    return (
      <Sheet
        aberta={aberta}
        aoFechar={fechar}
        titulo="Sem conexão"
        acoes={
          <>
            <Button onClick={() => setSemConexao(false)}>Tentar de novo</Button>
            <Button variante="secondary" onClick={fechar}>
              Fechar
            </Button>
          </>
        }
      >
        Para excluir sua conta, conecte-se à internet. Nada foi alterado.
      </Sheet>
    );
  }

  return (
    <Sheet
      aberta={aberta}
      aoFechar={fechar}
      titulo="Excluir sua conta?"
      acoes={
        <>
          <Button onClick={fechar}>Manter minha conta</Button>
          <Button variante="secondary" disabled={ocupado} onClick={() => void excluir()}>
            Excluir conta
          </Button>
        </>
      }
    >
      Seu perfil, marcações, cargas e treinos serão apagados e você sai do app. Não dá para
      desfazer. Para voltar, será preciso criar uma conta nova.
    </Sheet>
  );
}
