import { createArticle } from "../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../lib/portal/audit";
import { canCreateArticle, forbidden, hasRole } from "../../../../lib/portal/permissions";
import { adminListArticles } from "../../../../lib/portal/queries";

export const dynamic = "force-dynamic";

/** GET: lista do painel. O AUTOR enxerga apenas as próprias matérias. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const params = new URL(request.url).searchParams;
  const somenteDele = !hasRole(guard.actor, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");

  const articles = await adminListArticles(guard.db, {
    status: params.get("status") ?? undefined,
    categoryId: params.get("category") ?? undefined,
    search: params.get("q") ?? undefined,
    onlyAuthorUserId: somenteDele ? guard.session.sub : undefined,
  });
  return Response.json({ articles });
}

/** POST: cria a matéria em RASCUNHO, com dono registrado. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;
  if (!canCreateArticle(guard.actor)) {
    return forbidden("Somente a redação cria matérias.");
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) {
    return Response.json({ error: "Título e texto são obrigatórios." }, { status: 400 });
  }

  const article = await createArticle(guard.db, {
    title,
    content,
    subtitle: (body.subtitle as string) ?? null,
    categoryId: (body.categoryId as string) ?? null,
    authorId: (body.authorId as string) ?? null,
    coverImageUrl: (body.coverImageUrl as string) ?? null,
    coverCredit: (body.coverCredit as string) ?? null,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
    accessLevel: (body.accessLevel as string) ?? "public",
    featured: Boolean(body.featured),
    createdByUserId: guard.session.sub,
    origin: "painel",
    aiAssisted: Boolean(body.aiAssisted),
  });

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "article.create",
    entity: "article",
    entityId: article?.id,
    toStatus: article?.status,
    metadata: { titulo: title },
    ip: guard.ip,
  });

  return Response.json({ ok: true, article }, { status: 201 });
}
