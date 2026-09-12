import Link from "next/link";
import type { Metadata } from "next";
import { CorrectionForm } from "../../components/portal/CorrectionForm";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Direito de resposta",
  description: `Peça correção ou exerça o direito de resposta no ${BRAND.name}.`,
};

export default function RightOfReplyPage() {
  return (
    <InstitutionalPage
      title="Correção e direito de resposta"
      intro="Errou? Avise. Foi atingido por uma informação incorreta? Responda."
      updatedAt="12 de setembro de 2026"
    >
      <h2>O que é o direito de resposta</h2>
      <p>
        A Lei 13.188/2015 assegura a quem foi ofendido ou teve a imagem atingida por matéria
        divulgada em veículo de comunicação o direito de responder, de forma gratuita e proporcional
        ao agravo. O pedido pode ser feito em até <strong>60 dias</strong> contados da publicação.
      </p>

      <h2>Como funciona aqui</h2>
      <ul>
        <li>Você envia o pedido no formulário abaixo e recebe um protocolo na hora.</li>
        <li>A redação analisa e responde pelo e-mail informado em até cinco dias úteis.</li>
        <li>
          Sendo caso de correção, a nota entra no pé da matéria com data e descrição — veja a{" "}
          <Link href="/politica-de-correcoes">política de correções</Link>.
        </li>
        <li>
          Sendo caso de resposta, publicamos o texto com destaque equivalente ao da matéria que
          deu origem ao pedido.
        </li>
        <li>Se o pedido for recusado, você recebe a recusa por escrito, com a razão.</li>
      </ul>

      <h2>Formulário</h2>
      <CorrectionForm />

      <p style={{ marginTop: 24 }}>
        Prefere escrever direto? <strong>{BRAND.email}</strong>.
      </p>
    </InstitutionalPage>
  );
}
