import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: `Quais cookies o ${BRAND.name} usa e para quê.`,
};

export default function CookiesPage() {
  return (
    <InstitutionalPage
      title="Política de cookies"
      intro="A lista honesta: hoje o portal usa dois cookies, e nenhum deles serve para rastrear você."
      updatedAt="12 de setembro de 2026"
    >
      <h2>O que usamos hoje</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Para quê</th>
            <th>Duração</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dm_leitor</code></td>
            <td>Manter você conectado à conta gratuita de leitor</td>
            <td>30 dias</td>
          </tr>
          <tr>
            <td><code>dm_session</code></td>
            <td>Manter a equipe conectada ao painel de publicação</td>
            <td>12 horas</td>
          </tr>
        </tbody>
      </table>
      <p>
        Os dois são <strong>estritamente necessários</strong>: sem eles, não há como saber que é
        você do outro lado. Ambos são HttpOnly (o JavaScript da página não os lê), Secure (só
        trafegam em conexão cifrada) e SameSite=Lax.
      </p>

      <h2>O que não usamos</h2>
      <p>
        Não há cookie de publicidade, de rede social ou de rastreamento de terceiros neste site
        hoje. Não vendemos nem compartilhamos dados de navegação.
      </p>

      <h2>Medição</h2>
      <p>
        Contamos visualizações por matéria de forma agregada, sem identificar o leitor e sem
        cookie para isso.
      </p>

      <h2>Se isso mudar</h2>
      <p>
        Caso o portal passe a exibir publicidade, esta página será atualizada <em>antes</em> da
        mudança, com a lista dos novos cookies e um aviso de consentimento na primeira visita.
      </p>

      <h2>Como controlar</h2>
      <p>
        Você pode apagar ou bloquear cookies nas configurações do seu navegador. Bloqueando os
        dois acima, o site continua legível — você só não consegue entrar na conta. Mais detalhes
        em <Link href="/privacidade">privacidade</Link>.
      </p>
    </InstitutionalPage>
  );
}
