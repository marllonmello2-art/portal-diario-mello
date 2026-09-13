/**
 * Acesso ao banco do portal (Cloudflare D1 + Drizzle).
 *
 * O binding `DB` só existe dentro do Worker, por isso o import de
 * `cloudflare:workers` é dinâmico: em qualquer outro contexto devolvemos
 * `null` e a página mostra o estado "sem banco configurado" em vez de quebrar.
 */
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { BRAND } from "./brand";
import { slugify } from "./slug";

export type PortalDb = ReturnType<typeof drizzle<typeof schema>>;

async function bindings(): Promise<{ DB?: D1Database; BUCKET?: R2Bucket }> {
  try {
    const runtime = (await import("cloudflare:workers")) as {
      env: { DB?: D1Database; BUCKET?: R2Bucket };
    };
    return runtime.env ?? {};
  } catch {
    return {};
  }
}

export async function getD1(): Promise<D1Database | null> {
  return (await bindings()).DB ?? null;
}

export async function getBucket(): Promise<R2Bucket | null> {
  return (await bindings()).BUCKET ?? null;
}

/**
 * Devolve o Drizzle já com o schema do portal e com as tabelas garantidas.
 * `null` quando o binding D1 não está disponível.
 */
export async function getPortalDb(): Promise<PortalDb | null> {
  const d1 = await getD1();
  if (!d1) return null;
  await ensurePortalSchema(d1);
  return drizzle(d1, { schema });
}

/* ------------------------------------------------------------------ *
 * Bootstrap de schema
 *
 * As migrations em `drizzle/` são a fonte oficial do schema, mas o ambiente de
 * hospedagem pode entregar um D1 vazio sem rodar `wrangler d1 migrations
 * apply`. Para o portal nunca subir quebrado, criamos as tabelas com
 * `IF NOT EXISTS` na primeira consulta do processo (custo pago uma única vez).
 * ------------------------------------------------------------------ */

