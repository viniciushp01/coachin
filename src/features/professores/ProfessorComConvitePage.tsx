import { AlunoComConvitePage } from "@/features/alunos/AlunoComConvitePage";
import type { ConviteDoAluno } from "@/features/alunos/conviteDoAluno";

export type ProfessorComConvite = {
  professor: { nome: string; email: string };
  convite: ConviteDoAluno;
};

/**
 * Convite de professor pendente, expirado ou recusado, na visão do administrador (regras 92, 93,
 * 102 e 142; Figma "Admin · Professores", seções 1 e 3). É a mesma tela do aluno com convite,
 * com os textos do professor e a volta para a lista de professores.
 */
export function ProfessorComConvitePage({
  professor,
  convite,
  agora,
}: ProfessorComConvite & { agora?: Date }) {
  return (
    <AlunoComConvitePage
      papel="professor"
      aluno={{ id: convite.id, ...professor }}
      convite={convite}
      agora={agora}
    />
  );
}
