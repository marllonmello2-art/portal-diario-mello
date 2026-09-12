import { eq } from "drizzle-orm";
import { articles, categories } from "../../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../lib/portal/audit";
import { slugify } from "../../../../../lib/portal/slug";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  const db = guard.db;

  const { id } = await params;
  const body = (await request.json()) as { name?: string; slug?: string; color?: string; position?: number };
  const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!current) return Response.json({ error: "Editoria não encontrada." }, { status: 404 });

  await db
    .update(categories)
    .set({
      name: body.name?.trim() || current.name,
      slug: body.slug ? slugify(body.slug) : current.slug,
      color: body.color?.trim() || current.color,
      position: body.position === undefined ? current.position : Number(body.position) || 0,
    })
    .where(eq(categories.id, id));

  return Response.json({ ok: true });
}

/** Remove a editoria e desvincula as matérias (elas viram "sem editoria"). */
export async function DELETE(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  const db = guard.db;

  const { id } = await params;
  await db.update(articles).set({ categoryId: null }).where(eq(articles.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));

  await recordAudit(db, guard.actor.auditActor, {
    action: "category.delete",
    entity: "category",
    entityId: id,
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
