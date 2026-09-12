import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Condições de uso do site do ${BRAND.name}.`,
};

export default function TermsPage() {
  return (
    <InstitutionalPage
      title="Termos de uso"
      intro="As condições para usar este site e a conta gratuita de leitor."
      updatedAt="12 de setembro de 2026"
    >
      <h2>1. Quem oferece o serviço</h2>
      <p>
        Este site é mantido pelo {BRAND.name}, veículo de informação brasileiro. Contato:{" "}
        <strong>{BRAND.email}</strong>. O uso do site implica concordância com estes termos.
      </p>

      <h2>2. Conteúdo</h2>
      <p>
        O conteúdo é publicado segundo a{" "}
        <Link href="/politica-editorial">política editorial</Link>. Textos de opinião são de
        responsabilidade de quem assina. Conteúdo patrocinado é identificado como tal.
      </p>

      <h2>3. Direitos autorais e reprodução</h2>
      <p>
        Os textos, fotos e artes publicados são protegidos pela Lei 9.610/1998. A reprodução de
        notícia ou artigo informativo na imprensa é admitida com menção ao autor, quando assinado,
        e à publicação de origem. Fora dessa hipótese, a reprodução integral depende de autorização
        prévia — peça por e-mail. Citar um trecho com link para a matéria original é sempre bem-vindo.
      </p>

      <h2>4. Conta de leitor</h2>
      <p>
        A conta é gratuita, pessoal e intransferível. Você é responsável por manter a senha em
        sigilo. Podemos encerrar contas usadas para fraude, automação abusiva ou tentativa de
        violar a segurança do site. Para apagar sua conta e seus dados, escreva para{" "}
        <strong>{BRAND.email}</strong> — veja a <Link href="/privacidade">política de privacidade</Link>.
      </p>

      <h2>5. Conduta</h2>
      <p>
        Não é permitido tentar acessar áreas restritas, raspar o site em volume que prejudique o
        serviço, nem usar o conteúdo para treinar modelos comerciais sem autorização.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        Fazemos o possível para manter o site no ar, mas não garantimos funcionamento
        ininterrupto. Conteúdo pode ser corrigido, atualizado ou arquivado — correções ficam
        registradas conforme a{" "}
        <Link href="/politica-de-correcoes">política de correções</Link>.
      </p>

      <h2>7. Alterações</h2>
      <p>
        Estes termos podem mudar. A data de atualização fica no fim da página, e mudanças
        relevantes são anunciadas no site.
      </p>

      <h2>8. Lei aplicável</h2>
      <p>
        Aplica-se a lei brasileira. Eventuais controvérsias serão tratadas no foro do domicílio do
        leitor, quando consumidor, na forma da lei.
      </p>

      <p>
        <em>
          Este texto foi redigido para ser claro ao leitor e não substitui análise de advogado
          antes de o portal assumir compromissos comerciais.
        </em>
      </p>
    </InstitutionalPage>
  );
}
