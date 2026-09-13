/**
 * Consultas do portal, todas via Drizzle ORM.
 *
 * Regra de visibilidade pública: a matéria aparece quando está `published`, ou
 * quando está `scheduled` e a data de publicação já passou. Isso faz o
 * agendamento funcionar sem precisar de cron.
 */
import { and, desc, eq, gte, inArray, isNull, like, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { PUBLIC_STATUSES } from "./permissions";
import { NOT_FEATURABLE } from "./classification";
import { articleTags, articles, authors, categories, readerSavedArticles, tags } from "../../db/schema";
import type { PortalDb } from "./db";

export type Category = typeof categories.$inferSelect;
export type Author = typeof authors.$inferSelect;

export type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  coverCredit: string | null;
  status: string;
  classification: string;
  contentType: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  eventDate: string | null;
  expiresAt: string | null;
  accessLevel: string;
  origin: string;
  aiAssisted: number;
  createdByUserId: string | null;
  featured: number;
  publishedAt: string | null;
  updatedAt: string;
  viewsCount: number;
  categoryName: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null;
};

export type ArticleFull = ArticleCard & {
  content: string;
  coverSource: string | null;
  coverLicense: string | null;
  coverAiGenerated: number;
  riskSourceOk: number;
  riskNoPersonOk: number;
  riskNoAdviceOk: number;
  riskImageOk: number;
  authorBio: string | null;
  categoryId: string | null;
  authorId: string | null;
};

const cardColumns = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  subtitle: articles.subtitle,
  coverImageUrl: articles.coverImageUrl,
  coverCredit: articles.coverCredit,
  status: articles.status,
  classification: articles.classification,
  contentType: articles.contentType,
  reviewDueAt: articles.reviewDueAt,
  lastReviewedAt: articles.lastReviewedAt,
  eventDate: articles.eventDate,
  expiresAt: articles.expiresAt,
  accessLevel: articles.accessLevel,
  origin: articles.origin,
  aiAssisted: articles.aiAssisted,
  createdByUserId: articles.createdByUserId,
  featured: articles.featured,
  publishedAt: articles.publishedAt,
  updatedAt: articles.updatedAt,
  viewsCount: articles.viewsCount,
  categoryName: categories.name,
  categorySlug: categories.slug,
  categoryColor: categories.color,
  authorName: authors.name,
  authorSlug: authors.slug,
  authorAvatar: authors.avatarUrl,
};

/**
 * Condição SQL de "matéria visível ao público".
 *
 * Publicada ou corrigida aparece; agendada aparece quando a hora chega. Todo
 * o resto (rascunho, apuração, revisão, aprovada, arquivada) é invisível fora
 * do painel — inclusive para buscadores.
 *
 * Some daqui matéria de agenda cujo evento já passou e informação cujo prazo
 * venceu: o arquivamento é automático, medido na consulta, sem depender de
 * ninguém lembrar de tirar do ar.
 */
function visible() {
  const now = new Date().toISOString();
  const hoje = now.slice(0, 10);

  const noAr = or(
    inArray(articles.status, PUBLIC_STATUSES),
    and(eq(articles.status, "AGENDADA"), lte(articles.publishedAt, now)),
  );

  const dentroDoPrazo = and(
    // Agenda: vale até o fim do dia do evento.
    or(ne(articles.contentType, "AGENDA"), isNull(articles.eventDate), gte(articles.eventDate, hoje)),
    // Informação com prazo: vale até a data informada.
    or(isNull(articles.expiresAt), gte(articles.expiresAt, hoje)),
  );

  return and(noAr, dentroDoPrazo);
}

function baseSelect(db: PortalDb) {
  return db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id));
}

export async function listCategories(db: PortalDb): Promise<Category[]> {
  return db.select().from(categories).orderBy(categories.position, categories.name);
}

export async function getCategoryBySlug(db: PortalDb, slug: string): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function listAuthors(db: PortalDb): Promise<Author[]> {
  return db.select().from(authors).orderBy(authors.name);
}

/** Últimas matérias publicadas, opcionalmente de uma editoria. */
export async function listPublished(
  db: PortalDb,
  options: { categoryId?: string; limit?: number; offset?: number; excludeId?: string } = {},
): Promise<ArticleCard[]> {
  const conditions = [visible()];
  if (options.categoryId) conditions.push(eq(articles.categoryId, options.categoryId));
  if (options.excludeId) conditions.push(ne(articles.id, options.excludeId));

  return baseSelect(db)
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(options.limit ?? 12)
    .offset(options.offset ?? 0);
}

