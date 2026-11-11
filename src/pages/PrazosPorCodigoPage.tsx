import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { CalendarClock, Copy } from 'lucide-react'
import { hojeLocal } from '@/lib/datas'
import { br } from '@/lib/ferramentas/base'
import { ATOS_POR_CODIGO, CODIGOS, PRERROGATIVAS_DOBRO, calcularPrazoPorCodigo, resumoPrazo, rotuloPrazo, type Codigo } from '@/lib/prazos/codigos'

// Prazos por código: o mesmo tipo de ato tem contagem diferente em cada ramo do direito.
// Escolha o ramo, o ato e a data; a tela mostra a regra de contagem, a data final e a base legal.
const ORDEM: Codigo[] = ['CPC', 'CLT', 'CPP', 'JEC', 'LEF', 'MS', 'ECA', 'LOC', 'CDC', 'FAL', 'PRESC']
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const NATUREZA = { processual: 'Prazo processual', material: 'Direito material (decadência, prescrição ou prazo de contrato)', improprio: 'Prazo impróprio (do juiz, do MP ou da autoridade)' }

export default function PrazosPorCodigoPage() {
  const [codigo, setCodigo] = useState<Codigo | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [atoId, setAtoId] = useState('')
  const [inicio, setInicio] = useState(hojeLocal())
  const [prerrogativa, setPrerrogativa] = useState('nenhuma')
  const [copiado, setCopiado] = useState(false)

  const lista = useMemo(() => ATOS_POR_CODIGO.filter(a => (codigo === 'todos' || a.codigo === codigo) && (!busca || norm(`${a.ato} ${a.base} ${CODIGOS[a.codigo].nome}`).includes(norm(busca)))), [codigo, busca])
  const ato = ATOS_POR_CODIGO.find(a => a.id === atoId)
  const r = ato && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? calcularPrazoPorCodigo(ato, inicio, prerrogativa) : null
  const copiar = async () => { if (!ato || !r) return; try { await navigator.clipboard.writeText(resumoPrazo(ato, inicio, r)); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sem área de transferência */ } }

  return (
    <Layout title="Prazos por código">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <h2 className="font-serif text-xl flex items-center gap-2"><CalendarClock className="w-5 h-5 text-dourado" aria-hidden />1. Escolha o ramo do direito</h2>
          <p className="text-sm text-grafite-claro mt-1">Cada código conta o prazo de um jeito: o CPC em dias úteis, o CPP em dias corridos, o ECA em dias corridos sem prazo em dobro, a decadência em meses ou anos.</p>
          <div role="tablist" aria-label="Ramo do direito" className="flex flex-wrap gap-2 mt-3">
            {(['todos', ...ORDEM] as const).map(c => (
              <button key={c} role="tab" aria-selected={codigo === c} onClick={() => setCodigo(c)} data-testid={`ramo-${c}`}
                className={`min-h-[44px] px-4 text-sm border ${codigo === c ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}>{c === 'todos' ? 'Todos' : CODIGOS[c].sigla}</button>
            ))}
          </div>
          {codigo !== 'todos' && <p className="mt-3 p-3 text-sm border-l-4 border-dourado bg-navy/5" data-testid="regra-ramo"><strong>{CODIGOS[codigo].nome}.</strong> {CODIGOS[codigo].regra}</p>}
        </section>

        <section className="bg-white shadow-sm p-6">
          <h2 className="font-serif text-xl">2. Escolha o ato</h2>
          <label htmlFor="busca-ato" className="sr-only">Procurar ato</label>
          <input id="busca-ato" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar (apelação, contestação, queixa, falência…)" className="mt-3 w-full border px-3 py-2 min-h-[44px]" data-testid="busca-ato" />
          <p className="text-xs text-grafite-claro mt-2" aria-live="polite">{lista.length} ato(s)</p>
          <div className="mt-2 overflow-x-auto max-h-[420px] overflow-y-auto border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy text-white text-left"><tr><th className="p-2">Ato</th><th className="p-2">Prazo</th><th className="p-2">Base legal</th><th className="p-2"><span className="sr-only">Escolher</span></th></tr></thead>
              <tbody className="divide-y divide-navy/10">
                {lista.map(a => (
                  <tr key={a.id} className={a.id === atoId ? 'bg-dourado/10' : ''} data-testid={`ato-${a.id}`}>
                    <td className="p-2">{a.ato}<span className="block text-xs text-grafite-claro">{CODIGOS[a.codigo].sigla} · {a.natureza === 'material' ? 'direito material' : a.natureza === 'improprio' ? 'prazo impróprio' : 'processual'}</span></td>
                    <td className="p-2 whitespace-nowrap">{rotuloPrazo(a)}</td>
                    <td className="p-2">{a.base}</td>
                    <td className="p-2"><button type="button" onClick={() => { setAtoId(a.id); setPrerrogativa('nenhuma') }} aria-label={`Calcular ${a.ato}`} className="min-h-[44px] px-3 border border-navy text-navy">Calcular</button></td>
                  </tr>
                ))}
                {lista.length === 0 && <tr><td colSpan={4} className="p-4 text-grafite-claro">Nenhum ato encontrado. Tente outra palavra ou o ramo "Todos".</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {ato && (
          <section className="bg-white shadow-sm p-6 space-y-4" data-testid="calculo" aria-live="polite">
            <h2 className="font-serif text-xl">3. Data final: {ato.ato}</h2>
            <p className="text-sm text-grafite-claro">{CODIGOS[ato.codigo].nome} · {rotuloPrazo(ato)} · {NATUREZA[ato.natureza ?? 'processual']}</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="inicio" className="block text-sm font-medium">{ato.marco ?? 'Intimação considerada feita em'}</label>
                <input id="inicio" type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="border px-3 py-2 min-h-[44px]" />
              </div>
              {ato.dobro && (
                <div>
                  <label htmlFor="prerrogativa" className="block text-sm font-medium">Prazo em dobro?</label>
                  <select id="prerrogativa" value={prerrogativa} onChange={e => setPrerrogativa(e.target.value)} className="border px-3 py-2 min-h-[44px]">
                    {Object.entries(PRERROGATIVAS_DOBRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
            </div>
            {r && (
              <div className="space-y-2">
                <p className="text-lg" data-testid="prazo-final">Último dia: <strong>{br(r.final)}</strong> ({r.diaSemana})</p>
                <p className="text-sm">Contagem: {r.quantidade} {r.unidade === 'dias_uteis' ? 'dias úteis' : r.unidade === 'dias_corridos' ? 'dias corridos' : r.unidade === 'meses' ? 'meses' : 'anos'}, sem contar o dia do começo ({br(inicio)}). Base: {ato.base}.</p>
                {r.pulados.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Datas puladas ou prorrogadas ({r.pulados.length})</summary><ul className="list-disc pl-5 mt-1">{r.pulados.map(p => <li key={p.data}>{br(p.data)}: {p.motivo}</li>)}</ul></details>}
                {r.avisos.map((a, i) => <p key={i} className="p-3 text-sm border-l-4 border-atencao bg-atencaoFundo" role="note">{a}</p>)}
                <button type="button" onClick={copiar} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2" data-testid="copiar-prazo"><Copy className="w-4 h-4" aria-hidden />{copiado ? 'Resumo copiado' : 'Copiar resumo'}</button>
              </div>
            )}
          </section>
        )}
        <p className="text-xs text-grafite-claro">Apoio de conferência: portarias do tribunal, suspensões avulsas de prazo e a regra do caso concreto prevalecem. Feriados nacionais e do Rio (estado e município) estão incluídos; feriados de outras comarcas não. Confirme sempre no tribunal antes de protocolar no último dia.</p>
      </div>
    </Layout>
  )
}
