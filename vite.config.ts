/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // Precisa vir antes do plugin do React.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@db": fileURLToPath(new URL("./supabase", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Testes de componente pedem `// @vitest-environment jsdom` no topo do arquivo.
    environment: "node",
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "chave-de-teste",
    },
  },
});
