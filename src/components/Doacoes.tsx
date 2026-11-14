import { Link } from 'react-router-dom'
import { useTexto } from '@/lib/i18n'
import { entradaPara } from '@/lib/destino'

/**
 * Espaço de doação na porta do Instituto (pedido de M, 13/11/2026 21:35: "já coloque, por favor,
 * aí também espaço para doações").
 *
 * O que esta tela NÃO faz: não recebe dinheiro. Não tem chave PIX, não tem cartão, não tem link de
 * pagamento — a conta de destino do Instituto ainda está sendo aberta, e inventar um destino de
 * doação é o tipo de erro que não se desfaz. A tela diz as formas de apoio e manda combinar na
 * entrada; quando M decidir o destino, entra aqui.
 */
export default function Doacoes() {
  const t = useTexto()
  return (
    <section className="porta mt-16 text-left" data-testid="doacoes">
      <h2 className="text-3xl font-serif text-center">{t('doacoes.titulo')}</h2>
      <p className="text-base text-neutral-200 mt-3 mb-8 text-center max-w-3xl mx-auto">{t('doacoes.resumo')}</p>
      <div className="border border-neutral-600 bg-neutral-950 p-5 md:p-7">
        <ul className="grid gap-4 md:grid-cols-3">
          {(['doacoes.forma1', 'doacoes.forma2', 'doacoes.forma3'] as const).map((chave, i) => (
            <li key={chave} data-testid={`doacao-forma-${i + 1}`} className="border-l-2 border-neutral-400 pl-4 text-sm leading-relaxed text-neutral-100">
              {t(chave)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-300 mt-7" data-testid="doacao-destino">{t('doacoes.destino')}</p>
        <Link
          to={entradaPara('/instituto')}
          title={t('doacoes.entrar')}
          data-testid="doacoes-entrar"
          className="inline-block mt-6 border border-[#fff] px-5 py-3 text-sm font-medium uppercase tracking-wider text-[#fff] no-underline transition hover:bg-neutral-800"
        >
          {t('doacoes.entrar')}
        </Link>
      </div>
    </section>
  )
}
