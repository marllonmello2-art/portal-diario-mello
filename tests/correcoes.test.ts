import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUEST_KINDS,
  REQUEST_STATUSES,
  generateProtocol,
  isRequestKind,
  isRequestStatus,
} from "../lib/portal/protocol.ts";

test("o protocolo tem o formato DM-ano-sufixo e não se repete", () => {
  const data = new Date("2026-09-12T12:00:00Z");
  const protocolo = generateProtocol(data);
  assert.match(protocolo, /^DM-2026-[A-Z2-9]{6}$/);

  const cem = new Set(Array.from({ length: 100 }, () => generateProtocol(data)));
  assert.equal(cem.size, 100, "cem protocolos seguidos devem ser distintos");
});

test("o sufixo sorteado não usa caracteres que se confundem ao ditar", () => {
  // O ano faz parte do protocolo e pode conter zero; o que precisa ser legível
  // ao telefone é o sufixo aleatório.
  const sufixos = Array.from({ length: 200 }, () => generateProtocol().split("-")[2]).join("");
  for (const confuso of ["I", "O", "0", "1"]) {
    assert.ok(!sufixos.includes(confuso), `o sufixo não deve conter "${confuso}"`);
  }
});

test("tipos e status do pedido são fechados", () => {
  assert.deepEqual(REQUEST_KINDS, ["correcao", "direito_resposta"]);
  assert.deepEqual(REQUEST_STATUSES, [
    "recebido",
    "em_analise",
    "respondido",
    "corrigido",
    "recusado",
  ]);
  assert.equal(isRequestKind("correcao"), true);
  assert.equal(isRequestKind("qualquer"), false);
  assert.equal(isRequestStatus("recusado"), true);
  assert.equal(isRequestStatus("arquivado"), false);
});
