// Painel de nota da casa /geo. R1 criou a régua; R11 a transformou em painel ao vivo:
// cada dimensão diz de ONDE vem seu número (máquina, mão, ou fora do nosso alcance) e
// mostra a evolução real, lida do git pelo scripts/geo/historico-nota.mjs.
import { useMemo } from 'react'
import CasaGeo from '@/components/geo/CasaGeo'
import { RUBRICA, META, EMITIDO_EM, type Dimensao } from '@/data/geo/nota'
import { EXPLICA_FONTE, type FonteDaNota } from '@/lib/geo/medicao'
import medicoes from '@/data/geo/medicoes-ci.json'
import historico from '@/data/geo/nota-historico.json'

const cor = (d: Dimensao) => {
  if (d.nota == null) return { fundo: 'bg-grafite-claro/15', texto: 'text-grafite', rotulo: 'a medir' }
  if (d.nota >= 8) return { fundo: 'bg-regularFundo', texto: 'text-regular', rotulo: `${d.nota}/10` }
  if (d.nota >= 5) return { fundo: 'bg-atencaoFundo', texto: 'text-atencao', rotulo: `${d.nota}/10` }
  return { fundo: 'bg-criticoFundo', texto: 'text-critico', rotulo: `${d.nota}/10` }
}

const SELO: Record<FonteDaNota, string> = {
  ci: 'medida pela máquina',
  manual: 'medida à mão',
  externo: 'depende de um passo de fora',
}

type Registro = { elo: string; quando: string; commit: string; notas: Record<string, number | null> }
const registros = historico.registros as Registro[]

/** Uma linha do tempo em texto e barras, para uma dimensão. Sem biblioteca de gráfico: o
 *  painel também é avaliado pela própria régua, na dimensão de desempenho. */
