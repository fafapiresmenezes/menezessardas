/**
 * WorkTree Ontológico
 *
 * Visualização da intercorrelação entre setores (nichos) e variáveis compartilhadas.
 * Mostra como os setores se comunicam e dependem uns dos outros.
 *
 * Estrutura:
 * - Grafo com nós (setores) e arestas (correlações, variáveis compartilhadas)
 * - Cores/espessura indicam força da correlação (Jaccard)
 * - Hover mostra detalhes: variáveis em comum, dependências, índices
 * - Legendas explicam o que cada visual significa
 */

import { useMemo, useState } from 'react'
import { SETORES, INTERCORRELACOES, VARIAVEIS } from '@/data/ontologia-intercorrelacoes'
import type { CorrelacaoIntercetorial } from '@/data/ontologia-intercorrelacoes'

interface NodePos {
  id: string
  x: number
  y: number
  nome: string
}

function calcularPosicoes(): NodePos[] {
  // Layout circular dos 10 setores
  const raio = 200
  const angleStep = (2 * Math.PI) / SETORES.length
  const centerX = 300
  const centerY = 250

  return SETORES.map((s, i) => ({
    id: s.id,
    nome: s.nome,
    x: centerX + raio * Math.cos(i * angleStep),
    y: centerY + raio * Math.sin(i * angleStep),
  }))
}

function corJaccard(j: number | 'sem base'): string {
  if (j === 'sem base') return '#d4d4d8' // Sem base: cinza claro
  if (j >= 0.75) return '#dc2626' // Forte: vermelho
  if (j >= 0.6) return '#f59e0b' // Média: laranja
  return '#9ca3af' // Fraca: cinza
}

