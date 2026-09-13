/**
 * Cabeçalhos de segurança do portal.
 *
 * Aplicados a toda resposta HTML no Worker. A CSP começa em modo relatório de
 * propósito: o site usa script inline (dados estruturados da matéria e a
 * hidratação do framework), e uma política restritiva mal calibrada derruba
 * página no ar. O caminho é medir com Report-Only, ler as violações e só então
 * endurecer — trocando `CSP_MODE` para "enforce" quando não houver mais ruído.
 */

export type CspMode = "report-only" | "enforce";

/** Enquanto estiver medindo, mantenha em "report-only". */
export const CSP_MODE: CspMode = "report-only";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' cobre o JSON-LD da matéria e o bootstrap do framework.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Capas podem vir do R2 (mesma origem) ou de URL externa informada pela redação.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Desliga o que o portal não usa. Se um dia entrar vídeo incorporado ou
 * pagamento, esta linha muda junto.
 */
const PERMISSIONS = [
  "geolocation=()",
  "camera=()",
  "microphone=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "interest-cohort=()",
].join(", ");

export function securityHeaders(): Record<string, string> {
  return {
    [CSP_MODE === "enforce" ? "content-security-policy" : "content-security-policy-report-only"]:
      CSP,
    // Dois anos, incluindo subdomínios: o portal só existe em HTTPS.
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": PERMISSIONS,
    "x-frame-options": "DENY",
  };
}

/** Copia a resposta acrescentando os cabeçalhos, sem mexer no corpo. */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [nome, valor] of Object.entries(securityHeaders())) {
    headers.set(nome, valor);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
