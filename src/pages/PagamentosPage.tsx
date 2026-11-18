/**
 * Ecrã C05 — Pagamentos (fundos internacionais, DEMONSTRAÇÃO, dados fictícios).
 * Fila de pagamentos por estado, ligados à medição e ao projecto. Nada lê/grava no banco.
 */
import Layout from '@/components/Layout'
import { PAGAMENTOS_DEMO, RAZAO_RETIDO, type EstadoPag } from '@/data/pagamentosDemo'

const money = (v: number, m: string) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)} ${m}`
const dia = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('pt-PT')
const ROTULO: Record<EstadoPag, string> = { pago: 'Pago', aprovado: 'Aprovado, a pagar', 'em-analise': 'Em análise', retido: 'Retido' }
const COR: Record<EstadoPag, string> = {
  pago: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  aprovado: 'bg-sky-50 text-sky-800 border-sky-200',
  'em-analise': 'bg-amber-50 text-amber-800 border-amber-200',
  retido: 'bg-red-50 text-red-800 border-red-200',
}

export default function PagamentosPage() {
  const total = (e: EstadoPag, m: 'Kz' | 'US$') =>
    PAGAMENTOS_DEMO.filter(p => p.estado === e && p.moeda === m).reduce((s, p) => s + p.valor, 0)
  return (
    <Layout title="Pagamentos">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Cada pagamento ligado à medição e ao projecto, com o estado e o motivo de retenção quando há.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="resumo-pag">
          {(['pago','aprovado','em-analise','retido'] as EstadoPag[]).map(e => (
            <div key={e} className={`rounded-sm border p-3 ${COR[e]}`}>
              <p className="text-xs">{ROTULO[e]}</p>
              <p className="text-sm font-medium">{money(total(e,'Kz'),'Kz')}</p>
              <p className="text-xs">{money(total(e,'US$'),'US$')}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-2" data-testid="pagamentos">
          {PAGAMENTOS_DEMO.map(p => (
            <li key={p.id} className="border border-navy/15 rounded-sm p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{p.descricao}{p.medicao ? ` · ${p.medicao}` : ''}</p>
                  <p className="text-xs text-grafite-claro">{p.projeto} · {p.fornecedor}</p>
                  <p className="text-xs text-grafite-claro">Vencimento: {dia(p.vencimento)}</p>
                  {p.estado === 'retido' && RAZAO_RETIDO[p.id] && (
                    <p className="text-xs text-red-700 mt-1">{RAZAO_RETIDO[p.id]}</p>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-sm text-navy">{money(p.valor, p.moeda)}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-sm border ${COR[p.estado]}`}>{ROTULO[p.estado]}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
