/**
 * Apuração e fontes de uma matéria.
 *
 * Tudo aqui é interno: as funções deste módulo só são chamadas por rotas do
 * painel, protegidas por sessão. Nenhuma consulta pública toca esta tabela.
 */
import { and, desc, eq } from "drizzle-orm";
import { articleSources } from "../../db/schema";
import type { PortalDb } from "./db";

export const SOURCE_TYPES = [
  "documento_publico",
  "entrevista",
  "orgao_oficial",
  "pesquisa",
  "outro",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  documento_publico: "Documento público",
  entrevista: "Entrevista",
  orgao_oficial: "Órgão oficial",
  pesquisa: "Pesquisa",
  outro: "Outro",
};

export const SOURCE_STATUSES = ["pendente", "confirmado", "contestado"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  contestado: "Contestado",
};

export type SourceRow = typeof articleSources.$inferSelect;

function normalizeType(value: string | undefined): SourceType {
  return value && (SOURCE_TYPES as readonly string[]).includes(value)
    ? (value as SourceType)
    : "outro";
}

function normalizeStatus(value: string | undefined): SourceStatus {
  return value && (SOURCE_STATUSES as readonly string[]).includes(value)
    ? (value as SourceStatus)
    : "pendente";
}

export async function listSources(db: PortalDb, articleId: string): Promise<SourceRow[]> {
  return db
    .select()
    .from(articleSources)
    .where(eq(articleSources.articleId, articleId))
    .orderBy(desc(articleSources.createdAt));
}

export async function addSource(
  db: PortalDb,
  articleId: string,
  input: {
    name: string;
    type?: string;
    reference?: string | null;
    consultedAt?: string | null;
    status?: string;
    note?: string | null;
    confidential?: boolean;
    createdByUserId?: string | null;
  },
): Promise<SourceRow> {
  const row = {
    id: crypto.randomUUID(),
    articleId,
    name: input.name.trim(),
    type: normalizeType(input.type),
    reference: input.reference?.trim() || null,
    consultedAt: input.consultedAt || null,
    status: normalizeStatus(input.status),
    note: input.note?.trim() || null,
    confidential: input.confidential ? 1 : 0,
    createdByUserId: input.createdByUserId ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.insert(articleSources).values(row);
  return row;
}

export async function updateSource(
  db: PortalDb,
  articleId: string,
  sourceId: string,
  input: Partial<{
    name: string;
    type: string;
    reference: string | null;
    consultedAt: string | null;
    status: string;
    note: string | null;
    confidential: boolean;
  }>,
): Promise<boolean> {
  const [atual] = await db
    .select()
    .from(articleSources)
    .where(and(eq(articleSources.id, sourceId), eq(articleSources.articleId, articleId)))
    .limit(1);
  if (!atual) return false;

  await db
    .update(articleSources)
    .set({
      name: input.name?.trim() || atual.name,
      type: input.type === undefined ? atual.type : normalizeType(input.type),
      reference: input.reference === undefined ? atual.reference : input.reference?.trim() || null,
      consultedAt: input.consultedAt === undefined ? atual.consultedAt : input.consultedAt || null,
      status: input.status === undefined ? atual.status : normalizeStatus(input.status),
      note: input.note === undefined ? atual.note : input.note?.trim() || null,
      confidential:
        input.confidential === undefined ? atual.confidential : input.confidential ? 1 : 0,
    })
    .where(eq(articleSources.id, sourceId));
  return true;
}

export async function removeSource(
  db: PortalDb,
  articleId: string,
  sourceId: string,
): Promise<void> {
  await db
    .delete(articleSources)
    .where(and(eq(articleSources.id, sourceId), eq(articleSources.articleId, articleId)));
}

/** Existe ao menos uma fonte confirmada? É a trava da matéria classificada como notícia. */
export async function hasConfirmedSource(db: PortalDb, articleId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: articleSources.id })
    .from(articleSources)
    .where(and(eq(articleSources.articleId, articleId), eq(articleSources.status, "confirmado")))
    .limit(1);
  return Boolean(row);
}
