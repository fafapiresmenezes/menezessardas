import { useState } from 'react'
import Layout from '@/components/Layout'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { CONTRATOS_MOCK, statusDoContrato } from '@/data/contratosMock'
import { rotulosTipoAlerta, rotulosTipoImovel } from '@/lib/rotulos'

type Periodo = 30 | 90 | 365

const periodos: { dias: Periodo; rotulo: string }[] = [
  { dias: 30, rotulo: 'Próximos 30 dias' },
  { dias: 90, rotulo: 'Próximo trimestre' },
  { dias: 365, rotulo: 'Próximo ano' },
]

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export default function RelatóriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>(90)
  const { imoveis, loading: carregandoImoveis } = useImoveis()
  const { alertas, loading: carregandoAlertas } = useAlertas()

  if (carregandoImoveis || carregandoAlertas) {
    return (
      <Layout title="Relatórios">
        <p className="text-grafite-claro">Preparando relatórios…</p>
      </Layout>
    )
  }

  // Tudo abaixo é derivado dos mesmos dados que alimentam as outras telas.
  const contratos = Object.values(CONTRATOS_MOCK)
  const porStatus = { ativo: 0, a_renovar: 0, vencido: 0 }
  contratos.forEach(c => { porStatus[statusDoContrato(c)] += 1 })

  const documentos = contratos.flatMap(c => c.documentos)
  const docs = {
    validos: documentos.filter(d => d.status === 'valido').length,
    aRenovar: documentos.filter(d => d.status === 'a_renovar').length,
    vencidos: documentos.filter(d => d.status === 'vencido').length,
  }

  const receitaMensal = contratos
    .filter(c => statusDoContrato(c) !== 'vencido')
    .reduce((soma, c) => soma + c.valorMensal, 0)
  const receitaNoPeriodo = receitaMensal * (periodo / 30)

  const noPeriodo = alertas.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= periodo)
  const vencidosAbertos = alertas.filter(a => a.diasRestantes < 0)

  const porTipoAlerta = Object.entries(
    noPeriodo.reduce<Record<string, number>>((acc, a) => {
      acc[a.tipo] = (acc[a.tipo] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const porTipoImovel = Object.entries(
    imoveis.reduce<Record<string, number>>((acc, i) => {
      acc[i.tipo] = (acc[i.tipo] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const maiorTipo = Math.max(1, ...porTipoAlerta.map(([, n]) => n))
  const maiorImovel = Math.max(1, ...porTipoImovel.map(([, n]) => n))

  const Barra = ({ rotulo, valor, maximo }: { rotulo: string; valor: number; maximo: number }) => (
    <div className="flex items-center gap-4">
      <span className="w-44 text-sm text-grafite truncate">{rotulo}</span>
      <div className="flex-1 h-5 bg-pergaminho rounded-sm overflow-hidden" aria-hidden="true">
        <div className="h-full bg-navy" style={{ width: `${(valor / maximo) * 100}%` }} />
      </div>
      <span className="w-8 text-right font-serif text-lg text-navy">{valor}</span>
    </div>
  )

  return (
    <Layout title="Relatórios">
      <div className="space-y-8">
        <div className="bg-white p-4 shadow-sm">
          <p id="rotulo-periodo" className="text-xs uppercase tracking-wider text-grafite mb-3">
            Horizonte de análise
          </p>
          <div role="group" aria-labelledby="rotulo-periodo" className="flex flex-wrap gap-2">
            {periodos.map(p => (
              <button
                key={p.dias}
                onClick={() => setPeriodo(p.dias)}
                aria-pressed={periodo === p.dias}
                className={`px-4 py-2 rounded-sm text-sm transition ${
                  periodo === p.dias
                    ? 'bg-navy text-white'
                    : 'bg-pergaminho text-grafite hover:bg-navy/10'
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { rotulo: 'Compromissos no período', valor: String(noPeriodo.length), cor: 'text-navy' },
            { rotulo: 'Pendências vencidas', valor: String(vencidosAbertos.length), cor: 'text-critico' },
            { rotulo: 'Receita contratada no período', valor: moeda(receitaNoPeriodo), cor: 'text-navy' },
            { rotulo: 'Receita mensal contratada', valor: moeda(receitaMensal), cor: 'text-regular' },
          ].map(k => (
            <div key={k.rotulo} className="bg-white border-t-2 border-dourado p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-grafite-claro">{k.rotulo}</p>
              <p className={`font-serif text-3xl mt-2 ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white p-6 shadow-sm" aria-labelledby="t-compromissos">
            <h2 id="t-compromissos" className="text-lg mb-5">
              Compromissos por natureza
            </h2>
            {porTipoAlerta.length === 0 ? (
              <p className="text-sm text-grafite-claro">Nenhum compromisso neste horizonte.</p>
            ) : (
              <div className="space-y-3">
                {porTipoAlerta.map(([tipo, n]) => (
                  <Barra key={tipo} rotulo={rotulosTipoAlerta[tipo] ?? tipo} valor={n} maximo={maiorTipo} />
                ))}
              </div>
            )}
          </section>

          <section className="bg-white p-6 shadow-sm" aria-labelledby="t-contratos">
            <h2 id="t-contratos" className="text-lg mb-5">
              Situação dos contratos
            </h2>
            <dl className="space-y-3">
              {[
                { r: 'Ativos', v: porStatus.ativo, c: 'text-regular' },
                { r: 'A renovar (até 60 dias)', v: porStatus.a_renovar, c: 'text-atencao' },
                { r: 'Vencidos', v: porStatus.vencido, c: 'text-critico' },
              ].map(l => (
                <div key={l.r} className="flex items-center justify-between py-2 border-b border-navy/10 last:border-0">
                  <dt className="text-sm text-grafite">{l.r}</dt>
                  <dd className={`font-serif text-2xl ${l.c}`}>{l.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="bg-white p-6 shadow-sm" aria-labelledby="t-imoveis">
            <h2 id="t-imoveis" className="text-lg mb-5">
              Carteira por tipo de imóvel
            </h2>
            <div className="space-y-3">
              {porTipoImovel.map(([tipo, n]) => (
                <Barra key={tipo} rotulo={rotulosTipoImovel[tipo] ?? tipo} valor={n} maximo={maiorImovel} />
              ))}
            </div>
          </section>

          <section className="bg-white p-6 shadow-sm" aria-labelledby="t-docs">
            <h2 id="t-docs" className="text-lg mb-5">
              Documentação
            </h2>
            <dl className="space-y-3">
              {[
                { r: 'Documentos válidos', v: docs.validos, c: 'text-regular' },
                { r: 'A renovar', v: docs.aRenovar, c: 'text-atencao' },
                { r: 'Vencidos', v: docs.vencidos, c: 'text-critico' },
              ].map(l => (
                <div key={l.r} className="flex items-center justify-between py-2 border-b border-navy/10 last:border-0">
                  <dt className="text-sm text-grafite">{l.r}</dt>
                  <dd className={`font-serif text-2xl ${l.c}`}>{l.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </Layout>
  )
}
