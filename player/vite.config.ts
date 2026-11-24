import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { moduleRecoveryBootstrap } from '../src/lib/module-recovery';

// Separate static entry for the native wrapper: no admin pages or SSR server are bundled.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react(), tailwind(), {
    name: 'screenflow-player-startup-recovery',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [{ tag: 'script', children: moduleRecoveryBootstrap, injectTo: 'head-prepend' }],
    },
  }],
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  build: { outDir: "../dist-player", emptyOutDir: true },
});