function Evolucao({ n }: { n: number }) {
  const serie = useMemo(() => registros.map(r => ({ elo: r.elo, nota: r.notas[String(n)] })), [n])
  const mudou = serie.some((p, i) => i > 0 && p.nota !== serie[i - 1].nota)
  if (!mudou) {
    const atual = serie[serie.length - 1]?.nota
    return (
      <p className="text-xs text-grafite-claro">
        {atual == null
          ? 'sem nota desde o começo do trilho: nunca foi medida'
          : `${atual}/10 desde o primeiro boletim, sem mudança nos ${registros.length} elos`}
      </p>
    )
  }
  return (
    <div>
      <div className="flex items-end gap-1 h-12" role="img" aria-label={`Evolução da nota: ${serie.map(p => `${p.elo} ${p.nota ?? 'sem nota'}`).join(', ')}`}>
        {serie.map(p => (
          <div key={p.elo} className="flex-1 flex flex-col justify-end items-center gap-0.5" title={`${p.elo}: ${p.nota == null ? 'sem nota' : `${p.nota}/10`}`}>
            <div className={p.nota == null ? 'w-full bg-grafite-claro/20 h-1' : 'w-full bg-navy'} style={p.nota == null ? undefined : { height: `${(p.nota / 10) * 44}px` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {serie.map(p => <div key={p.elo} className="flex-1 text-center text-[10px] text-grafite-claro">{p.elo}</div>)}
      </div>
    </div>
  )
}

export default function NotaGeo() {
  const medidas = RUBRICA.filter(d => d.nota != null)
  const media = medidas.length ? (medidas.reduce((s, d) => s + (d.nota ?? 0), 0) / medidas.length) : 0
  const doCI = RUBRICA.filter(d => d.fonte === 'ci')
  const quandoMedido = new Date(medicoes.quando).toLocaleDateString('pt-BR')

  return (
    <CasaGeo>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-navy">A régua de nota do app</h1>
          <p className="text-sm text-grafite mt-1">
            Dez dimensões, cada uma com um alvo medível. O primeiro boletim é de {EMITIDO_EM}; aqui
            você acompanha a nota subir a cada passo do trilho, e vê de onde cada número vem.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="bg-white shadow-sm p-4 border-t-2 border-dourado">
            <div className="text-3xl font-semibold text-navy">{media.toFixed(1)}<span className="text-base text-grafite-claro">/{META}</span></div>
            <div className="text-xs text-grafite-claro mt-1">média do que já foi medido ({medidas.length} de {RUBRICA.length})</div>
          </div>
          <div className="bg-white shadow-sm p-4 border-t-2 border-dourado">
            <div className="text-3xl font-semibold text-navy">{RUBRICA.length - medidas.length}</div>
            <div className="text-xs text-grafite-claro mt-1">ainda a medir (dependem de passos à frente)</div>
          </div>
          <div className="bg-white shadow-sm p-4 border-t-2 border-dourado">
            <div className="text-3xl font-semibold text-navy">{doCI.length}<span className="text-base text-grafite-claro">/{RUBRICA.length}</span></div>
            <div className="text-xs text-grafite-claro mt-1">medidas pela máquina a cada rodada (última: {quandoMedido})</div>
          </div>
        </div>

        <div className="bg-white shadow-sm p-4 border-l-2 border-navy text-sm text-grafite">
          <b className="text-navy">Como ler estas notas.</b> Duas dimensões ({doCI.map(d => d.n).join(' e ')}) são
          medidas pela máquina a cada rodada da obra, e a régua não consegue divergir da medição: se
          divergir, a obra quebra. As outras oito foram medidas à mão, com a evidência escrita ao
          lado — menos honesto seria chamá-las de automáticas. E a que depende de um passo de fora
          fica <b>sem nota</b> em vez de receber um número de consolação.
        </div>

        <div className="space-y-3">
          {RUBRICA.map(d => {
            const c = cor(d)
            const m = (medicoes.dimensoes as Record<string, { valor: string; como: string } | undefined>)[String(d.n)]
            return (
              <div key={d.n} className="bg-white shadow-sm p-4 border border-navy/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-navy">{d.n}. {d.nome}</h2>
                    <p className="text-xs text-grafite-claro">{d.norma}</p>
                  </div>
                  <div className="text-right">
                    <span data-testid="nota-badge" className={`${c.fundo} ${c.texto} text-sm font-semibold px-3 py-1 whitespace-nowrap`} title={`Nota 10 = ${d.criterio10}`}>{c.rotulo}</span>
                    <div className="text-[10px] text-grafite-claro mt-1" title={EXPLICA_FONTE[d.fonte]}>{SELO[d.fonte]}</div>
                  </div>
                </div>
                <dl className="mt-2 text-sm space-y-1">
                  <div><dt className="inline text-grafite font-semibold">Nota 10 é: </dt><dd className="inline text-grafite">{d.criterio10}</dd></div>
                  <div><dt className="inline text-grafite font-semibold">Hoje: </dt><dd className="inline text-grafite">{d.evidencia}</dd></div>
                  <div><dt className="inline text-grafite font-semibold">Até 10: </dt><dd className="inline text-grafite-claro">{d.ate10}</dd></div>
                  {m && <div><dt className="inline text-grafite font-semibold">Medição desta rodada: </dt><dd className="inline text-grafite">{m.valor} — {m.como}</dd></div>}
                </dl>
                <div className="mt-3 pt-3 border-t border-navy/5">
                  <Evolucao n={d.n} />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-grafite-claro">
          A evolução vem do próprio histórico do código ({registros.length} elos, de {registros[0]?.elo} a{' '}
          {registros[registros.length - 1]?.elo}): cada barra é o que a régua dizia no commit em que
          aquele elo foi entregue, lido pelo <code>scripts/geo/historico-nota.mjs</code>. Nenhuma nota
          é adjetivo — cada uma tem um número e uma forma de conferir.
        </p>
      </div>
    </CasaGeo>
  )
}
