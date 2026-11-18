/**
 * Ecrã C02 — Carteira de projectos (fundos internacionais, DEMONSTRAÇÃO, dados fictícios).
 * Lista os projectos por país e sector, com cor, avanço e o que há a pagar, e deixa filtrar por cor e país.
 * Nada lê nem grava no banco. Contas reais (src/lib/medicaoObra.ts).
 */
import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { calcularBoletim, desvioDeCronograma, semaforo, type Semaforo } from '@/lib/medicaoObra'
import { PROJETOS_DEMO } from '@/data/demoObraAngola'

const kz = (v: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)} Kz`
const pct = (v: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(Math.round(v * 1000) / 10)} %`
const COR: Record<Semaforo, string> = { verde: 'bg-emerald-600', amarelo: 'bg-amber-500', vermelho: 'bg-red-600' }
const NOME: Record<Semaforo, string> = { verde: 'No prazo', amarelo: 'Atenção', vermelho: 'Crítico' }
const PAIS: Record<string, string> = { AO: 'Angola', NA: 'Namíbia' }

export default function CarteiraProjectosPage() {
  const [cor, setCor] = useState<'todas' | Semaforo>('todas')
  const [pais, setPais] = useState<'todos' | 'AO' | 'NA'>('todos')

  const linhas = useMemo(() => PROJETOS_DEMO.map(p => {
    const b = calcularBoletim(p.itens, p.medidos, p.parametros)
    const contratado = p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
    const c = semaforo(desvioDeCronograma(b.avancoFisico, p.previsto), p.diasParado)
    return { p, b, contratado, c }
  }), [])

  const vis = linhas.filter(l => (cor === 'todas' || l.c === cor) && (pais === 'todos' || l.p.pais === pais))

  return (
    <Layout title="Carteira de projectos">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Projectos por país e sector, com cor, avanço e o que há a pagar.</p>
        <div className="flex flex-wrap gap-2">
          <label className="text-sm text-grafite-claro">Cor:
            <select value={cor} onChange={e => setCor(e.target.value as 'todas' | Semaforo)} className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy" title="Filtrar os projectos pela cor">
              <option value="todas">Todas</option><option value="verde">No prazo</option><option value="amarelo">Atenção</option><option value="vermelho">Crítico</option>
            </select>
          </label>
          <label className="text-sm text-grafite-claro">País:
            <select value={pais} onChange={e => setPais(e.target.value as 'todos' | 'AO' | 'NA')} className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy" title="Filtrar os projectos por país">
              <option value="todos">Todos</option><option value="AO">Angola</option><option value="NA">Namíbia</option>
            </select>
          </label>
        </div>
        <ul className="space-y-2" data-testid="carteira">
          {vis.map(l => (
            <li key={l.p.id} className="border border-navy/15 rounded-sm p-4 flex items-center gap-4" data-cor={l.c}>
              <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${COR[l.c]}`} title={NOME[l.c]} aria-label={NOME[l.c]} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy truncate">{l.p.nome}</p>
                <p className="text-xs text-grafite-claro">{PAIS[l.p.pais]} · avanço {pct(l.b.avancoFisico)} (previsto {pct(l.p.previsto)})</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm text-navy">{kz(l.contratado)}</p>
                <p className="text-[11px] text-grafite-claro">contratado</p>
              </div>
            </li>
          ))}
          {vis.length === 0 && <li className="text-sm text-grafite-claro" data-testid="vazio">Nenhum projecto com estes filtros.</li>}
        </ul>
      </div>
    </Layout>
  )
}
