// Painel de nota da casa /geo (elo R1 do replano): a régua das 10 dimensões, à vista.
// Mostra de onde o MVP parte e para onde cada dimensão vai. R11 liga ao CI; aqui é o boletim.
import CasaGeo from '@/components/geo/CasaGeo'
import { RUBRICA, META, EMITIDO_EM, type Dimensao } from '@/data/geo/nota'

const cor = (d: Dimensao) => {
  if (d.nota == null) return { fundo: 'bg-grafite-claro/15', texto: 'text-grafite', rotulo: 'a medir' }
  if (d.nota >= 8) return { fundo: 'bg-regularFundo', texto: 'text-regular', rotulo: `${d.nota}/10` }
  if (d.nota >= 5) return { fundo: 'bg-atencaoFundo', texto: 'text-atencao', rotulo: `${d.nota}/10` }
  return { fundo: 'bg-criticoFundo', texto: 'text-critico', rotulo: `${d.nota}/10` }
}

export default function NotaGeo() {
  const medidas = RUBRICA.filter(d => d.nota != null)
  const media = medidas.length ? (medidas.reduce((s, d) => s + (d.nota ?? 0), 0) / medidas.length) : 0
  return (
    <CasaGeo>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-navy">A régua de nota do app</h1>
          <p className="text-sm text-grafite mt-1">
            Dez dimensões, cada uma com um alvo medível. Isto é o ponto de partida ({EMITIDO_EM}); a nota sobe a cada passo do trilho, e aqui você acompanha.
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
        </div>

        <div className="space-y-3">
          {RUBRICA.map(d => {
            const c = cor(d)
            return (
              <div key={d.n} className="bg-white shadow-sm p-4 border border-navy/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-navy">{d.n}. {d.nome}</h2>
                    <p className="text-xs text-grafite-claro">{d.norma}</p>
                  </div>
                  <span data-testid="nota-badge" className={`${c.fundo} ${c.texto} text-sm font-semibold px-3 py-1 whitespace-nowrap`} title={`Nota 10 = ${d.criterio10}`}>{c.rotulo}</span>
                </div>
                <dl className="mt-2 text-sm space-y-1">
                  <div><dt className="inline text-grafite font-semibold">Nota 10 é: </dt><dd className="inline text-grafite">{d.criterio10}</dd></div>
                  <div><dt className="inline text-grafite font-semibold">Hoje: </dt><dd className="inline text-grafite">{d.evidencia}</dd></div>
                  <div><dt className="inline text-grafite font-semibold">Até 10: </dt><dd className="inline text-grafite-claro">{d.ate10}</dd></div>
                </dl>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-grafite-claro">
          Medido com axe-core (acessibilidade) e Playwright (desempenho) na entrada da casa; segurança (MASVS) e precisão em campo vêm nos próximos passos. Nenhuma nota é adjetivo — cada uma tem um número e uma forma de conferir.
        </p>
      </div>
    </CasaGeo>
  )
}
