import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'

type Area = {
  area: string; nome: string; porAno: { ano: number; n: number }[]; amostra: number; fonte: string; consultadoEm: string
  previsao?: { ano: number; processos: number; margem: number; variacao: number | null; r2: number }
  confianca: 'alta' | 'media' | 'baixa' | 'insuficiente'; desatualizado?: boolean; erro?: string; anosIncompletos?: number[]
  jen?: { fonte: string; tribunal: string; indicador: string; porAno: { ano: number; n: number }[]; previsao: { ano: number; processos: number; margem: number; variacao: number | null; r2: number }; confianca: 'alta' | 'media' | 'baixa'; concordam: boolean }
  confiancaCombinada?: 'alta' | 'media' | 'baixa'
}
const AREAS = ['imobiliario', 'civel', 'trabalhista', 'familia', 'tributario', 'empresarial', 'consumidor', 'previdenciario', 'penal', 'compliance']
const fmt = (n: number) => n.toLocaleString('pt-BR')

// Previsão de mercado: demanda judicial por área (processos novos por ano no CNJ) e projeção para 3 anos.
export default function MercadoPage() {
  const [dados, setDados] = useState<Record<string, Area | { erro: string } | null>>({})
  useEffect(() => {
    AREAS.forEach(async a => {
      const { data, error } = await supabase.functions.invoke('mercado', { body: { area: a } })
      const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
      setDados(d => ({ ...d, [a]: error || corpo?.erro ? { erro: corpo?.erro ?? 'O CNJ não respondeu.' } : data }))
    })
  }, [])
  const prontas = AREAS.map(a => dados[a]).filter((d): d is Area => !!d && 'previsao' in d && !!d.previsao)
  const nivel = (x: Area) => x.confiancaCombinada ?? x.confianca
  const ranking = [...prontas].filter(x => nivel(x) === 'alta' || nivel(x) === 'media').sort((x, y) => (y.previsao!.variacao ?? -999) - (x.previsao!.variacao ?? -999))
  return (
    <Layout title="Previsão de mercado jurídico">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <p className="text-sm">Quantos processos novos cada área recebe por ano nos tribunais do Rio, em duas fontes públicas do CNJ (DataJud por classe processual e Justiça em Números por tribunal), e a tendência para os próximos 3 anos, com margem de erro de 95%. Mede <strong>demanda</strong>: mais processos significam mais clientes potenciais, não necessariamente honorários maiores.</p>
          {prontas.length > 0 && !ranking.length && <p className="mt-3 text-sm text-atencao">Nenhuma área tem tendência confiável ainda (os dados do CNJ variam muito de ano para ano). Veja os números brutos abaixo.</p>}
          {ranking.length > 0 && (
            <ol className="mt-4 text-sm list-decimal pl-5 space-y-1" data-testid="ranking">
              {ranking.map(r => (
                <li key={r.area}><strong>{r.nome}</strong>: {r.previsao!.variacao !== null && (r.previsao!.variacao >= 0 ? '+' : '')}{r.previsao!.variacao}% até {r.previsao!.ano} <span className="text-grafite-claro">(confiança {nivel(r)}{r.jen?.concordam ? ', duas fontes concordam' : ''})</span></li>
              ))}
            </ol>
          )}
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          {AREAS.map(a => {
            const d = dados[a]
            if (!d) return <section key={a} className="bg-white shadow-sm p-5 text-sm text-grafite-claro">Consultando o CNJ…</section>
            if ('erro' in d && !('porAno' in d)) return <section key={a} className="bg-white shadow-sm p-5 text-sm">{a}: {d.erro}</section>
            const x = d as Area
            const max = Math.max(1, ...x.porAno.map(p => p.n), x.previsao ? x.previsao.processos + x.previsao.margem : 0)
            return (
              <section key={a} className="bg-white shadow-sm p-5" data-testid={`mercado-${a}`}>
                <h2 className="font-serif text-lg">{x.nome}</h2>
                <div className="flex items-end gap-1 h-28 mt-3" aria-hidden>
                  {x.porAno.map(p => <div key={p.ano} className="flex-1 bg-navy" style={{ height: `${(p.n / max) * 100}%` }} title={`${p.ano}: ${fmt(p.n)}`} />)}
                  {x.previsao && <div className="flex-1 border-2 border-dashed border-dourado" style={{ height: `${(x.previsao.processos / max) * 100}%` }} title={`${x.previsao.ano} (previsão)`} />}
                </div>
                <div className="flex gap-1 text-[10px] text-grafite-claro mt-1">
                  {x.porAno.map(p => <span key={p.ano} className="flex-1 text-center">{String(p.ano).slice(2)}</span>)}
                  {x.previsao && <span className="flex-1 text-center">{String(x.previsao.ano).slice(2)}*</span>}
                </div>
                <p className="text-sm mt-2">
                  {x.porAno.length ? <>Último ano: {fmt(x.porAno[x.porAno.length - 1].n)} processos novos. </> : 'Sem dados no CNJ para esta classe. '}
                  {x.previsao && (x.confianca === 'baixa' ? <>Sem tendência confiável: os números variam demais para prever.</> : <>Previsão {x.previsao.ano}: <strong>{fmt(x.previsao.processos)}</strong> ± {fmt(x.previsao.margem)}.</>)}
                </p>
                {x.jen && (
                  <p className="text-sm mt-2 border-t border-navy/10 pt-2" data-testid={`jen-${a}`}>
                    <strong>Justiça em Números</strong> ({x.jen.tribunal}, {x.jen.indicador}): último ano {fmt(x.jen.porAno[x.jen.porAno.length - 1].n)}; previsão {x.jen.previsao.ano}: <strong>{fmt(x.jen.previsao.processos)}</strong> ± {fmt(x.jen.previsao.margem)} ({x.jen.previsao.variacao !== null && (x.jen.previsao.variacao >= 0 ? '+' : '')}{x.jen.previsao.variacao}%, confiança {x.jen.confianca}). {x.previsao && (x.jen.concordam ? 'As duas fontes apontam a mesma direção.' : 'As fontes divergem: use com cautela.')}
                  </p>
                )}
                <p className="text-xs text-grafite-claro mt-1">Amostra: {fmt(x.amostra)} processos · confiança {x.confianca}{x.previsao && ` (R² ${x.previsao.r2})`}{x.amostra < 300 && ' · amostra pequena, use com cautela'} · {x.fonte}{x.desatualizado && ' · CNJ fora do ar, dado anterior'}{!!x.anosIncompletos?.length && ` · ${x.anosIncompletos.join(', ')} fora do cálculo (dados ainda incompletos no CNJ)`}</p>
              </section>
            )
          })}
        </div>
        <p className="text-xs text-grafite-claro">Método: contagem anual de processos novos (data de ajuizamento) na classe processual que representa cada área; tendência linear com intervalo de previsão de 95%. Anos recentes podem estar incompletos se o tribunal ainda não enviou tudo ao CNJ. Atualizado a cada 7 dias. Segunda fonte: Justiça em Números 2026 (base aberta do CNJ, 23/06/2026), série anual consolidada por tribunal, mesma tendência linear; a confiança combinada sobe quando as duas fontes concordam e cai quando divergem.</p>
      </div>
    </Layout>
  )
}
