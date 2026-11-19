/**
 * O início da casa própria dos fundos (pedido de M, 19/11/2026): a plataforma nova, com os
 * quadradinhos dela. Mostra só os ecrãs que o nível de quem olha abre; o «ver como» muda o nível.
 */
import { useNavigate } from 'react-router-dom'
import LayoutFundos from '@/components/LayoutFundos'
import VerComoFundos, { usePessoaFundos } from '@/components/VerComoFundos'
import { ECRAS_FUNDOS, GRUPOS_FUNDOS } from '@/data/ecrasFundos'
import { veEcra } from '@/lib/visaoFundos'

export default function FundosInicioPage() {
  const navigate = useNavigate()
  const pessoa = usePessoaFundos()
  return (
    <LayoutFundos title="Início">
      <div className="max-w-5xl mx-auto space-y-6">
        <VerComoFundos />
        <p className="text-sm text-grafite-claro">
          A casa de governação de projectos financiados por fundos internacionais. Demonstração com dados de exemplo citados —
          cada nível vê só o que é seu, e cada ecrã traz as regras da literatura com a fonte.
        </p>
        {GRUPOS_FUNDOS.map(grupo => {
          const itens = ECRAS_FUNDOS.filter(e => e.grupo === grupo && veEcra(pessoa, e.rota))
          if (itens.length === 0) return null
          return (
            <section key={grupo} aria-label={grupo}>
              <h2 className="font-serif text-lg text-navy mb-2">{grupo}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid={`fundos-grupo-${grupo}`}>
                {itens.map(e => (
                  <button key={e.rota} type="button" onClick={() => navigate(e.rota)} title={e.resumo}
                    className="text-left border border-navy/15 rounded-sm bg-white p-4 hover:-translate-y-0.5 hover:shadow transition focus:outline-none focus:ring-2 focus:ring-dourado flex items-start gap-3 min-h-[44px]">
                    <e.icone className="w-6 h-6 mt-0.5 shrink-0 text-dourado" aria-hidden />
                    <span>
                      <span className="block font-medium text-navy">{e.nome}</span>
                      <span className="block text-xs text-grafite-claro mt-0.5">{e.resumo}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </LayoutFundos>
  )
}
