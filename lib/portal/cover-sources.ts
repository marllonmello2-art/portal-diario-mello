/**
 * De onde pode vir a foto de capa que o agente manda.
 *
 * O agente não sobe arquivo: ele indica um endereço. Aceitar qualquer endereço
 * seria pedir problema em duas frentes — direito autoral (foto de jornal
 * concorrente ou de banco pago) e link quebrado (imagem que some do servidor
 * alheio). Por isso a lista fechada abaixo: são fontes de licença livre ou
 * pública, com crédito conhecido e endereço estável.
 *
 * Módulo sem dependência de banco de propósito: é política pura, testável.
 */

/** Domínios aceitos exatamente como estão. */
export const ALLOWED_COVER_HOSTS = [
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "images.unsplash.com",
  "images.pexels.com",
  "agenciabrasil.ebc.com.br",
  "imagens.ebc.com.br",
  "memoria.ebc.com.br",
] as const;

/**
 * Sufixos aceitos.
 *
 * Só o governo brasileiro: material de órgão público costuma ser de uso livre
 * com crédito, e o domínio é difícil de falsificar. `.org.br` e `.edu.br`
 * ficaram de fora de propósito — são conjuntos grandes demais para servir de
 * garantia de licença.
 */
export const ALLOWED_COVER_SUFFIXES = [".gov.br"] as const;

export type CoverUrlCheck = { ok: true; host: string } | { ok: false; reason: string };

/** Lista legível, para mensagem de erro e para a documentação da API. */
export function describeAllowedCovers(): string {
  return `${ALLOWED_COVER_HOSTS.join(", ")} ou qualquer endereço terminado em ${ALLOWED_COVER_SUFFIXES.join(", ")}`;
}

/**
 * O endereço da capa é aceitável?
 *
 * Exige https: imagem por http seria bloqueada pelo navegador dentro de uma
 * página segura, e o leitor veria um buraco no lugar da foto.
 */
export function checkCoverUrl(value: string): CoverUrlCheck {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "O endereço da imagem de capa não é uma URL válida." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "A imagem de capa precisa vir de um endereço https." };
  }

  const host = url.hostname.toLowerCase();
  const permitido =
    (ALLOWED_COVER_HOSTS as readonly string[]).includes(host) ||
    ALLOWED_COVER_SUFFIXES.some((sufixo) => host.endsWith(sufixo));

  if (!permitido) {
    return {
      ok: false,
      reason: `Imagem de ${host} não é aceita. Use ${describeAllowedCovers()}.`,
    };
  }

  return { ok: true, host };
}
