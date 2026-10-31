import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Passo 44 (Onda D): indicadores do escritório lado a lado com o Justiça em Números (CNJ), por segmento dos
// tribunais do Rio: Justiça Estadual (TJRJ) e Justiça do Trabalho (TRT1). Os números do CNJ são censitários
// (todo o acervo, sem margem amostral); os do escritório trazem amostra e margem de 95%.
type Indic = { casos_total: number; casos_abertos: number; casos_encerrados: number; tempo_medio_dias: number | null; margem_dias: number | null; por_area: { area: string; n: number; abertos: number; tempo_medio_dias: number | null }[]; consultado_em: string }

export const JEN_FONTE = 'Justiça em Números 2026 (CNJ, 23ª edição, ano-base 2025, publicado em junho de 2026)'
export const JEN_SEGMENTOS = [
  { tribunal: 'TJRJ', segmento: 'Justiça Estadual', baixadoMeses: 28, conhecimentoMeses: 32, execucaoMeses: 57, sentencaConhecimentoMeses: 15, congestionamento: 62.6, casosNovos: 28_300_000, observacao: 'médias nacionais do segmento estadual; o CNJ não publica o tempo médio por tribunal no resumo aberto' },
  { tribunal: 'TRT1', segmento: 'Justiça do Trabalho', baixadoMeses: 31, conhecimentoMeses: 8, execucaoMeses: 45, sentencaConhecimentoMeses: 18, congestionamento: 39.3, casosNovos: 5_200_000, observacao: 'médias nacionais do segmento trabalhista; conhecimento 8 meses, execução 3 anos e 9 meses' },
]
export const JEN_AMOSTRA = 'censo do CNJ: 40,9 milhões de casos novos e 75,5 milhões pendentes em 2025; margem amostral zero (não é pesquisa por amostra)'

const meses = (d: number | null) => d === null ? '—' : d < 60 ? `${d} dia(s)` : `${(d / 30.4).toFixed(1)} meses`
const mesesJen = (m: number) => m >= 12 ? `${Math.floor(m / 12)} ano(s) e ${m % 12} mes(es)` : `${m} meses`

export default function ComparacaoJustica() {
  const [ind, setInd] = useState<Indic | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => { supabase.rpc('indicadores_escritorio').then(({ data, error }) => { if (error) setErro(error.message); else setInd(data as Indic) }) }, [])
  const tempoEsc = ind?.tempo_medio_dias ?? null
  return (
    <section className="bg-white border border-navy/10 rounded-sm p-5" data-testid="comparacao-justica">
      <h2 className="font-display text-xl text-navy">O escritório lado a lado com o Justiça em Números</h2>
      <p className="text-sm text-grafite mt-1">Tempo médio por caso e casos por área do escritório, comparados com a duração média dos processos nos segmentos do TJRJ (Justiça Estadual) e do TRT1 (Justiça do Trabalho).</p>
      {erro && <p className="text-sm text-critico mt-2" role="alert">{erro}</p>}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="border border-navy/10 rounded-sm p-4 bg-pergaminho/40" data-testid="comparacao-escritorio">
          <h3 className="font-semibold text-navy">Escritório</h3>
          <p className="text-3xl font-display text-navy mt-2" data-testid="tempo-medio-escritorio">{ind ? meses(tempoEsc) : '…'}</p>
          <p className="text-xs text-grafite-claro">tempo médio da abertura ao encerramento{ind?.margem_dias != null && ` · ± ${ind.margem_dias} dia(s) (95%)`}</p>
          <p className="text-sm mt-2">{ind ? `${ind.casos_total} caso(s): ${ind.casos_abertos} aberto(s), ${ind.casos_encerrados} encerrado(s).` : 'Carregando…'}</p>
          <ul className="text-sm mt-2 space-y-0.5" data-testid="casos-por-area">
            {ind?.por_area.map(a => <li key={a.area}><strong>{a.area}</strong>: {a.n} caso(s){a.tempo_medio_dias != null && `, ${meses(a.tempo_medio_dias)} em média`}</li>)}
            {ind && !ind.por_area.length && <li className="text-grafite-claro">Nenhum caso cadastrado ainda em Casos e projetos.</li>}
          </ul>
          <p className="text-xs text-grafite-claro mt-2">Amostra: {ind?.casos_encerrados ?? 0} caso(s) encerrado(s){(ind?.casos_encerrados ?? 0) < 30 && ' · amostra pequena, a margem é só indicativa'}.</p>
        </div>
        {JEN_SEGMENTOS.map(s => (
          <div key={s.tribunal} className="border border-navy/10 rounded-sm p-4" data-testid={`comparacao-${s.tribunal.toLowerCase()}`}>
            <h3 className="font-semibold text-navy">{s.tribunal} · {s.segmento}</h3>
            <p className="text-3xl font-display text-navy mt-2">{mesesJen(s.baixadoMeses)}</p>
            <p className="text-xs text-grafite-claro">tempo médio do processo baixado (pendentes do segmento)</p>
            <ul className="text-sm mt-2 space-y-0.5">
              <li>Conhecimento: <strong>{mesesJen(s.conhecimentoMeses)}</strong></li>
              <li>Execução: <strong>{mesesJen(s.execucaoMeses)}</strong></li>
              <li>Até a sentença (1º grau, execução): <strong>{mesesJen(s.sentencaConhecimentoMeses)}</strong></li>
              <li>Taxa de congestionamento: <strong>{s.congestionamento.toLocaleString('pt-BR')}%</strong></li>
              <li>Casos novos no segmento (2025): <strong>{(s.casosNovos / 1e6).toLocaleString('pt-BR')} milhões</strong></li>
            </ul>
            {tempoEsc !== null && <p className="text-sm mt-2 text-navy" data-testid={`leitura-${s.tribunal.toLowerCase()}`}>{tempoEsc / 30.4 < s.conhecimentoMeses ? 'O escritório encerra seus casos mais rápido que a média do segmento na fase de conhecimento.' : 'O escritório leva mais tempo que a média do segmento na fase de conhecimento: vale revisar os prazos internos.'}</p>}
            <p className="text-xs text-grafite-claro mt-2">{s.observacao}.</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-grafite-claro mt-3">Fonte: {JEN_FONTE}, lido em 31/10/2026 em resumos públicos do relatório. Amostra: {JEN_AMOSTRA}. Comparação indicativa: o CNJ mede do ajuizamento à baixa; o escritório mede da abertura do caso na plataforma ao encerramento, que pode ser antes ou depois da baixa judicial. A série de casos novos do TJRJ e do TRT1 por ano está nos cartões acima.</p>
    </section>
  )
}
