import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErroDeRota } from "./features/acesso/ErroDeRota";
import { queryClient } from "./lib/queryClient";
import { supabase } from "./lib/supabase";
import { routeTree } from "./routeTree.gen";
import "./styles/global.css";

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: ErroDeRota,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Entrou, saiu ou mudou a conta: descarta o estado guardado e refaz as guardas de rota.
// (O callback não chama o Supabase direto: o setTimeout evita travar o cliente de auth.)
supabase.auth.onAuthStateChange((evento) => {
  if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED") return;
  setTimeout(() => {
    if (evento === "SIGNED_OUT") queryClient.clear();
    else queryClient.removeQueries({ queryKey: ["sessao"] });
    void router.invalidate();
  }, 0);
});

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado.");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
