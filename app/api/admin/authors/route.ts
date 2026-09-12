import { authors } from "../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../lib/portal/audit";
import { listAuthors } from "../../../../lib/portal/queries";
import { slugify } from "../../../../lib/portal/slug";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;
  return Response.json({ authors: await listAuthors(guard.db) });
}

export async function POST(request: Request) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  const db = guard.db;

  const body = (await request.json()) as {
    name?: string;
    bio?: string;
    email?: string;
    avatarUrl?: string;
  };
  const name = (body.name ?? "").trim();
  if (!name) return Response.json({ error: "Informe o nome do autor." }, { status: 400 });

  const author = {
    id: crypto.randomUUID(),
    name,
    slug: slugify(name),
    bio: body.bio?.trim() || null,
    email: body.email?.trim() || null,
    avatarUrl: body.avatarUrl?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  try {
    await db.insert(authors).values(author);
  } catch {
    return Response.json({ error: "Já existe um autor com esse nome." }, { status: 409 });
  }
  await recordAudit(db, guard.actor.auditActor, {
    action: "author.create",
    entity: "author",
    entityId: author.id,
    metadata: { nome: author.name },
    ip: guard.ip,
  });

  return Response.json({ ok: true, author }, { status: 201 });
}
