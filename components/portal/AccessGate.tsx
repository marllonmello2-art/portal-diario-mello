import Link from "next/link";
import { BRAND } from "../../lib/portal/brand";

/**
 * Convite exibido no lugar do restante do texto quando a matéria é exclusiva
 * e o visitante ainda não tem conta.
 *
 * O começo da matéria continua visível de propósito: o leitor (e os buscadores)
 * veem do que se trata antes de decidir criar a conta.
 */
export function AccessGate({ returnTo }: { returnTo: string }) {
  const params = `?voltar_para=${encodeURIComponent(returnTo)}`;

  return (
    <section className="dm-gate" aria-labelledby="dm-gate-title">
      <span className="dm-kicker">Conteúdo exclusivo</span>
      <h2 id="dm-gate-title">Continue lendo com a conta gratuita</h2>
      <p>
        Esta matéria é aberta a quem tem conta no {BRAND.name}. O cadastro é gratuito, leva menos
        de um minuto e também libera sua lista de leitura.
      </p>
      <div className="dm-actions">
        <Link href={`/criar-conta${params}`} className="dm-btn">
          Criar conta gratuita
        </Link>
        <Link href={`/entrar${params}`} className="dm-btn dm-btn-ghost">
          Já tenho conta
        </Link>
      </div>
    </section>
  );
}
