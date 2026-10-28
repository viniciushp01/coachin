import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { ToastProvider } from "@/ui";

export type ContextoRotas = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<ContextoRotas>()({
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
});
