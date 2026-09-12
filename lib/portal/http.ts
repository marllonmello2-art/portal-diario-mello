/**
 * Chamadas às rotas de API a partir do navegador.
 *
 * Nem toda resposta é JSON: se o Worker for interrompido (estouro do limite de
 * CPU, por exemplo) o corpo chega vazio, e um `response.json()` direto quebra
 * com "Unexpected end of JSON input" — uma mensagem que não ajuda ninguém.
 * Aqui lemos o texto primeiro e traduzimos a falha para algo compreensível.
 */
export async function requestJson<T = Record<string, unknown>>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();

  let data: (T & { error?: string }) | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.error ?? describeFailure(response.status, text));
  }
  if (!data) {
    throw new Error(describeFailure(response.status, text));
  }
  return data;
}

function describeFailure(status: number, body: string): string {
  if (!body.trim()) {
    return `O servidor encerrou a requisição sem responder (HTTP ${status}). Tente de novo em alguns segundos.`;
  }
  if (status >= 500) return `Erro no servidor (HTTP ${status}). Tente de novo.`;
  return `Não foi possível concluir a operação (HTTP ${status}).`;
}
