import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "../../../components/portal/ArticleCard";
import { Img } from "../../../components/portal/Img";
import { Newsletter } from "../../../components/portal/Newsletter";
import { DatabaseMissing, PortalShell } from "../../../components/portal/PortalShell";
import { ShareButtons } from "../../../components/portal/ShareButtons";
import { BRAND } from "../../../lib/portal/brand";
import { getPortalDb } from "../../../lib/portal/db";
import { formatDateTime } from "../../../lib/portal/format";
import { excerpt, leadParagraphs, readingMinutes, renderMarkdown } from "../../../lib/portal/markdown";
import {
  getArticleBySlug,
  incrementViews,
  isArticleSaved,
  isVisible,
  relatedArticles,
  tagsOfArticle,
} from "../../../lib/portal/queries";
import { AccessGate } from "../../../components/portal/AccessGate";
import {
  ClassificationNotice,
  ClassificationTag,
} from "../../../components/portal/ClassificationTag";
import { listCorrections } from "../../../lib/portal/corrections";
import { formatDate, formatDateTime as formatCorrecao } from "../../../lib/portal/format";
import { SaveArticleButton } from "../../../components/portal/SaveArticleButton";
import { currentReader } from "../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

/** Meta tags dinâmicas (SEO + Open Graph) por matéria. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getPortalDb();
  const article = db ? await getArticleBySlug(db, slug) : null;
  if (!article || !isVisible(article)) return { title: "Matéria não encontrada" };

  const description = article.subtitle?.trim() || excerpt(article.content, 180);
  const images = article.coverImageUrl ? [article.coverImageUrl] : undefined;

  return {
    title: article.title,
    description,
    alternates: { canonical: `/noticia/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      images,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: article.authorName ? [article.authorName] : undefined,
      section: article.categoryName ?? undefined,
      siteName: BRAND.name,
    },
    twitter: { card: "summary_large_image", title: article.title, description, images },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const db = await getPortalDb();
  if (!db) {
    return (
      <PortalShell>
        <DatabaseMissing />
      </PortalShell>
    );
  }

  const article = await getArticleBySlug(db, slug);
  if (!article || !isVisible(article)) notFound();

  const reader = await currentReader();
  const [tags, related, saved, correcoes] = await Promise.all([
    tagsOfArticle(db, article.id),
    relatedArticles(db, article, 4),
    reader ? isArticleSaved(db, reader.sub, article.id) : Promise.resolve(false),
    listCorrections(db, article.id),
  ]);

  // Matéria exclusiva + visitante sem conta: mostramos só a abertura do texto.
  const restricted = article.accessLevel === "registered" && !reader;

  // Contador de visualizações: uma falha aqui nunca pode derrubar a página.
  try {
    await incrementViews(db, article.id);
  } catch {
    /* contador é informativo, segue o jogo */
  }

  const body = renderMarkdown(
    restricted ? leadParagraphs(article.content, 2) : article.content,
  );
  const minutes = readingMinutes(article.content);

  // Dados estruturados ajudam o Google a entender que isto é uma notícia.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.subtitle ?? excerpt(article.content, 180),
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    articleSection: article.categoryName ?? undefined,
    // Sinaliza ao Google que parte do texto exige cadastro — é o formato que
    // evita ser tratado como conteúdo escondido do buscador.
    isAccessibleForFree: article.accessLevel === "registered" ? "False" : "True",
    hasPart:
      article.accessLevel === "registered"
        ? {
            "@type": "WebPageElement",
            isAccessibleForFree: "False",
            cssSelector: ".dm-prose",
          }
        : undefined,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    publisher: { "@type": "Organization", name: BRAND.name },
  };

  return (
    <PortalShell>
      <div className="dm-wrap">
        <article className="dm-article">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <div className="dm-article-kickers">
            {article.categoryName ? (
              <Link href={`/editoria/${article.categorySlug}`}>
                <span className="dm-kicker dm-kicker-block" style={{ background: article.categoryColor ?? undefined }}>
                  {article.categoryName}
                </span>
              </Link>
            ) : null}
            {article.accessLevel === "registered" ? (
              <span className="dm-kicker dm-kicker-exclusive">Exclusiva</span>
            ) : null}
            <ClassificationTag classification={article.classification} />
          </div>

          <h1 className="dm-article-title">{article.title}</h1>
          {article.subtitle ? <p className="dm-article-deck">{article.subtitle}</p> : null}

          <div className="dm-byline">
            {article.authorAvatar ? (
              <Img src={article.authorAvatar} alt={article.authorName ?? ""} className="dm-avatar" />
            ) : (
              <span className="dm-avatar-fallback" aria-hidden="true">
                {(article.authorName ?? BRAND.initials).slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="dm-meta" style={{ display: "block" }}>
              <div>
                <strong>{article.authorName ?? BRAND.defaultAuthorName}</strong>
              </div>
              <div>
                {formatDateTime(article.publishedAt ?? article.updatedAt)}
                <span className="dm-dot" style={{ marginLeft: 8 }}>{minutes} min de leitura</span>
              </div>
            </div>
          </div>

          <ClassificationNotice
            classification={article.classification}
            authorName={article.authorName}
          />

          {/*
            Transparência sobre o que o leitor tem na frente: texto escrito e
            publicado pelo agente editorial, ainda sem conferência humana. O
            aviso some quando alguém da redação registra a conferência.
          */}
          {article.origin === "integracao" && !article.lastReviewedAt ? (
            <p className="dm-aviso-agente">
              Texto produzido e publicado automaticamente pelo agente editorial do {BRAND.name},
              dentro das regras de conteúdo explicativo. Ainda não passou por conferência humana.{" "}
              <Link href="/uso-de-ia">Como usamos inteligência artificial</Link>.
            </p>
          ) : null}

          {article.coverImageUrl ? (
            <figure className="dm-figure">
              <Img src={article.coverImageUrl} alt={article.title} loading="eager" />
              {article.coverCredit || article.coverSource ? (
                <figcaption>
                  {[article.coverCredit, article.coverSource].filter(Boolean).join(" · ")}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {/* O HTML vem do nosso renderizador de Markdown, que escapa a entrada. */}
          <div
            className={`dm-prose${restricted ? " dm-prose-preview" : ""}`}
            dangerouslySetInnerHTML={{ __html: body }}
          />

          {restricted ? (
            <AccessGate returnTo={`/noticia/${article.slug}`} />
          ) : (
            <ShareButtons
              title={article.title}
              extra={
                <SaveArticleButton
                  articleId={article.id}
                  articleSlug={article.slug}
                  initialSaved={saved}
                  loggedIn={Boolean(reader)}
                />
              }
            />
          )}

          <p className="dm-validade">
            {article.contentType === "AGENDA" && article.eventDate
              ? `Agenda: evento em ${formatDate(article.eventDate)}. Esta página sai do ar depois dessa data.`
              : article.contentType === "PRAZO" && article.expiresAt
                ? `Informação válida até ${formatDate(article.expiresAt)}.`
                : article.lastReviewedAt
                  ? `Conteúdo revisado em ${formatDate(article.lastReviewedAt)}${
                      article.reviewDueAt ? `. Próxima revisão prevista para ${formatDate(article.reviewDueAt)}` : ""
                    }.`
                  : ""}
          </p>

          {correcoes.length ? (
            <section className="dm-correcoes" aria-labelledby="dm-correcoes-titulo">
              <h2 id="dm-correcoes-titulo">
                {correcoes.length === 1 ? "Correção" : "Correções"}
              </h2>
              {correcoes.map((correcao) => (
                <p key={correcao.id}>
                  <strong>Correção: {formatCorrecao(correcao.createdAt)}</strong> — {correcao.description}
                </p>
              ))}
            </section>
          ) : null}

          {tags.length ? (
            <div className="dm-tags">
              {tags.map((tag) => (
                <Link key={tag.id} href={`/busca?q=${encodeURIComponent(tag.name)}`} className="dm-tag">
                  #{tag.name}
                </Link>
              ))}
            </div>
          ) : null}
        </article>

        {related.length ? (
          <section className="dm-section">
            <div className="dm-section-head">
              <h2 className="dm-section-title">
                Leia <span>também</span>
              </h2>
            </div>
            <div className="dm-grid dm-grid-4">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} showDeck={false} />
              ))}
            </div>
          </section>
        ) : null}

        <Newsletter />
      </div>
    </PortalShell>
  );
}
