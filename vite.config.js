import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Check if running in a Shopify context
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET)
) {
  console.warn(
    "\n⚠️  Warning: SHOPIFY_API_KEY and/or SHOPIFY_API_SECRET env variables not set. " +
      "Running in development mode without Shopify authentication.\n"
  );
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    allowedHosts: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 64999,
    },
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});
