import { categories } from "../../db/schema";
import { getPortalDb } from "../../lib/portal/db";
import { sitemapArticles } from "../../lib/portal/queries";

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sitemap gerado a partir das matérias e editorias publicadas.
 *
 * A lista de matérias vem de `sitemapArticles`, que usa a mesma condição de
 * visibilidade das páginas do site. Esta rota já teve a regra escrita à mão,
 * com o vocabulário antigo de status, e ficou meses sem listar matéria
 * nenhuma — duplicar essa lógica aqui é o erro a não repetir.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const db = await getPortalDb();

  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: `${origin}/`, priority: "1.0" },
    { loc: `${origin}/sobre`, priority: "0.3" },
    { loc: `${origin}/contato`, priority: "0.3" },
    { loc: `${origin}/expediente`, priority: "0.2" },
    { loc: `${origin}/privacidade`, priority: "0.2" },
  ];

  if (db) {
    const [categoryRows, articleRows] = await Promise.all([
      db.select().from(categories).orderBy(categories.position),
      sitemapArticles(db),
    ]);

    for (const category of categoryRows) {
      urls.push({ loc: `${origin}/editoria/${category.slug}`, priority: "0.6" });
    }
    for (const article of articleRows) {
      urls.push({
        loc: `${origin}/noticia/${article.slug}`,
        lastmod: article.updatedAt ?? article.publishedAt ?? undefined,
        priority: "0.8",
      });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `  <url><loc>${xmlEscape(url.loc)}</loc>${
        url.lastmod ? `<lastmod>${xmlEscape(new Date(url.lastmod).toISOString())}</lastmod>` : ""
      }<priority>${url.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}
