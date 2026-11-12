import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { render } from '@/pages/AssistentePage'
import { secoesDoDiagnostico, ehSecaoDeAcoes, detalhesDasAcoes } from '@/lib/acoesConsultor'

export interface AcaoDaSemana { id: string; indice: number; texto: string; feito_em: string | null }

// Títulos do consultor trocados por perguntas que o advogado faria.
const TITULO_CLARO: [RegExp, string][] = [
  [/^diagn[óo]stico$/i, 'Como está o escritório (pontos fortes e fracos)'],
  [/^for[çc]as$/i, 'Pontos fortes'],
  [/^fraquezas$/i, 'Pontos fracos'],
  [/^fundamenta[çc][ãa]o$/i, 'O que a lei diz'],
  [/^premissas/i, 'O que o consultor presumiu (confira)'],
  [/^riscos/i, 'Riscos e pontos de dúvida'],
  [/^pr[óo]ximos passos$/i, 'Dia a dia da semana'],
]
const tituloClaro = (t: string) => TITULO_CLARO.find(([r]) => r.test(t))?.[1] ?? t
const ehResumo = (t: string) => /^resposta direta$/i.test(t)

const Texto = ({ md, className = '' }: { md: string; className?: string }) => {
  const saida = render(md)
  return typeof saida === 'string'
    ? <div className={`text-sm text-grafite space-y-2 ${className}`} dangerouslySetInnerHTML={{ __html: saida }} />
    : <div className={`text-sm text-grafite space-y-2 ${className}`}>{saida}</div>
}

/** Consultor da semana em blocos: resumo, o que fazer (marcável) e o restante recolhido. */
export default function ConsultorSemana({ diagnostico, acoes, onMarcar }: {
  diagnostico: { resposta: string; criado_em: string } | null
  acoes: AcaoDaSemana[]
  onMarcar: (a: AcaoDaSemana) => void
}) {
  const feitas = acoes.filter(a => a.feito_em).length
  const { secoes, fontes } = secoesDoDiagnostico(diagnostico?.resposta ?? '')
  const detalhes = detalhesDasAcoes(diagnostico?.resposta ?? '')
  const resumo = secoes.find(s => ehResumo(s.titulo)) ?? (secoes[0] && !secoes[0].titulo ? secoes[0] : undefined)
  const outras = secoes.filter(s => s !== resumo && !(acoes.length && ehSecaoDeAcoes(s.titulo)) && s.corpo)

  return (
    <section className="bg-white shadow-sm p-5" data-testid="consultor-semana">
      <h2 className="font-serif text-lg flex items-center gap-2"><Briefcase className="w-5 h-5" aria-hidden />Consultor da semana</h2>
      <p className="text-sm text-grafite-claro mt-1" data-testid="consultor-o-que-e">
        Toda segunda-feira um consultor automático lê os números do escritório (prazos, intimações, tarefas e contratos) e diz o que fazer primeiro. É uma sugestão: quem decide é você.
      </p>
      {!diagnostico ? (
        <p className="text-sm text-grafite-claro mt-3">O primeiro diagnóstico chega na segunda-feira. Enquanto isso, <Link to="/consultores" className="underline">peça um agora em Consultores</Link>.</p>
      ) : (
        <>
          <p className="text-xs text-grafite-claro mt-2">
            Gerado em {new Date(diagnostico.criado_em).toLocaleDateString('pt-BR')} pelo consultor do seu nível.{' '}
            <Link to="/consultores" className="underline" title="Abre a tela Consultores, onde você pede um diagnóstico novo na hora, sem esperar a segunda-feira">Pedir um diagnóstico agora</Link>
          </p>

          {resumo && (
            <div className="mt-4 border-l-4 border-navy bg-pergaminho p-4" data-testid="consultor-resumo">
              <p className="text-[11px] uppercase tracking-wider text-grafite-claro">1. Em resumo</p>
              <Texto md={resumo.corpo} className="mt-1" />
            </div>
          )}

          {!!acoes.length && (
            <div className="mt-5" data-testid="acoes-consultor">
              <p className="text-[11px] uppercase tracking-wider text-grafite-claro">2. O que fazer esta semana</p>
              <p className="text-sm font-semibold flex flex-wrap items-center justify-between gap-2 mt-1">
                Marque cada ação quando terminar
                <span data-testid="aderencia-semana" title="Quantas ações da semana já foram marcadas como feitas">{feitas} de {acoes.length} feitas ({Math.round(100 * feitas / acoes.length)}%)</span>
              </p>
              <ul className="mt-2 space-y-2">
                {acoes.map(a => {
                  const d = detalhes[a.indice - 1] ?? []
                  return (
                    <li key={a.id} className={`border p-3 ${a.feito_em ? 'border-navy/10 bg-pergaminho' : 'border-navy/20'}`}>
                      <label className="flex items-start gap-3 text-sm min-h-[44px] cursor-pointer" title={a.feito_em ? 'Clique para desmarcar' : 'Clique quando esta ação estiver concluída'}>
                        <input type="checkbox" checked={!!a.feito_em} onChange={() => onMarcar(a)} className="mt-0.5 w-5 h-5 shrink-0" data-testid={`acao-${a.indice}`} />
                        <span className={`font-medium ${a.feito_em ? 'line-through text-grafite-claro' : 'text-navy'}`}>
                          {a.indice}. {a.texto}
                          {a.feito_em && <span className="text-xs font-normal ml-2">feita em {new Date(a.feito_em).toLocaleDateString('pt-BR')}</span>}
                        </span>
                      </label>
                      {!!d.length && !a.feito_em && (
                        <dl className="mt-2 ml-8 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[11rem_1fr]" data-testid={`detalhes-acao-${a.indice}`}>
                          {d.map(x => (
                            <div key={x.rotulo} className="contents">
                              <dt className="text-grafite-claro">{x.rotulo}</dt>
                              <dd className="text-grafite">{x.texto}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-grafite-claro mt-2">O quanto cada nível cumpre das ações aparece em <Link to="/indicadores" className="underline">Indicadores</Link>.</p>
            </div>
          )}

          {!!outras.length && (
            <div className="mt-5" data-testid="consultor-detalhes">
              <p className="text-[11px] uppercase tracking-wider text-grafite-claro">3. Para ler com calma (clique para abrir)</p>
              <div className="mt-1 divide-y divide-navy/10 border-y border-navy/10">
                {outras.map((s, i) => (
                  <details key={`${s.titulo}-${i}`} className="group">
                    <summary className="cursor-pointer min-h-[44px] flex items-center text-sm font-medium text-navy" title="Clique para abrir ou fechar esta parte">{tituloClaro(s.titulo) || 'Observações'}</summary>
                    <Texto md={s.corpo} className="pb-3" />
                  </details>
                ))}
              </div>
            </div>
          )}

          {fontes && <p className="text-xs text-grafite-claro mt-3" data-testid="consultor-fontes"><strong>Leis consultadas:</strong> {fontes}</p>}
          <p className="text-xs text-atencao mt-2">Texto escrito por inteligência artificial. Confira os artigos citados e o que estiver marcado "a conferir" antes de decidir.</p>
        </>
      )}
    </section>
  )
}
