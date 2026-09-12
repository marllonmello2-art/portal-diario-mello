import { countAdmins, createAdmin, createSessionToken, sessionCookie } from "../../../../lib/portal/auth";
import { recordAudit, requestIp } from "../../../../lib/portal/audit";
import { getPortalDb } from "../../../../lib/portal/db";

export const dynamic = "force-dynamic";

/**
 * Primeiro acesso ao painel.
 *
 * Em vez de nascer com uma senha padrão no código (que vazaria junto com o
 * repositório), o portal deixa o dono criar o primeiro usuário — e a rota se
 * fecha sozinha assim que existe um admin cadastrado.
 */
export async function POST(request: Request) {
  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Banco não conectado." },
      { status: 503 },
    );
  }

  if ((await countAdmins(db)) > 0) {
    return Response.json(
      { code: "SETUP_CLOSED", error: "O painel já possui um usuário. Faça login." },
      { status: 409 },
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string; name?: string };
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < 10) {
    return Response.json({ error: "A senha precisa ter pelo menos 10 caracteres." }, { status: 400 });
  }

  // O primeiro acesso é do dono do veículo: editor-chefe e administrador.
  const roles = ["EDITOR_CHEFE", "ADMINISTRADOR"] as const;
  const user = await createAdmin(db, {
    email,
    password,
    name: body.name ?? null,
    role: "admin",
    roles: [...roles],
  });
  const token = await createSessionToken({ ...user, name: user.name, roles: [...roles] });

  await recordAudit(db, { kind: "sistema" }, {
    action: "admin.primeiro_acesso",
    entity: "admin_user",
    entityId: user.id,
    metadata: { email: user.email, papeis: roles },
    ip: requestIp(request),
  });

  return Response.json(
    { ok: true, user: { email: user.email, name: user.name, roles } },
    { status: 201, headers: { "set-cookie": sessionCookie(token) } },
  );
}
