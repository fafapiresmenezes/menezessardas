import { Fragment, useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import GraficoTendencia from '@/components/GraficoTendencia'
import CalibracaoPrevisoes from '@/components/CalibracaoPrevisoes'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { repositorio, type Contrato } from '@/lib/repositorio'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import {
  calcularKPIs,
  calcularOKRs,
  matrizRisco,
  matrizPendencias,
  tendencia12Meses,
  type Nivel,
  type PontoRisco,
  type PontoPendencia,
} from '@/lib/indicadores'
import { Printer, Building2, Percent, FileCheck2, CalendarClock, TrendingUp, AlertOctagon, Sparkles, ListChecks } from 'lucide-react'

// Passo 20: aderência às ações do Consultor da semana, por nível (RPC aderencia_consultores).
const NOME_NIVEL: Record<string, string> = { nivel_socio_gestor: 'Sócia gestora', nivel_senior: 'Advogado sênior', nivel_pleno: 'Advogado pleno', nivel_junior: 'Advogado júnior', nivel_estagiario: 'Estagiário', nivel_secretaria: 'Secretaria', nivel_financeiro: 'Financeiro', nivel_ti: 'TI', nivel_marketing: 'Marketing', nivel_rh: 'Pessoas', nivel_compliance: 'Compliance', nivel_cliente: 'Cliente', nivel_controladoria: 'Controladoria', nivel_recepcao: 'Recepção' }
type Aderencia = { nivel: string; total: number; feitas: number; aderencia: number | null; gerado_em: string }

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const NIVEIS: Nivel[] = ['baixo', 'medio', 'alto']
const rotuloNivel: Record<Nivel, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }

// Cor da célula conforme a combinação de eixos (quanto mais ao canto alto × alto, mais grave).
const corCelula = (a: Nivel, b: Nivel): string => {
  const soma = NIVEIS.indexOf(a) + NIVEIS.indexOf(b)
  if (soma >= 3) return 'bg-criticoFundo'
  if (soma === 2) return 'bg-atencaoFundo'
  return 'bg-regularFundo'
}

