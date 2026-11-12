import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ErroApp } from "@/lib/erros";
import { Button, Sheet, TextButton, useToast } from "@/ui";
import { cancelarPedido, pedirNovoTreino, type EstadoDoPedido } from "./pedido";

type Acao = "pedir" | "cancelar";

/** Erros que só dizem que a tela estava desatualizada: basta reler (o banco já está certo). */
const RELER = new Set(["request_already_open", "no_open_request"]);

/**
 * "Solicitar novo treino" na home e na tela "sem treino" (regras 40, 52, 103 e 116; Figma "Aluno ·
 * Entrada", seção 7, e "Home · 9 Solicitar treino sem conexão"). Pedir e cancelar exigem conexão:
 * sem ela, abre a folha "Sem conexão" e nada muda.
 */
export function SolicitarTreino({ pedido }: { pedido: EstadoDoPedido }) {
  const router = useRouter();
  const mostrarToast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [semConexao, setSemConexao] = useState<Acao | null>(null);

  async function executar(acao: Acao) {
    setOcupado(true);
    setSemConexao(null);
    try {
      await (acao === "pedir" ? pedirNovoTreino() : cancelarPedido());
      await router.invalidate();
      if (acao === "cancelar") mostrarToast("success", "Solicitação cancelada.");
    } catch (erro) {
      if (erro instanceof ErroApp && erro.codigo === "sem_conexao") {
        setSemConexao(acao);
      } else if (erro instanceof ErroApp && RELER.has(erro.codigo)) {
        await router.invalidate();
      } else {
        // Ex.: o professor agiu entre a leitura e o toque (professor_already_acted).
        mostrarToast("error", erro instanceof ErroApp ? erro.message : "Não foi possível enviar.");
        await router.invalidate();
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {pedido === "nenhum" ? (
        <Button variante="secondary" disabled={ocupado} onClick={() => void executar("pedir")}>
          Solicitar novo treino
        </Button>
      ) : (
        <Button disabled>Solicitação enviada</Button>
      )}
      {pedido === "aberto" && (
        <TextButton disabled={ocupado} onClick={() => setConfirmando(true)}>
          Cancelar solicitação
        </TextButton>
      )}

      <Sheet
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo="Cancelar solicitação?"
        acoes={
          <>
            <Button onClick={() => setConfirmando(false)}>Manter solicitação</Button>
            <Button
              variante="secondary"
              disabled={ocupado}
              onClick={() => {
                setConfirmando(false);
                void executar("cancelar");
              }}
            >
              Cancelar solicitação
            </Button>
          </>
        }
      >
        O professor deixa de ver o seu pedido de novo treino. Você pode pedir de novo quando quiser.
      </Sheet>

      <Sheet
        aberta={semConexao !== null}
        aoFechar={() => setSemConexao(null)}
        titulo="Sem conexão"
        acoes={
          <>
            <Button disabled={ocupado} onClick={() => semConexao && void executar(semConexao)}>
              Tentar de novo
            </Button>
            <Button variante="secondary" onClick={() => setSemConexao(null)}>
              Fechar
            </Button>
          </>
        }
      >
        Para pedir um novo treino, conecte-se à internet. Seu treino continua disponível para
        leitura.
      </Sheet>
    </div>
  );
}
