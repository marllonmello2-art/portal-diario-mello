/**
 * Qual é o endereço público do portal, agora.
 *
 * Isto parece detalhe e não é: o `<link rel="canonical">` diz ao Google qual
 * é o endereço de verdade de cada página. Enquanto o valor vinha fixo do
 * código, todas as páginas servidas em workers.dev apontavam como canônico um
 * domínio que ainda não existe — e o Google, obediente, não indexava nada.
 *
 * A ordem é: o que estiver em PORTAL_SITE_URL (para quando o domínio próprio
 * entrar e tiver que vencer), senão o host da própria requisição, senão o
 * fallback do código.
 */
import { headers } from "next/headers";
import { SITE_URL_FALLBACK } from "./brand";

async function envVar(name: string): Promise<string | null> {
  try {
    const runtime = (await import("cloudflare:workers")) as {
      env: Record<string, string | undefined>;
    };
    const value = runtime.env?.[name];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    const value = typeof process !== "undefined" ? process.env?.[name] : undefined;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
}

export async function siteUrl(): Promise<string> {
  const configurado = await envVar("PORTAL_SITE_URL");
  if (configurado) return configurado.replace(/\/+$/, "");

  try {
    const host = (await headers()).get("host");
    if (host) return `https://${host.replace(/\/+$/, "")}`;
  } catch {
    // Fora de uma requisição (build, script): cai no fallback.
  }

  return SITE_URL_FALLBACK;
}
