// R6: o grafo deixa de ser uma lista e vira desenho na tela.
// Tudo é calculado no próprio aparelho (src/lib/geo/layout.ts), sem biblioteca de fora e sem enviar nada.
// Regra da casa: cor nunca é a única pista — cada tipo de ponto também tem um FORMATO próprio (WCAG 1.4.1),
// e tudo que o desenho mostra está escrito embaixo, em texto, para quem usa leitor de tela.
import { useMemo, useState } from 'react'
import type { Aresta, No } from '@/lib/geo/grafo'
import { FONTE_LAYOUT, posicionar } from '@/lib/geo/layout'

const L = 800, A = 500

type Tipo = No['tipo']

const ESTILO: Record<Tipo, { cor: string; forma: 'circulo' | 'quadrado' | 'losango' | 'triangulo' | 'pentagono'; r: number; nome: string }> = {
  Titular: { cor: '#0B0B0C', forma: 'circulo', r: 13, nome: 'Você' },
  Lugar: { cor: '#1E6B45', forma: 'quadrado', r: 9, nome: 'Lugar seu' },
  Municipio: { cor: '#1A4F8A', forma: 'losango', r: 10, nome: 'Município' },
  Noticia: { cor: '#8A5A00', forma: 'triangulo', r: 7, nome: 'Notícia do município' },
  Cena: { cor: '#6B2E8A', forma: 'pentagono', r: 7, nome: 'Cena vista pela câmera' },
}

const EM_PALAVRAS: Record<Aresta['tipo'], string> = {
  ESTEVE_EM: 'esteve em',
  FICA_EM: 'fica em',
  NOTICIA_SOBRE: 'é notícia sobre',
  OBSERVOU: 'viu',
  VAI_PARA: 'deve ir para',
}

function Forma({ forma, r, cor, destacado }: { forma: string; r: number; cor: string; destacado: boolean }) {
  const comum = { fill: cor, stroke: destacado ? '#0B0B0C' : '#F5F5F6', strokeWidth: destacado ? 3 : 1.5 }
  if (forma === 'quadrado') return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1.5} {...comum} />
  if (forma === 'losango') return <polygon points={`0,${-r * 1.25} ${r},0 0,${r * 1.25} ${-r},0`} {...comum} />
  if (forma === 'triangulo') return <polygon points={`0,${-r * 1.3} ${r * 1.15},${r * 0.8} ${-r * 1.15},${r * 0.8}`} {...comum} />
  if (forma === 'pentagono') {
    const p = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / 5; return `${(r * 1.2 * Math.cos(a)).toFixed(1)},${(r * 1.2 * Math.sin(a)).toFixed(1)}` }).join(' ')
    return <polygon points={p} {...comum} />
  }
  return <circle r={r} {...comum} />
}

