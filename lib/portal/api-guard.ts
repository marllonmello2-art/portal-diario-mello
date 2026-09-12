/**
 * Porteiro das rotas do painel.
 *
 * Cada rota começa chamando `guardAdmin`: sem sessão válida não se passa, e
 * sem o papel exigido também não. A interface esconde botões por conveniência;
 * a recusa que vale é esta, no servidor.
 */
import { sessionFromRequest, unauthorized, type AdminSession } from "./auth";
import { requestIp, type AuditActor } from "./audit";
import { getPortalDb, type PortalDb } from "./db";
import { forbidden, hasRole, type Actor, type Role } from "./permissions";

export type Guarded = {
  session: AdminSession;
  db: PortalDb;
  /** O mesmo ator no formato que a máquina de estados espera. */
  actor: Actor & { auditActor: AuditActor };
  ip: string | null;
};

export async function guardAdmin(
  request: Request,
  ...roles: Role[]
): Promise<Guarded | Response> {
  const session = await sessionFromRequest(request);
  if (!session) return unauthorized();

  if (roles.length && !hasRole(session, ...roles)) {
    return forbidden("Seu perfil não tem permissão para esta ação.");
  }

  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Banco não conectado." },
      { status: 503 },
    );
  }

  return {
    session,
    db,
    actor: {
      id: session.sub,
      roles: session.roles,
      auditActor: { kind: "usuario", id: session.sub, label: session.name || session.email },
    },
    ip: requestIp(request),
  };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
