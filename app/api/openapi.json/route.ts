import { BRAND } from "../../../lib/portal/brand";
import { CLASSIFICATIONS } from "../../../lib/portal/classification";
import { CONTENT_TYPES } from "../../../lib/portal/lifecycle";
import {
  AUTO_PUBLISH_CLASSIFICATIONS,
  AUTO_PUBLISH_LIMIT_DAY,
  AUTO_PUBLISH_LIMIT_HOUR,
  MIN_AUTO_PUBLISH_CHARS,
} from "../../../lib/portal/auto-publish";

export const dynamic = "force-dynamic";

/**
 * Schema OpenAPI 3.1 das rotas de publicação, pronto para ser colado como
 * Action de um GPT customizado. O campo `servers` usa o host da requisição,
 * então o mesmo arquivo serve para preview e produção.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const automatizaveis = AUTO_PUBLISH_CLASSIFICATIONS.join(", ");

  const schema = {
    openapi: "3.1.0",
    info: {
      title: `${BRAND.name} — API de publicação`,
      version: "2.0.0",
      // O ChatGPT recusa o schema quando uma descrição passa de 300 caracteres,
      // então aqui vale a regra do lide: o essencial primeiro, curto. O detalhe
      // de cada campo fica na descrição do próprio campo.
      description:
        `Envia matérias ao portal e lista editorias e autores. Escrita exige o cabeçalho x-agent-api-key. ` +
        `Só ${automatizaveis} é publicado automaticamente; o resto vai para revisão humana.`,
    },
    servers: [{ url: origin }],
    security: [{ agentApiKey: [] }],
    paths: {
      "/api/publish": {
        post: {
          operationId: "publishArticle",
          summary: "Envia uma matéria ao portal; publica direto quando ela cumpre todas as regras.",
          description:
            `Grava a matéria e decide na hora: ${automatizaveis} com ${MIN_AUTO_PUBLISH_CHARS}+ caracteres, linha fina, editoria, assinatura, ` +
            `tipo de conteúdo e baixo_risco completos vai ao ar. Senão fica em revisão humana e "motivos" diz o que faltou. ` +
            `Teto: ${AUTO_PUBLISH_LIMIT_HOUR}/hora e ${AUTO_PUBLISH_LIMIT_DAY}/dia.`,
          security: [{ agentApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublishRequest" },
              },
            },
          },
          responses: {
            "201": {
              description:
                "Matéria criada. O campo publicada diz se ela foi ao ar ou ficou na fila de revisão.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/PublishResponse" } },
              },
            },
            "400": { description: "Campos obrigatórios ausentes ou JSON inválido." },
            "401": { description: "Chave de agente inválida." },
            "429": { description: "Muitos envios na mesma hora. Aguarde o tempo indicado em retry-after." },
            "503": { description: "Banco ou chave de agente não configurados." },
          },
        },
      },
      "/api/categories": {
        get: {
          operationId: "listCategories",
          summary: "Lista as editorias existentes, com o slug aceito em category_slug.",
          security: [],
          responses: {
            "200": {
              description: "Editorias disponíveis.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      categories: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Category" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/authors": {
        get: {
          operationId: "listAuthors",
          summary: "Lista os autores cadastrados, com o id aceito em author_id.",
          security: [],
          responses: {
            "200": {
              description: "Autores disponíveis.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      authors: { type: "array", items: { $ref: "#/components/schemas/Author" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        agentApiKey: { type: "apiKey", in: "header", name: "x-agent-api-key" },
      },
      schemas: {
        BaixoRisco: {
          type: "object",
          description:
            "As quatro confirmações do selo de baixo risco. Só marque true o que for verdade sobre o texto: sem as quatro, a matéria não é publicada automaticamente.",
          required: [
            "fonte_verificavel",
            "sem_pessoa_exposta",
            "sem_aconselhamento",
            "imagem_regular",
          ],
          properties: {
            fonte_verificavel: {
              type: "boolean",
              description: "Usa fonte oficial, livro, documento ou material público verificável.",
            },
            sem_pessoa_exposta: {
              type: "boolean",
              description: "Não acusa, expõe nem avalia uma pessoa identificável.",
            },
            sem_aconselhamento: {
              type: "boolean",
              description: "Não dá conselho médico, jurídico ou financeiro individual.",
            },
            imagem_regular: {
              type: "boolean",
              description: "Imagem própria, licenciada ou gerada por IA e identificada como tal.",
            },
          },
        },
        PublishRequest: {
          type: "object",
          required: ["title", "subtitle", "content", "category_slug", "author_name", "baixo_risco"],
          properties: {
            title: {
              type: "string",
              description: "Título da matéria, de 15 a 120 caracteres. O slug é gerado a partir dele.",
            },
            subtitle: { type: "string", description: "Linha fina: uma frase dizendo do que trata o texto." },
            content: {
              type: "string",
              description: `Corpo da matéria em Markdown, com pelo menos ${MIN_AUTO_PUBLISH_CHARS} caracteres para publicação automática.`,
            },
            category_slug: {
              type: "string",
              description: "Slug da editoria (use /api/categories para descobrir os válidos).",
            },
            author_id: { type: "string", description: "Id do autor existente." },
            author_name: {
              type: "string",
              description: "Nome do autor. Se não existir, o autor é criado automaticamente.",
            },
            tags: { type: "array", items: { type: "string" }, description: "Lista de tags." },
            cover_image_url: { type: "string", description: "URL da imagem de capa." },
            cover_credit: { type: "string", description: "Crédito de quem fez a foto de capa." },
            cover_source: { type: "string", description: "Origem da imagem (veículo, acervo, banco)." },
            cover_license: { type: "string", description: "Licença da imagem, quando houver." },
            cover_ai_generated: {
              type: "boolean",
              default: false,
              description:
                "Marque true quando a capa for ilustração gerada por IA. O crédito vira “Imagem ilustrativa gerada por IA”.",
            },
            classification: {
              type: "string",
              enum: [...CLASSIFICATIONS],
              default: "EXPLICATIVO",
              description:
                `O que a publicação é. Só ${automatizaveis} vai ao ar automaticamente. NOTICIA exige fonte confirmada registrada pela redação; OPINIAO, ANALISE, CORRECAO, COMUNICADO e PATROCINADO dependem de aprovação humana.`,
            },
            content_type: {
              type: "string",
              enum: [...CONTENT_TYPES],
              default: "PERMANENTE",
              description:
                "PERMANENTE (história, cultura, explicação; revisão em 6 meses), TECNOLOGIA_SERVICO (muda com o tempo; revisão em 3 meses), AGENDA (evento com data; exige event_date) ou PRAZO (vale até uma data; exige expires_at).",
            },
            event_date: {
              type: "string",
              format: "date",
              description: "Data do evento, no formato AAAA-MM-DD. Obrigatória quando content_type é AGENDA.",
            },
            expires_at: {
              type: "string",
              format: "date",
              description: "Data até quando a informação vale, AAAA-MM-DD. Obrigatória quando content_type é PRAZO.",
            },
            baixo_risco: { $ref: "#/components/schemas/BaixoRisco" },
            publicar: {
              type: "boolean",
              default: true,
              description:
                "Deixe true (ou omita) para publicar quando as regras permitirem. Use false para mandar a matéria direto à fila humana, por exemplo quando você mesmo estiver em dúvida sobre o assunto.",
            },
            access_level: {
              type: "string",
              enum: ["public", "registered"],
              default: "public",
              description:
                "public: qualquer visitante lê. registered: só quem tem conta gratuita de leitor; os demais veem a abertura do texto e um convite para se cadastrar.",
            },
          },
        },
        PublishResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            publicada: {
              type: "boolean",
              description: "true quando a matéria foi ao ar; false quando ficou na fila de revisão humana.",
            },
            status: { type: "string", description: "PUBLICADA ou EM_REVISAO." },
            status_descricao: { type: "string" },
            aviso: { type: "string", description: "Frase pronta para repassar a quem pediu a matéria." },
            motivos: {
              type: "array",
              items: { type: "string" },
              description:
                "Vazio quando publicada. Quando não, lista exatamente o que impediu a publicação automática.",
            },
            url: {
              type: "string",
              description: "Endereço público da matéria. Só existe quando publicada é true.",
            },
            url_apos_publicacao: {
              type: "string",
              description: "Endereço que a matéria terá caso seja publicada.",
            },
            article: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                slug: { type: "string" },
                subtitle: { type: ["string", "null"] },
                classification: { type: "string" },
                content_type: { type: "string" },
                access_level: { type: "string" },
                category: { type: ["string", "null"] },
                category_slug: { type: ["string", "null"] },
                author: { type: ["string", "null"] },
                cover_image_url: { type: ["string", "null"] },
                excerpt: { type: "string" },
                painel: { type: "string", description: "Onde a redação vê e confere esta matéria." },
              },
            },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            color: { type: "string" },
          },
        },
        Author: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            bio: { type: ["string", "null"] },
            avatar_url: { type: ["string", "null"] },
          },
        },
      },
    },
  };

  return Response.json(schema, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
