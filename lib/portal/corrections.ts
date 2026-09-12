/**
 * Pedidos de correção e direito de resposta, e as correções publicadas.
 */
import { and, desc, eq } from "drizzle-orm";
import { articleCorrections, correctionRequests } from "../../db/schema";
import type { PortalDb } from "./db";
import {
  generateProtocol,
  isRequestKind,
  isRequestStatus,
  REQUEST_KIND_LABEL,
  REQUEST_KINDS,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUSES,
  type RequestKind,
  type RequestStatus,
} from "./protocol";

export {
  generateProtocol,
  isRequestKind,
  isRequestStatus,
  REQUEST_KIND_LABEL,
  REQUEST_KINDS,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUSES,
};
export type { RequestKind, RequestStatus };

export type RequestRow = typeof correctionRequests.$inferSelect;
export type CorrectionRow = typeof articleCorrections.$inferSelect;

export async function createRequest(
  db: PortalDb,
  input: {
    kind: RequestKind;
    articleId?: string | null;
    articleUrl?: string | null;
    requesterName: string;
    requesterEmail: string;
    requesterRole?: string | null;
    claim: string;
    evidence?: string | null;
    ip?: string | null;
  },
): Promise<RequestRow> {
  const agora = new Date();
  const row = {
    id: crypto.randomUUID(),
    protocol: generateProtocol(agora),
    kind: input.kind,
    articleId: input.articleId ?? null,
    articleUrl: input.articleUrl?.trim() || null,
    requesterName: input.requesterName.trim(),
    requesterEmail: input.requesterEmail.trim().toLowerCase(),
    requesterRole: input.requesterRole?.trim() || null,
    claim: input.claim.trim(),
    evidence: input.evidence?.trim() || null,
    status: "recebido",
    internalNote: null,
    response: null,
    handledByUserId: null,
    createdAt: agora.toISOString(),
    updatedAt: agora.toISOString(),
    ip: input.ip ?? null,
  };
  await db.insert(correctionRequests).values(row);
  return row;
}

export async function listRequests(
  db: PortalDb,
  filters: { status?: string } = {},
): Promise<RequestRow[]> {
  const base = db.select().from(correctionRequests);
  const query = filters.status
    ? base.where(eq(correctionRequests.status, filters.status))
    : base;
  return query.orderBy(desc(correctionRequests.createdAt)).limit(200);
}

export async function getRequest(db: PortalDb, id: string): Promise<RequestRow | null> {
  const [row] = await db
    .select()
    .from(correctionRequests)
    .where(eq(correctionRequests.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateRequest(
  db: PortalDb,
  id: string,
  input: { status?: RequestStatus; internalNote?: string | null; response?: string | null },
  handledByUserId: string,
): Promise<void> {
  await db
    .update(correctionRequests)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
      ...(input.response !== undefined ? { response: input.response } : {}),
      handledByUserId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(correctionRequests.id, id));
}

/* ----------------------- correções publicadas ------------------------- */

/** Correções de uma matéria, da mais antiga para a mais recente. */
export async function listCorrections(db: PortalDb, articleId: string): Promise<CorrectionRow[]> {
  return db
    .select()
    .from(articleCorrections)
    .where(eq(articleCorrections.articleId, articleId))
    .orderBy(articleCorrections.createdAt);
}

export async function addCorrection(
  db: PortalDb,
  input: {
    articleId: string;
    description: string;
    correctedByUserId: string;
    requestId?: string | null;
  },
): Promise<CorrectionRow> {
  const row = {
    id: crypto.randomUUID(),
    articleId: input.articleId,
    description: input.description.trim(),
    correctedByUserId: input.correctedByUserId,
    requestId: input.requestId ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.insert(articleCorrections).values(row);
  return row;
}

/** Quantos pedidos estão esperando alguém da redação. */
export async function countOpenRequests(db: PortalDb): Promise<number> {
  const linhas = await db
    .select({ id: correctionRequests.id })
    .from(correctionRequests)
    .where(
      and(
        eq(correctionRequests.status, "recebido"),
      ),
    );
  return linhas.length;
}
