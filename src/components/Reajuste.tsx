import { useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import type { Contrato } from '@/lib/repositorio'
import { Calculator, Copy } from 'lucide-react'

interface Resultado { indice: string; acumulado12m: number; de: string; ate: string; fonte: string; meses?: { data: string; valor: number }[]; desatualizado?: boolean; aviso?: string }
// Passo 33: simulador com escolha de índice (IGP-M, IPCA, INPC) e gráfico dos últimos 12 meses.
const INDICES: { valor: string; rotulo: string }[] = [{ valor: 'igpm', rotulo: 'IGP-M' }, { valor: 'ipca', rotulo: 'IPCA' }, { valor: 'inpc', rotulo: 'INPC' }]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Cálculo do reajuste pelo acumulado de 12 meses do Banco Central e carta pronta ao locatário. */
export default function Reajuste({ contrato, imovel }: { contrato: Contrato; imovel: string }) {
  const [res, setRes] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [indiceSim, setIndiceSim] = useState<string>(['igpm', 'ipca', 'inpc'].includes(contrato.indice) ? contrato.indice : 'igpm')
  const [comparacao, setComparacao] = useState<Record<string, number>>({})

  if (contrato.indice === 'sem_reajuste' || contrato.indice === 'fixo') return null
  const suportado = ['igpm', 'ipca', 'inpc'].includes(contrato.indice)

  const calcular = async (indice = indiceSim) => {
    setCarregando(true); setErro('')
    try {
      if (!supabaseConfigurado) throw new Error('Disponível na versão conectada ao banco.')
      const { data, error } = await supabase.functions.invoke('indice-reajuste', { body: { indice } })
      if (error) throw error
      if (data?.erro) throw new Error(data.erro)
      setRes(data); setIndiceSim(indice); setComparacao(c => ({ ...c, [indice]: data.acumulado12m }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o índice.')
    } finally { setCarregando(false) }
  }

  const novo = res ? Math.round(contrato.valor * (1 + res.acumulado12m / 100) * 100) / 100 : 0
  const nomeIndice = (res?.indice ?? indiceSim).toUpperCase().replace('IGPM', 'IGP-M')
  const nomeContrato = contrato.indice.toUpperCase().replace('IGPM', 'IGP-M')
  const carta = res ? `Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}.

Prezado(a) ${contrato.parte},

Referente ao contrato do imóvel ${imovel}, comunicamos o reajuste anual do valor, conforme a cláusula de reajuste pelo ${nomeIndice} (art. 17 e 18 da Lei 8.245/91).

Índice acumulado de ${res.de.slice(3)} a ${res.ate.slice(3)}: ${res.acumulado12m.toLocaleString('pt-BR')}% (${res.fonte}).
Valor atual: ${brl(contrato.valor)}
Novo valor: ${brl(novo)}, a partir do próximo vencimento.

Permanecemos à disposição.

GMenezes Advogados Associados` : ''

  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-reajuste">
      <h3 id="titulo-reajuste" className="text-lg mb-1 flex items-center gap-2"><Calculator size={18} aria-hidden="true" /> Reajuste anual</h3>
      <p className="text-sm text-grafite-claro mb-4">Calcula pelo índice oficial do Banco Central e prepara a carta ao locatário.</p>
      <div className="flex flex-wrap items-center gap-2 mb-3" role="radiogroup" aria-label="Índice do simulador" data-testid="simulador-indice">
        <span className="text-xs uppercase tracking-wider text-grafite-claro">Simular com</span>
        {INDICES.map(i => <button key={i.valor} type="button" role="radio" aria-checked={indiceSim === i.valor} onClick={() => calcular(i.valor)} disabled={carregando} className={`min-h-[44px] px-3 text-sm border ${indiceSim === i.valor ? 'bg-navy text-white' : 'border-navy/20'}`} data-testid={`indice-${i.valor}`}>{i.rotulo}{contrato.indice === i.valor ? ' (do contrato)' : ''}</button>)}
      </div>
      {!suportado && <p className="text-sm text-grafite mb-3">O {nomeContrato} não tem série pública no Banco Central; use o simulador acima como referência e informe o percentual manualmente.</p>}
      {!res ? (
        <button onClick={() => calcular()} disabled={carregando} className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 rounded-sm uppercase tracking-wider text-sm disabled:opacity-60" data-testid="calcular-reajuste">
          {carregando ? 'Consultando o Banco Central…' : `Calcular reajuste pelo ${nomeIndice}`}
        </button>
      ) : (
        <div className="space-y-4">
          {res.aviso && <p className="text-xs text-atencao">{res.aviso}</p>}
          {res.meses && res.meses.length > 0 && (() => {
            const max = Math.max(...res.meses.map(m => Math.abs(m.valor)), 0.1)
            return (
              <figure data-testid="grafico-indice">
                <figcaption className="text-xs uppercase tracking-wider text-grafite-claro mb-1">{nomeIndice} mês a mês (%), últimos 12 meses</figcaption>
                <svg viewBox="0 0 360 110" className="w-full max-w-xl" role="img" aria-label={`Variação mensal do ${nomeIndice}: ${res.meses.map(m => `${m.data.slice(3)} ${m.valor.toLocaleString('pt-BR')}%`).join(', ')}`}>
                  <line x1="0" y1="60" x2="360" y2="60" stroke="#B08D57" strokeWidth="0.5" />
                  {res.meses.map((m, i) => { const h = (Math.abs(m.valor) / max) * 45; const y = m.valor >= 0 ? 60 - h : 60; return (
                    <g key={m.data}><rect x={i * 30 + 6} y={y} width={18} height={Math.max(h, 0.5)} fill={m.valor >= 0 ? '#14213D' : '#B23A48'} data-testid="barra-mes" />
                      <text x={i * 30 + 15} y={m.valor >= 0 ? y - 2 : y + h + 7} textAnchor="middle" fontSize="6" fill="#333">{m.valor.toLocaleString('pt-BR')}</text>
                      <text x={i * 30 + 15} y="104" textAnchor="middle" fontSize="6" fill="#666">{m.data.slice(3, 5)}/{m.data.slice(8)}</text></g>) })}
                </svg>
              </figure>
            )
          })()}
          {Object.keys(comparacao).length > 1 && <p className="text-xs text-grafite-claro" data-testid="comparacao-indices">Comparação em 12 meses: {INDICES.filter(i => comparacao[i.valor] !== undefined).map(i => `${i.rotulo} ${comparacao[i.valor].toLocaleString('pt-BR')}% (${brl(Math.round(contrato.valor * (1 + comparacao[i.valor] / 100) * 100) / 100)})`).join(' · ')}</p>}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">{nomeIndice} em 12 meses</dt><dd className="font-serif text-2xl text-navy" data-testid="acumulado-12m">{res.acumulado12m.toLocaleString('pt-BR')}%</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor atual</dt><dd className="font-serif text-2xl text-navy">{brl(contrato.valor)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">Novo valor</dt><dd className="font-serif text-2xl text-navy" data-testid="novo-valor">{brl(novo)}</dd></div>
          </dl>
          <textarea readOnly value={carta} rows={12} className="w-full border border-navy/15 p-3 text-sm font-mono" aria-label="Carta de reajuste" />
          <button onClick={() => { navigator.clipboard.writeText(carta); setCopiado(true) }} className="inline-flex items-center gap-2 min-h-[44px] px-4 border border-navy/20 text-sm">
            <Copy size={16} aria-hidden="true" /> {copiado ? 'Carta copiada' : 'Copiar carta'}
          </button>
        </div>
      )}
      {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}
    </section>
  )
}
