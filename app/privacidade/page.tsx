import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Privacidade",
  description: `Quais dados o ${BRAND.name} coleta, para quê, por quanto tempo e como apagar.`,
};

export default function PrivacyPage() {
  return (
    <InstitutionalPage
      title="Política de privacidade"
      intro="O que guardamos, por que guardamos e como você apaga."
      updatedAt="13 de setembro de 2026"
    >
      <p>
        Esta política vale para o site do {BRAND.name} e segue a Lei Geral de Proteção de Dados
        (Lei 13.709/2018). Quem responde pelos dados é a direção do veículo, pelo e-mail{" "}
        <strong>{BRAND.email}</strong> — é também o canal para exercer qualquer direito descrito
        aqui.
      </p>

      <h2>O que coletamos</h2>
      <table>
        <thead>
          <tr>
            <th>Dado</th>
            <th>Quando</th>
            <th>Para quê</th>
            <th>Por quanto tempo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>E-mail, nome e senha</td>
            <td>Ao criar a conta gratuita de leitor</td>
            <td>Identificar você e guardar sua lista de leitura</td>
            <td>Até você apagar a conta</td>
          </tr>
          <tr>
            <td>Matérias salvas</td>
            <td>Ao clicar em salvar</td>
            <td>Montar a página “Minhas leituras”</td>
            <td>Até você remover ou apagar a conta</td>
          </tr>
          <tr>
            <td>E-mail, data, origem e finalidade</td>
            <td>Ao assinar o boletim</td>
            <td>Enviar o boletim e registrar seu consentimento</td>
            <td>Até o cancelamento; o registro é apagado a pedido</td>
          </tr>
          <tr>
            <td>Nome, e-mail e o teor do pedido</td>
            <td>Ao pedir correção ou direito de resposta</td>
            <td>Analisar, responder e comprovar que respondemos</td>
            <td>5 anos, como prova do atendimento</td>
          </tr>
          <tr>
            <td>Endereço IP e horário</td>
            <td>Em envios de formulário e tentativas de login</td>
            <td>Conter abuso e fraude</td>
            <td>Registros de segurança, por até 12 meses</td>
          </tr>
        </tbody>
      </table>

      <h2>Senhas</h2>
      <p>
        Não guardamos senha legível. Ela é convertida por PBKDF2-SHA256 com sal individual — nem a
        equipe do portal consegue ler a sua.
      </p>

      <h2>Métricas</h2>
      <p>
        Contamos visualizações por matéria de forma agregada, sem identificar quem leu e sem
        cookie para isso. Não usamos Google Analytics nem pixel de rede social.
      </p>

      <h2>Cookies</h2>
      <p>
        São dois, os dois necessários para manter sessão. A lista completa está na{" "}
        <Link href="/politica-de-cookies">política de cookies</Link>.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Com ninguém para fins de marketing. Os dados ficam na infraestrutura da Cloudflare, que
        hospeda o site e o banco, atuando como operadora. Não vendemos dados. Só entregamos
        informação a autoridade mediante ordem judicial, e avisamos a pessoa quando a lei permitir.
      </p>

      <h2>Seus direitos</h2>
      <ul>
        <li><strong>Acesso</strong> — pedir a cópia do que temos sobre você.</li>
        <li><strong>Correção</strong> — corrigir dado errado no seu cadastro.</li>
        <li><strong>Exclusão</strong> — apagar a conta pelo botão em “Minhas leituras”, ou pedir a exclusão do e-mail do boletim.</li>
        <li><strong>Revogação do consentimento</strong> — cancelar o boletim em um clique, pelo link do rodapé de cada edição.</li>
        <li><strong>Oposição e portabilidade</strong> — escreva e nós respondemos em até 15 dias.</li>
      </ul>

      <h2>O que a exclusão apaga</h2>
      <p>
        Apagar a conta remove seu cadastro e sua lista de leitura na hora. Registros de auditoria
        de segurança guardam apenas o identificador da ação, sem reconstruir seu perfil, e pedidos
        de correção permanecem pelo prazo acima porque são a prova de que o veículo respondeu.
      </p>

      <h2>Crianças e adolescentes</h2>
      <p>
        A conta de leitor é destinada a maiores de 18 anos. Se soubermos de cadastro de menor sem
        consentimento dos responsáveis, apagamos.
      </p>

      <h2>Mudanças</h2>
      <p>
        Alterações relevantes são anunciadas no site antes de entrar em vigor, e a data de
        atualização fica no fim desta página.
      </p>
    </InstitutionalPage>
  );
}
