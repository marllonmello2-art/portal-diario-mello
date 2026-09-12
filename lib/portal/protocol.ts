/**
 * Vocabulário dos pedidos de correção e direito de resposta.
 *
 * Módulo puro, sem banco: serve ao servidor, à interface e aos testes.
 */

export const REQUEST_KINDS = ["correcao", "direito_resposta"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  correcao: "Pedido de correção",
  direito_resposta: "Direito de resposta",
};

export const REQUEST_STATUSES = [
  "recebido",
  "em_analise",
  "respondido",
  "corrigido",
  "recusado",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  respondido: "Respondido",
  corrigido: "Corrigido",
  recusado: "Recusado",
};

export function isRequestKind(value: string): value is RequestKind {
  return (REQUEST_KINDS as readonly string[]).includes(value);
}

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

/**
 * Protocolo no formato DM-2026-XXXXXX.
 *
 * Sem sequência incremental de propósito: um número em ordem contaria a
 * qualquer solicitante quantos pedidos o veículo já recebeu. O alfabeto exclui
 * I, O, 0 e 1, que se confundem quando alguém dita o código por telefone.
 */
export function generateProtocol(now = new Date()): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const sorteio = crypto.getRandomValues(new Uint8Array(6));
  const sufixo = Array.from(sorteio, (byte) => alfabeto[byte % alfabeto.length]).join("");
  return `DM-${now.getUTCFullYear()}-${sufixo}`;
}
