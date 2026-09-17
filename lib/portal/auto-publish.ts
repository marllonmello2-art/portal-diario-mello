/**
 * Publicação automática pelo agente editorial.
 *
 * O portal deixou de ser um veículo de notícia de apuração e passou a publicar
 * conteúdo explicativo e de serviço: história, cultura, guias, agenda. Para
 * esse material — e só para ele — o agente de IA publica direto, sem esperar
 * um editor-chefe humano.
 *
 * O que sustenta essa decisão não é confiança no modelo; são as travas deste
 * módulo, conferidas no servidor a cada chamada. Uma matéria só sai do agente
 * para o site se passar por todas. Qualquer coisa que não passe continua indo
 * para a fila de revisão humana, exatamente como antes.
 *
 * Módulo sem dependência de banco de propósito: é política editorial pura,
 * testável isoladamente.
 */
import type { Classification } from "./classification.ts";
import { checkLowRisk, type ContentType, type LowRiskChecklist } from "./lifecycle.ts";
import { checkCoverRights } from "./media-rights.ts";

/**
 * A única classificação que o agente publica sozinho.
 *
 * Notícia exige apuração e fonte confirmada; opinião e análise têm juízo de
 * quem assina; patrocinado tem contrato; comunicado é texto de terceiro;
 * correção mexe em matéria já publicada. Nada disso é trabalho de máquina.
 */
export const AUTO_PUBLISH_CLASSIFICATIONS: Classification[] = ["EXPLICATIVO"];

/** Tamanho mínimo do corpo. Texto curto e raso não vai ao ar sozinho. */
export const MIN_AUTO_PUBLISH_CHARS = 1800;

/** Título muito longo quebra a capa e o resultado de busca. */
export const MAX_TITLE_CHARS = 120;
export const MIN_TITLE_CHARS = 15;

/** Teto de publicações automáticas, para o agente nunca inundar o site. */
export const AUTO_PUBLISH_LIMIT_DAY = 4;
export const AUTO_PUBLISH_LIMIT_HOUR = 2;

export type AutoPublishBlockCode =
  | "AUTOMACAO_DESLIGADA"
  | "CLASSIFICACAO_NAO_AUTOMATIZAVEL"
  | "TEXTO_INSUFICIENTE"
  | "SELO_INCOMPLETO"
  | "DIREITOS_DE_IMAGEM";

export type AutoPublishDecision =
  | { ok: true }
  | { ok: false; code: AutoPublishBlockCode; motivos: string[] };

export type AutoPublishInput = {
  classification: string;
  contentType: ContentType;
  title: string;
  subtitle?: string | null;
  content: string;
  hasCategory: boolean;
  hasAuthor: boolean;
  checklist: LowRiskChecklist;
  reviewDueAt?: string | null;
  eventDate?: string | null;
  expiresAt?: string | null;
  coverImageUrl?: string | null;
  coverCredit?: string | null;
  coverSource?: string | null;
  coverAiGenerated?: boolean;
};

/**
 * Esta matéria pode ir ao ar sem passar por uma pessoa?
 *
 * A ordem das travas é a ordem da conversa com o agente: primeiro o que ele
 * é autorizado a publicar, depois se o texto está inteiro, depois o selo de
 * baixo risco, por fim os direitos da imagem.
 */
export function evaluateAutoPublish(input: AutoPublishInput): AutoPublishDecision {
  if (!(AUTO_PUBLISH_CLASSIFICATIONS as string[]).includes(input.classification)) {
    return {
      ok: false,
      code: "CLASSIFICACAO_NAO_AUTOMATIZAVEL",
      motivos: [
        `O agente só publica direto material classificado como ${AUTO_PUBLISH_CLASSIFICATIONS.join(", ")}. Esta matéria foi enviada como ${input.classification} e segue para revisão humana.`,
      ],
    };
  }

  const faltas: string[] = [];
  const titulo = input.title.trim();
  if (titulo.length < MIN_TITLE_CHARS) faltas.push(`Título com pelo menos ${MIN_TITLE_CHARS} caracteres`);
  if (titulo.length > MAX_TITLE_CHARS) faltas.push(`Título com no máximo ${MAX_TITLE_CHARS} caracteres`);
  if (!input.subtitle?.trim()) faltas.push("Linha fina (subtitle) explicando do que trata a matéria");
  if (input.content.trim().length < MIN_AUTO_PUBLISH_CHARS) {
    faltas.push(`Corpo com pelo menos ${MIN_AUTO_PUBLISH_CHARS} caracteres`);
  }
  if (!input.hasCategory) faltas.push("Editoria existente em category_slug");
  if (!input.hasAuthor) faltas.push("Assinatura em author_name ou author_id");
  if (faltas.length) return { ok: false, code: "TEXTO_INSUFICIENTE", motivos: faltas };

  const selo = checkLowRisk({
    checklist: input.checklist,
    contentType: input.contentType,
    reviewDueAt: input.reviewDueAt,
    eventDate: input.eventDate,
    expiresAt: input.expiresAt,
  });
  if (!selo.ok) return { ok: false, code: "SELO_INCOMPLETO", motivos: selo.faltando };

  const direitos = checkCoverRights({
    coverImageUrl: input.coverImageUrl,
    coverCredit: input.coverCredit,
    coverSource: input.coverSource,
    coverAiGenerated: input.coverAiGenerated,
  });
  if (!direitos.ok) return { ok: false, code: "DIREITOS_DE_IMAGEM", motivos: [direitos.reason] };

  return { ok: true };
}

/** Frase única para o agente entender por que a matéria ficou na fila. */
export function blockMessage(decision: Extract<AutoPublishDecision, { ok: false }>): string {
  if (decision.code === "AUTOMACAO_DESLIGADA") return decision.motivos[0];
  if (decision.code === "CLASSIFICACAO_NAO_AUTOMATIZAVEL") return decision.motivos[0];
  return `Matéria criada, mas não publicada automaticamente. Falta: ${decision.motivos.join("; ")}.`;
}
