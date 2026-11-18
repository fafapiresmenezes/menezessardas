/**
 * Visão do presidente (fase C, ecrã C01) — DEMONSTRAÇÃO, dados inventados (src/data/demoObraAngola.ts).
 * Lê-se em trinta segundos: cada projecto com semáforo e o motivo da cor, o contratado e o medido,
 * e os avisos mais graves. Nada lê nem grava no banco. As contas são as de verdade (src/lib/medicaoObra.ts).
 */
import { useMemo } from 'react'
import Layout from '@/components/Layout'
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react'
import { calcularBoletim, desvioDeCronograma, semaforo, type Semaforo } from '@/lib/medicaoObra'
import { PROJETOS_DEMO } from '@/data/demoObraAngola'

const kz = (v: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)} Kz`
const pct = (v: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(Math.round(v * 1000) / 10)} %`
const COR: Record<Semaforo, string> = { verde: 'bg-emerald-600', amarelo: 'bg-amber-500', vermelho: 'bg-red-600' }
const NOME: Record<Semaforo, string> = { verde: 'No prazo', amarelo: 'Atenção', vermelho: 'Crítico' }

export default function VisaoPresidentePage() {
  const linhas = useMemo(() => PROJETOS_DEMO.map(p => {
    const b = calcularBoletim(p.itens, p.medidos, p.parametros)
    const contratado = p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
    const desvio = desvioDeCronograma(b.avancoFisico, p.previsto)
    const cor = semaforo(desvio, p.diasParado)
    const motivo = cor === 'vermelho'
      ? (p.diasParado >= 15 ? `boletim parado há ${p.diasParado} dias` : `avanço ${pct(desvio / 100)} abaixo do previsto`)
      : cor === 'amarelo'
        ? (p.diasParado >= 7 ? `boletim parado há ${p.diasParado} dias` : 'avanço um pouco abaixo do previsto')
        : 'dentro do previsto'
    return { p, b, contratado, desvio, cor, motivo }
  }), [])

  const totContratado = linhas.reduce((s, l) => s + l.contratado, 0)
  const totMedido = linhas.reduce((s, l) => s + l.b.liquidoAPagar, 0)
  const avisos = linhas
    .filter(l => l.cor !== 'verde')
    .sort((a, b) => (a.cor === 'vermelho' ? -1 : 1) - (b.cor === 'vermelho' ? -1 : 1) || b.p.diasParado - a.p.diasParado)

  return (
    <Layout title="Visão do presidente">
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Cada projecto com a cor e o motivo, o contratado e o medido, e os avisos a tratar. As contas são as de verdade.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-navy/15 rounded-sm p-4">
            <p className="text-xs uppercase tracking-wider text-grafite-claro flex items-center gap-2"><TrendingUp size={14} aria-hidden="true" /> Projectos</p>
            <p className="text-2xl font-semibold text-navy">{linhas.length}</p>
          </div>
          <div className="border border-navy/15 rounded-sm p-4">
            <p className="text-xs uppercase tracking-wider text-grafite-claro flex items-center gap-2"><Wallet size={14} aria-hidden="true" /> Contratado</p>
            <p className="text-2xl font-semibold text-navy">{kz(totContratado)}</p>
          </div>
          <div className="border border-navy/15 rounded-sm p-4">
            <p className="text-xs uppercase tracking-wider text-grafite-claro flex items-center gap-2"><Wallet size={14} aria-hidden="true" /> A pagar neste período</p>
            <p className="text-2xl font-semibold text-navy">{kz(totMedido)}</p>
          </div>
        </div>

        <section aria-labelledby="carteira">
          <h2 id="carteira" className="text-sm uppercase tracking-wider text-grafite-claro mb-2">Projectos</h2>
          <ul className="space-y-2" data-testid="lista-projectos">
            {linhas.map(l => (
              <li key={l.p.id} className="border border-navy/15 rounded-sm p-4 flex items-center gap-4" data-cor={l.cor}>
                <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${COR[l.cor]}`} title={NOME[l.cor]} aria-label={NOME[l.cor]} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy truncate">{l.p.nome}</p>
                  <p className="text-xs text-grafite-claro">{NOME[l.cor]} — {l.motivo}. Avanço físico {pct(l.b.avancoFisico)} (previsto {pct(l.p.previsto)}).</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-navy">{kz(l.b.liquidoAPagar)}</p>
                  <p className="text-[11px] text-grafite-claro">a pagar</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="avisos">
          <h2 id="avisos" className="text-sm uppercase tracking-wider text-grafite-claro mb-2 flex items-center gap-2"><AlertTriangle size={14} aria-hidden="true" /> Avisos a tratar</h2>
          {avisos.length === 0 ? (
            <p className="text-sm text-grafite-claro">Nenhum projecto em alerta.</p>
          ) : (
            <ul className="space-y-1" data-testid="lista-avisos">
              {avisos.map(l => (
                <li key={l.p.id} className="text-sm text-navy flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${COR[l.cor]}`} aria-hidden="true" />
                  <strong>{l.p.nome}:</strong> {l.motivo}.
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}
