# Diário Mello

Portal de notícias generalista — capa com destaque, editorias, busca,
newsletter, painel do editor e uma API para publicação automatizada.

Roda inteiro na Cloudflare: **Next.js (App Router)** compilado por
[vinext](https://github.com/cloudflare/vinext) para **Workers**, com **D1**
(SQLite) via **Drizzle ORM** e **R2** para as imagens.

A marca vem do sobrenome da família: o nome, a assinatura da redação e a cor de
destaque ficam todos em `lib/portal/brand.ts`.

## Colocar no ar

O passo a passo completo está em **[PUBLICAR.md](PUBLICAR.md)**. Em resumo:

```bash
npm install
npx wrangler login
npm run deploy        # cria o D1 e o R2 do portal, compila, publica e gera os secrets
```

O workflow `.github/workflows/publicar-portal.yml` faz o mesmo a cada push na
branch `main`, usando os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.

## Desenvolver

```bash
npm install
cp .dev.vars.example .dev.vars   # opcional: chave da API de publicação
npm run dev                      # http://localhost:5173
```

O D1 e o R2 locais são simulados pelo Miniflare. Na primeira visita o portal
cria as tabelas e o conteúdo inicial: as sete editorias, a redação padrão e três
matérias de exemplo.

Outros comandos: `npm run lint`, `npm test` (compila e roda os testes do Worker)
e `npm run db:generate` (nova migration depois de mexer em `db/schema.ts`).

## Rotas públicas

| Rota | O que faz |
| --- | --- |
| `/` | Capa: destaque, últimas notícias e blocos por editoria |
| `/editoria/[slug]` | Lista paginada da editoria |
| `/noticia/[slug]` | Matéria com autor, tags, compartilhamento e relacionadas |
| `/busca?q=` | Busca por título, linha fina e corpo do texto |
| `/sobre`, `/contato`, `/privacidade`, `/expediente` | Páginas institucionais |
| `/sitemap.xml`, `/robots.txt` | SEO, gerados a partir do banco |

Cada matéria publica suas próprias meta tags (Open Graph, Twitter Card) e dados
estruturados `NewsArticle`.

## Contas de leitor

Qualquer pessoa lê o portal sem cadastro. A conta gratuita (`/criar-conta`,
`/entrar`) acrescenta:

- **Matérias exclusivas** — no editor, cada matéria escolhe entre *Aberta* e
  *Exclusiva*. Na exclusiva, quem não tem conta vê os primeiros parágrafos e um
  convite para se cadastrar; o JSON-LD marca o trecho fechado como manda o
  Google, então não é conteúdo escondido do buscador.
- **Salvar para ler depois** — botão na matéria e a página `/minhas-leituras`.

A sessão do leitor usa um cookie próprio (`dm_leitor`, 30 dias) e um público
diferente no token: uma sessão de leitor nunca abre o painel, e a do painel não
vale como leitor.

## Governança editorial

O painel é uma redação com fluxo, papéis e trilha de auditoria.

**Estados da matéria:** RASCUNHO → EM_APURACAO → EM_REDACAO → EM_REVISAO →
(EM_REVISAO_JURIDICA) → APROVADA → PUBLICADA, mais AGENDADA, CORRIGIDA e
ARQUIVADA. A máquina de estados vive em `lib/portal/permissions.ts` e é
validada no servidor: transição fora da tabela é recusada, venha de onde vier.

**Papéis** (acumuláveis por pessoa, em `admin_user_roles`):

| Perfil | Pode |
| --- | --- |
| AUTOR | Criar e editar as próprias matérias até entregar para revisão |
| EDITOR | Revisar, mandar para revisão jurídica e aprovar |
| EDITOR_CHEFE | Único que publica, agenda, despublica e arquiva |
| ADMINISTRADOR | Pessoas, editorias, autores e exclusão definitiva |

**Regra inegociável:** matéria vinda de integração (`POST /api/publish`) entra
sempre em EM_REVISAO, marcada como origem `integracao`. Não existe caminho de
código de uma integração até PUBLICADA — publicar é ato de um EDITOR_CHEFE
humano, registrado com nome e horário.

**Classificação obrigatória:** toda publicação declara o que é — NOTICIA,
OPINIAO, PATROCINADO, COMUNICADO, ANALISE ou CORRECAO — e o site diz isso ao
leitor. Opinião traz a responsabilidade do autor; patrocinado e comunicado têm
aviso próprio e nunca ocupam a manchete da capa.

**Apuração e fontes:** cada matéria tem um caderno interno de fontes (nome,
tipo, referência, data de consulta, status, observação e marca de reserva).
Nada dessa área é servido ao site. Matéria classificada como notícia só chega a
APROVADA com ao menos uma fonte **confirmada**.

**Direitos de imagem:** capa exige crédito do autor e origem, com licença, data
de obtenção e observação de uso; cada upload entra no acervo `media_assets` com
essa papelada. A exceção é a ilustração do próprio portal, creditada como
"Imagem ilustrativa gerada por IA".

**Auditoria:** `/admin/auditoria` guarda login, criação, edição, mudança de
estado, aprovação, publicação e exclusão. Linhas nunca são alteradas.

## Painel do editor (`/admin`)

Lista com filtros e contadores, editor em Markdown com pré-visualização, upload
de capa para o R2, destaque da capa, agendamento e CRUD de editorias e autores.

No primeiro acesso a tela oferece **criar o usuário dono do portal** e se fecha
sozinha depois disso — não existe senha padrão no código. A senha é guardada em
PBKDF2-SHA256 (150 mil iterações, salt por usuário) e a sessão é um cookie
HttpOnly assinado em HMAC-SHA256, válido por 12 horas.

## API de publicação

`POST /api/publish`, protegida pelo header `x-agent-api-key` (secret
`AGENT_API_KEY`; sem ele a rota responde 503).

```bash
curl -X POST https://SEU-ENDERECO/api/publish \
  -H "x-agent-api-key: $AGENT_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "title": "Banco Central mantém juros",
    "subtitle": "Decisão foi unânime",
    "content": "## Cenário\n\nTexto em **Markdown**.",
    "category_slug": "economia",
    "author_name": "Redação Diário Mello",
    "tags": ["juros", "copom"],
    "status": "published"
  }'
```

`GET /api/categories` e `GET /api/authors` (públicas) informam os valores
válidos. O schema **OpenAPI 3.1** fica em `GET /api/openapi.json`, pronto para
virar Action de um GPT customizado.

## Estrutura

```
app/           páginas públicas, painel /admin e rotas de API
components/    componentes do site (portal/) e do painel (admin/)
lib/portal/    marca, banco, consultas, autenticação, Markdown e datas
db/            schema Drizzle
drizzle/       migrations geradas
worker/        entrada do Cloudflare Worker
scripts/       publicação automatizada
tests/         testes contra o Worker compilado
```
