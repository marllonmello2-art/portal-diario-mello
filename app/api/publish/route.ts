import { autoPublishArticle, createArticle, normalizeContentType } from "../../../lib/portal/articles";
import { recordAudit, requestIp } from "../../../lib/portal/audit";
import { getEnvSecret } from "../../../lib/portal/auth";
import {
  AUTO_PUBLISH_LIMIT_DAY,
  AUTO_PUBLISH_LIMIT_HOUR,
  blockMessage,
  evaluateAutoPublish,
} from "../../../lib/portal/auto-publish";
import { getPortalDb } from "../../../lib/portal/db";
import { nextReviewDate } from "../../../lib/portal/lifecycle";
import { excerpt } from "../../../lib/portal/markdown";
import { INTEGRATION_ENTRY_STATUS, STATUS_LABEL } from "../../../lib/portal/permissions";
import { checkRateLimit, tooManyRequests } from "../../../lib/portal/rate-limit";
import { autoPublishEnabled } from "../../../lib/portal/settings";

export const dynamic = "force-dynamic";

/**
 * Entrada do agente editorial.
 *
 * AUTENTICAÇÃO: cabeçalho `x-agent-api-key`, comparado em tempo constante com
 * o secret `AGENT_API_KEY` do Worker. A chave nunca aparece no código; sem ela
 * configurada, a rota responde 503 em vez de aceitar qualquer chamada.
 *
 * FLUXO: a matéria é sempre gravada primeiro em revisão. Se for conteúdo
 * explicativo, estiver completa e passar no selo de baixo risco, o agente
 * publica na sequência. Se faltar qualquer item, ela fica na fila e a resposta
 * diz exatamente o que faltou — o agente conserta e reenvia, ou uma pessoa
 * resolve no painel.
 */

type RiskFlags = {
  fonte_verificavel?: boolean;
  sem_pessoa_exposta?: boolean;
  sem_aconselhamento?: boolean;
  imagem_regular?: boolean;
};

type PublishBody = {
  title?: string;
  subtitle?: string;
  content?: string;
  category_slug?: string;
  category_id?: string;
  author_id?: string;
  author_name?: string;
  tags?: string[];
  cover_image_url?: string;
  cover_credit?: string;
  cover_source?: string;
  cover_license?: string;
  cover_ai_generated?: boolean;
  access_level?: string;
  classification?: string;
  content_type?: string;
  event_date?: string;
  expires_at?: string;
  baixo_risco?: RiskFlags;
  /** `false` manda a matéria para a fila humana mesmo que ela pudesse ir ao ar. */
  publicar?: boolean;
};

