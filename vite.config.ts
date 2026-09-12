import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Desenvolvimento local do Diário Mello.
 *
 * Os bindings abaixo são simulados pelo Miniflare: um D1 e um R2 locais, que
 * vivem em `.wrangler/` dentro do projeto. Os recursos de produção são criados
 * e conectados por `scripts/publish-portal.sh` na hora de publicar.
 */
const localBindings = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [
    {
      binding: "DB",
      database_name: "diario-mello-local",
      database_id: "00000000-0000-4000-8000-000000000000",
    },
  ],
  r2_buckets: [{ binding: "BUCKET", bucket_name: "diario-mello-local" }],
};

export default defineConfig(async () => {
  // Mantém os arquivos de estado do Wrangler dentro do projeto.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: { host: "0.0.0.0" },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindings,
      }),
    ],
  };
});
