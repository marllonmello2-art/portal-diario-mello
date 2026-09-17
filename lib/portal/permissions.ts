/**
 * Governança editorial do Diário Mello: papéis, estados da matéria e quem
 * pode mover o quê.
 *
 * Este módulo é a fonte única da verdade das permissões. A interface esconde
 * botões por conveniência, mas quem decide é sempre o servidor — toda rota do
 * painel consulta as funções daqui antes de gravar.
 */

/* ------------------------------- papéis ------------------------------- */

export const ROLES = ["AUTOR", "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  AUTOR: "Autor",
  EDITOR: "Editor",
  EDITOR_CHEFE: "Editor-chefe",
  ADMINISTRADOR: "Administrador",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  AUTOR: "Escreve e apura. Mexe apenas nas próprias matérias, até enviar para revisão.",
  EDITOR: "Revisa o trabalho da redação e encaminha para revisão jurídica ou aprovação.",
  EDITOR_CHEFE: "Único perfil que publica, agenda, despublica e arquiva.",
  ADMINISTRADOR: "Cuida de pessoas, editorias e configuração. Não publica por si só.",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/* ------------------------------- estados ------------------------------ */

export const STATUSES = [
  "RASCUNHO",
  "EM_APURACAO",
  "EM_REDACAO",
  "EM_REVISAO",
  "EM_REVISAO_JURIDICA",
  "APROVADA",
  "AGENDADA",
  "PUBLICADA",
  "CORRIGIDA",
  "ARQUIVADA",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  RASCUNHO: "Rascunho",
  EM_APURACAO: "Em apuração",
  EM_REDACAO: "Em redação",
  EM_REVISAO: "Em revisão",
  EM_REVISAO_JURIDICA: "Em revisão jurídica",
  APROVADA: "Aprovada",
  AGENDADA: "Agendada",
  PUBLICADA: "Publicada",
  CORRIGIDA: "Corrigida",
  ARQUIVADA: "Arquivada",
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

/** Estados em que a matéria está visível no site público. */
export const PUBLIC_STATUSES: Status[] = ["PUBLICADA", "CORRIGIDA"];

/** Estados que a redação ainda está produzindo (o autor pode editar). */
export const AUTHORING_STATUSES: Status[] = ["RASCUNHO", "EM_APURACAO", "EM_REDACAO"];

/* --------------------------- máquina de estados ------------------------ */

/**
 * Transições possíveis e quem pode fazê-las.
 *
 * Ler assim: de RASCUNHO dá para ir a EM_APURACAO, e quem pode é AUTOR,
 * EDITOR ou EDITOR_CHEFE. Qualquer par que não esteja nesta tabela é recusado
 * pelo servidor, venha de onde vier.
 */
export const TRANSITIONS: { from: Status; to: Status; roles: Role[] }[] = [
  // Produção — a redação toca o texto.
  { from: "RASCUNHO", to: "EM_APURACAO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "RASCUNHO", to: "EM_REDACAO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_APURACAO", to: "EM_REDACAO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_APURACAO", to: "RASCUNHO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REDACAO", to: "EM_APURACAO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REDACAO", to: "RASCUNHO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },

  // Entrega para revisão: o autor entrega, mas não volta a mexer sozinho.
  { from: "EM_REDACAO", to: "EM_REVISAO", roles: ["AUTOR", "EDITOR", "EDITOR_CHEFE"] },
  { from: "RASCUNHO", to: "EM_REVISAO", roles: ["EDITOR", "EDITOR_CHEFE"] },

  // Revisão — daqui em diante é do editor para cima.
  { from: "EM_REVISAO", to: "EM_REDACAO", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REVISAO", to: "EM_REVISAO_JURIDICA", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REVISAO", to: "APROVADA", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REVISAO_JURIDICA", to: "EM_REVISAO", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REVISAO_JURIDICA", to: "EM_REDACAO", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "EM_REVISAO_JURIDICA", to: "APROVADA", roles: ["EDITOR", "EDITOR_CHEFE"] },
  { from: "APROVADA", to: "EM_REVISAO", roles: ["EDITOR", "EDITOR_CHEFE"] },

  // Ir ao ar, sair do ar, arquivar: exclusivo do editor-chefe.
  { from: "APROVADA", to: "PUBLICADA", roles: ["EDITOR_CHEFE"] },
  { from: "APROVADA", to: "AGENDADA", roles: ["EDITOR_CHEFE"] },
  { from: "AGENDADA", to: "PUBLICADA", roles: ["EDITOR_CHEFE"] },
  { from: "AGENDADA", to: "APROVADA", roles: ["EDITOR_CHEFE"] },
  { from: "PUBLICADA", to: "CORRIGIDA", roles: ["EDITOR_CHEFE"] },
  { from: "PUBLICADA", to: "EM_REVISAO", roles: ["EDITOR_CHEFE"] },
  { from: "PUBLICADA", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "CORRIGIDA", to: "CORRIGIDA", roles: ["EDITOR_CHEFE"] },
  { from: "CORRIGIDA", to: "EM_REVISAO", roles: ["EDITOR_CHEFE"] },
  { from: "CORRIGIDA", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "ARQUIVADA", to: "EM_REVISAO", roles: ["EDITOR_CHEFE"] },
  { from: "RASCUNHO", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "EM_APURACAO", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "EM_REDACAO", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "EM_REVISAO", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
  { from: "APROVADA", to: "ARQUIVADA", roles: ["EDITOR_CHEFE"] },
];

export type Actor = { roles: Role[]; id?: string };

export function hasRole(actor: Actor, ...roles: Role[]): boolean {
  return actor.roles.some((role) => roles.includes(role));
}

/** Transições que este ator pode aplicar a partir do estado atual. */
export function allowedTransitions(actor: Actor, from: Status): Status[] {
  return TRANSITIONS.filter(
    (transition) => transition.from === from && transition.roles.some((role) => actor.roles.includes(role)),
  ).map((transition) => transition.to);
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

/** A transição existe e este ator pode fazê-la? */
export function canTransition(actor: Actor, from: Status, to: Status): TransitionCheck {
  const transition = TRANSITIONS.find((item) => item.from === from && item.to === to);
  if (!transition) {
    return {
      ok: false,
      reason: `Transição inválida: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}.`,
    };
  }
  if (!transition.roles.some((role) => actor.roles.includes(role))) {
    const quem = transition.roles.map((role) => ROLE_LABEL[role]).join(" ou ");
    return { ok: false, reason: `Somente ${quem} pode fazer esta mudança.` };
  }
  return { ok: true };
}

/* ------------------------- edição do conteúdo -------------------------- */

/**
 * Quem pode alterar o texto de uma matéria.
 *
 * O autor só mexe nas próprias e enquanto o texto está em produção; depois de
 * entregue, a matéria é da edição. Editor e editor-chefe editam em qualquer
 * estado, menos arquivada.
 */
export function canEditArticle(
  actor: Actor,
  article: { status: Status; authorUserId?: string | null },
): TransitionCheck {
  if (article.status === "ARQUIVADA" && !hasRole(actor, "EDITOR_CHEFE")) {
    return { ok: false, reason: "Matéria arquivada: só o editor-chefe pode reabrir." };
  }
  if (hasRole(actor, "EDITOR", "EDITOR_CHEFE")) return { ok: true };

  if (hasRole(actor, "AUTOR")) {
    if (!AUTHORING_STATUSES.includes(article.status)) {
      return {
        ok: false,
        reason: `Matéria em "${STATUS_LABEL[article.status]}": o autor não edita depois de entregar para revisão.`,
      };
    }
    if (article.authorUserId && actor.id && article.authorUserId !== actor.id) {
      return { ok: false, reason: "Esta matéria é de outro autor." };
    }
    return { ok: true };
  }

  return { ok: false, reason: "Seu perfil não edita matérias." };
}

/** Criar matéria: qualquer perfil da redação. Administrador puro, não. */
export function canCreateArticle(actor: Actor): boolean {
  return hasRole(actor, "AUTOR", "EDITOR", "EDITOR_CHEFE");
}

/** Apagar de vez é do administrador; a redação arquiva. */
export function canDeleteArticle(actor: Actor): boolean {
  return hasRole(actor, "ADMINISTRADOR");
}

/** Editorias, autores e pessoas do painel. */
export function canManageTaxonomy(actor: Actor): boolean {
  return hasRole(actor, "EDITOR_CHEFE", "ADMINISTRADOR");
}

export function canManagePeople(actor: Actor): boolean {
  return hasRole(actor, "ADMINISTRADOR");
}

export function canSeeAudit(actor: Actor): boolean {
  return hasRole(actor, "EDITOR_CHEFE", "ADMINISTRADOR");
}

/**
 * Estado em que uma matéria vinda de integração (agente de IA) entra.
 *
 * Toda matéria do agente é gravada aqui primeiro, em revisão. O que acontece
 * depois depende do que ela é: material explicativo e de serviço que passe em
 * todas as travas de `auto-publish.ts` vai ao ar na sequência, pelo próprio
 * agente; qualquer outra coisa fica nesta fila esperando uma pessoa.
 *
 * A tabela de transições acima não conhece esse atalho, e não deve conhecer:
 * ela descreve o que cada *perfil humano* pode fazer. A publicação automática
 * é uma exceção nomeada, com regras próprias e registro em auditoria.
 */
export const INTEGRATION_ENTRY_STATUS: Status = "EM_REVISAO";

export function forbidden(reason: string) {
  return Response.json({ code: "FORBIDDEN", error: reason }, { status: 403 });
}
