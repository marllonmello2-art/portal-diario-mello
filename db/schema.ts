import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Editorias (Política, Economia, ...). Criadas/editadas pelo painel. */
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Cor usada na tag visual da editoria. */
  color: text("color").notNull().default("#c8102e"),
  /** Ordem no menu principal. */
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Jornalistas/colunistas que assinam as matérias. */
export const authors = sqliteTable("authors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Matérias. `content` guarda Markdown. */
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  /** Linha fina (deck) exibida abaixo do título. */
  subtitle: text("subtitle"),
  content: text("content").notNull(),
  coverImageUrl: text("cover_image_url"),
  coverCredit: text("cover_credit"),
  categoryId: text("category_id").references(() => categories.id),
  authorId: text("author_id").references(() => authors.id),
  /**
   * Estado editorial: RASCUNHO, EM_APURACAO, EM_REDACAO, EM_REVISAO,
   * EM_REVISAO_JURIDICA, APROVADA, AGENDADA, PUBLICADA, CORRIGIDA, ARQUIVADA.
   * A máquina de estados vive em lib/portal/permissions.ts.
   */
  status: text("status").notNull().default("RASCUNHO"),
  /**
   * Quem pode ler o texto completo:
   * `public` — qualquer visitante;
   * `registered` — só quem tem conta gratuita de leitor.
   */
  accessLevel: text("access_level").notNull().default("public"),
  /** Destaque principal da home (hero). */
  featured: integer("featured").notNull().default(0),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  viewsCount: integer("views_count").notNull().default(0),
  /** Usuário do painel dono da matéria (não confundir com a assinatura). */
  createdByUserId: text("created_by_user_id"),
  /** `painel` ou `integracao` — de onde o texto entrou no sistema. */
  origin: text("origin").notNull().default("painel"),
  /** Houve assistência de IA na produção? Registro interno, nunca público. */
  aiAssisted: integer("ai_assisted").notNull().default(0),
  approvedByUserId: text("approved_by_user_id"),
  approvedAt: text("approved_at"),
  publishedByUserId: text("published_by_user_id"),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

/** Junção many-to-many entre matérias e tags. */
export const articleTags = sqliteTable(
  "article_tags",
  {
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })],
);

/** Usuários do painel administrativo. Senha guardada como hash PBKDF2. */
export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  /** admin | editor */
  role: text("role").notNull().default("editor"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
});

/**
 * Papéis de cada pessoa do painel.
 *
 * É uma tabela à parte (e não uma coluna) porque uma pessoa acumula papéis:
 * no Diário Mello, o dono é editor-chefe e administrador ao mesmo tempo.
 */
export const adminUserRoles = sqliteTable(
  "admin_user_roles",
  {
    userId: text("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    /** AUTOR | EDITOR | EDITOR_CHEFE | ADMINISTRADOR */
    role: text("role").notNull(),
    grantedAt: text("granted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

/**
 * Trilha de auditoria: quem fez o quê, quando.
 *
 * Toda mudança de status, login, criação, edição, aprovação, publicação e
 * exclusão passa por aqui. Linhas nunca são alteradas nem apagadas.
 */
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  at: text("at").notNull().default(sql`CURRENT_TIMESTAMP`),
  /** usuario | integracao | sistema | leitor */
  actorKind: text("actor_kind").notNull().default("usuario"),
  actorId: text("actor_id"),
  actorLabel: text("actor_label"),
  /** login, article.create, article.status, article.publish, ... */
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  /** JSON com o que mais for relevante para aquele evento. */
  metadata: text("metadata"),
  ip: text("ip"),
});

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("site"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Contas gratuitas de leitor (diferentes dos usuários do painel). */
export const readers = sqliteTable("readers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
});

/** Matérias que o leitor salvou para ler depois. */
export const readerSavedArticles = sqliteTable(
  "reader_saved_articles",
  {
    readerId: text("reader_id").notNull().references(() => readers.id, { onDelete: "cascade" }),
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.readerId, table.articleId] })],
);

/** Configurações internas (ex.: segredo de assinatura das sessões). */
export const portalSettings = sqliteTable("portal_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
