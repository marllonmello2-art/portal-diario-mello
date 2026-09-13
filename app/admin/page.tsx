import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "../../components/admin/AdminShell";
import { getPortalDb } from "../../lib/portal/db";
import { formatShort } from "../../lib/portal/format";
import { adminListArticles, listCategories, maintenanceQueue } from "../../lib/portal/queries";
import { CONTENT_TYPE_LABEL } from "../../lib/portal/lifecycle";
import { requireAdmin } from "../../lib/portal/session-server";
import {
  AUTHORING_STATUSES,
  PUBLIC_STATUSES,
  STATUSES,
  STATUS_LABEL,
  canCreateArticle,
  hasRole,
} from "../../lib/portal/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

/** Cor da etiqueta por etapa do fluxo. */
const STATUS_TOM: Record<string, string> = {
  RASCUNHO: "rascunho",
  EM_APURACAO: "producao",
  EM_REDACAO: "producao",
  EM_REVISAO: "revisao",
  EM_REVISAO_JURIDICA: "revisao",
  APROVADA: "aprovada",
  AGENDADA: "agendada",
  PUBLICADA: "publicada",
  CORRIGIDA: "publicada",
  ARQUIVADA: "arquivada",
};

/** Dashboard: lista de matérias com filtros por editoria e status. */
export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; editoria?: string; q?: string; sem_permissao?: string }>;
}) {
  const session = await requireAdmin();
  const filters = await searchParams;
  const db = await getPortalDb();
  const soVeOProprio = !hasRole(session, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">
          <h2>Banco não conectado</h2>
          <p>Conecte o binding D1 (<code>DB</code>) para usar o painel.</p>
        </div>
      </AdminShell>
    );
  }

  const [articles, categories, manutencao] = await Promise.all([
    adminListArticles(db, {
      status: filters.status || undefined,
      categoryId: filters.editoria || undefined,
      search: filters.q || undefined,
      onlyAuthorUserId: soVeOProprio ? session.sub : undefined,
    }),
    listCategories(db),
    hasRole(session, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR")
      ? maintenanceQueue(db)
      : Promise.resolve([]),
  ]);

  const noAr = articles.filter((article) => PUBLIC_STATUSES.includes(article.status as never)).length;
  const emProducao = articles.filter((article) =>
    AUTHORING_STATUSES.includes(article.status as never),
  ).length;
  const aguardando = articles.filter(
    (article) => article.status === "EM_REVISAO" || article.status === "EM_REVISAO_JURIDICA",
  ).length;
  const aprovadas = articles.filter((article) => article.status === "APROVADA").length;

  return (
    <AdminShell user={session}>
      <div className="dm-admin-head">
        <h1>Matérias</h1>
        {canCreateArticle(session) ? (
          <Link href="/admin/materias/nova" className="dm-btn">
            + Nova matéria
          </Link>
        ) : null}
      </div>

      {filters.sem_permissao ? (
        <p className="dm-aviso">Seu perfil não tem acesso àquela área do painel.</p>
      ) : null}

      <div className="dm-stat-row">
        <div className="dm-stat">
          <strong>{emProducao}</strong>
          <span>Em produção</span>
        </div>
        <div className="dm-stat dm-stat-atencao">
          <strong>{aguardando}</strong>
          <span>Aguardando revisão</span>
        </div>
        <div className="dm-stat">
          <strong>{aprovadas}</strong>
          <span>Aprovadas, prontas</span>
        </div>
        <div className="dm-stat">
          <strong>{noAr}</strong>
          <span>No ar</span>
        </div>
      </div>

      {manutencao.length ? (
        <div className="dm-panel">
          <h2>Precisa de revisão</h2>
          <p className="dm-note" style={{ color: "#6b7280", marginTop: -6 }}>
            Matérias que passaram da data de revisão, ou que saíram do site sozinhas porque o
            evento ou o prazo venceu.
          </p>
          <table className="dm-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Revisão prevista</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {manutencao.map((article) => (
                <tr key={article.id}>
                  <td>
                    <Link href={`/admin/materias/${article.id}`}>{article.title}</Link>
                  </td>
                  <td>
                    {CONTENT_TYPE_LABEL[article.contentType as keyof typeof CONTENT_TYPE_LABEL] ??
                      article.contentType}
                  </td>
                  <td>{formatShort(article.reviewDueAt)}</td>
                  <td>
                    {article.eventDate
                      ? `evento em ${article.eventDate}`
                      : article.expiresAt
                        ? `valia até ${article.expiresAt}`
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="dm-panel">
        {/* Filtros via GET: recarregam a página sem precisar de JavaScript. */}
        <form className="dm-toolbar" method="get">
          <input type="search" name="q" placeholder="Buscar no título ou no texto" defaultValue={filters.q ?? ""} />
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos os estados</option>
            {STATUSES.map((estado) => (
              <option key={estado} value={estado}>
                {STATUS_LABEL[estado]}
              </option>
            ))}
          </select>
          <select name="editoria" defaultValue={filters.editoria ?? ""}>
            <option value="">Todas as editorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit" className="dm-btn dm-btn-ghost">
            Filtrar
          </button>
        </form>

        <table className="dm-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Editoria</th>
              <th>Assinatura</th>
              <th>Estado</th>
              <th>Atualizada</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <Link href={`/admin/materias/${article.id}`}>{article.title}</Link>
                  {article.featured ? (
                    <span className="dm-badge dm-badge-scheduled" style={{ marginLeft: 8 }}>
                      Destaque
                    </span>
                  ) : null}
                  {article.accessLevel === "registered" ? (
                    <span className="dm-badge dm-badge-exclusive" style={{ marginLeft: 8 }}>
                      Exclusiva
                    </span>
                  ) : null}
                  {article.origin === "integracao" || article.aiAssisted ? (
                    <span className="dm-badge dm-badge-ia" style={{ marginLeft: 8 }} title="Texto com assistência de IA">
                      IA
                    </span>
                  ) : null}
                </td>
                <td>{article.categoryName ?? "—"}</td>
                <td>{article.authorName ?? "—"}</td>
                <td>
                  <span className={`dm-badge dm-badge-${STATUS_TOM[article.status] ?? "rascunho"}`}>
                    {STATUS_LABEL[article.status as keyof typeof STATUS_LABEL] ?? article.status}
                  </span>
                </td>
                <td>{formatShort(article.updatedAt)}</td>
                <td>{article.viewsCount}</td>
              </tr>
            ))}
            {articles.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "#6b7280", padding: "26px 10px" }}>
                  Nenhuma matéria encontrada com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
