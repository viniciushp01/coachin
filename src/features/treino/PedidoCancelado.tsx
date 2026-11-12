import { linkDoWhatsApp } from "@/features/acompanhar/logica";
import { primeiroNome } from "@/lib/listas";
import { Notice } from "@/ui";

/** Topo da etapa de fichas (Figma "Criar treino · 15 Fichas · pedido cancelado"). */
export function AvisoPedidoCancelado({
  nome,
  telefone,
}: {
  nome: string;
  telefone: string | null;
}) {
  return (
    <Notice tom="neutral" titulo={`${primeiroNome(nome)} cancelou o pedido`}>
      <p>Você pode terminar e salvar este treino mesmo assim.</p>
      {telefone && (
        <a
          href={linkDoWhatsApp(telefone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-48 items-center py-12 text-link"
        >
          Falar com o aluno no WhatsApp
        </a>
      )}
    </Notice>
  );
}
