/**
 * Trilha de auditoria.
 *
 * Grava o que aconteceu, quem fez e quando. As linhas nunca são alteradas nem
 * apagadas: é o registro que sustenta a governança editorial — sem ele, "quem
 * aprovou isso?" vira discussão de memória.
 *
 * Uma falha ao auditar nunca derruba a operação em si; ela é registrada no
 * log do Worker para não passar despercebida.
 */
import { desc, eq, and } from "drizzle-orm";
import { auditLog } from "../../db/schema";
import type { PortalDb } from "./db";

export type AuditActor = {
  kind: "usuario" | "integracao" | "sistema" | "leitor";
  id?: string | null;
  label?: string | null;
};

export type AuditEvent = {
  action: string;
  entity?: string;
  entityId?: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function recordAudit(
  db: PortalDb,
  actor: AuditActor,
  event: AuditEvent,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actorKind: actor.kind,
      actorId: actor.id ?? null,
      actorLabel: actor.label ?? null,
      action: event.action,
      entity: event.entity ?? null,
      entityId: event.entityId ?? null,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      note: event.note ?? null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      ip: event.ip ?? null,
    });
  } catch (error) {
    console.error("[auditoria] não foi possível registrar", event.action, error);
  }
}

/** IP de quem chamou, para registrar tentativa de login e publicação. */
export function requestIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export type AuditRow = typeof auditLog.$inferSelect;

/** Últimos eventos, para a tela de auditoria e o histórico da matéria. */
export async function listAudit(
  db: PortalDb,
  filters: { entity?: string; entityId?: string; limit?: number } = {},
): Promise<AuditRow[]> {
  const conditions = [];
  if (filters.entity) conditions.push(eq(auditLog.entity, filters.entity));
  if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));

  const base = db.select().from(auditLog);
  const query = conditions.length ? base.where(and(...conditions)) : base;
  return query.orderBy(desc(auditLog.at)).limit(filters.limit ?? 100);
}
