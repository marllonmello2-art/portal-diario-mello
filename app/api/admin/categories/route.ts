import { categories } from "../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../lib/portal/audit";
import { listCategories } from "../../../../lib/portal/queries";
import { slugify } from "../../../../lib/portal/slug";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;
  return Response.json({ categories: await listCategories(guard.db) });
}

/** Cria uma editoria (nome, slug e cor da tag). */
export async function POST(request: Request) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  const db = guard.db;

  const body = (await request.json()) as { name?: string; slug?: string; color?: string; position?: number };
  const name = (body.name ?? "").trim();
  if (!name) return Response.json({ error: "Informe o nome da editoria." }, { status: 400 });

  const category = {
    id: crypto.randomUUID(),
    name,
    slug: slugify(body.slug?.trim() || name),
    color: (body.color ?? "#c8102e").trim(),
    position: Number(body.position) || 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await db.insert(categories).values(category);
  } catch {
    return Response.json({ error: "Já existe uma editoria com esse endereço (slug)." }, { status: 409 });
  }
  await recordAudit(db, guard.actor.auditActor, {
    action: "category.create",
    entity: "category",
    entityId: category.id,
    metadata: { nome: category.name },
    ip: guard.ip,
  });

  return Response.json({ ok: true, category }, { status: 201 });
}
