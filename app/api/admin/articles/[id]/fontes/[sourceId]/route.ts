import { normalizeStatus } from "../../../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../../../lib/portal/audit";
import { canEditArticle, forbidden } from "../../../../../../../lib/portal/permissions";
import { getArticleById } from "../../../../../../../lib/portal/queries";
import { removeSource, updateSource } from "../../../../../../../lib/portal/sources";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; sourceId: string }> };

async function permitir(request: Request, id: string) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const article = await getArticleById(guard.db, id);
  if (!article) return Response.json({ error: "Matéria não encontrada." }, { status: 404 });

  const permitido = canEditArticle(guard.actor, {
    status: normalizeStatus(article.status),
    authorUserId: article.createdByUserId,
  });
  if (!permitido.ok) return forbidden(permitido.reason);
  return guard;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, sourceId } = await params;
  const guard = await permitir(request, id);
  if (isResponse(guard)) return guard;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ok = await updateSource(guard.db, id, sourceId, {
    name: body.name as string,
    type: body.type as string,
    reference: body.reference as string | null,
    consultedAt: body.consultedAt as string | null,
    status: body.status as string,
    note: body.note as string | null,
    confidential: body.confidential === undefined ? undefined : Boolean(body.confidential),
  });
  if (!ok) return Response.json({ error: "Fonte não encontrada." }, { status: 404 });

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "fonte.update",
    entity: "article",
    entityId: id,
    metadata: { fonte: sourceId, status: body.status ?? null },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id, sourceId } = await params;
  const guard = await permitir(request, id);
  if (isResponse(guard)) return guard;

  await removeSource(guard.db, id, sourceId);

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "fonte.delete",
    entity: "article",
    entityId: id,
    metadata: { fonte: sourceId },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