function Matriz<T extends { rotulo: string }>({
  titulo,
  eixoX,
  eixoY,
  pontos,
  nivelX,
  nivelY,
}: {
  titulo: string
  eixoX: string
  eixoY: string
  pontos: T[]
  nivelX: (p: T) => Nivel
  nivelY: (p: T) => Nivel
}) {
  return (
    <section className="bg-white p-6 shadow-sm" aria-label={titulo}>
      <h3 className="text-lg mb-1">{titulo}</h3>
      <p className="text-sm text-grafite-claro mb-4">
        Eixo horizontal: {eixoX}. Eixo vertical: {eixoY}.
      </p>
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 text-xs">
        <div />
        {NIVEIS.map(x => (
          <div key={x} className="text-center font-medium text-grafite-claro uppercase tracking-wider py-1">
            {rotuloNivel[x]}
          </div>
        ))}
        {[...NIVEIS].reverse().map(y => (
          <Fragment key={`row-${y}`}>
            <div className="flex items-center justify-end pr-2 font-medium text-grafite-claro uppercase tracking-wider">
              {rotuloNivel[y]}
            </div>
            {NIVEIS.map(x => {
              const dentro = pontos.filter(p => nivelX(p) === x && nivelY(p) === y)
              return (
                <div key={`${x}-${y}`} className={`min-h-[70px] border border-navy/5 p-1.5 ${corCelula(x, y)}`}>
                  {dentro.slice(0, 4).map((p, i) => (
                    <p key={i} className="text-[11px] text-grafite truncate" title={p.rotulo}>
                      {p.rotulo}
                    </p>
                  ))}
                  {dentro.length > 4 && <p className="text-[11px] text-grafite-claro">+{dentro.length - 4}</p>}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </section>
  )
}

interface ResumoDiario {
  data: string
  periodo: string
  vencimentos: number
  reajustes: number
  documentos: number
  receitaEmRisco: number
  proximosPassos: string[]
}

export default function IndicadoresPage() {
  const { imoveis, loading: li } = useImoveis()
  const { alertas, loading: la } = useAlertas()
  const [contratos, setContratos] = useState<Contrato[] | null>(null)
  const [resumoDiario, setResumoDiario] = useState<ResumoDiario | null>(null)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [erroResumo, setErroResumo] = useState('')
  const [aderencia, setAderencia] = useState<Aderencia[]>([])

  useEffect(() => {
    repositorio.listarContratos().then(setContratos)
    carregarResumoDiario()
    if (supabaseConfigurado) supabase.rpc('aderencia_consultores').then(r => setAderencia((r.data as Aderencia[]) ?? []))
  }, [])

  const carregarResumoDiario = async () => {
    if (!supabaseConfigurado) {
      setResumoDiario({
        data: new Date().toISOString().split('T')[0],
        periodo: '30 dias',
        vencimentos: 2,
        reajustes: 1,
        documentos: 0,
        receitaEmRisco: 15000,
        proximosPassos: ['2 contratos vencem nos próximos 30 dias.', '1 reajuste programado.'],
      })
      return
    }
    setCarregandoResumo(true)
    setErroResumo('')
    try {
      const { data, error } = await supabase.functions.invoke('agente-guardiao')
      if (error) throw new Error(error.message)
      setResumoDiario(data as ResumoDiario)
    } catch (e) {
      setErroResumo(e instanceof Error ? e.message : 'Erro ao carregar resumo')
    } finally {
      setCarregandoResumo(false)
    }
  }

  const dados = useMemo(() => {
    if (!contratos) return null
    return {
      kpis: calcularKPIs(imoveis, contratos),
      okrs: calcularOKRs(imoveis, contratos, alertas),
      risco: matrizRisco(imoveis, contratos),
      pendencias: matrizPendencias(alertas),
      tendencia: tendencia12Meses(imoveis, contratos),
    }
  }, [imoveis, contratos, alertas])

  if (li || la || !dados) {
    return (
      <Layout title="Indicadores">
        <p className="text-grafite-claro">Calculando indicadores…</p>
      </Layout>
    )
  }

  const { kpis, okrs, risco, pendencias, tendencia } = dados
  const tiles = [
    { rotulo: 'Imóveis na carteira', valor: String(kpis.imoveis), icone: Building2, cor: 'text-navy' },
    { rotulo: 'Taxa de vacância', valor: `${kpis.vacancia}%`, icone: Percent, cor: 'text-navy' },
    { rotulo: 'Receita contratada / mês', valor: moeda(kpis.receitaContratadaMensal), icone: TrendingUp, cor: 'text-regular' },
    { rotulo: 'Documentação em dia', valor: `${kpis.documentacaoEmDia}%`, icone: FileCheck2, cor: kpis.documentacaoEmDia >= 95 ? 'text-regular' : 'text-atencao' },
    { rotulo: 'Prazo médio de vencimento', valor: kpis.prazoMedioDias === null ? '—' : `${kpis.prazoMedioDias} dias`, icone: CalendarClock, cor: 'text-navy' },
    { rotulo: 'Contratos vencidos', valor: String(kpis.contratosVencidos), icone: AlertOctagon, cor: kpis.contratosVencidos ? 'text-critico' : 'text-regular' },
  ]

  return (
    <Layout title="Indicadores">
      <div className="space-y-8">
        <div className="flex justify-end -mb-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-sm text-sm"
          >
            <Printer size={16} aria-hidden="true" /> Exportar PDF
          </button>
        </div>

        <section aria-label="Indicadores-chave">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map(t => (
              <div key={t.rotulo} className="bg-white border-t-2 border-dourado p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-grafite-claro">{t.rotulo}</p>
                    <p className={`font-serif text-3xl mt-2 ${t.cor}`}>{t.valor}</p>
                  </div>
                  <t.icone className={t.cor} size={20} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-grafite-claro mt-3">
            Receita recebida e inadimplência dependem da integração de pagamentos, ainda não disponível.
          </p>
        </section>

        <CalibracaoPrevisoes />

        {supabaseConfigurado && (
          <section className="bg-white p-6 shadow-sm" aria-labelledby="t-aderencia" data-testid="aderencia-consultores">
            <h2 id="t-aderencia" className="text-xl mb-1 flex items-center gap-2"><ListChecks className="w-5 h-5 text-dourado" aria-hidden />Aderência às ações dos Consultores da semana</h2>
            <p className="text-sm text-grafite-claro mb-4">Percentual das ações do último diagnóstico de cada nível marcadas como feitas em Meu dia.</p>
            {aderencia.length === 0 ? (
              <p className="text-sm text-grafite-claro" data-testid="aderencia-vazia">Nenhum diagnóstico semanal ainda. Eles chegam toda segunda-feira, ou peça um em Consultores.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {aderencia.map(a => (
                  <li key={a.nivel} className="border border-navy/10 p-3" data-testid={`aderencia-${a.nivel}`}>
                    <div className="flex items-center justify-between text-sm"><span>{NOME_NIVEL[a.nivel] ?? a.nivel}</span><strong data-testid="aderencia-pct">{a.aderencia === null ? 'sem ações abertas' : `${a.aderencia}%`}</strong></div>
                    <div className="h-2 bg-pergaminho mt-2" role="progressbar" aria-valuenow={a.aderencia ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Aderência ${NOME_NIVEL[a.nivel] ?? a.nivel}`}>
                      <div className={`h-2 ${(a.aderencia ?? 0) >= 80 ? 'bg-regular' : (a.aderencia ?? 0) >= 40 ? 'bg-atencao' : 'bg-critico'}`} style={{ width: `${a.aderencia ?? 0}%` }} />
                    </div>
                    <p className="text-xs text-grafite-claro mt-1">{a.feitas} de {a.total} ações · diagnóstico de {new Date(a.gerado_em).toLocaleDateString('pt-BR')}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="bg-white p-6 shadow-sm" aria-labelledby="t-tend">
          <h2 id="t-tend" className="text-xl mb-1">
            Tendência dos próximos 12 meses
          </h2>
          <p className="text-sm text-grafite-claro mb-4">
            Receita contratada, vencimentos, reajustes e documentos a vencer, mês a mês, a partir das datas cadastradas.
          </p>
          <GraficoTendencia pontos={tendencia} />
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="t-resumo">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="t-resumo" className="text-xl mb-0 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-dourado" />
                Resumo do Agente Guardião
              </h2>
              <p className="text-xs text-grafite-claro mt-1">Eventos esperados nos próximos 30 dias</p>
            </div>
            <button
              onClick={carregarResumoDiario}
              disabled={carregandoResumo}
              className="min-h-[44px] text-sm px-3 rounded border border-navy/20 text-navy hover:bg-navy/5 disabled:opacity-50"
              title="Atualizar resumo do Agente Guardião"
            >
              {carregandoResumo ? 'Carregando…' : 'Atualizar'}
            </button>
          </div>
          {erroResumo && <p className="text-sm text-critico mb-3">{erroResumo}</p>}
          {resumoDiario ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="bg-pergaminho p-2 rounded">
                  <p className="text-grafite-claro text-xs">Vencimentos</p>
                  <p className="text-lg font-medium text-navy">{resumoDiario.vencimentos}</p>
                </div>
                <div className="bg-pergaminho p-2 rounded">
                  <p className="text-grafite-claro text-xs">Reajustes</p>
                  <p className="text-lg font-medium text-navy">{resumoDiario.reajustes}</p>
                </div>
                <div className="bg-pergaminho p-2 rounded">
                  <p className="text-grafite-claro text-xs">Documentos</p>
                  <p className="text-lg font-medium text-navy">{resumoDiario.documentos}</p>
                </div>
                <div className="bg-pergaminho p-2 rounded">
                  <p className="text-grafite-claro text-xs">Receita em risco</p>
                  <p className="text-sm font-medium text-critico">{moeda(resumoDiario.receitaEmRisco)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Próximos passos</p>
                <ul className="text-sm space-y-1">
                  {resumoDiario.proximosPassos.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-dourado">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-grafite-claro mt-3">Período: próximos {resumoDiario.periodo}</p>
            </div>
          ) : (
            <p className="text-sm text-grafite-claro">Clique em "Atualizar" para carregar o resumo diário.</p>
          )}
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="t-okr">
          <h2 id="t-okr" className="text-xl mb-5">
            OKRs do trimestre
          </h2>
          <div className="space-y-6">
            {okrs.map((o, i) => (
              <div key={i}>
                <h3 className="font-medium text-navy mb-3">{o.titulo}</h3>
                <div className="space-y-3">
                  {o.keyResults.map((kr, j) => {
                    const teto = kr.unidade === 'un' || kr.menorMelhor
                    const atingido = teto ? kr.atual <= kr.meta : kr.atual >= kr.meta
                    const pct = teto
                      ? atingido ? 100 : Math.max(5, Math.round((kr.meta / Math.max(kr.atual, 1)) * 100))
                      : Math.min(100, Math.round((kr.atual / kr.meta) * 100))
                    return (
                      <div key={j}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-grafite">{kr.descricao}</span>
                          <span className={atingido ? 'text-regular font-medium' : 'text-atencao font-medium'}>
                            {kr.atual}
                            {kr.unidade === '%' ? '%' : ''} / meta {teto && kr.unidade === '%' ? '≤ ' : ''}{kr.meta}
                            {kr.unidade === '%' ? '%' : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-pergaminho rounded-sm overflow-hidden" aria-hidden="true">
                          <div className={`h-full ${atingido ? 'bg-regular' : 'bg-atencao'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Matriz<PontoRisco>
            titulo="Matriz de risco dos contratos"
            eixoX="impacto (valor do contrato)"
            eixoY="probabilidade (urgência do prazo)"
            pontos={risco}
            nivelX={p => p.impacto}
            nivelY={p => p.probabilidade}
          />
          <Matriz<PontoPendencia>
            titulo="Matriz de pendências"
            eixoX="importância"
            eixoY="urgência"
            pontos={pendencias}
            nivelX={p => p.importancia}
            nivelY={p => p.urgencia}
          />
        </div>
      </div>
    </Layout>
  )
}
