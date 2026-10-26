import { useId } from 'react'
import type { PontoTendencia } from '@/lib/indicadores'

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

/**
 * Tendência dos próximos 12 meses: barras para a receita contratada e marcadores
 * para vencimentos, reajustes e documentos. O gráfico é decorativo para leitores
 * de tela; a tabela abaixo carrega os mesmos números (WCAG 1.1.1).
 */
export default function GraficoTendencia({ pontos, compacto = false }: { pontos: PontoTendencia[]; compacto?: boolean }) {
  const id = useId()
  const largura = 720
  const altura = compacto ? 150 : 190
  const margem = { topo: 16, base: 30, esq: 8, dir: 8 }
  const n = Math.max(pontos.length, 1)
  const passo = (largura - margem.esq - margem.dir) / n
  const maxReceita = Math.max(1, ...pontos.map(p => p.receitaMensal))
  const alturaUtil = altura - margem.topo - margem.base
  const nenhumEvento = pontos.every(p => !p.vencimentos && !p.reajustes && !p.documentosAVencer)

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full h-auto"
        role="img"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
      >
        <title id={`${id}-t`}>Tendência dos próximos 12 meses</title>
        <desc id={`${id}-d`}>
          Receita contratada por mês e eventos previstos: vencimentos, reajustes e documentos a vencer. Os valores estão na tabela a seguir.
        </desc>
        {pontos.map((p, i) => {
          const x = margem.esq + i * passo
          const h = (p.receitaMensal / maxReceita) * alturaUtil
          const topo = margem.topo + alturaUtil - h
          const eventos = p.vencimentos + p.reajustes + p.documentosAVencer
          return (
            <g key={p.mes}>
              <rect x={x + passo * 0.2} y={topo} width={passo * 0.6} height={h} fill="#14213D" opacity={0.85} rx={1} />
              {p.vencimentos > 0 && (
                <circle cx={x + passo / 2} cy={topo - 9} r={4.5} fill="#A32020" />
              )}
              {p.reajustes > 0 && (
                <rect x={x + passo / 2 - 4} y={topo - (p.vencimentos ? 24 : 13)} width={8} height={8} fill="#B08D57" />
              )}
              {p.documentosAVencer > 0 && (
                <text
                  x={x + passo / 2}
                  y={topo - (p.vencimentos ? 24 : 13) - (p.reajustes ? 12 : 0)}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#8A5A00"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {p.documentosAVencer} doc
                </text>
              )}
              <text
                x={x + passo / 2}
                y={altura - 12}
                textAnchor="middle"
                fontSize={10}
                fill={eventos ? '#14213D' : '#5A6372'}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={eventos ? 600 : 400}
              >
                {p.rotulo}
              </text>
            </g>
          )
        })}
        <line x1={margem.esq} x2={largura - margem.dir} y1={margem.topo + alturaUtil} y2={margem.topo + alturaUtil} stroke="#14213D" strokeOpacity={0.2} />
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-grafite-claro" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 bg-navy/85" /> Receita contratada</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-critico" /> Vencimento de contrato</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 bg-dourado" /> Reajuste anual</span>
        <span>“n doc” = documentos a vencer</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Projeção mês a mês dos próximos 12 meses</caption>
          <thead className="bg-pergaminho">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs uppercase tracking-wider text-grafite-claro font-medium">Mês</th>
              <th scope="col" className="px-3 py-2 text-right text-xs uppercase tracking-wider text-grafite-claro font-medium">Vigentes</th>
              <th scope="col" className="px-3 py-2 text-right text-xs uppercase tracking-wider text-grafite-claro font-medium">Receita</th>
              <th scope="col" className="px-3 py-2 text-right text-xs uppercase tracking-wider text-grafite-claro font-medium">Vencem</th>
              <th scope="col" className="px-3 py-2 text-right text-xs uppercase tracking-wider text-grafite-claro font-medium">Reajustes</th>
              <th scope="col" className="px-3 py-2 text-right text-xs uppercase tracking-wider text-grafite-claro font-medium">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {pontos.map(p => (
              <tr key={p.mes} className={p.vencimentos ? 'bg-criticoFundo/40' : undefined}>
                <th scope="row" className="px-3 py-1.5 text-left font-medium text-navy capitalize">{p.rotulo}</th>
                <td className="px-3 py-1.5 text-right">{p.contratosVigentes}</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{moeda(p.receitaMensal)}</td>
                <td className={`px-3 py-1.5 text-right ${p.vencimentos ? 'text-critico font-medium' : 'text-grafite-claro'}`}>{p.vencimentos || '—'}</td>
                <td className={`px-3 py-1.5 text-right ${p.reajustes ? 'text-dourado-escuro font-medium' : 'text-grafite-claro'}`}>{p.reajustes || '—'}</td>
                <td className={`px-3 py-1.5 text-right ${p.documentosAVencer ? 'text-atencao font-medium' : 'text-grafite-claro'}`}>{p.documentosAVencer || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nenhumEvento && (
        <p className="text-xs text-grafite-claro">Nenhum vencimento, reajuste ou documento a vencer nos próximos 12 meses.</p>
      )}
    </div>
  )
}
