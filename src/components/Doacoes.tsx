import { Link } from 'react-router-dom'
import { useTexto } from '@/lib/i18n'

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
    <section className="mt-10 text-left" data-testid="doacoes">
      <h2 className="text-lg font-serif text-center">{t('doacoes.titulo')}</h2>
      <p className="text-xs text-white/60 mt-2 mb-4 text-center max-w-2xl mx-auto">{t('doacoes.resumo')}</p>
      <div className="border border-white/20 p-4">
        <ul className="space-y-2 text-xs text-white/70">
          <li data-testid="doacao-forma-1">{t('doacoes.forma1')}</li>
          <li data-testid="doacao-forma-2">{t('doacoes.forma2')}</li>
          <li data-testid="doacao-forma-3">{t('doacoes.forma3')}</li>
        </ul>
        <p className="text-[11px] text-white/45 mt-4" data-testid="doacao-destino">{t('doacoes.destino')}</p>
        <Link
          to="/login"
          title={t('doacoes.entrar')}
          data-testid="doacoes-entrar"
          className="inline-block mt-4 border border-white/40 hover:border-white px-4 py-2 text-xs uppercase tracking-wider no-underline"
        >
          {t('doacoes.entrar')}
        </Link>
      </div>
    </section>
  )
}
