import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminShell } from "../../../../components/admin/AdminShell";
import { ArticleEditor } from "../../../../components/admin/ArticleEditor";
import { WorkflowPanel } from "../../../../components/admin/WorkflowPanel";
import { AuditTrail } from "../../../../components/admin/AuditTrail";
import { SourcesPanel } from "../../../../components/admin/SourcesPanel";
import { CorrectionPanel } from "../../../../components/admin/CorrectionPanel";
import { listCorrections } from "../../../../lib/portal/corrections";
import { hasRole } from "../../../../lib/portal/permissions";
import { listSources } from "../../../../lib/portal/sources";
import { requiresConfirmedSource } from "../../../../lib/portal/classification";
import { listAudit } from "../../../../lib/portal/audit";
import { getPortalDb } from "../../../../lib/portal/db";
import { toLocalInput } from "../../../../lib/portal/format";
import { normalizeStatus } from "../../../../lib/portal/articles";
import { allowedTransitions, canEditArticle } from "../../../../lib/portal/permissions";
import { getArticleById, listAuthors, listCategories, tagsOfArticle } from "../../../../lib/portal/queries";
import { requireAdmin } from "../../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Editar matéria", robots: { index: false } };

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/materias/${id}`);
  const db = await getPortalDb();

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">Banco não conectado.</div>
      </AdminShell>
    );
  }

  const article = await getArticleById(db, id);
  if (!article) notFound();

  const status = normalizeStatus(article.status);
  const [categories, authors, tags, historico, fontes, correcoes] = await Promise.all([
    listCategories(db),
    listAuthors(db),
    tagsOfArticle(db, id),
    listAudit(db, { entity: "article", entityId: id, limit: 30 }),
    listSources(db, id),
    listCorrections(db, id),
  ]);

  // Quem decide se esta pessoa edita é o mesmo módulo que a API consulta.
  const podeEditar = canEditArticle(session, {
    status,
    authorUserId: article.createdByUserId,
  });
  const transicoes = allowedTransitions(session, status);

  return (
    <AdminShell user={session}>
      <ArticleEditor
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        authors={authors.map((author) => ({ id: author.id, name: author.name }))}
        readOnly={!podeEditar.ok}
        readOnlyReason={podeEditar.ok ? undefined : podeEditar.reason}
        article={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          subtitle: article.subtitle,
          content: article.content,
          coverImageUrl: article.coverImageUrl,
          coverCredit: article.coverCredit,
          categoryId: article.categoryId,
          authorId: article.authorId,
          status: article.status,
          accessLevel: article.accessLevel,
          featured: article.featured,
          publishedAt: article.publishedAt,
          origin: article.origin,
          aiAssisted: article.aiAssisted,
          classification: article.classification,
          contentType: article.contentType,
          reviewDueAt: article.reviewDueAt,
          eventDate: article.eventDate,
          expiresAt: article.expiresAt,
          riskSourceOk: article.riskSourceOk,
          riskNoPersonOk: article.riskNoPersonOk,
          riskNoAdviceOk: article.riskNoAdviceOk,
          riskImageOk: article.riskImageOk,
          coverSource: article.coverSource,
          coverLicense: article.coverLicense,
          coverObtainedAt: null,
          coverUsageNote: null,
          coverAiGenerated: article.coverAiGenerated,
        }}
        initialTags={tags.map((tag) => tag.name)}
      />

      <div className="dm-editor-layout" style={{ marginTop: 18 }}>
        <SourcesPanel
          articleId={article.id}
          fontes={fontes}
          exigeConfirmada={requiresConfirmedSource(article.classification)}
          somenteLeitura={!podeEditar.ok}
        />
        <div>
          <WorkflowPanel
            articleId={article.id}
            status={status}
            transitions={transicoes}
            scheduledFor={toLocalInput(article.publishedAt) || toLocalInput(new Date().toISOString())}
          />
          <CorrectionPanel
            articleId={article.id}
            correcoes={correcoes}
            podeCorrigir={hasRole(session, "EDITOR_CHEFE")}
            publicada={status === "PUBLICADA" || status === "CORRIGIDA"}
          />
          <AuditTrail eventos={historico} />
        </div>
      </div>
    </AdminShell>
  );
}
