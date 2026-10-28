// Página provisória da Fase 0: mostra os tokens para conferir com o Style guide do Figma.
// Vai para a rota /dev/componentes quando o roteador entrar (Fase 0, item 3).

const cores = [
  "bg-canvas",
  "bg-surface",
  "bg-surface-raised",
  "bg-scrim",
  "bg-brand",
  "bg-brand-subtle",
  "bg-success-subtle",
  "bg-info-subtle",
  "bg-neutral-subtle",
  "bg-warning-subtle",
  "border-subtle",
  "border-default",
  "border-strong",
  "border-brand",
  "border-danger",
  "text-primary",
  "text-secondary",
  "text-disabled",
  "text-on-brand",
  "text-brand",
  "text-brand-soft",
  "status-success",
  "status-warning",
  "status-info",
  "status-danger",
];

const textos = [
  ["text-display", "Olá, Vinicius"],
  ["text-title-lg", "Ficha C"],
  ["text-title-screen", "Meus alunos"],
  ["text-title-md", "Sair do app?"],
  ["text-title-sm", "Sem treino por enquanto"],
  ["text-title-card", "Hipertrofia · Fase 2"],
  ["text-number-display", "12"],
  ["text-number-xl", "40 kg"],
  ["text-number-lg", "31"],
  ["text-number-md", "8"],
  ["text-body", "Você ainda não tem um treino ativo."],
  ["text-body-medium", "Pernas e glúteos"],
  ["text-body-strong", "Ver ficha"],
  ["text-body-bold", "Supino reto"],
  ["text-caption", "Início 05/10"],
  ["text-label", "Frequência"],
  ["text-label-strong", "Semana 4 de 8"],
  ["text-label-bold", "FICHA DE HOJE"],
  ["text-overline", "Outras fichas"],
  ["text-link", "Esqueci a senha"],
  ["text-nav-label", "Início"],
] as const;

const raios = ["inset", "control", "tile", "card", "sheet", "pill"] as const;

export function App() {
  return (
    <main className="mx-auto flex max-w-screen flex-col gap-32 px-screen-margin py-40">
      <header className="flex flex-col gap-8">
        <p className="text-overline text-text-secondary">Fase 0 · item 2</p>
        <h1 className="text-title-screen">Tokens do Coach In</h1>
      </header>

      <section className="flex flex-col gap-12">
        <h2 className="text-overline text-text-secondary">Cores</h2>
        <ul className="grid grid-cols-2 gap-8">
          {cores.map((nome) => (
            <li key={nome} className="flex items-center gap-12 rounded-tile bg-bg-surface p-12">
              <span
                className="size-32 shrink-0 rounded-inset border border-border-subtle"
                style={{ background: `var(--color-${nome})` }}
              />
              <span className="truncate text-caption text-text-secondary">{nome}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-12">
        <h2 className="text-overline text-text-secondary">Texto</h2>
        <ul className="flex flex-col gap-16">
          {textos.map(([classe, exemplo]) => (
            <li key={classe} className="flex flex-col gap-4">
              <span className="text-caption text-text-secondary">{classe}</span>
              <span className={classe}>{exemplo}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-12">
        <h2 className="text-overline text-text-secondary">Raios, sombras e gradiente</h2>
        <ul className="grid grid-cols-3 gap-8">
          {raios.map((r) => (
            <li
              key={r}
              className="flex h-48 items-center justify-center bg-bg-surface-raised text-caption"
              style={{ borderRadius: `var(--radius-${r})` }}
            >
              {r}
            </li>
          ))}
        </ul>
        <div className="rounded-control bg-bg-surface p-16 text-body shadow-raised">
          shadow-raised
        </div>
        <div className="h-8 overflow-hidden rounded-pill bg-bg-surface-raised">
          <div className="h-full w-1/2 bg-brand-progress" />
        </div>
      </section>
    </main>
  );
}
