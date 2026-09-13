/**
 * Ciclo de vida do conteúdo e selo de baixo risco.
 *
 * O Diário Mello começa publicando material que dura: explicação, história,
 * serviço com fonte oficial. Isso muda duas coisas no sistema. Primeiro, cada
 * matéria declara de que tipo é, e o tipo define quando ela precisa ser
 * revisada. Segundo, matéria com data (agenda, informação com prazo) some
 * sozinha do site quando a data passa — ninguém precisa lembrar de tirar.
 */

export const CONTENT_TYPES = ["PERMANENTE", "TECNOLOGIA_SERVICO", "AGENDA", "PRAZO"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  PERMANENTE: "Conteúdo permanente",
  TECNOLOGIA_SERVICO: "Tecnologia ou serviço",
  AGENDA: "Agenda (tem data de evento)",
  PRAZO: "Informação com prazo",
};

export const CONTENT_TYPE_HINT: Record<ContentType, string> = {
  PERMANENTE: "História, cultura, explicação. Revisão a cada 6 meses.",
  TECNOLOGIA_SERVICO: "Muda com o tempo: golpes, aplicativos, canais de atendimento. Revisão a cada 3 meses.",
  AGENDA: "Evento com data. Sai do site sozinho no dia seguinte ao evento.",
  PRAZO: "Vale até uma data (inscrição, campanha). Sai do site sozinho depois dela.",
};

/** Meses de validade antes da próxima revisão, por tipo. */
const REVIEW_MONTHS: Record<ContentType, number | null> = {
  PERMANENTE: 6,
  TECNOLOGIA_SERVICO: 3,
  AGENDA: null,
  PRAZO: null,
};

/**
 * Quando esta matéria precisa ser olhada de novo.
 *
 * Agenda e informação com prazo não têm revisão periódica: elas têm data de
 * validade, e depois dela simplesmente saem do ar.
 */
export function nextReviewDate(
  contentType: ContentType,
  from: Date,
  options: { eventDate?: string | null; expiresAt?: string | null } = {},
): string | null {
  if (contentType === "AGENDA") return options.eventDate ?? null;
  if (contentType === "PRAZO") return options.expiresAt ?? null;

  const meses = REVIEW_MONTHS[contentType];
  if (!meses) return null;

  const data = new Date(from);
  data.setMonth(data.getMonth() + meses);
  return data.toISOString();
}

/** Passou da data de revisão? Serve para a fila de manutenção do painel. */
export function reviewOverdue(reviewDueAt: string | null | undefined, now = new Date()): boolean {
  if (!reviewDueAt) return false;
  const data = new Date(reviewDueAt);
  return !Number.isNaN(data.getTime()) && data.getTime() < now.getTime();
}

/* --------------------------- selo de baixo risco ----------------------- */

export type LowRiskChecklist = {
  /** Fonte oficial, livro, documento ou material verificável. */
  fonteVerificavel: boolean;
  /** Não acusa, expõe nem avalia pessoa identificável. */
  semPessoaExposta: boolean;
  /** Não dá conselho médico, jurídico ou financeiro individual. */
  semAconselhamento: boolean;
  /** Imagem própria, licenciada ou gerada por IA e identificada. */
  imagemRegular: boolean;
};

export const LOW_RISK_LABELS: Record<keyof LowRiskChecklist, string> = {
  fonteVerificavel: "Usa fonte oficial, livro, documento ou material verificável",
  semPessoaExposta: "Não acusa, expõe nem avalia uma pessoa identificável",
  semAconselhamento: "Não dá conselho médico, jurídico ou financeiro individual",
  imagemRegular: "Imagem própria, licenciada ou gerada por IA e identificada",
};

export type LowRiskResult =
  | { ok: true }
  | { ok: false; faltando: string[] };

/**
 * A matéria merece o selo BAIXO_RISCO?
 *
 * Além das quatro confirmações da redação, o sistema exige o que ele mesmo
 * consegue conferir: data de revisão definida (ou data do evento/prazo, nos
 * tipos com validade).
 */
export function checkLowRisk(input: {
  checklist: LowRiskChecklist;
  contentType: ContentType;
  reviewDueAt?: string | null;
  eventDate?: string | null;
  expiresAt?: string | null;
}): LowRiskResult {
  const faltando: string[] = [];

  for (const [chave, rotulo] of Object.entries(LOW_RISK_LABELS) as [
    keyof LowRiskChecklist,
    string,
  ][]) {
    if (!input.checklist[chave]) faltando.push(rotulo);
  }

  if (input.contentType === "AGENDA" && !input.eventDate) {
    faltando.push("Informe a data do evento");
  } else if (input.contentType === "PRAZO" && !input.expiresAt) {
    faltando.push("Informe até quando a informação vale");
  } else if (
    (input.contentType === "PERMANENTE" || input.contentType === "TECNOLOGIA_SERVICO") &&
    !input.reviewDueAt
  ) {
    faltando.push("Defina a data da próxima revisão");
  }

  return faltando.length ? { ok: false, faltando } : { ok: true };
}
