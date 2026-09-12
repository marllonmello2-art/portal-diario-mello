import Link from "next/link";
import type { Metadata } from "next";
import { ArticleCard } from "../../components/portal/ArticleCard";
import { DatabaseMissing, PortalShell } from "../../components/portal/PortalShell";
import { getPortalDb } from "../../lib/portal/db";
import { savedArticles } from "../../lib/portal/queries";
import { requireReader } from "../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Minhas leituras", robots: { index: false } };

/** Lista das matérias que o leitor salvou para ler depois. */
export default async function SavedPage() {
  const reader = await requireReader("/minhas-leituras");
  const db = await getPortalDb();
  if (!db) {
    return (
      <PortalShell>
        <DatabaseMissing />
      </PortalShell>
    );
  }

  const saved = await savedArticles(db, reader.sub);

  return (
    <PortalShell>
      <div className="dm-wrap">
        <header className="dm-page-head">
          <span className="dm-kicker">Sua conta</span>
          <h1 className="dm-page-title">Minhas leituras</h1>
          <p className="dm-page-sub">
            {saved.length
              ? `${saved.length} ${saved.length === 1 ? "matéria salva" : "matérias salvas"}`
              : "Nada salvo ainda."}
          </p>
        </header>

        {saved.length ? (
          <div className="dm-grid dm-grid-3">
            {saved.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="dm-empty">
            Use o botão <strong>☆ Salvar</strong> em qualquer matéria para guardá-la aqui.{" "}
            <Link href="/">Ver a capa</Link>.
          </p>
        )}
      </div>
    </PortalShell>
  );
}
