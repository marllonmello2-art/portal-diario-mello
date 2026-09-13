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
  /** Autor/crédito da imagem de capa. */
  coverCredit: text("cover_credit"),
  /** De onde a imagem veio (agência, órgão, fotógrafo, banco de imagens). */
  coverSource: text("cover_source"),
  /** Licença ou autorização de uso. */
  coverLicense: text("cover_license"),
  coverObtainedAt: text("cover_obtained_at"),
  coverUsageNote: text("cover_usage_note"),
  /** Imagem ilustrativa gerada por IA — dispensa crédito de terceiro. */
  coverAiGenerated: integer("cover_ai_generated").notNull().default(0),
  categoryId: text("category_id").references(() => categories.id),
  authorId: text("author_id").references(() => authors.id),
  /**
   * Estado editorial: RASCUNHO, EM_APURACAO, EM_REDACAO, EM_REVISAO,
   * EM_REVISAO_JURIDICA, APROVADA, AGENDADA, PUBLICADA, CORRIGIDA, ARQUIVADA.
   * A máquina de estados vive em lib/portal/permissions.ts.
   */
  status: text("status").notNull().default("RASCUNHO"),
  /**
   * O que esta publicação é: NOTICIA, OPINIAO, PATROCINADO, COMUNICADO,
   * ANALISE ou CORRECAO. Aparece para o leitor no site.
   */
  classification: text("classification").notNull().default("NOTICIA"),
  /** PERMANENTE | TECNOLOGIA_SERVICO | AGENDA | PRAZO — define a manutenção. */
  contentType: text("content_type").notNull().default("PERMANENTE"),
  /** Quando esta matéria precisa ser olhada de novo. */
  reviewDueAt: text("review_due_at"),
  lastReviewedAt: text("last_reviewed_at"),
  /** Data do evento, para a agenda: depois dela a matéria sai do site. */
  eventDate: text("event_date"),
  /** Até quando a informação vale, para conteúdo com prazo. */
  expiresAt: text("expires_at"),
  /* Confirmações da redação para o selo de baixo risco. */
  riskSourceOk: integer("risk_source_ok").notNull().default(0),
  riskNoPersonOk: integer("risk_no_person_ok").notNull().default(0),
  riskNoAdviceOk: integer("risk_no_advice_ok").notNull().default(0),
  riskImageOk: integer("risk_image_ok").notNull().default(0),
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
 * Apuração: as fontes de cada matéria.
 *
 * Área interna da redação. Nada daqui é serializado para o site público —
 * nem em JSON, nem em metadado — porque inclui apuração em andamento e
 * material sob reserva.
 */
export const articleSources = sqliteTable("article_sources", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  /** Nome da fonte ou do documento. */
  name: text("name").notNull(),
  /** documento_publico | entrevista | orgao_oficial | pesquisa | outro */
  type: text("type").notNull().default("outro"),
  /** Link ou referência do documento. */
  reference: text("reference"),
  consultedAt: text("consulted_at"),
  /** pendente | confirmado | contestado */
  status: text("status").notNull().default("pendente"),
  note: text("note"),
  /** Fonte sob reserva: aparece só para a equipe, com aviso. */
  confidential: integer("confidential").notNull().default(0),
  createdByUserId: text("created_by_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Acervo de mídia com a papelada de direitos.
 *
 * Toda imagem que entra pelo painel é registrada aqui com crédito, origem e
 * licença — é o que permite responder, meses depois, de onde veio uma foto.
 */
export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  /** Chave no bucket R2. */
  key: text("key").notNull(),
  url: text("url").notNull(),
  mime: text("mime"),
  bytes: integer("bytes"),
  credit: text("credit"),
  source: text("source"),
  license: text("license"),
  obtainedAt: text("obtained_at"),
  usageNote: text("usage_note"),
  aiGenerated: integer("ai_generated").notNull().default(0),
  uploadedByUserId: text("uploaded_by_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Pedidos de correção e de direito de resposta.
 *
 * Entram pelo formulário público com um protocolo, e a redação responde no
 * painel. Guardar o pedido é o que permite provar, depois, que houve resposta
 * — e em quanto tempo.
 */
export const correctionRequests = sqliteTable("correction_requests", {
  id: text("id").primaryKey(),
  /** Código que o solicitante usa para acompanhar: DM-2026-XXXXXX. */
  protocol: text("protocol").notNull().unique(),
  /** correcao | direito_resposta */
  kind: text("kind").notNull().default("correcao"),
  articleId: text("article_id"),
  /** Endereço informado pelo solicitante, quando ele não veio de uma matéria. */
  articleUrl: text("article_url"),
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  requesterRole: text("requester_role"),
  /** O que o solicitante afirma estar errado. */
  claim: text("claim").notNull(),
  /** Documento, link ou referência que sustenta o pedido. */
  evidence: text("evidence"),
  /** recebido | em_analise | respondido | corrigido | recusado */
  status: text("status").notNull().default("recebido"),
  internalNote: text("internal_note"),
  /** Resposta enviada ao solicitante. */
  response: text("response"),
  handledByUserId: text("handled_by_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ip: text("ip"),
});

/**
 * Correções aplicadas a uma matéria já publicada.
 *
 * Aparecem no pé do texto, com data e descrição. Alteração factual não se
 * apaga em silêncio: fica registrada aqui, para o leitor ver.
 */
export const articleCorrections = sqliteTable("article_corrections", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  correctedByUserId: text("corrected_by_user_id"),
  requestId: text("request_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Contadores de uso para conter abuso em formulários públicos e no login.
 * Uma linha por chave e janela de tempo.
 */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: text("window_start").notNull(),
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

/**
 * Assinantes do boletim.
 *
 * Dupla confirmação: a inscrição nasce `pendente` e só vira `confirmado`
 * quando a pessoa abre o link do token. Guardamos data, origem e finalidade
 * porque é isso que a LGPD chama de registro do consentimento.
 */
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  /** De onde veio a inscrição: rodapé, matéria, campanha. */
  source: text("source").notNull().default("site"),
  /** Para que a pessoa consentiu. */
  purpose: text("purpose").notNull().default("Boletim diário do Diário Mello"),
  /** pendente | confirmado | cancelado */
  status: text("status").notNull().default("pendente"),
  /** Token de confirmação e de cancelamento em um clique. */
  token: text("token"),
  confirmedAt: text("confirmed_at"),
  unsubscribedAt: text("unsubscribed_at"),
  ip: text("ip"),
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
