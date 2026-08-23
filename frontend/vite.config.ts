import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const isVercel = process.env["VERCEL"] === "1";

export default defineConfig({
  plugins: [
    tanstackStart({
      target: isVercel ? "vercel" : "node-server",
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: { tsconfigPaths: true },
  server: { host: "127.0.0.1", port: 8080, strictPort: true },
});
