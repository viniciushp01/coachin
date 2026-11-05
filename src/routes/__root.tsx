import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { SincronizadorDaFila } from "@/features/aluno/SincronizadorDaFila";
import { ToastProvider } from "@/ui";

export type ContextoRotas = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<ContextoRotas>()({
  component: () => (
    <ToastProvider>
      <SincronizadorDaFila />
      <Outlet />
    </ToastProvider>
  ),
});
