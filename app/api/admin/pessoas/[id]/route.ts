import { eq } from "drizzle-orm";
import { adminUserRoles, adminUsers } from "../../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../lib/portal/audit";
import { hashPassword, setUserRoles } from "../../../../../lib/portal/auth";
import { isRole, type Role } from "../../../../../lib/portal/permissions";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const [pessoa] = await guard.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!pessoa) return Response.json({ error: "Pessoa não encontrada." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string | null;
    password?: string;
    roles?: string[];
  };

  const mudancas: Record<string, unknown> = {};
  if (body.name !== undefined) mudancas.name = body.name?.trim() || null;

  if (body.password) {
    if (body.password.length < 10) {
      return Response.json({ error: "A senha precisa ter pelo menos 10 caracteres." }, { status: 400 });
    }
    mudancas.passwordHash = await hashPassword(body.password);
  }

  if (Object.keys(mudancas).length) {
    await guard.db.update(adminUsers).set(mudancas).where(eq(adminUsers.id, id));
  }

  if (body.roles) {
    const roles = body.roles.filter(isRole) as Role[];
    if (!roles.length) {
      return Response.json({ error: "Escolha pelo menos um perfil." }, { status: 400 });
    }

    // Trava contra auto-bloqueio: o portal não pode ficar sem editor-chefe
    // nem sem administrador porque alguém se rebaixou.
    for (const essencial of ["EDITOR_CHEFE", "ADMINISTRADOR"] as Role[]) {
      const tinha = await guard.db
        .select({ userId: adminUserRoles.userId })
        .from(adminUserRoles)
        .where(eq(adminUserRoles.role, essencial));
      const outros = tinha.filter((linha) => linha.userId !== id);
      if (tinha.some((linha) => linha.userId === id) && !roles.includes(essencial) && !outros.length) {
        return Response.json(
          { error: `Esta é a única pessoa com o perfil ${essencial}. Dê o perfil a outra antes de tirar.` },
          { status: 409 },
        );
      }
    }

    await setUserRoles(guard.db, id, roles);
  }

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "pessoa.update",
    entity: "admin_user",
    entityId: id,
    metadata: {
      email: pessoa.email,
      papeis: body.roles ?? null,
      senhaTrocada: Boolean(body.password),
    },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const { id } = await params;
  if (id === guard.session.sub) {
    return Response.json({ error: "Você não pode remover a própria conta." }, { status: 409 });
  }

  const [pessoa] = await guard.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!pessoa) return Response.json({ error: "Pessoa não encontrada." }, { status: 404 });

  await guard.db.delete(adminUserRoles).where(eq(adminUserRoles.userId, id));
  await guard.db.delete(adminUsers).where(eq(adminUsers.id, id));

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "pessoa.delete",
    entity: "admin_user",
    entityId: id,
    metadata: { email: pessoa.email },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
