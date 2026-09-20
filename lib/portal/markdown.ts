/**
 * Renderizador de Markdown próprio (sem dependências externas).
 *
 * SEGURANÇA: todo o texto é escapado ANTES de qualquer conversão, e só as tags
 * geradas aqui chegam ao HTML final. Isso significa que HTML colado dentro da
 * matéria aparece como texto, nunca como marcação executável — é o que impede
 * XSS vindo do editor do painel ou da rota /api/publish.
 */

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE[char]);
}

/** Só aceitamos links http(s), mailto e caminhos internos. */
function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(https?:\/\/|mailto:|\/)/i.test(url)) return url;
  return null;
}

/**
 * Rótulo curto para um endereço solto no meio do texto.
 *
 * Uma URL de 120 caracteres no corpo da matéria é ruído: quebra a linha,
 * atrapalha a leitura e não diz nada ao leitor. O domínio diz de onde vem a
 * informação, que é o que interessa — o endereço completo continua no link.
 */
export function linkLabel(url: string): string {
  const semProtocolo = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const host = semProtocolo.split("/")[0];
  return host || url;
}

function anchor(href: string, label: string): string {
  const externo = /^https?:\/\//i.test(href);
  const attrs = externo ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${href}"${attrs}>${label}</a>`;
}

/**
 * Trechos já convertidos ficam guardados atrás de um marcador enquanto o
 * resto da linha é processado. Sem isso, o endereço de um link markdown seria
 * "linkado" de novo pela regra de URL solta, e o HTML sairia aninhado.
 */
function inline(text: string): string {
  let out = escapeHtml(text);
  const prontos: string[] = [];
  const guardar = (html: string) => {
    prontos.push(html);
    return `\u0000${prontos.length - 1}\u0000`;
  };

  // `código`
  out = out.replace(/`([^`]+)`/g, (_m, code) => guardar(`<code>${code}</code>`));

  // ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, src) => {
    const href = safeUrl(src);
    return href ? guardar(`<img src="${href}" alt="${alt}" loading="lazy" />`) : match;
  });

  // [texto](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, src) => {
    const href = safeUrl(src);
    return href ? guardar(anchor(href, label)) : match;
  });

  // Endereço solto: vira link com o domínio à mostra, não a URL inteira.
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_m, antes: string, url: string) => {
    const limpo = url.replace(/[.,;:!?]+$/, "");
    const sobra = url.slice(limpo.length);
    const href = safeUrl(limpo);
    if (!href) return `${antes}${url}`;
    return `${antes}${guardar(anchor(href, linkLabel(limpo)))}${sobra}`;
  });

  // **negrito** e *itálico*
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return out.replace(/\u0000(\d+)\u0000/g, (_m, indice: string) => prontos[Number(indice)] ?? "");
}

/** Converte Markdown (ou HTML já escapado) em HTML pronto para exibição. */
/** Títulos que abrem a lista de fontes no pé da matéria. */
const SECAO_DE_FONTES = /^(fontes|fontes consultadas|refer[êe]ncias|saiba mais|para saber mais)$/i;

export function renderMarkdown(source: string): string {
  const lines = (source ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { lang: string; lines: string[] } | null = null;
  let emFontes = false;

  // "Fonte: ..." no meio do texto é nota de rodapé, não parágrafo: entra em
  // corpo menor e cor discreta, para não competir com a leitura.
  const NOTA_DE_FONTE = /^fontes?\s*[:\u2014-]/i;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const texto = paragraph.join(" ");
    const classe = NOTA_DE_FONTE.test(texto.trim()) ? ' class="dm-fonte"' : "";
    html.push(`<p${classe}>${inline(texto)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item) => `<li>${inline(item)}</li>`).join("");
    html.push(`<${list.type}>${items}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (code) {
      if (line.trim().startsWith("```")) {
        html.push(`<pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre>`);
        code = null;
      } else {
        code.lines.push(rawLine);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushAll();
      code = { lang: line.trim().slice(3).trim(), lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      // O h1 da página é o título da matéria, então "#" no corpo vira h2.
      const level = Math.min(Math.max(heading[1].length, 2), 6);
      // A lista de fontes no fim da matéria é um apêndice: ganha moldura
      // própria e some do corpo principal do texto.
      if (!emFontes && SECAO_DE_FONTES.test(heading[2].trim())) {
        emFontes = true;
        html.push('<section class="dm-fontes-texto" aria-label="Fontes desta matéria">');
      }
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(line.trim())) {
      flushAll();
      html.push("<hr />");
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (code) html.push(`<pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre>`);
  flushAll();
  if (emFontes) html.push("</section>");

  return html.join("\n");
}

/** Texto puro (sem marcação) — usado em meta description e chamadas. */
export function plainText(source: string): string {
  return (source ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resumo curto para cards e meta tags. */
export function excerpt(source: string, limit = 180): string {
  const text = plainText(source);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

/**
 * Primeiros parágrafos do texto — o trecho que fica visível numa matéria
 * exclusiva antes do convite para criar conta.
 */
export function leadParagraphs(source: string, count = 2): string {
  const blocks = (source ?? "").replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const lead: string[] = [];
  for (const block of blocks) {
    if (lead.length >= count) break;
    const clean = block.trim();
    // Pula títulos e citações: queremos parágrafos de verdade na prévia.
    if (!clean || clean.startsWith("#") || clean.startsWith(">")) continue;
    lead.push(clean);
  }
  return lead.join("\n\n");
}

/** Tempo estimado de leitura, em minutos (200 palavras/min). */
export function readingMinutes(source: string): number {
  const words = plainText(source).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
