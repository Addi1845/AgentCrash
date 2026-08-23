import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: { host: "127.0.0.1", port: 8080, strictPort: true },
});

