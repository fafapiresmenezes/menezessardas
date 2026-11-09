import { useState } from 'react'
import { INDICADORES_TRIBUNAL, JEN_FONTE, previsaoJen } from '@/lib/mercadoJen'

const fmt = (n: number) => n.toLocaleString('pt-BR')

/**
 * Frente 1.6 · passo A08: intervalo de confiança de 95% por tribunal (TJRJ, TRT-1, TRF-2),
 * com a série trabalhista do TRT-1 completa (2019–2025) do Justiça em Números 2026.
 */
export default function IntervaloTribunais() {
  const [baixado, setBaixado] = useState(false)
  const linhas = INDICADORES_TRIBUNAL.map(l => ({ ...l, p: previsaoJen(l.trib, l.i) })).filter(l => l.p)
  const teto = Math.max(1, ...linhas.map(l => l.p!.processos + l.p!.margem), ...linhas.map(l => l.p!.ultimo.n))
  const baixar = () => {
    const csv = ['tribunal;indicador;ano_base;casos_novos;ano_previsto;previsao;minimo_95;maximo_95;variacao_pct;r2;confianca',
      ...linhas.map(l => [l.rotulo, l.indicador, l.p!.ultimo.ano, l.p!.ultimo.n, l.p!.ano, l.p!.processos, Math.max(0, l.p!.processos - l.p!.margem), l.p!.processos + l.p!.margem, l.p!.variacao ?? '', l.p!.r2, l.p!.confianca].join(';'))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'intervalo-por-tribunal.csv'; a.click(); setBaixado(true)
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  return (
    <section className="bg-white shadow-sm p-6" aria-labelledby="t-tribunais" data-testid="intervalo-tribunais">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="t-tribunais" className="font-serif text-lg">Por tribunal: faixa provável com 95% de confiança</h2>
          <p className="text-sm text-grafite-claro mt-1">Casos novos por ano no Rio de Janeiro e a previsão para 3 anos. A faixa mostra o mínimo e o máximo prováveis: em 95 de cada 100 anos parecidos, o número real cai dentro dela.</p>
        </div>
        <button type="button" onClick={baixar} data-testid="baixar-tribunais" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{baixado ? 'Baixado' : 'Baixar CSV'}</button>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm" tabIndex={0}>{/* no celular a tabela rola para os lados: precisa receber foco do teclado (WCAG 2.1.1) */}
          <caption className="sr-only">Previsão de casos novos por tribunal com intervalo de 95%</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-grafite-claro">
              <th scope="col" className="py-2 pr-3">Tribunal</th>
              <th scope="col" className="py-2 pr-3">Indicador</th>
              <th scope="col" className="py-2 pr-3 text-right">Último ano</th>
              <th scope="col" className="py-2 pr-3 text-right">Previsão</th>
              <th scope="col" className="py-2 pr-3">Faixa provável (95%)</th>
              <th scope="col" className="py-2">Confiança</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => {
              const p = l.p!; const min = Math.max(0, p.processos - p.margem); const max = p.processos + p.margem
              return (
                <tr key={`${l.trib}-${l.i}`} className="border-t border-navy/10" data-testid={`tribunal-${l.trib}-${l.i}`}>
                  <th scope="row" className="py-2 pr-3 font-medium text-navy">{l.rotulo}</th>
                  <td className="py-2 pr-3">{l.indicador}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{fmt(p.ultimo.n)} <span className="text-grafite-claro">({p.ultimo.ano})</span></td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap"><strong>{fmt(p.processos)}</strong> <span className="text-grafite-claro">({p.ano}, {p.variacao !== null && p.variacao >= 0 ? '+' : ''}{p.variacao}%)</span></td>
                  <td className="py-2 pr-3 min-w-[12rem]">
                    <span className="whitespace-nowrap">{fmt(min)} a {fmt(max)}</span>
                    <span className="relative block h-2 mt-1 bg-navy/10" aria-hidden="true">
                      <span className="absolute top-0 h-2 bg-dourado/60" style={{ left: `${(min / teto) * 100}%`, width: `${((max - min) / teto) * 100}%` }} />
                      <span className="absolute -top-0.5 h-3 w-0.5 bg-navy" style={{ left: `${(p.processos / teto) * 100}%` }} />
                    </span>
                  </td>
                  <td className="py-2">{p.confianca} <span className="text-grafite-claro">(R² {p.r2})</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-grafite-claro mt-3">Fonte: {JEN_FONTE}, séries de 2019 a 2025 (2017 e 2018 ficam fora: antecedem a reforma trabalhista e distorcem a tendência do TRT-1). Método: tendência linear com intervalo de previsão de 95% (t de Student). Confiança baixa quando a faixa passa da metade da previsão.</p>
    </section>
  )
}
