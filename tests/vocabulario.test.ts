/**
 * Guarda do vocabulário de status.
 *
 * Quando os três status antigos (draft/published/scheduled) viraram os dez
 * estados editoriais, uma rota ficou para trás: o sitemap continuou
 * perguntando por "published" e passou meses listando zero matérias — nenhum
 * teste percebeu, porque o XML continuava válido.
 *
 * Este teste existe para que isso não aconteça de novo. A única exceção é o
 * mapa de migração, que precisa citar os nomes antigos para traduzi-los.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const PASTAS = ["app", "lib", "components", "worker", "db"];
const EXCECOES = ["lib/portal/db.ts"];
const ANTIGOS = ["draft", "published", "scheduled", "archived"];

function arquivos(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivos(caminho));
    else if (/\.(ts|tsx)$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

test("nenhuma consulta usa o vocabulário de status antigo", () => {
  const culpados: string[] = [];

  for (const pasta of PASTAS) {
    for (const caminho of arquivos(join(RAIZ, pasta))) {
      const relativo = caminho.slice(RAIZ.length);
      if (EXCECOES.includes(relativo)) continue;

      const conteudo = readFileSync(caminho, "utf8");
      for (const antigo of ANTIGOS) {
        // Só o literal entre aspas: `publishedAt` e afins não contam.
        if (new RegExp(`["']${antigo}["']`).test(conteudo)) {
          culpados.push(`${relativo} usa "${antigo}"`);
        }
      }
    }
  }

  assert.deepEqual(culpados, [], `Status antigo em uso:\n${culpados.join("\n")}`);
});
