import { createFileRoute } from "@tanstack/react-router";

// Provisório até o roteamento por papel (Fase 0, item 5).
export const Route = createFileRoute("/")({
  component: () => (
    <main className="mx-auto flex min-h-dvh max-w-screen flex-col justify-center gap-8 px-screen-margin">
      <h1 className="text-display">Coach In</h1>
      <p className="text-body text-text-secondary">Em construção.</p>
    </main>
  ),
});
