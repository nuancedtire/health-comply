import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const inspectorPort = process.env.CLOUDFLARE_INSPECTOR_PORT === "false"
  ? false
  : undefined;
const remoteBindings = process.env.CLOUDFLARE_REMOTE_BINDINGS === "false"
  ? false
  : undefined;

const config = defineConfig({
  server: {
    allowedHosts: ["test.fazeen.dev"],
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      start: { entry: "./start.tsx" },
      server: { entry: "./server.ts" },
    }),
    viteReact(),
    cloudflare({
      inspectorPort,
      remoteBindings,
      viteEnvironment: {
        name: "ssr",
      },
    }),
  ],
});

export default config;
