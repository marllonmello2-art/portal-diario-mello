import { recordAudit, requestIp } from "../../../lib/portal/audit";
import { getPortalDb } from "../../../lib/portal/db";
import { subscribe } from "../../../lib/portal/newsletter";
import { checkRateLimit, tooManyRequests } from "../../../lib/portal/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Cadastro na newsletter. O disparo do e-mail fica para uma etapa futura. */
export async function POST(request: Request) {
  let payload: { email?: string; source?: string };
  try {
    payload = (await request.json()) as { email?: string; source?: string };
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Cadastro indisponível: banco não conectado." },
      { status: 503 },
    );
  }

  // Cinco inscrições por hora do mesmo endereço.
  const ip = requestIp(request) ?? "desconhecido";
  const limite = await checkRateLimit(db, `newsletter:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!limite.ok) return tooManyRequests(limite.retryAfter);

  const resultado = await subscribe(db, {
    email,
    source: payload.source ?? "site",
    ip,
  });

  await recordAudit(db, { kind: "sistema" }, {
    action: "newsletter.inscricao",
    entity: "newsletter",
    note: resultado.status,
    ip,
  });

  // A resposta é a mesma para quem já era assinante e para quem acabou de se
  // inscrever: não contamos a terceiros quem está na base.
  return Response.json({
    ok: true,
    mensagem:
      "Inscrição registrada. Você vai receber um e-mail para confirmar — o boletim só começa depois da sua confirmação.",
  });
}
