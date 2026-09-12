import { recordAudit, requestIp } from "../../../lib/portal/audit";
import { createRequest, isRequestKind } from "../../../lib/portal/corrections";
import { getPortalDb } from "../../../lib/portal/db";
import { checkRateLimit, tooManyRequests } from "../../../lib/portal/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Pedido público de correção ou de direito de resposta.
 *
 * Devolve um protocolo para o solicitante acompanhar. O pedido cai na fila do
 * painel — nada é aplicado automaticamente ao texto publicado.
 */
export async function POST(request: Request) {
  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Formulário indisponível no momento." },
      { status: 503 },
    );
  }

  const ip = requestIp(request) ?? "desconhecido";

  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const kind = isRequestKind(body.kind ?? "") ? body.kind : "correcao";
  const requesterName = (body.requesterName ?? "").trim();
  const requesterEmail = (body.requesterEmail ?? "").trim();
  const claim = (body.claim ?? "").trim();

  if (requesterName.length < 3) {
    return Response.json({ error: "Informe seu nome completo." }, { status: 400 });
  }
  if (!EMAIL.test(requesterEmail)) {
    return Response.json({ error: "Informe um e-mail válido para receber a resposta." }, { status: 400 });
  }
  if (claim.length < 30) {
    return Response.json(
      { error: "Descreva com mais detalhe o que está incorreto (pelo menos 30 caracteres)." },
      { status: 400 },
    );
  }

  // O limite conta pedidos aceitos, não tentativas: quem erra a digitação do
  // formulário não perde a cota da hora.
  const limite = await checkRateLimit(db, `correcao:${ip}`, { limit: 3, windowSeconds: 3600 });
  if (!limite.ok) {
    return tooManyRequests(
      limite.retryAfter,
      "Recebemos vários pedidos deste endereço na última hora. Se for urgente, escreva para a redação.",
    );
  }

  const pedido = await createRequest(db, {
    kind: kind as "correcao" | "direito_resposta",
    articleUrl: body.articleUrl ?? null,
    requesterName,
    requesterEmail,
    requesterRole: body.requesterRole ?? null,
    claim,
    evidence: body.evidence ?? null,
    ip,
  });

  await recordAudit(db, { kind: "sistema" }, {
    action: "pedido.recebido",
    entity: "correction_request",
    entityId: pedido.id,
    metadata: { protocolo: pedido.protocol, tipo: pedido.kind },
    ip,
  });

  return Response.json(
    {
      ok: true,
      protocolo: pedido.protocol,
      mensagem:
        "Pedido recebido. Guarde o protocolo: a redação responde pelo e-mail informado.",
    },
    { status: 201 },
  );
}
