import { transitionArticle } from "../../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../../lib/portal/audit";
import { addCorrection, listCorrections, updateRequest } from "../../../../../../lib/portal/corrections";
import { forbidden, hasRole } from "../../../../../../lib/portal/permissions";
import { getArticleById } from "../../../../../../lib/portal/queries";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  return Response.json({ correcoes: await listCorrections(guard.db, id) });
}

/**
 * Registra uma correção numa matéria publicada.
 *
 * A nota aparece no pé do texto, com data e hora, e a matéria passa ao estado
 * CORRIGIDA — nunca se altera fato publicado em silêncio.
 */
export async function POST(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;
  if (!hasRole(guard.actor, "EDITOR_CHEFE")) {
    return forbidden("Registrar correção em matéria publicada é do editor-chefe.");
  }

  const { id } = await params;
  const article = await getArticleById(guard.db, id);
  if (!article) return Response.json({ error: "Matéria não encontrada." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    description?: string;
    requestId?: string;
  };
  const description = (body.description ?? "").trim();
  if (description.length < 10) {
    return Response.json(
      { error: "Descreva objetivamente o que foi corrigido (pelo menos 10 caracteres)." },
      { status: 400 },
    );
  }

  const correcao = await addCorrection(guard.db, {
    articleId: id,
    description,
    correctedByUserId: guard.session.sub,
    requestId: body.requestId ?? null,
  });

  // A matéria precisa estar no ar para ser corrigida; a transição registra
  // quem corrigiu e quando.
  if (article.status === "PUBLICADA") {
    const resultado = await transitionArticle(guard.db, guard.actor, id, "CORRIGIDA", {
      note: description,
      ip: guard.ip,
    });
    if (!resultado.ok) return forbidden(resultado.reason);
  } else {
    await recordAudit(guard.db, guard.actor.auditActor, {
      action: "correcao.registrada",
      entity: "article",
      entityId: id,
      note: description,
      ip: guard.ip,
    });
  }

  if (body.requestId) {
    await updateRequest(guard.db, body.requestId, { status: "corrigido" }, guard.session.sub);
  }

  return Response.json({ ok: true, correcao }, { status: 201 });
}
