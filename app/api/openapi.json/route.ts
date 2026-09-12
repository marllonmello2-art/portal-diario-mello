import { BRAND } from "../../../lib/portal/brand";

export const dynamic = "force-dynamic";

/**
 * Schema OpenAPI 3.1 das rotas de publicação, pronto para ser colado como
 * Action de um GPT customizado. O campo `servers` usa o host da requisição,
 * então o mesmo arquivo serve para preview e produção.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const schema = {
    openapi: "3.1.0",
    info: {
      title: `${BRAND.name} — API de publicação`,
      version: "1.0.0",
      description:
        "Envia matérias para a fila de revisão editorial do portal e lista editorias e autores válidos. A rota de escrita exige o cabeçalho x-agent-api-key. Nenhuma matéria enviada por aqui vai ao ar sem aprovação de um editor-chefe humano.",
    },
    servers: [{ url: origin }],
    security: [{ agentApiKey: [] }],
    paths: {
      "/api/publish": {
        post: {
          operationId: "publishArticle",
          summary: "Envia uma matéria para a fila de revisão editorial.",
          description:
            "A matéria é gravada em EM_REVISAO, marcada como vinda de integração e com assistência de IA. Não existe forma de publicar por esta rota: quem leva ao ar é um editor-chefe, no painel.",
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
              description: "Matéria criada na fila de revisão editorial.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/PublishResponse" } },
              },
            },
            "400": { description: "Campos obrigatórios ausentes ou JSON inválido." },
            "401": { description: "Chave de agente inválida." },
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
        PublishRequest: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: { type: "string", description: "Título da matéria. O slug é gerado a partir dele." },
            subtitle: { type: "string", description: "Linha fina (deck)." },
            content: { type: "string", description: "Corpo da matéria em Markdown." },
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
            cover_credit: { type: "string", description: "Crédito da foto de capa." },
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
            aviso: {
              type: "string",
              description: "Lembrete de que a matéria ficou aguardando revisão humana.",
            },
            article: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                slug: { type: "string" },
                subtitle: { type: ["string", "null"] },
                status: {
                  type: "string",
                  description: "Sempre EM_REVISAO para matérias vindas de integração.",
                },
                status_descricao: { type: "string" },
                access_level: { type: "string" },
                category: { type: ["string", "null"] },
                category_slug: { type: ["string", "null"] },
                author: { type: ["string", "null"] },
                cover_image_url: { type: ["string", "null"] },
                excerpt: { type: "string" },
                url_apos_publicacao: {
                  type: "string",
                  description: "Endereço que a matéria terá caso seja aprovada e publicada.",
                },
                painel: {
                  type: "string",
                  description: "Onde o editor revisa esta matéria.",
                },
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
