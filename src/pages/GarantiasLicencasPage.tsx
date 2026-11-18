/** Ecrã C07 — Garantias e licenças (fundos internacionais, DEMONSTRAÇÃO). Nada lê/grava no banco. */
import Layout from '@/components/Layout'
import { GARANTIAS_DEMO } from '@/data/operacaoDemo'
import { DATA_REFERENCIA_LEGIVEL, diasAte } from '@/data/referenciaDemo'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import { recorte } from '@/lib/visaoFundos'
const dia = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('pt-PT')
export default function GarantiasLicencasPage() {
  const quem = usePessoaFundos()
  const ordenado = recorte(quem, GARANTIAS_DEMO).sort((a, b) => a.validade.localeCompare(b.validade))
  return (
    <Layout title="Garantias e licenças">
      <SoParaNiveis rota="/garantias-licencas">
      <div className="max-w-5xl mx-auto space-y-4">
        <VerComoFundos />
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Garantias e licenças por validade, com alerta de proximidade (vermelho &lt; 15 dias, âmbar &lt; 45). Os dias contam-se a partir de {DATA_REFERENCIA_LEGIVEL}.</p>
        <ul className="space-y-2" data-testid="garantias">
          {ordenado.map(g => {
            const d = diasAte(g.validade)
            const cor = d < 15 ? 'text-red-700' : d < 45 ? 'text-amber-700' : 'text-grafite'
            return (
              <li key={g.id} className="border border-navy/15 rounded-sm p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{g.tipo}: {g.descricao}</p>
                  <p className="text-xs text-grafite-claro">{g.projecto} · {g.entidade}</p>
                </div>
                <p className={`text-sm whitespace-nowrap ${cor}`}>{dia(g.validade)}{d < 45 ? ` · ${d} dias` : ''}</p>
              </li>
            )
          })}
          {ordenado.length === 0 && <li className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</li>}
        </ul>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
