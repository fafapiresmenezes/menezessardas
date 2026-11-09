import { useEffect, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import Layout from '@/components/Layout'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import ComparacaoJustica from '@/components/ComparacaoJustica'
import IntervaloTribunais from '@/components/IntervaloTribunais'
import { AREA_JEN, JEN_FONTE, previsaoJen } from '@/lib/mercadoJen'

type Area = {
  area: string; nome: string; porAno: { ano: number; n: number }[]; amostra: number; fonte: string; consultadoEm: string
  previsao?: { ano: number; processos: number; margem: number; variacao: number | null; r2: number }
  confianca: 'alta' | 'media' | 'baixa' | 'insuficiente'; desatualizado?: boolean; erro?: string; anosIncompletos?: number[]
  jen?: { fonte: string; tribunal: string; indicador: string; porAno: { ano: number; n: number }[]; previsao: { ano: number; processos: number; margem: number; variacao: number | null; r2: number }; confianca: 'alta' | 'media' | 'baixa'; concordam: boolean }
  confiancaCombinada?: 'alta' | 'media' | 'baixa'; fontePrevisao?: string
}
const NOME_AREA: Record<string, string> = { imobiliario: 'Imobiliário', civel: 'Cível', trabalhista: 'Trabalhista', familia: 'Família', tributario: 'Tributário', empresarial: 'Empresarial', consumidor: 'Consumidor', previdenciario: 'Previdenciário', penal: 'Penal', compliance: 'Compliance' }
const AREAS = ['imobiliario', 'civel', 'trabalhista', 'familia', 'tributario', 'empresarial', 'consumidor', 'previdenciario', 'penal', 'compliance']
const fmt = (n: number) => n.toLocaleString('pt-BR')

// Previsão de mercado: demanda judicial por área (processos novos por ano no CNJ) e projeção para 3 anos.
export default function MercadoPage() {
  const [dados, setDados] = useState<Record<string, Area | { erro: string } | null>>({})
  useEffect(() => {
    // Passo A08: sem servidor (demonstração), cada área usa só a série pública do Justiça em Números, com a fonte dita.
    if (!supabaseConfigurado) {
      setDados(Object.fromEntries(AREAS.map(a => {
        const c = AREA_JEN[a]; const p = previsaoJen(c.trib, c.i)
        if (!p) return [a, { erro: 'Sem série suficiente no Justiça em Números.' }]
        const { confianca, ultimo: _u, serie, ...previsao } = p
        return [a, { area: a, nome: c.nome, porAno: serie, amostra: serie.reduce((s, x) => s + x.n, 0), fonte: JEN_FONTE, consultadoEm: '2026-06-23', previsao, confianca, confiancaCombinada: confianca, fontePrevisao: `${JEN_FONTE} (${c.trib})` } satisfies Area]
      })))
      return
    }
    AREAS.forEach(async a => {
      // Revisão 06/11: falha de rede não pode deixar a área presa em "Carregando".
      try {
        const { data, error } = await supabase.functions.invoke('mercado', { body: { area: a } })
        let corpo = data
        if (error) { try { corpo = await (error as { context?: Response }).context?.json?.() } catch { corpo = null } }
        setDados(d => ({ ...d, [a]: error || corpo?.erro ? { erro: corpo?.erro ?? 'O CNJ não respondeu agora. Tente de novo em alguns minutos.' } : data }))
      } catch {
        setDados(d => ({ ...d, [a]: { erro: 'Sem conexão com o CNJ agora. Tente de novo em alguns minutos.' } }))
      }
    })
  }, [])
  const prontas = AREAS.map(a => dados[a]).filter((d): d is Area => !!d && 'previsao' in d && !!d.previsao)
  const nivel = (x: Area) => x.confiancaCombinada ?? x.confianca
  // Passo 96: ranking copiável para a reunião de sócios.
  const [copiado, setCopiado] = useState(false)
  // Passo 126: relatório completo por área (amostra, confiança, tendência) copiável.
  const [areasCopiadas, setAreasCopiadas] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 252
  const [baixado, marcarBaixado] = useBaixado() // Passo 396
  const copiarAreas = async () => {
    const t = ['Demanda judicial por área — CNJ, tribunais do RJ', ...prontas.map(x => `${x.nome}: ${x.previsao!.variacao !== null && x.previsao!.variacao >= 0 ? '+' : ''}${x.previsao!.variacao}% até ${x.previsao!.ano} · confiança ${nivel(x)} · amostra ${fmt(x.amostra)} · ${x.fontePrevisao ?? x.fonte}`), `Gerado em ${new Date().toLocaleDateString('pt-BR')} · GMenezes Advogados Associados`].join('\n')
    try { await navigator.clipboard.writeText(t); setAreasCopiadas(true); setTimeout(() => setAreasCopiadas(false), 2500) } catch { /* sem área de transferência */ }
  }
  const ranking = [...prontas].filter(x => nivel(x) === 'alta' || nivel(x) === 'media').sort((x, y) => (y.previsao!.variacao ?? -999) - (x.previsao!.variacao ?? -999))
  return (
    <Layout title="Previsão de mercado jurídico">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          {!supabaseConfigurado && <p className="text-sm mb-3 p-3 bg-atencaoFundo border-l-2 border-atencao" data-testid="aviso-demo-mercado">Demonstração: números públicos do Justiça em Números 2026 (CNJ), sem a consulta ao vivo do DataJud. Na versão do escritório as duas fontes são cruzadas toda semana.</p>}
          <p className="text-sm">Quantos processos novos cada área recebe por ano nos tribunais do Rio, em duas fontes públicas do CNJ (DataJud por classe processual e Justiça em Números por tribunal), e a tendência para os próximos 3 anos, com margem de erro de 95%. Mede <strong>demanda</strong>: mais processos significam mais clientes potenciais, não necessariamente honorários maiores.</p>
          {/* Passo 159: imprimir o mercado jurídico por área. */}
          {prontas.length > 0 && <button type="button" onClick={() => window.print()} data-testid="imprimir-mercado" className="mt-3 mr-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">Imprimir</button>}
          {prontas.length > 0 && <button type="button" onClick={copiarAreas} data-testid="copiar-areas" className="mt-3 min-h-[44px] px-4 border border-navy text-navy text-sm print:hidden">{areasCopiadas ? 'Áreas copiadas' : 'Copiar todas as áreas'}</button>}
          {prontas.length > 0 && <button type="button" data-testid="copiar-link-mercado" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="mt-3 ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>}{/* Passo 218 */}
              <button type="button" data-testid="baixar-ranking" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['posição;área;variação;ano', ...ranking.map((r, i) => `${i + 1};${r.nome};${r.previsao?.variacao ?? ''};${r.previsao?.ano ?? ''}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'ranking-mercado.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="mt-3 ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{baixado ? 'Baixado' : 'Baixar CSV'}</button>{/* Passo 290 */}
          {prontas.length > 0 && !ranking.length && <p className="mt-3 text-sm text-atencao">Nenhuma área tem tendência confiável ainda (os dados do CNJ variam muito de ano para ano). Veja os números brutos abaixo.</p>}
          {ranking.length > 0 && (
            <>
            <p className="mt-3 text-sm"><strong>Leitura rápida:</strong> a área que mais cresce é <strong>{ranking[0].nome}</strong>{ranking.length > 1 && <>, e a que menos cresce é <strong>{ranking[ranking.length - 1].nome}</strong></>}. Só entram áreas com confiança alta ou média.{' '}
              <button type="button" onClick={async () => { const t = ['Previsão de demanda judicial por área (CNJ, tribunais do RJ)', ...ranking.map((r, i) => `${i + 1}. ${r.nome}: ${r.previsao!.variacao !== null && r.previsao!.variacao >= 0 ? '+' : ''}${r.previsao!.variacao}% até ${r.previsao!.ano} (confiança ${nivel(r)})`), `Gerado em ${new Date().toLocaleDateString('pt-BR')} · GMenezes Advogados Associados`].join('\n'); try { await navigator.clipboard.writeText(t); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sem área de transferência */ } }} data-testid="copiar-ranking" className="underline text-navy">{copiado ? 'ranking copiado' : 'copiar ranking'}</button>
              <button type="button" onClick={() => window.print()} data-testid="imprimir-ranking" className="ml-2 underline text-navy text-sm print:hidden">imprimir ranking</button>{/* Passo 193 */}
            </p>
            <ol className="mt-2 text-sm list-decimal pl-5 space-y-1" data-testid="ranking">
              {ranking.map(r => (
                <li key={r.area}><strong>{r.nome}</strong>: {r.previsao!.variacao !== null && (r.previsao!.variacao >= 0 ? '+' : '')}{r.previsao!.variacao}% até {r.previsao!.ano} <span className="text-grafite-claro">(confiança {nivel(r)}{r.jen?.concordam ? ', duas fontes concordam' : ''})</span></li>
              ))}
            </ol>
            </>
          )}
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          {AREAS.map(a => {
            const d = dados[a]
            if (!d) return <section key={a} className="bg-white shadow-sm p-5 text-sm text-grafite-claro">Consultando o CNJ…</section>
            if ('erro' in d && !('porAno' in d)) return <section key={a} className="bg-white shadow-sm p-5 text-sm">{NOME_AREA[a] ?? a}: {d.erro}</section>
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
                  {x.porAno.length ? <>Último ano: {fmt(x.porAno[x.porAno.length - 1].n)} processos novos. </> : (x.fontePrevisao ? 'O DataJud não tem esta classe; a previsão usa só o Justiça em Números. ' : 'Sem dados no CNJ para esta classe. ')}
                  {x.previsao && (x.confianca === 'baixa' ? <>Sem tendência confiável: os números variam demais para prever.</> : <>Previsão {x.previsao.ano}: <strong>{fmt(x.previsao.processos)}</strong> ± {fmt(x.previsao.margem)}.</>)}
                </p>
                {x.jen && (
                  <p className="text-sm mt-2 border-t border-navy/10 pt-2" data-testid={`jen-${a}`}>
                    <strong>Justiça em Números</strong> ({x.jen.tribunal}, {x.jen.indicador}): último ano {fmt(x.jen.porAno[x.jen.porAno.length - 1].n)}; previsão {x.jen.previsao.ano}: <strong>{fmt(x.jen.previsao.processos)}</strong> ± {fmt(x.jen.previsao.margem)} ({x.jen.previsao.variacao !== null && (x.jen.previsao.variacao >= 0 ? '+' : '')}{x.jen.previsao.variacao}%, confiança {x.jen.confianca}). {x.previsao && !x.fontePrevisao && (x.jen.concordam ? 'As duas fontes apontam a mesma direção.' : 'As fontes divergem: use com cautela.')}
                  </p>
                )}
                {x.fontePrevisao ? <p className="text-xs text-grafite-claro mt-1" data-testid={`fonte-unica-${a}`}>Fonte única: {x.fontePrevisao} · confiança {x.confiancaCombinada}{x.previsao && ` (R² ${x.previsao.r2})`}</p> : <p className="text-xs text-grafite-claro mt-1">Amostra: {fmt(x.amostra)} processos · confiança {x.confianca}{x.previsao && ` (R² ${x.previsao.r2})`}{x.amostra < 300 && ' · amostra pequena, use com cautela'} · {x.fonte}{x.desatualizado && ' · CNJ fora do ar, dado anterior'}{!!x.anosIncompletos?.length && ` · ${x.anosIncompletos.join(', ')} fora do cálculo (dados ainda incompletos no CNJ)`}</p>}
              </section>
            )
          })}
        </div>
        <IntervaloTribunais />
        <ComparacaoJustica />
        <p className="text-xs text-grafite-claro">Método: contagem anual de processos novos (data de ajuizamento) na classe processual que representa cada área; tendência linear com intervalo de previsão de 95%. Anos recentes podem estar incompletos se o tribunal ainda não enviou tudo ao CNJ. Atualizado a cada 7 dias. Segunda fonte: Justiça em Números 2026 (base aberta do CNJ, 23/06/2026), série anual consolidada por tribunal, mesma tendência linear; a confiança combinada sobe quando as duas fontes concordam e cai quando divergem.</p>
      </div>
    </Layout>
  )
}