export async function countPublished(
  db: PortalDb,
  options: { categoryId?: string; search?: string } = {},
): Promise<number> {
  const conditions = [visible()];
  if (options.categoryId) conditions.push(eq(articles.categoryId, options.categoryId));
  if (options.search) conditions.push(searchCondition(options.search));

  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(articles)
    .where(and(...conditions));
  return Number(row?.total ?? 0);
}

/** Matéria marcada como destaque; se não houver, cai na mais recente. */
export async function getFeatured(db: PortalDb): Promise<ArticleCard | null> {
  // Material pago e comunicado de assessoria nunca ocupam a manchete: seria
  // exatamente "apresentar como notícia" o que não é notícia.
  const [flagged] = await baseSelect(db)
    .where(and(visible(), eq(articles.featured, 1), notInArray(articles.classification, NOT_FEATURABLE)))
    .orderBy(desc(articles.publishedAt))
    .limit(1);
  if (flagged) return flagged;

  const [latest] = await baseSelect(db)
    .where(and(visible(), notInArray(articles.classification, NOT_FEATURABLE)))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(1);
  return latest ?? null;
}

export async function getArticleBySlug(db: PortalDb, slug: string): Promise<ArticleFull | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      content: articles.content,
      coverSource: articles.coverSource,
      coverLicense: articles.coverLicense,
      coverAiGenerated: articles.coverAiGenerated,
      riskSourceOk: articles.riskSourceOk,
      riskNoPersonOk: articles.riskNoPersonOk,
      riskNoAdviceOk: articles.riskNoAdviceOk,
      riskImageOk: articles.riskImageOk,
      categoryId: articles.categoryId,
      authorId: articles.authorId,
      authorBio: authors.bio,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(eq(articles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getArticleById(db: PortalDb, id: string): Promise<ArticleFull | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      content: articles.content,
      coverSource: articles.coverSource,
      coverLicense: articles.coverLicense,
      coverAiGenerated: articles.coverAiGenerated,
      riskSourceOk: articles.riskSourceOk,
      riskNoPersonOk: articles.riskNoPersonOk,
      riskNoAdviceOk: articles.riskNoAdviceOk,
      riskImageOk: articles.riskImageOk,
      categoryId: articles.categoryId,
      authorId: articles.authorId,
      authorBio: authors.bio,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(eq(articles.id, id))
    .limit(1);
  return row ?? null;
}

export function isVisible(article: {
  status: string;
  publishedAt: string | null;
  contentType?: string | null;
  eventDate?: string | null;
  expiresAt?: string | null;
}): boolean {
  const hoje = new Date().toISOString().slice(0, 10);

  // Prazo vencido tira do ar mesmo uma matéria publicada.
  if (article.contentType === "AGENDA" && article.eventDate && article.eventDate < hoje) return false;
  if (article.expiresAt && article.expiresAt < hoje) return false;

  if ((PUBLIC_STATUSES as string[]).includes(article.status)) return true;
  if (article.status === "AGENDADA" && article.publishedAt) {
    return new Date(article.publishedAt).getTime() <= Date.now();
  }
  return false;
}

/** Incrementa o contador de visualizações sem bloquear a renderização. */
export async function incrementViews(db: PortalDb, id: string): Promise<void> {
  await db
    .update(articles)
    .set({ viewsCount: sql`${articles.viewsCount} + 1` })
    .where(eq(articles.id, id));
}

function searchCondition(term: string) {
  const needle = `%${term.toLowerCase()}%`;
  return or(
    like(sql`lower(${articles.title})`, needle),
    like(sql`lower(${articles.subtitle})`, needle),
    like(sql`lower(${articles.content})`, needle),
  );
}

/** Busca por título, linha fina e corpo do texto. */
export async function searchArticles(
  db: PortalDb,
  term: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ArticleCard[]> {
  return baseSelect(db)
    .where(and(visible(), searchCondition(term)))
    .orderBy(desc(articles.publishedAt))
    .limit(options.limit ?? 20)
    .offset(options.offset ?? 0);
}

export type TagRow = typeof tags.$inferSelect;

export async function tagsOfArticle(db: PortalDb, articleId: string): Promise<TagRow[]> {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId))
    .orderBy(tags.name);
}