const DDL = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#c8102e',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    cover_credit TEXT,
    category_id TEXT,
    author_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    featured INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    views_count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS article_tags (
    article_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (article_id, tag_id)
  )`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'site',
    purpose TEXT NOT NULL DEFAULT 'Boletim diário do Diário Mello',
    status TEXT NOT NULL DEFAULT 'pendente',
    token TEXT,
    confirmed_at TEXT,
    unsubscribed_at TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS correction_requests (
    id TEXT PRIMARY KEY NOT NULL,
    protocol TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'correcao',
    article_id TEXT,
    article_url TEXT,
    requester_name TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    requester_role TEXT,
    claim TEXT NOT NULL,
    evidence TEXT,
    status TEXT NOT NULL DEFAULT 'recebido',
    internal_note TEXT,
    response TEXT,
    handled_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS correction_requests_status_idx ON correction_requests(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS article_corrections (
    id TEXT PRIMARY KEY NOT NULL,
    article_id TEXT NOT NULL,
    description TEXT NOT NULL,
    corrected_by_user_id TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS article_corrections_article_idx ON article_corrections(article_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS article_sources (
    id TEXT PRIMARY KEY NOT NULL,
    article_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'outro',
    reference TEXT,
    consulted_at TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    note TEXT,
    confidential INTEGER NOT NULL DEFAULT 0,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS article_sources_article_idx ON article_sources(article_id)`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL,
    url TEXT NOT NULL,
    mime TEXT,
    bytes INTEGER,
    credit TEXT,
    source TEXT,
    license TEXT,
    obtained_at TEXT,
    usage_note TEXT,
    ai_generated INTEGER NOT NULL DEFAULT 0,
    uploaded_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_user_roles (
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_kind TEXT NOT NULL DEFAULT 'usuario',
    actor_id TEXT,
    actor_label TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    from_status TEXT,
    to_status TEXT,
    note TEXT,
    metadata TEXT,
    ip TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log(at)`,
  `CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity, entity_id)`,
  `CREATE TABLE IF NOT EXISTS readers (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reader_saved_articles (
    reader_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reader_id, article_id)
  )`,
  `CREATE TABLE IF NOT EXISTS portal_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS articles_status_idx ON articles(status, published_at)`,
  `CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category_id, published_at)`,
];

/**
 * Editorias do portal.
 *
 * A linha editorial é de conteúdo que dura: explicação, história, serviço com
 * fonte oficial. Cobertura factual em tempo real (política partidária, crime,
 * denúncia) fica de fora por decisão de risco, não por falta de interesse.
 */
const SEED_CATEGORIES: { name: string; color: string }[] = [
  { name: "Cultura e história", color: "#8b3fbf" },
  { name: "Tecnologia prática", color: "#2b2f77" },
  { name: "Educação e explicação", color: "#0b6e4f" },
  { name: "Serviço", color: "#0f7c8c" },
  { name: "Agenda cultural", color: "#b5651d" },
  { name: "Esporte informativo", color: "#1b5fc1" },
];

/** Editorias da versão anterior do portal, aposentadas na virada de linha. */
const RETIRED_CATEGORY_SLUGS = [
  "politica",
  "economia",
  "esportes",
  "cultura",
  "internacional",
  "tecnologia",
  "opiniao",
];

let bootstrapPromise: Promise<void> | null = null;

export function ensurePortalSchema(d1: D1Database): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await d1.batch(DDL.map((statement) => d1.prepare(statement)));
      await addMissingColumns(d1);
      await seed(d1);
    })().catch((error) => {
      // Uma falha não pode congelar o bootstrap para sempre: zera o cache
      // para a próxima requisição tentar de novo.
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

/**
 * Colunas acrescentadas depois que o portal já estava no ar.
 *
 * O SQLite não tem `ADD COLUMN IF NOT EXISTS`, então conferimos antes no
 * PRAGMA — assim um banco antigo ganha a coluna e um banco novo não quebra.
 */
async function addMissingColumns(d1: D1Database) {
  const info = await d1.prepare("PRAGMA table_info(articles)").all<{ name: string }>();
  const columns = new Set((info.results ?? []).map((column: { name: string }) => column.name));

  if (!columns.has("access_level")) {
    await d1
      .prepare("ALTER TABLE articles ADD COLUMN access_level TEXT NOT NULL DEFAULT 'public'")
      .run();
  }

  // Governança editorial (fase 1).
  const novas: [string, string][] = [
    ["created_by_user_id", "ALTER TABLE articles ADD COLUMN created_by_user_id TEXT"],
    ["origin", "ALTER TABLE articles ADD COLUMN origin TEXT NOT NULL DEFAULT 'painel'"],
    ["ai_assisted", "ALTER TABLE articles ADD COLUMN ai_assisted INTEGER NOT NULL DEFAULT 0"],
    ["approved_by_user_id", "ALTER TABLE articles ADD COLUMN approved_by_user_id TEXT"],
    ["approved_at", "ALTER TABLE articles ADD COLUMN approved_at TEXT"],
    ["published_by_user_id", "ALTER TABLE articles ADD COLUMN published_by_user_id TEXT"],
    // Fase 2: classificação e direitos de imagem.
    ["classification", "ALTER TABLE articles ADD COLUMN classification TEXT NOT NULL DEFAULT 'NOTICIA'"],
    ["cover_source", "ALTER TABLE articles ADD COLUMN cover_source TEXT"],
    ["cover_license", "ALTER TABLE articles ADD COLUMN cover_license TEXT"],
    ["cover_obtained_at", "ALTER TABLE articles ADD COLUMN cover_obtained_at TEXT"],
    ["cover_usage_note", "ALTER TABLE articles ADD COLUMN cover_usage_note TEXT"],
    ["cover_ai_generated", "ALTER TABLE articles ADD COLUMN cover_ai_generated INTEGER NOT NULL DEFAULT 0"],
    // Fase 5: ciclo de vida do conteúdo e selo de baixo risco.
    ["content_type", "ALTER TABLE articles ADD COLUMN content_type TEXT NOT NULL DEFAULT 'PERMANENTE'"],
    ["review_due_at", "ALTER TABLE articles ADD COLUMN review_due_at TEXT"],
    ["last_reviewed_at", "ALTER TABLE articles ADD COLUMN last_reviewed_at TEXT"],
    ["event_date", "ALTER TABLE articles ADD COLUMN event_date TEXT"],
    ["expires_at", "ALTER TABLE articles ADD COLUMN expires_at TEXT"],
    ["risk_source_ok", "ALTER TABLE articles ADD COLUMN risk_source_ok INTEGER NOT NULL DEFAULT 0"],
    ["risk_no_person_ok", "ALTER TABLE articles ADD COLUMN risk_no_person_ok INTEGER NOT NULL DEFAULT 0"],
    ["risk_no_advice_ok", "ALTER TABLE articles ADD COLUMN risk_no_advice_ok INTEGER NOT NULL DEFAULT 0"],
    ["risk_image_ok", "ALTER TABLE articles ADD COLUMN risk_image_ok INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [coluna, comando] of novas) {
    if (!columns.has(coluna)) await d1.prepare(comando).run();
  }

  await migrateEditorialStatuses(d1);
  await migrateRoles(d1);
  await addNewsletterColumns(d1);
  await switchEditorialLine(d1);
}

/**
 * Troca as editorias antigas pelas da nova linha editorial.
 *
 * Roda uma vez só, marcada em portal_settings. As matérias das editorias
 * antigas não são apagadas: ficam sem editoria, à espera de reclassificação no
 * painel — perder texto para arrumar menu seria um péssimo negócio.
 */
async function switchEditorialLine(d1: D1Database) {
  const feito = await d1
    .prepare("SELECT value FROM portal_settings WHERE key = 'linha_editorial_2026' LIMIT 1")
    .first<{ value: string }>();
  if (feito?.value) return;

  const novas = SEED_CATEGORIES.map((categoria, index) =>
    d1
      .prepare(
        "INSERT OR IGNORE INTO categories (id, name, slug, color, position) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), categoria.name, slugify(categoria.name), categoria.color, index),
  );
  await d1.batch(novas);

  const aposentar = RETIRED_CATEGORY_SLUGS.filter(
    (slug) => !SEED_CATEGORIES.some((categoria) => slugify(categoria.name) === slug),
  );
  for (const slug of aposentar) {
    const categoria = await d1
      .prepare("SELECT id FROM categories WHERE slug = ? LIMIT 1")
      .bind(slug)
      .first<{ id: string }>();
    if (!categoria) continue;
    await d1
      .prepare("UPDATE articles SET category_id = NULL WHERE category_id = ?")
      .bind(categoria.id)
      .run();
    await d1.prepare("DELETE FROM categories WHERE id = ?").bind(categoria.id).run();
  }

  await d1
    .prepare(
      "INSERT OR REPLACE INTO portal_settings (key, value) VALUES ('linha_editorial_2026', ?)",
    )
    .bind(new Date().toISOString())
    .run();
}

/** Colunas de consentimento do boletim, acrescentadas na fase 4. */
async function addNewsletterColumns(d1: D1Database) {
  const info = await d1.prepare("PRAGMA table_info(newsletter_subscribers)").all<{ name: string }>();
  const columns = new Set((info.results ?? []).map((column: { name: string }) => column.name));

  const novas: [string, string][] = [
    [
      "purpose",
      "ALTER TABLE newsletter_subscribers ADD COLUMN purpose TEXT NOT NULL DEFAULT 'Boletim diário do Diário Mello'",
    ],
    ["status", "ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente'"],
    ["token", "ALTER TABLE newsletter_subscribers ADD COLUMN token TEXT"],
    ["confirmed_at", "ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT"],
    ["unsubscribed_at", "ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribed_at TEXT"],
    ["ip", "ALTER TABLE newsletter_subscribers ADD COLUMN ip TEXT"],
  ];
  for (const [coluna, comando] of novas) {
    if (!columns.has(coluna)) await d1.prepare(comando).run();
  }
}

/**
 * Traduz os três status antigos para o vocabulário editorial.
 *
 * Nenhuma matéria é criada, apagada ou reescrita: só o rótulo do estado muda.
 * A consulta é idempotente — depois da primeira passada nada mais casa.
 */
async function migrateEditorialStatuses(d1: D1Database) {
  const antigos: [string, string][] = [
    ["draft", "RASCUNHO"],
    ["published", "PUBLICADA"],
    ["scheduled", "AGENDADA"],
  ];
  for (const [de, para] of antigos) {
    await d1.prepare("UPDATE articles SET status = ? WHERE status = ?").bind(para, de).run();
  }
}

/**
 * Converte o antigo campo `role` em papéis da nova governança.
 *
 * O dono do portal (que era `admin`) vira editor-chefe E administrador, para
 * não ficar sem poder publicar no meio da migração.
 */
async function migrateRoles(d1: D1Database) {
  const usuarios = await d1
    .prepare(
      `SELECT u.id, u.role FROM admin_users u
       WHERE NOT EXISTS (SELECT 1 FROM admin_user_roles r WHERE r.user_id = u.id)`,
    )
    .all<{ id: string; role: string }>();

  const linhas = usuarios.results ?? [];
  if (!linhas.length) return;

  const inserts = [];
  for (const usuario of linhas as { id: string; role: string }[]) {
    const papeis = usuario.role === "editor" ? ["EDITOR"] : ["EDITOR_CHEFE", "ADMINISTRADOR"];
    for (const papel of papeis) {
      inserts.push(
        d1
          .prepare("INSERT OR IGNORE INTO admin_user_roles (user_id, role) VALUES (?, ?)")
          .bind(usuario.id, papel),
      );
    }
  }
  if (inserts.length) await d1.batch(inserts);
}

/** Seed idempotente: editorias, redação padrão e matérias de demonstração. */
async function seed(d1: D1Database) {
  const categoryCount = await d1
    .prepare("SELECT COUNT(*) AS total FROM categories")
    .first<{ total: number }>();

  if (!categoryCount?.total) {
    await d1.batch(
      SEED_CATEGORIES.map((category, index) =>
        d1
          .prepare(
            "INSERT OR IGNORE INTO categories (id, name, slug, color, position) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(crypto.randomUUID(), category.name, slugify(category.name), category.color, index),
      ),
    );
  }

  const authorCount = await d1
    .prepare("SELECT COUNT(*) AS total FROM authors")
    .first<{ total: number }>();

  if (!authorCount?.total) {
    await d1
      .prepare(
        "INSERT OR IGNORE INTO authors (id, name, slug, bio, email) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        crypto.randomUUID(),
        BRAND.defaultAuthorName,
        slugify(BRAND.defaultAuthorName),
        `Equipe de reportagem do ${BRAND.name}.`,
        BRAND.email,
      )
      .run();
  }

  const articleCount = await d1
    .prepare("SELECT COUNT(*) AS total FROM articles")
    .first<{ total: number }>();

  if (!articleCount?.total) await seedDemoArticles(d1);
}

/**
 * Conteúdo de demonstração — são textos sobre o próprio portal, marcados como
 * exemplo, para a home não nascer vazia. Apague pelo painel quando publicar
 * as primeiras matérias de verdade.
 */
async function seedDemoArticles(d1: D1Database) {
  const author = await d1.prepare("SELECT id FROM authors LIMIT 1").first<{ id: string }>();
  const categoryRows = await d1
    .prepare("SELECT id, slug FROM categories")
    .all<{ id: string; slug: string }>();
  const bySlug = new Map(
    (categoryRows.results ?? []).map((row: { id: string; slug: string }) => [row.slug, row.id]),
  );
  const now = new Date();

  const demos = [
    {
      slug: "diario-mello-entra-no-ar",
      title: `${BRAND.name} entra no ar`,
      subtitle: `O portal da família ${BRAND.founderSurname} chega para cobrir o dia a dia com apuração própria e linguagem direta.`,
      category: "politica",
      featured: 1,
      content: `> Esta é uma **matéria de exemplo** criada junto com o portal. Edite ou apague pelo painel em /admin.\n\nO ${BRAND.name} nasce com uma proposta simples: informar sem rodeios. A redação cobre ${SEED_CATEGORIES.map((c) => c.name).join(", ")} e mantém o leitor no centro de cada decisão editorial.\n\n## O que você encontra aqui\n\n- Destaque diário na primeira página\n- Editorias organizadas no menu principal\n- Newsletter com o resumo do dia\n\nBoa leitura.`,
    },
    {
      slug: "como-publicar-sua-primeira-materia",
      title: "Como publicar sua primeira matéria",
      subtitle: "Um passo a passo do painel administrativo, do rascunho à publicação.",
      category: "tecnologia",
      featured: 0,
      content: `> **Matéria de exemplo.** Serve como manual rápido do painel.\n\n1. Acesse \`/admin\` e faça login.\n2. Clique em **Nova matéria**.\n3. Preencha título, linha fina, editoria e autor.\n4. Envie a imagem de capa — ela vai para o bucket R2.\n5. Escreva o texto em Markdown e clique em **Publicar**.\n\nPara publicar de forma automatizada, use a rota \`POST /api/publish\` com o cabeçalho \`x-agent-api-key\`.`,
    },
    {
      slug: "a-newsletter-do-diario-mello",
      title: `A newsletter do ${BRAND.name}`,
      subtitle: "Cadastre seu e-mail e receba o resumo das principais notícias.",
      category: "cultura",
      featured: 0,
      content: `> **Matéria de exemplo.**\n\nO formulário no rodapé guarda os e-mails na tabela \`newsletter_subscribers\`. O disparo do boletim pode ser ligado depois, sem mexer no site.`,
    },
  ];

  await d1.batch(
    demos.map((demo, index) =>
      d1
        .prepare(
          `INSERT OR IGNORE INTO articles
            (id, title, slug, subtitle, content, category_id, author_id, status, featured, published_at, created_at, updated_at, views_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLICADA', ?, ?, ?, ?, 0)`,
        )
        .bind(
          crypto.randomUUID(),
          demo.title,
          demo.slug,
          demo.subtitle,
          demo.content,
          bySlug.get(demo.category) ?? null,
          author?.id ?? null,
          demo.featured,
          new Date(now.getTime() - index * 3600_000).toISOString(),
          now.toISOString(),
          now.toISOString(),
        ),
    ),
  );
}
