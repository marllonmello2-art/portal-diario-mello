/**
 * Travas da publicação automática.
 *
 * O agente publica sozinho, então estas regras são o que separa "portal com
 * conteúdo explicativo" de "máquina de encher página". Cada teste aqui é uma
 * porta que precisa continuar fechada.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_PUBLISH_CLASSIFICATIONS,
  MIN_AUTO_PUBLISH_CHARS,
  evaluateAutoPublish,
  type AutoPublishInput,
} from "../lib/portal/auto-publish.ts";
import { CLASSIFICATIONS } from "../lib/portal/classification.ts";

const corpo = "a".repeat(MIN_AUTO_PUBLISH_CHARS + 10);

const completo: AutoPublishInput = {
  classification: "EXPLICATIVO",
  contentType: "PERMANENTE",
  title: "Como funcionava o bonde elétrico nas cidades do interior",
  subtitle: "Uma tecnologia que sumiu das ruas e deixou marcas no traçado urbano.",
  content: corpo,
  hasCategory: true,
  hasAuthor: true,
  checklist: {
    fonteVerificavel: true,
    semPessoaExposta: true,
    semAconselhamento: true,
    imagemRegular: true,
  },
  reviewDueAt: "2027-03-17T00:00:00.000Z",
};

test("matéria explicativa completa vai ao ar sozinha", () => {
  assert.equal(evaluateAutoPublish(completo).ok, true);
});

test("notícia nunca é publicada pelo agente", () => {
  const decisao = evaluateAutoPublish({ ...completo, classification: "NOTICIA" });
  assert.equal(decisao.ok, false);
  if (decisao.ok) return;
  assert.equal(decisao.code, "CLASSIFICACAO_NAO_AUTOMATIZAVEL");
});

test("só a classificação explicativa é automatizável", () => {
  assert.deepEqual(AUTO_PUBLISH_CLASSIFICATIONS, ["EXPLICATIVO"]);

  for (const classificacao of CLASSIFICATIONS) {
    if ((AUTO_PUBLISH_CLASSIFICATIONS as string[]).includes(classificacao)) continue;
    const decisao = evaluateAutoPublish({ ...completo, classification: classificacao });
    assert.equal(decisao.ok, false, `${classificacao} não pode ser publicada pelo agente`);
  }
});

test("sem as quatro confirmações de baixo risco a matéria fica na fila", () => {
  const decisao = evaluateAutoPublish({
    ...completo,
    checklist: { ...completo.checklist, semPessoaExposta: false },
  });
  assert.equal(decisao.ok, false);
  if (decisao.ok) return;
  assert.equal(decisao.code, "SELO_INCOMPLETO");
  assert.match(decisao.motivos.join(" "), /pessoa identificável/i);
});

test("texto raso, sem linha fina, sem editoria ou sem assinatura não vai ao ar", () => {
  const curto = evaluateAutoPublish({ ...completo, content: "muito curto" });
  assert.equal(curto.ok, false);
  if (!curto.ok) assert.equal(curto.code, "TEXTO_INSUFICIENTE");

  const semLinhaFina = evaluateAutoPublish({ ...completo, subtitle: "  " });
  assert.equal(semLinhaFina.ok, false);

  const semEditoria = evaluateAutoPublish({ ...completo, hasCategory: false });
  assert.equal(semEditoria.ok, false);

  const semAssinatura = evaluateAutoPublish({ ...completo, hasAuthor: false });
  assert.equal(semAssinatura.ok, false);

  const tituloLongo = evaluateAutoPublish({ ...completo, title: "t".repeat(121) });
  assert.equal(tituloLongo.ok, false);
});

test("agenda sem data de evento e prazo sem validade ficam na fila", () => {
  const agenda = evaluateAutoPublish({ ...completo, contentType: "AGENDA", reviewDueAt: null });
  assert.equal(agenda.ok, false);
  if (!agenda.ok) assert.match(agenda.motivos.join(" "), /data do evento/i);

  const comData = evaluateAutoPublish({
    ...completo,
    contentType: "AGENDA",
    reviewDueAt: null,
    eventDate: "2026-11-20",
  });
  assert.equal(comData.ok, true);

  const prazo = evaluateAutoPublish({ ...completo, contentType: "PRAZO", reviewDueAt: null });
  assert.equal(prazo.ok, false);
});

test("conteúdo permanente sem data de revisão não é publicado", () => {
  const decisao = evaluateAutoPublish({ ...completo, reviewDueAt: null });
  assert.equal(decisao.ok, false);
  if (!decisao.ok) assert.match(decisao.motivos.join(" "), /próxima revisão/i);
});

test("capa sem crédito e origem barra a publicação automática", () => {
  const decisao = evaluateAutoPublish({
    ...completo,
    coverImageUrl: "https://exemplo.com/foto.jpg",
  });
  assert.equal(decisao.ok, false);
  if (decisao.ok) return;
  assert.equal(decisao.code, "DIREITOS_DE_IMAGEM");

  const creditada = evaluateAutoPublish({
    ...completo,
    coverImageUrl: "https://exemplo.com/foto.jpg",
    coverCredit: "Maria Silva",
    coverSource: "Acervo público municipal",
  });
  assert.equal(creditada.ok, true);

  const ilustracao = evaluateAutoPublish({
    ...completo,
    coverImageUrl: "https://exemplo.com/ilustracao.png",
    coverAiGenerated: true,
  });
  assert.equal(ilustracao.ok, true);
});
