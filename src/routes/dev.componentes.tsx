import { createFileRoute, notFound } from "@tanstack/react-router";
import { ComponentesPage } from "@/features/dev/ComponentesPage";

// Catálogo dos componentes base. Só no ambiente local e no preview (VITE_MOSTRAR_DEV=true na
// Vercel, ambiente Preview); em produção a rota não existe.
export const Route = createFileRoute("/dev/componentes")({
  beforeLoad: () => {
    if (!import.meta.env.DEV && import.meta.env.VITE_MOSTRAR_DEV !== "true") throw notFound();
  },
  component: ComponentesPage,
});
