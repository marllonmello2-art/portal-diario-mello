import { adminUserRoles, adminUsers } from "../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../lib/portal/audit";
import { createAdmin, findAdminByEmail } from "../../../../lib/portal/auth";
import { isRole, type Role } from "../../../../lib/portal/permissions";

export const dynamic = "force-dynamic";

/** GET: pessoas do painel e seus papéis. Só administrador enxerga. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request, "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const usuarios = await guard.db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .orderBy(adminUsers.email);

  const papeis = await guard.db
    .select({ userId: adminUserRoles.userId, role: adminUserRoles.role })
    .from(adminUserRoles);

  return Response.json({
    pessoas: usuarios.map((usuario) => ({
      ...usuario,
      roles: papeis.filter((papel) => papel.userId === usuario.id).map((papel) => papel.role),
    })),
  });
}

/** POST: cria uma pessoa do painel com os papéis informados. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request, "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    password?: string;
    roles?: string[];
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const roles = (body.roles ?? []).filter(isRole) as Role[];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < 10) {
    return Response.json({ error: "A senha precisa ter pelo menos 10 caracteres." }, { status: 400 });
  }
  if (!roles.length) {
    return Response.json({ error: "Escolha pelo menos um perfil." }, { status: 400 });
  }
  if (await findAdminByEmail(guard.db, email)) {
    return Response.json({ error: "Já existe uma pessoa com este e-mail." }, { status: 409 });
  }

  const user = await createAdmin(guard.db, { email, password, name: body.name ?? null, roles });

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "pessoa.create",
    entity: "admin_user",
    entityId: user.id,
    metadata: { email, papeis: roles },
    ip: guard.ip,
  });

  return Response.json({ ok: true, pessoa: { id: user.id, email, name: user.name, roles } }, { status: 201 });
}
