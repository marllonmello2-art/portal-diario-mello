import { eq } from "drizzle-orm";
import { articles, authors } from "../../../../../db/schema";
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
  const body = (await request.json()) as {
    name?: string;
    bio?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  const [current] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
  if (!current) return Response.json({ error: "Autor não encontrado." }, { status: 404 });

  await db
    .update(authors)
    .set({
      name: body.name?.trim() || current.name,
      slug: body.name ? slugify(body.name) : current.slug,
      bio: body.bio === undefined ? current.bio : body.bio?.trim() || null,
      email: body.email === undefined ? current.email : body.email?.trim() || null,
      avatarUrl: body.avatarUrl === undefined ? current.avatarUrl : body.avatarUrl?.trim() || null,
    })
    .where(eq(authors.id, id));

  return Response.json({ ok: true });
}

/** Remove o autor; as matérias dele ficam sem assinatura. */
export async function DELETE(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  const db = guard.db;

  const { id } = await params;
  await db.update(articles).set({ authorId: null }).where(eq(articles.authorId, id));
  await db.delete(authors).where(eq(authors.id, id));

  await recordAudit(db, guard.actor.auditActor, {
    action: "author.delete",
    entity: "author",
    entityId: id,
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