export default function WorkTreeOntologico() {
  const [hoveredEdge, setHoveredEdge] = useState<CorrelacaoIntercetorial | null>(null)
  const posicoes = useMemo(calcularPosicoes, [])

  const posMap = new Map(posicoes.map(p => [p.id, p]))

  return (
    <section className="space-y-6" data-testid="worktree-ontologico">
      <div>
        <h2 className="font-serif text-2xl text-navy">WorkTree Ontológico</h2>
        <p className="mt-2 max-w-4xl text-sm text-grafite-claro">
          Intercorrelação entre setores. Os nós são os 10 nichos; as arestas mostram ligações já identificadas.
          Nenhum índice está calculado ainda: toda aresta aparece como "sem base" até a conta ser feita e conferida.
        </p>
      </div>

      <div className="border border-navy/10 bg-white p-4" data-testid="grafo-container">
        <svg viewBox="0 0 600 500" className="w-full" data-testid="grafo-svg">
          <defs>
            <marker
              id="arrowhead-dep"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#999" />
            </marker>
          </defs>

          {/* Arestas (correlações) */}
          {INTERCORRELACOES.map((cor, i) => {
            const posA = posMap.get(cor.setorA)
            const posB = posMap.get(cor.setorB)
            if (!posA || !posB) return null

            const isHovered =
              hoveredEdge &&
              ((hoveredEdge.setorA === cor.setorA && hoveredEdge.setorB === cor.setorB) ||
                (hoveredEdge.setorA === cor.setorB && hoveredEdge.setorB === cor.setorA))

            const jaccardNum = typeof cor.jaccard === 'number' ? cor.jaccard : 0.5
            const strokeWidth = 1 + jaccardNum * 3
            const cor_linha = corJaccard(cor.jaccard)

            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredEdge(cor)}>
                {/* Linha de correlação */}
                <line
                  x1={posA.x}
                  y1={posA.y}
                  x2={posB.x}
                  y2={posB.y}
                  stroke={cor_linha}
                  strokeWidth={isHovered ? strokeWidth * 1.5 : strokeWidth}
                  opacity={isHovered ? 1 : 0.6}
                  className="transition-all"
                />

                {/* Seta de dependência (se houver) */}
                {(cor.dependenciaAB || cor.dependenciaBA) && (
                  <line
                    x1={posA.x}
                    y1={posA.y}
                    x2={posB.x}
                    y2={posB.y}
                    stroke="none"
                    markerEnd="url(#arrowhead-dep)"
                    strokeWidth={2}
                    opacity={0}
                  />
                )}

                {/* Tooltip ao hover */}
                {isHovered && (
                  <g>
                    <rect x={Math.min(posA.x, posB.x) - 20} y={Math.max(posA.y, posB.y) + 10} width="140" height="60" fill="#fff" stroke="#999" rx="4" />
                    <text x={Math.min(posA.x, posB.x) - 15} y={Math.max(posA.y, posB.y) + 25} fontSize="10" fontFamily="monospace" fill="#333">
                      Jaccard: {typeof cor.jaccard === 'number' ? (cor.jaccard * 100).toFixed(0) + '%' : 'sem base'}
                    </text>
                    <text x={Math.min(posA.x, posB.x) - 15} y={Math.max(posA.y, posB.y) + 40} fontSize="9" fill="#666">
                      {hoveredEdge?.variaveisCompartilhadas.length ?? 0} variáveis
                    </text>
                    {(cor.dependenciaAB || cor.dependenciaBA) && (
                      <text x={Math.min(posA.x, posB.x) - 15} y={Math.max(posA.y, posB.y) + 55} fontSize="9" fill="#f00">
                        {cor.dependenciaAB ? '↓ ' : ''}{cor.dependenciaBA ? '↑ ' : ''}Depende
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {/* Nós (setores) */}
          {posicoes.map(pos => {
            const setor = SETORES.find(s => s.id === pos.id)
            if (!setor) return null

            return (
              <g key={pos.id} data-testid={`node-${pos.id}`}>
                {/* Círculo do nó */}
                <circle cx={pos.x} cy={pos.y} r="40" fill="#f6f7f9" stroke="#999" strokeWidth="2" />

                {/* Texto: nome do setor */}
                <text x={pos.x} y={pos.y - 5} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#151a22">
                  {setor.nome.split(' ')[0]}
                </text>
                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="10" fill="#6b7280">
                  P{setor.prioridade}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-navy/10 bg-white p-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Força de Correlação</h3>
          <div className="mt-2 space-y-1 text-xs text-grafite-claro">
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 bg-red-600"></div>
              <span>Forte (Jaccard ≥ 75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 bg-amber-500"></div>
              <span>Média (60–74%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 bg-gray-400"></div>
              <span>Fraca (&lt; 60%)</span>
            </div>
          </div>
        </div>

        <div className="border border-navy/10 bg-white p-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Dependências</h3>
          <div className="mt-2 text-xs text-grafite-claro">
            <p>↓ A precisa de B para funcionar</p>
            <p>↑ B precisa de A para funcionar</p>
            <p className="mt-1 text-[11px]">
              <span className="font-semibold">P1–P10:</span> Prioridade do setor
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Variáveis Compartilhadas */}
      <div className="border border-navy/10 bg-white p-4">
        <h3 className="font-medium text-navy">Variáveis Chave (Ontologia)</h3>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="text-left font-semibold text-grafite-claro">Variável</th>
              <th className="text-left font-semibold text-grafite-claro">Tipo</th>
              <th className="text-center font-semibold text-grafite-claro">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {VARIAVEIS.slice(0, 8).map(v => (
              <tr key={v.id} className="border-b border-navy/5 text-navy">
                <td className="py-2">{v.nome}</td>
                <td className="py-2 text-[10px] text-grafite-claro">{v.tipo}</td>
                <td className="py-2 text-center text-grafite-claro">{v.pct_cobertura === undefined ? 'sem base' : `${v.pct_cobertura}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-grafite-claro">Total: {VARIAVEIS.length} variáveis ontológicas</p>
      </div>
    </section>
  )
}