/** Comparação em tempo constante entre a chave enviada e o secret. */
function secureEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function authorize(request: Request): Promise<Response | null> {
  const configured = (await getEnvSecret("AGENT_API_KEY")) ?? (await getEnvSecret("PORTAL_AGENT_API_KEY"));
  if (!configured) {
    return Response.json(
      {
        code: "AGENT_KEY_NOT_CONFIGURED",
        error:
          "Defina o secret AGENT_API_KEY no ambiente do Worker para habilitar a publicação automatizada.",
      },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-agent-api-key") ?? "";
  if (!provided || !secureEquals(provided, configured)) {
    return Response.json(
      { code: "INVALID_AGENT_KEY", error: "Chave de agente inválida." },
      { status: 401 },
    );
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return Response.json({ code: "INVALID_JSON", error: "Envie um JSON válido." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const content = (body.content ?? "").trim();
  const missing: string[] = [];
  if (!title) missing.push("title");
  if (!content) missing.push("content");
  if (missing.length) {
    return Response.json(
      { code: "MISSING_FIELDS", error: `Campos obrigatórios ausentes: ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Banco D1 não conectado." },
      { status: 503 },
    );
  }

  // Teto de envios: mesmo o que vai para a fila humana passa por aqui, para
  // um agente em laço não encher o banco. Só é cobrado depois da validação.
  const envios = await checkRateLimit(db, "agente:envio", { limit: 20, windowSeconds: 3600 });
  if (!envios.ok) {
    return tooManyRequests(
      envios.retryAfter,
      "O agente já enviou muitas matérias nesta hora. Aguarde antes de enviar outra.",
    );
  }

  const ip = requestIp(request);
  const flags = body.baixo_risco ?? {};
  const contentType = normalizeContentType(body.content_type);
  const agora = new Date();
  // Data da próxima revisão é conta do sistema, não julgamento editorial.
  const reviewDueAt = nextReviewDate(contentType, agora, {
    eventDate: body.event_date ?? null,
    expiresAt: body.expires_at ?? null,
  });

  const article = await createArticle(db, {
    title,
    subtitle: body.subtitle ?? null,
    content,
    categorySlug: body.category_slug ?? null,
    categoryId: body.category_id ?? null,
    authorId: body.author_id ?? null,
    authorName: body.author_name ?? null,
    coverImageUrl: body.cover_image_url ?? null,
    coverCredit: body.cover_credit ?? null,
    coverSource: body.cover_source ?? null,
    coverLicense: body.cover_license ?? null,
    coverAiGenerated: Boolean(body.cover_ai_generated),
    tags: Array.isArray(body.tags) ? body.tags.filter((tag) => typeof tag === "string") : [],
    status: INTEGRATION_ENTRY_STATUS,
    // Sem classificação declarada, vale a linha atual do portal: explicação e
    // serviço. As demais travas continuam valendo do mesmo jeito.
    classification: body.classification ?? "EXPLICATIVO",
    contentType,
    eventDate: body.event_date ?? null,
    expiresAt: body.expires_at ?? null,
    reviewDueAt,
    riskSourceOk: Boolean(flags.fonte_verificavel),
    riskNoPersonOk: Boolean(flags.sem_pessoa_exposta),
    riskNoAdviceOk: Boolean(flags.sem_aconselhamento),
    riskImageOk: Boolean(flags.imagem_regular),
    accessLevel: body.access_level ?? null,
    featured: false,
    origin: "integracao",
    aiAssisted: true,
  });

  if (!article) {
    return Response.json(
      { code: "CREATE_FAILED", error: "Não foi possível criar a matéria." },
      { status: 500 },
    );
  }

  await recordAudit(db, { kind: "integracao", label: "agente via x-agent-api-key" }, {
    action: "article.create",
    entity: "article",
    entityId: article.id,
    toStatus: article.status,
    note: "matéria recebida do agente editorial",
    metadata: { titulo: article.title },
    ip,
  });

  const origin = new URL(request.url).origin;
  const resposta = (extra: Record<string, unknown>, status = 201) =>
    Response.json(
      {
        ok: true,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          subtitle: article.subtitle,
          classification: article.classification,
          content_type: article.contentType,
          access_level: article.accessLevel,
          category: article.categoryName,
          category_slug: article.categorySlug,
          author: article.authorName,
          cover_image_url: article.coverImageUrl,
          excerpt: excerpt(article.content, 200),
          painel: `${origin}/admin/materias/${article.id}`,
        },
        ...extra,
      },
      { status },
    );

  const naFila = (aviso: string, motivos: string[]) =>
    resposta({
      publicada: false,
      status: INTEGRATION_ENTRY_STATUS,
      status_descricao: STATUS_LABEL[INTEGRATION_ENTRY_STATUS],
      aviso,
      motivos,
      url_apos_publicacao: `${origin}/noticia/${article.slug}`,
    });

  if (body.publicar === false) {
    return naFila("Matéria criada na fila de revisão, como você pediu.", []);
  }

  if (!(await autoPublishEnabled(db))) {
    return naFila(
      "A publicação automática está desligada no painel. A matéria ficou na fila de revisão.",
      ["Publicação automática desligada por decisão da redação."],
    );
  }

  const decisao = evaluateAutoPublish({
    classification: article.classification,
    contentType,
    title: article.title,
    subtitle: article.subtitle,
    content: article.content,
    hasCategory: Boolean(article.categoryId),
    hasAuthor: Boolean(article.authorId),
    checklist: {
      fonteVerificavel: Boolean(flags.fonte_verificavel),
      semPessoaExposta: Boolean(flags.sem_pessoa_exposta),
      semAconselhamento: Boolean(flags.sem_aconselhamento),
      imagemRegular: Boolean(flags.imagem_regular),
    },
    reviewDueAt,
    eventDate: body.event_date ?? null,
    expiresAt: body.expires_at ?? null,
    coverImageUrl: article.coverImageUrl,
    coverCredit: article.coverCredit,
    coverSource: article.coverSource,
    coverAiGenerated: Boolean(article.coverAiGenerated),
  });

  if (!decisao.ok) return naFila(blockMessage(decisao), decisao.motivos);

  // Ritmo: o agente publica pouco e espaçado. Volume alto é justamente o que
  // caracteriza abuso de conteúdo em escala — e o que afunda um site novo.
  const hora = await checkRateLimit(db, "agente:publicacao:hora", {
    limit: AUTO_PUBLISH_LIMIT_HOUR,
    windowSeconds: 3600,
  });
  if (!hora.ok) {
    return naFila(
      `Limite de ${AUTO_PUBLISH_LIMIT_HOUR} publicações automáticas por hora atingido. A matéria ficou na fila e pode ser publicada no painel.`,
      ["Teto de publicações por hora."],
    );
  }
  const dia = await checkRateLimit(db, "agente:publicacao:dia", {
    limit: AUTO_PUBLISH_LIMIT_DAY,
    windowSeconds: 86400,
  });
  if (!dia.ok) {
    return naFila(
      `Limite de ${AUTO_PUBLISH_LIMIT_DAY} publicações automáticas por dia atingido. A matéria ficou na fila e pode ser publicada no painel.`,
      ["Teto de publicações por dia."],
    );
  }

  const publicada = await autoPublishArticle(db, article.id, { ip, label: "agente editorial" });
  if (!publicada.ok) {
    return naFila(
      `Matéria criada, mas não publicada: ${publicada.motivos.join("; ")}.`,
      publicada.motivos,
    );
  }

  return resposta({
    publicada: true,
    status: "PUBLICADA",
    status_descricao: STATUS_LABEL.PUBLICADA,
    aviso:
      "Matéria publicada pelo agente. Ela aparece no site marcada como publicação automática até que uma pessoa da redação confira.",
    motivos: [],
    url: `${origin}/noticia/${article.slug}`,
    url_apos_publicacao: `${origin}/noticia/${article.slug}`,
  });
}
