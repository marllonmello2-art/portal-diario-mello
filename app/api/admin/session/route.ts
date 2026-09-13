import { adminUsers } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import {
  clearedSessionCookie,
  createSessionToken,
  findAdminByEmail,
  hashPassword,
  rolesOfUser,
  sessionCookie,
  sessionFromRequest,
  verifyPassword,
} from "../../../../lib/portal/auth";
import { recordAudit, requestIp } from "../../../../lib/portal/audit";
import { getPortalDb } from "../../../../lib/portal/db";
import { checkRateLimit, tooManyRequests } from "../../../../lib/portal/rate-limit";

export const dynamic = "force-dynamic";

/** GET: quem está logado (usado pelo painel para checar a sessão). */
export async function GET(request: Request) {
  const session = await sessionFromRequest(request);
  return Response.json({ session });
}

/** POST: login com e-mail e senha. */
export async function POST(request: Request) {
  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Banco não conectado." },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  // Força bruta: duas travas independentes. Uma por endereço, para o script
  // que varre senhas; outra por e-mail, para quem mira numa conta específica
  // trocando de endereço.
  const ip = requestIp(request) ?? "desconhecido";
  for (const [chave, limite] of [
    [`login-ip:${ip}`, { limit: 12, windowSeconds: 900 }],
    [`login-conta:${email}`, { limit: 6, windowSeconds: 900 }],
  ] as const) {
    const resultado = await checkRateLimit(db, chave, limite);
    if (!resultado.ok) {
      await recordAudit(db, { kind: "sistema" }, {
        action: "login.bloqueado",
        entity: "admin_user",
        note: chave.startsWith("login-ip") ? "excesso por endereço" : "excesso por conta",
        metadata: { email },
        ip,
      });
      return tooManyRequests(
        resultado.retryAfter,
        "Muitas tentativas de acesso. Espere alguns minutos antes de tentar de novo.",
      );
    }
  }

  const user = await findAdminByEmail(db, email);
  // Mensagem genérica de propósito: não revelamos se o e-mail existe.
  const invalid = Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

  if (!user) {
    // Gasta o mesmo tempo de um login real. Sem isso, uma resposta instantânea
    // entregaria quais e-mails estão cadastrados.
    await hashPassword(password);
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(adminUsers.id, user.id));

  const roles = await rolesOfUser(db, user.id);
  const token = await createSessionToken({ ...user, roles });

  await recordAudit(db, { kind: "usuario", id: user.id, label: user.name || user.email }, {
    action: "login.sucesso",
    entity: "admin_user",
    entityId: user.id,
    metadata: { papeis: roles },
    ip,
  });

  return Response.json(
    { ok: true, user: { email: user.email, name: user.name, roles } },
    { headers: { "set-cookie": sessionCookie(token) } },
  );
}

/** DELETE: logout. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearedSessionCookie() } });
}
