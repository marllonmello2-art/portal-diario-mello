/**
 * Limite de tentativas para formulários públicos e para o login.
 *
 * Guarda um contador por chave e janela de tempo no próprio D1 — sem serviço
 * externo. Não é proteção contra ataque distribuído; é o que impede que uma
 * pessoa, ou um script simples, encha o banco de pedidos ou fique testando
 * senhas à vontade.
 */
import { eq } from "drizzle-orm";
import { rateLimits } from "../../db/schema";
import type { PortalDb } from "./db";

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfter: number };

export async function checkRateLimit(
  db: PortalDb,
  key: string,
  options: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const agora = Date.now();
  const [linha] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);

  const inicio = linha ? new Date(linha.windowStart).getTime() : 0;
  const dentroDaJanela = linha && agora - inicio < options.windowSeconds * 1000;

  if (!dentroDaJanela) {
    // Janela nova: zera o contador.
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: new Date(agora).toISOString() })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, windowStart: new Date(agora).toISOString() },
      });
    return { ok: true, remaining: options.limit - 1 };
  }

  if (linha.count >= options.limit) {
    const retryAfter = Math.ceil((inicio + options.windowSeconds * 1000 - agora) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }

  await db
    .update(rateLimits)
    .set({ count: linha.count + 1 })
    .where(eq(rateLimits.key, key));
  return { ok: true, remaining: options.limit - linha.count - 1 };
}

/** Resposta padrão de "devagar aí", com o cabeçalho que os clientes entendem. */
export function tooManyRequests(retryAfter: number, mensagem?: string) {
  return Response.json(
    {
      code: "RATE_LIMITED",
      error:
        mensagem ??
        `Muitas tentativas seguidas. Tente de novo em ${Math.ceil(retryAfter / 60)} minuto(s).`,
    },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
