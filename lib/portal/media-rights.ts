/**
 * Direitos de imagem.
 *
 * Módulo sem dependência de banco de propósito: é política editorial pura,
 * usada tanto pelo servidor quanto pelos testes.
 */

/** Identificação obrigatória da ilustração feita pelo próprio portal. */
export const AI_IMAGE_CREDIT = "Imagem ilustrativa gerada por IA";

/**
 * Capa sem crédito e origem não passa.
 *
 * A exceção é a imagem ilustrativa gerada pelo próprio sistema, que recebe a
 * identificação própria em vez de crédito de terceiro.
 */
export function checkCoverRights(input: {
  coverImageUrl?: string | null;
  coverCredit?: string | null;
  coverSource?: string | null;
  coverAiGenerated?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.coverImageUrl?.trim()) return { ok: true };
  if (input.coverAiGenerated) return { ok: true };

  const faltando: string[] = [];
  if (!input.coverCredit?.trim()) faltando.push("crédito do autor");
  if (!input.coverSource?.trim()) faltando.push("origem");
  if (faltando.length) {
    return {
      ok: false,
      reason: `A imagem de capa precisa de ${faltando.join(" e ")}. Marque "imagem gerada por IA" se for ilustração do próprio portal.`,
    };
  }
  return { ok: true };
}
