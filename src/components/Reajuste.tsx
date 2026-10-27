import { useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import type { Contrato } from '@/lib/repositorio'
import { Calculator, Copy } from 'lucide-react'

interface Resultado { acumulado12m: number; de: string; ate: string; fonte: string }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Cálculo do reajuste pelo acumulado de 12 meses do Banco Central e carta pronta ao locatário. */
export default function Reajuste({ contrato, imovel }: { contrato: Contrato; imovel: string }) {
  const [res, setRes] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  if (contrato.indice === 'sem_reajuste' || contrato.indice === 'fixo') return null
  const suportado = ['igpm', 'ipca', 'inpc'].includes(contrato.indice)

  const calcular = async () => {
    setCarregando(true); setErro('')
    try {
      if (!supabaseConfigurado) throw new Error('Disponível na versão conectada ao banco.')
      const { data, error } = await supabase.functions.invoke('indice-reajuste', { body: { indice: contrato.indice } })
      if (error) throw error
      if (data?.erro) throw new Error(data.erro)
      setRes(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o índice.')
    } finally { setCarregando(false) }
  }

  const novo = res ? Math.round(contrato.valor * (1 + res.acumulado12m / 100) * 100) / 100 : 0
  const nomeIndice = contrato.indice.toUpperCase().replace('IGPM', 'IGP-M')
  const carta = res ? `Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}.

Prezado(a) ${contrato.parte},

Referente ao contrato do imóvel ${imovel}, comunicamos o reajuste anual do valor, conforme a cláusula de reajuste pelo ${nomeIndice} (art. 17 e 18 da Lei 8.245/91).

Índice acumulado de ${res.de.slice(3)} a ${res.ate.slice(3)}: ${res.acumulado12m.toLocaleString('pt-BR')}% (${res.fonte}).
Valor atual: ${brl(contrato.valor)}
Novo valor: ${brl(novo)}, a partir do próximo vencimento.

Permanecemos à disposição.

Leticia Sardas & Menezes Advogados Associados` : ''

  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-reajuste">
      <h3 id="titulo-reajuste" className="text-lg mb-1 flex items-center gap-2"><Calculator size={18} aria-hidden="true" /> Reajuste anual</h3>
      <p className="text-sm text-grafite-claro mb-4">Calcula pelo índice oficial do Banco Central e prepara a carta ao locatário.</p>
      {!suportado ? (
        <p className="text-sm text-grafite">O {nomeIndice} não tem série pública no Banco Central; informe o percentual manualmente.</p>
      ) : !res ? (
        <button onClick={calcular} disabled={carregando} className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 rounded-sm uppercase tracking-wider text-sm disabled:opacity-60">
          {carregando ? 'Consultando o Banco Central…' : `Calcular reajuste pelo ${nomeIndice}`}
        </button>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">{nomeIndice} em 12 meses</dt><dd className="font-serif text-2xl text-navy">{res.acumulado12m.toLocaleString('pt-BR')}%</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor atual</dt><dd className="font-serif text-2xl text-navy">{brl(contrato.valor)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-grafite-claro">Novo valor</dt><dd className="font-serif text-2xl text-navy">{brl(novo)}</dd></div>
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
