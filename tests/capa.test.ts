/**
 * De onde a capa pode vir.
 *
 * O agente indica um endereço de imagem e o portal baixa. Sem lista fechada,
 * o caminho estaria aberto para foto de veículo concorrente, banco de imagem
 * pago ou endereço que o próprio modelo inventou.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { checkCoverUrl, describeAllowedCovers } from "../lib/portal/cover-sources.ts";

test("aceita as fontes de licença livre e os sites públicos", () => {
  const boas = [
    "https://upload.wikimedia.org/wikipedia/commons/a/ab/foto.jpg",
    "https://images.unsplash.com/photo-123",
    "https://images.pexels.com/photos/1/foto.jpeg",
    "https://agenciabrasil.ebc.com.br/sites/default/files/foto.jpg",
    "https://www.gov.br/imagens/foto.png",
    "https://www.bcb.gov.br/content/foto.png",
  ];
  for (const url of boas) assert.equal(checkCoverUrl(url).ok, true, url);
});

test("recusa endereço fora da lista, http e lixo", () => {
  const ruins = [
    "https://g1.globo.com/foto.jpg",
    "https://cdn.exemplo.com/foto.jpg",
    "https://gettyimages.com/foto.jpg",
    "https://acervo.usp.edu.br/foto.jpg",
    "https://ong.org.br/foto.jpg",
    "http://upload.wikimedia.org/foto.jpg",
    "foto.jpg",
    "",
  ];
  for (const url of ruins) assert.equal(checkCoverUrl(url).ok, false, url);
});

test("um domínio que só contém o nome permitido não passa", () => {
  // upload.wikimedia.org.golpe.com não é a Wikimedia.
  assert.equal(checkCoverUrl("https://upload.wikimedia.org.golpe.com/foto.jpg").ok, false);
  assert.equal(checkCoverUrl("https://gov.br.golpe.com/foto.jpg").ok, false);
});

test("a mensagem de erro diz onde buscar imagem", () => {
  const resultado = checkCoverUrl("https://exemplo.com/foto.jpg");
  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.reason, /wikimedia/i);
  assert.match(describeAllowedCovers(), /gov\.br/);
});