/** Matérias relacionadas: mesma editoria, mais recentes, exceto a atual. */
export async function relatedArticles(
  db: PortalDb,
  article: { id: string; categoryId: string | null },
  limit = 4,
): Promise<ArticleCard[]> {
  if (!article.categoryId) return listPublished(db, { limit, excludeId: article.id });
  return listPublished(db, { categoryId: article.categoryId, limit, excludeId: article.id });
}

/** Uma consulta por editoria para montar os blocos da home. */
export async function homeSections(
  db: PortalDb,
  categoryList: Category[],
  perSection = 4,
): Promise<{ category: Category; articles: ArticleCard[] }[]> {
  const sections = await Promise.all(
    categoryList.map(async (category) => ({
      category,
      articles: await listPublished(db, { categoryId: category.id, limit: perSection }),
    })),
  );
  return sections.filter((section) => section.articles.length > 0);
}

/* --------------------------- leitores logados -------------------------- */

/** Matérias que o leitor salvou, mais recentes primeiro. */
export async function savedArticles(db: PortalDb, readerId: string): Promise<ArticleCard[]> {
  return db
    .select(cardColumns)
    .from(readerSavedArticles)
    .innerJoin(articles, eq(readerSavedArticles.articleId, articles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(eq(readerSavedArticles.readerId, readerId))
    .orderBy(desc(readerSavedArticles.createdAt))
    .limit(100);
}

/** Diz se uma matéria específica está salva por este leitor. */
export async function isArticleSaved(
  db: PortalDb,
  readerId: string,
  articleId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ articleId: readerSavedArticles.articleId })
    .from(readerSavedArticles)
    .where(and(eq(readerSavedArticles.readerId, readerId), eq(readerSavedArticles.articleId, articleId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Fila de manutenção: o que está no ar e já passou da data de revisão, mais o
 * que saiu do ar sozinho por vencimento.
 */
export async function maintenanceQueue(db: PortalDb): Promise<ArticleCard[]> {
  const agora = new Date().toISOString();
  const hoje = agora.slice(0, 10);

  return baseSelect(db)
    .where(
      and(
        inArray(articles.status, PUBLIC_STATUSES),
        or(
          lte(articles.reviewDueAt, agora),
          and(eq(articles.contentType, "AGENDA"), lte(articles.eventDate, hoje)),
          lte(articles.expiresAt, hoje),
        ),
      ),
    )
    .orderBy(articles.reviewDueAt)
    .limit(100);
}

/** Lista do painel: todos os status, com filtros opcionais. */
export async function adminListArticles(
  db: PortalDb,
  filters: {
    status?: string;
    categoryId?: string;
    search?: string;
    /** Preenchido para o perfil AUTOR: ele só enxerga o que é dele. */
    onlyAuthorUserId?: string;
  } = {},
): Promise<ArticleCard[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(articles.status, filters.status));
  if (filters.categoryId) conditions.push(eq(articles.categoryId, filters.categoryId));
  if (filters.search) conditions.push(searchCondition(filters.search));
  if (filters.onlyAuthorUserId) {
    conditions.push(eq(articles.createdByUserId, filters.onlyAuthorUserId));
  }

  const query = baseSelect(db).orderBy(desc(articles.updatedAt)).limit(200);
  return conditions.length ? query.where(and(...conditions)) : query;
}

/**
 * Sincroniza as tags de uma matéria a partir de uma lista de nomes,
 * criando as que ainda não existem.
 */
export async function syncArticleTags(
  db: PortalDb,
  articleId: string,
  names: string[],
  slugify: (value: string) => string,
): Promise<void> {
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 12);
  if (!clean.length) return;

  const slugs = clean.map(slugify);
  const existing = slugs.length
    ? await db.select().from(tags).where(inArray(tags.slug, slugs))
    : [];
  const bySlug = new Map(existing.map((tag) => [tag.slug, tag]));

  const links: { articleId: string; tagId: string }[] = [];
  for (const [index, name] of clean.entries()) {
    const slug = slugs[index];
    let tag = bySlug.get(slug);
    if (!tag) {
      tag = { id: crypto.randomUUID(), name, slug };
      await db.insert(tags).values(tag).onConflictDoNothing();
      bySlug.set(slug, tag);
    }
    links.push({ articleId, tagId: tag.id });
  }
  if (links.length) await db.insert(articleTags).values(links).onConflictDoNothing();
}
