import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedTransitions,
  canCreateArticle,
  canDeleteArticle,
  canEditArticle,
  canTransition,
  INTEGRATION_ENTRY_STATUS,
  PUBLIC_STATUSES,
  STATUSES,
  TRANSITIONS,
} from "../lib/portal/permissions.ts";

const autor = { roles: ["AUTOR" as const], id: "u-autor" };
const editor = { roles: ["EDITOR" as const], id: "u-editor" };
const chefe = { roles: ["EDITOR_CHEFE" as const], id: "u-chefe" };
const admin = { roles: ["ADMINISTRADOR" as const], id: "u-admin" };
const dono = { roles: ["EDITOR_CHEFE" as const, "ADMINISTRADOR" as const], id: "u-dono" };

test("só o editor-chefe leva uma matéria ao ar", () => {
  assert.equal(canTransition(chefe, "APROVADA", "PUBLICADA").ok, true);
  assert.equal(canTransition(dono, "APROVADA", "PUBLICADA").ok, true);
  assert.equal(canTransition(editor, "APROVADA", "PUBLICADA").ok, false);
  assert.equal(canTransition(autor, "APROVADA", "PUBLICADA").ok, false);
  assert.equal(canTransition(admin, "APROVADA", "PUBLICADA").ok, false);
});

test("publicar exige passar por APROVADA", () => {
  for (const estado of STATUSES) {
    if (estado === "APROVADA" || estado === "AGENDADA") continue;
    assert.equal(
      canTransition(chefe, estado, "PUBLICADA").ok,
      false,
      `${estado} não pode ir direto para PUBLICADA`,
    );
  }
});

test("nenhuma transição leva de rascunho a publicada em um passo", () => {
  const atalho = TRANSITIONS.find(
    (t) => t.to === "PUBLICADA" && t.from !== "APROVADA" && t.from !== "AGENDADA",
  );
  assert.equal(atalho, undefined);
});

test("agendar e arquivar também são do editor-chefe", () => {
  assert.equal(canTransition(editor, "APROVADA", "AGENDADA").ok, false);
  assert.equal(canTransition(chefe, "APROVADA", "AGENDADA").ok, true);
  assert.equal(canTransition(editor, "PUBLICADA", "ARQUIVADA").ok, false);
  assert.equal(canTransition(chefe, "PUBLICADA", "ARQUIVADA").ok, true);
});

test("o editor aprova, mas não publica", () => {
  assert.equal(canTransition(editor, "EM_REVISAO", "APROVADA").ok, true);
  assert.ok(!allowedTransitions(editor, "APROVADA").includes("PUBLICADA"));
});

test("o autor edita só o que é dele e enquanto está em produção", () => {
  const minha = { status: "EM_REDACAO" as const, authorUserId: "u-autor" };
  const alheia = { status: "EM_REDACAO" as const, authorUserId: "outra-pessoa" };
  const entregue = { status: "EM_REVISAO" as const, authorUserId: "u-autor" };

  assert.equal(canEditArticle(autor, minha).ok, true);
  assert.equal(canEditArticle(autor, alheia).ok, false);
  assert.equal(canEditArticle(autor, entregue).ok, false);
  assert.equal(canEditArticle(editor, entregue).ok, true);
});

test("matéria de integração entra em revisão, nunca no ar", () => {
  assert.equal(INTEGRATION_ENTRY_STATUS, "EM_REVISAO");
  assert.ok(!PUBLIC_STATUSES.includes(INTEGRATION_ENTRY_STATUS));
});

test("apagar de vez é do administrador; criar é da redação", () => {
  assert.equal(canDeleteArticle(admin), true);
  assert.equal(canDeleteArticle(chefe), false);
  assert.equal(canCreateArticle(autor), true);
  assert.equal(canCreateArticle(admin), false);
});
