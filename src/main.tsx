import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { ErroDeRota } from "./features/acesso/ErroDeRota";
import { queryClient } from "./lib/queryClient";
import { sincronizar } from "./lib/sincronia";
import { verificarInatividade } from "./lib/sessao";
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
    if (evento === "SIGNED_IN") void sincronizar().catch(() => undefined);
    if (evento === "SIGNED_OUT") queryClient.clear();
    else queryClient.removeQueries({ queryKey: ["sessao"] });
    void router.invalidate();
  }, 0);
});

// Regra 121 (30 dias sem uso): ao voltar ao app, sessão vencida sai e cai no "Entre de novo";
// ao voltar ou sair da tela com a sessão valendo, conta como uso.
document.addEventListener("visibilitychange", () => void verificarInatividade());

// Service worker (regra 116): o app abre sem conexão. Só em produção; sem aviso de atualização.
if ("serviceWorker" in navigator && import.meta.env.PROD) registerSW({ immediate: true });

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado.");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