export default function GrafoVivo({ nos, arestas }: { nos: No[]; arestas: Aresta[] }) {
  const [sel, setSel] = useState<string | null>(null)

  // Com muita notícia o desenho vira borrão: entram as 10 primeiras, e o resto segue na lista de texto.
  const { visiveis, ligacoes, cortadas } = useMemo(() => {
    const noticias = nos.filter(n => n.tipo === 'Noticia')
    const corte = new Set(noticias.slice(10).map(n => n.id))
    const visiveis = nos.filter(n => !corte.has(n.id))
    const vivos = new Set(visiveis.map(n => n.id))
    return { visiveis, ligacoes: arestas.filter(a => vivos.has(a.de) && vivos.has(a.para)), cortadas: corte.size }
  }, [nos, arestas])

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    for (const p of posicionar(visiveis, ligacoes, { largura: L, altura: A, margem: 26 })) m.set(p.id, p)
    return m
  }, [visiveis, ligacoes])

  const porId = useMemo(() => new Map(nos.map(n => [n.id, n])), [nos])
  const rot = (id: string) => porId.get(id)?.rotulo ?? id
  const tipos = useMemo(() => [...new Set(visiveis.map(n => n.tipo))], [visiveis])
  const escolhido = sel ? porId.get(sel) ?? null : null
  const doEscolhido = useMemo(() => (sel ? arestas.filter(a => a.de === sel || a.para === sel) : []), [arestas, sel])

  if (visiveis.length === 0) return <p className="text-sm text-grafite">Ainda não há nada para desenhar. Grave alguns pontos e o grafo aparece aqui.</p>

  return (
    <div>
      {/* role="group" e não "img": dentro deste desenho cada ponto é um botão de verdade,
          e um "img" tornaria os pontos invisíveis para o leitor de tela (axe: nested-interactive). */}
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full h-auto bg-pergaminho border border-navy/10" role="group"
        aria-label={`Desenho do grafo com ${visiveis.length} pontos e ${ligacoes.length} ligações. A mesma informação está escrita na lista logo abaixo.`}>
        <g>
          {ligacoes.map((a, i) => {
            const p = pos.get(a.de), q = pos.get(a.para)
            if (!p || !q) return null
            const previsao = a.tipo === 'VAI_PARA'
            const aceso = sel != null && (a.de === sel || a.para === sel)
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              stroke={previsao ? '#8A5A00' : '#5F6166'} strokeWidth={aceso ? 2.5 : previsao ? 1.8 : 1}
              strokeDasharray={previsao ? '6 4' : undefined} opacity={sel == null ? 0.45 : aceso ? 0.95 : 0.12}><title>{`${rot(a.de)} ${EM_PALAVRAS[a.tipo]} ${rot(a.para)} — fonte: ${a.fonte}`}</title></line>
          })}
        </g>
        <g>
          {visiveis.map(n => {
            const p = pos.get(n.id); if (!p) return null
            const e = ESTILO[n.tipo]
            const aceso = sel === n.id
            const apagado = sel != null && !aceso && !doEscolhido.some(a => a.de === n.id || a.para === n.id)
            const curto = n.rotulo.length > 22 ? n.rotulo.slice(0, 21) + '…' : n.rotulo
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={apagado ? 0.2 : 1}
                tabIndex={0} role="button" aria-pressed={aceso}
                aria-label={`${e.nome}: ${n.rotulo}. Apertar para ver as ligações deste ponto.`}
                onClick={() => setSel(aceso ? null : n.id)}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel(aceso ? null : n.id) } }}
                style={{ cursor: 'pointer' }}>
                <Forma forma={e.forma} r={e.r} cor={e.cor} destacado={aceso} />
                <title>{`${e.nome}: ${n.rotulo}`}</title>
                {(n.tipo === 'Titular' || n.tipo === 'Lugar' || n.tipo === 'Municipio' || aceso) && (
                  <text y={e.r + 14} textAnchor="middle" fontSize={12} fill="#2A2D31" style={{ paintOrder: 'stroke', stroke: '#F5F5F6', strokeWidth: 3 }}>{curto}</text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-grafite">
        {tipos.map(t => (
          <li key={t} className="flex items-center gap-1">
            <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true"><Forma forma={ESTILO[t].forma} r={6} cor={ESTILO[t].cor} destacado={false} /></svg>
            {ESTILO[t].nome}
          </li>
        ))}
        <li className="flex items-center gap-1"><svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true"><line x1="0" y1="5" x2="24" y2="5" stroke="#8A5A00" strokeWidth="2" strokeDasharray="6 4" /></svg>previsão de para onde você vai</li>
      </ul>

      <p className="text-xs text-grafite-claro mt-2">
        Aperte um ponto (ou chegue nele pelo teclado e aperte Enter) para ver só as ligações dele.
        O desenho se organiza sozinho: pontos ligados se puxam, pontos soltos se afastam — método de{' '}
        <a href={FONTE_LAYOUT.url} target="_blank" rel="noreferrer noopener" className="underline" title={`${FONTE_LAYOUT.titulo}, ${FONTE_LAYOUT.onde}`}>{FONTE_LAYOUT.autores} (1991)</a>.
        A distância no desenho <b>não</b> é distância no mundo real; quem mostra isso é o mapa.
        {cortadas > 0 && ` ${cortadas} notícia(s) ficaram fora do desenho para ele não virar borrão, mas continuam na lista e no arquivo exportado.`}
      </p>

      {escolhido && (
        <div className="mt-3 border border-navy/10 bg-white px-3 py-2">
          <p className="text-sm font-semibold text-navy">{ESTILO[escolhido.tipo].nome}: {escolhido.rotulo}</p>
          {Object.entries(escolhido.props).length > 0 && (
            <ul className="text-xs text-grafite mt-1">{Object.entries(escolhido.props).map(([c, v]) => <li key={c}>{c.replace(/_/g, ' ')}: {String(v)}</li>)}</ul>
          )}
          <p className="text-xs text-grafite mt-2 font-semibold">Ligações deste ponto ({doEscolhido.length}):</p>
          <ul className="text-xs text-grafite max-h-40 overflow-auto" tabIndex={0} aria-label={`Ligações de ${escolhido.rotulo}`}>
            {doEscolhido.map((a, i) => (
              <li key={i} className="border-t border-navy/5 py-0.5">
                {rot(a.de)} <b>{EM_PALAVRAS[a.tipo]}</b> {rot(a.para)}{a.peso != null ? ` (${a.peso})` : ''}
                <span className="block text-grafite-claro">de onde veio: {a.fonte}</span>
              </li>
            ))}
          </ul>
          <button className="mt-2 text-xs underline text-navy min-h-[44px]" onClick={() => setSel(null)}>Mostrar o grafo inteiro de novo</button>
        </div>
      )}
    </div>
  )
}
