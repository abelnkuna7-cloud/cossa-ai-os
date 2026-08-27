// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // VERCEL_ENV is server-side build metadata. Expose only this non-secret
    // environment label so preview deployments can never masquerade as production.
    define: {
      "import.meta.env.VITE_DEPLOYMENT_ENV": JSON.stringify(process.env.VERCEL_ENV ?? ""),
    },
  },
  // Production is deployed through Vercel. Without an explicit preset this
  // Lovable/TanStack configuration defaults to a Cloudflare Worker build.
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
