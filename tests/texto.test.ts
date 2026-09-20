/**
 * Como a matéria aparece na página.
 *
 * O agente cita fonte em todo parágrafo — é o que se pede dele. O que não dá
 * é despejar uma URL de 120 caracteres no meio da leitura. Estas regras
 * arrumam a citação sem esconder de onde veio a informação.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { linkLabel, renderMarkdown } from "../lib/portal/markdown.ts";

test("endereço solto vira link com o domínio à mostra", () => {
  const html = renderMarkdown(
    "Veja https://multirio.rio.rj.gov.br/index.php/reportagens/17260-historia-dos-meios para mais.",
  );
  assert.match(html, /href="https:\/\/multirio\.rio\.rj\.gov\.br\/index\.php[^"]*"/);
  assert.match(html, />multirio\.rio\.rj\.gov\.br</);
  assert.ok(!html.includes(">https://"), "a URL inteira não aparece como texto");
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test("link markdown continua com o rótulo escrito pela redação", () => {
  const html = renderMarkdown("A [Brasiliana Fotográfica](https://brasilianafotografica.bn.gov.br/?p=29732) registra o fato.");
  assert.match(html, />Brasiliana Fotográfica</);
  // Uma âncora só: a regra de URL solta não pode linkar de novo o que já é link.
  assert.equal(html.match(/<a /g)?.length, 1);
});

test("parágrafo que começa com Fonte vira nota discreta", () => {
  const html = renderMarkdown("Texto.\n\nFonte: MultiRio — História: https://multirio.rio.rj.gov.br/x");
  assert.match(html, /<p class="dm-fonte">Fonte: MultiRio/);
  assert.match(renderMarkdown("Fontes — Banco Central"), /class="dm-fonte"/);
  assert.ok(!renderMarkdown("Fonte de energia limpa no país.").includes("dm-fonte"));
});

test("a lista de fontes do fim ganha moldura própria", () => {
  const html = renderMarkdown("Texto.\n\n## Fontes\n\n- [MultiRio](https://multirio.rio.rj.gov.br/x)");
  assert.match(html, /<section class="dm-fontes-texto"/);
  assert.ok(html.trimEnd().endsWith("</section>"), "a seção é fechada");
  assert.equal(html.match(/<section/g)?.length, 1);

  for (const titulo of ["## Referências", "## Saiba mais", "### Fontes consultadas"]) {
    assert.match(renderMarkdown(`Texto.\n\n${titulo}\n\n- item`), /dm-fontes-texto/, titulo);
  }
  assert.ok(!renderMarkdown("## Como funciona\n\nTexto").includes("dm-fontes-texto"));
});

test("endereço perigoso não vira link e HTML colado continua escapado", () => {
  const html = renderMarkdown("Clique em [aqui](javascript:alert(1)) e <script>alert(2)</script>.");
  assert.ok(!html.includes("<a "), "javascript: nunca vira link");
  assert.ok(!html.includes("<script>"), "HTML colado aparece como texto");
  assert.match(html, /&lt;script&gt;/);
});

test("pontuação depois do endereço fica fora do link", () => {
  const html = renderMarkdown("Consulte https://www.bcb.gov.br/pix.");
  assert.match(html, /href="https:\/\/www\.bcb\.gov\.br\/pix"/);
  assert.match(html, /<\/a>\./);
  assert.equal(linkLabel("https://www.bcb.gov.br/pix"), "bcb.gov.br");
});
