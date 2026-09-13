import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_TYPES,
  checkLowRisk,
  nextReviewDate,
  reviewOverdue,
} from "../lib/portal/lifecycle.ts";

const completo = {
  fonteVerificavel: true,
  semPessoaExposta: true,
  semAconselhamento: true,
  imagemRegular: true,
};

test("cada tipo de conteúdo tem a cadência de revisão prometida", () => {
  const base = new Date("2026-09-13T12:00:00Z");

  const permanente = nextReviewDate("PERMANENTE", base);
  assert.equal(permanente?.slice(0, 7), "2027-03", "permanente revisa em 6 meses");

  const servico = nextReviewDate("TECNOLOGIA_SERVICO", base);
  assert.equal(servico?.slice(0, 7), "2026-12", "tecnologia e serviço revisam em 3 meses");

  assert.equal(nextReviewDate("AGENDA", base, { eventDate: "2026-10-01" }), "2026-10-01");
  assert.equal(nextReviewDate("PRAZO", base, { expiresAt: "2026-11-30" }), "2026-11-30");
});

test("a fila de manutenção enxerga data vencida", () => {
  const agora = new Date("2026-09-13T12:00:00Z");
  assert.equal(reviewOverdue("2026-09-12T00:00:00Z", agora), true);
  assert.equal(reviewOverdue("2026-12-01T00:00:00Z", agora), false);
  assert.equal(reviewOverdue(null, agora), false);
});

test("o selo exige as quatro confirmações da redação", () => {
  for (const chave of Object.keys(completo) as (keyof typeof completo)[]) {
    const parcial = { ...completo, [chave]: false };
    const resultado = checkLowRisk({
      checklist: parcial,
      contentType: "PERMANENTE",
      reviewDueAt: "2027-03-13",
    });
    assert.equal(resultado.ok, false, `faltando ${chave} deveria reprovar`);
  }
});

test("o selo exige a data que o tipo de conteúdo pede", () => {
  assert.equal(
    checkLowRisk({ checklist: completo, contentType: "PERMANENTE", reviewDueAt: null }).ok,
    false,
    "permanente sem data de revisão não passa",
  );
  assert.equal(
    checkLowRisk({ checklist: completo, contentType: "AGENDA", eventDate: null }).ok,
    false,
    "agenda sem data do evento não passa",
  );
  assert.equal(
    checkLowRisk({ checklist: completo, contentType: "PRAZO", expiresAt: null }).ok,
    false,
    "prazo sem validade não passa",
  );
});

test("matéria completa recebe o selo em qualquer tipo", () => {
  const datas: Record<string, Record<string, string>> = {
    PERMANENTE: { reviewDueAt: "2027-03-13" },
    TECNOLOGIA_SERVICO: { reviewDueAt: "2026-12-13" },
    AGENDA: { eventDate: "2026-10-05" },
    PRAZO: { expiresAt: "2026-10-30" },
  };
  for (const tipo of CONTENT_TYPES) {
    const resultado = checkLowRisk({ checklist: completo, contentType: tipo, ...datas[tipo] });
    assert.equal(resultado.ok, true, `${tipo} completo deveria receber o selo`);
  }
});

test("o selo diz o que falta, em português, para aparecer na tela", () => {
  const resultado = checkLowRisk({
    checklist: { ...completo, semPessoaExposta: false },
    contentType: "PERMANENTE",
    reviewDueAt: null,
  });
  assert.equal(resultado.ok, false);
  if (!resultado.ok) {
    assert.equal(resultado.faltando.length, 2);
    assert.match(resultado.faltando.join(" "), /pessoa identific/i);
    assert.match(resultado.faltando.join(" "), /revis/i);
  }
});

import { formatDate } from "../lib/portal/format.ts";

test("data sem hora não anda para trás por causa do fuso", () => {
  // "2026-09-14" é meia-noite UTC, que em São Paulo seria dia 13 às 21h.
  assert.match(formatDate("2026-09-14"), /14 de setembro de 2026/);
  assert.match(formatDate("2027-03-13"), /13 de março de 2027/);
});

test("data com hora continua no fuso de Brasília", () => {
  // 3h UTC do dia 14 é meia-noite do dia 14 em São Paulo.
  assert.match(formatDate("2026-09-14T03:00:00Z"), /14 de setembro de 2026/);
});
