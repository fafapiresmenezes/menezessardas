import { useEffect, useState } from 'react'
import Vazio from '@/components/Vazio'
import Layout from '@/components/Layout'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { repositorio, type Contrato, type Documento } from '@/lib/repositorio'
import { diasAte } from '@/lib/datas'
import { rotulosTipoAlerta, rotulosTipoImovel } from '@/lib/rotulos'
import type { Periodicidade } from '@/lib/dominio'

type Periodo = 30 | 90 | 365

const periodos: { dias: Periodo; rotulo: string }[] = [
  { dias: 30, rotulo: 'Próximos 30 dias' },
  { dias: 90, rotulo: 'Próximo trimestre' },
  { dias: 365, rotulo: 'Próximo ano' },
]

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

/** O status nunca é guardado: é lido da data de vencimento, para não envelhecer. */
const statusDoContrato = (c: Contrato): 'ativo' | 'vencido' | 'a_renovar' => {
  const dias = diasAte(c.dataVencimento)
  if (dias === null) return 'ativo'
  if (dias < 0) return 'vencido'
  if (dias <= 60) return 'a_renovar'
  return 'ativo'
}

const statusDoDocumento = (d: Documento): 'valido' | 'vencido' | 'a_renovar' => {
  const dias = diasAte(d.dataVencimento)
  if (dias === null) return 'valido'
  if (dias < 0) return 'vencido'
  if (dias <= 60) return 'a_renovar'
  return 'valido'
}

/** Quantos meses cada parcela cobre, para comparar contratos de periodicidades diferentes. */
const mesesPorPeriodo: Record<Periodicidade, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12, unica: 0 }

export default function RelatóriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>(90)
  const { imoveis, loading: carregandoImoveis } = useImoveis()
  const { alertas, loading: carregandoAlertas } = useAlertas()
  const [contratos, setContratos] = useState<Contrato[] | null>(null)
  // Relatório mensal (Passo 16): PDF gerado no servidor e enviado por e-mail à sócia no dia 1; aqui dá para testar e baixar.
  const [ultimo, setUltimo] = useState<{ mes: string; enviado_em: string | null; destinatarios: number; sha256: string | null } | null>(null)
  const [msgMensal, setMsgMensal] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    repositorio.listarContratos().then(setContratos)
    if (supabaseConfigurado) supabase.from('relatorios_mensais').select('mes,enviado_em,destinatarios,sha256').order('mes', { ascending: false }).limit(1).maybeSingle().then(r => setUltimo(r.data ?? null))
  }, [])
  const testarMensal = async () => {
    setOcupado(true); setMsgMensal('Gerando o PDF e enviando para o seu e-mail…')
    const { data, error } = await supabase.functions.invoke('relatorio-mensal', { body: { teste: true } })
    setOcupado(false)
    if (error) return setMsgMensal(`Não foi possível enviar: ${error.message}`)
    if (data?.enviado) setMsgMensal(`Relatório de ${data.mes?.slice(0, 7)} enviado para o seu e-mail (SHA-256 ${String(data.sha256).slice(0, 12)}…). No dia 1 de cada mês ele vai sozinho à sócia.`)
    else setMsgMensal(`Não enviado: ${data?.motivo ?? data?.detalhe ?? data?.erro ?? 'erro desconhecido'}.`)
  }
  const baixarMensal = async () => {
    setOcupado(true); setMsgMensal('Gerando o PDF…')
    const { data, error } = await supabase.functions.invoke('relatorio-mensal', { body: { teste: true, baixar: true } })
    setOcupado(false)
    if (error || !data?.pdf_base64) return setMsgMensal(`Não foi possível gerar: ${error?.message ?? data?.erro ?? 'erro desconhecido'}`)
    const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = data.arquivo ?? 'relatorio-mensal.pdf'; a.click(); URL.revokeObjectURL(url)
    setMsgMensal(`PDF gerado (SHA-256 ${String(data.sha256).slice(0, 12)}…).`)
  }

  if (carregandoImoveis || carregandoAlertas || contratos === null) {
    return (
      <Layout title="Relatórios">
        <p className="text-grafite-claro">Preparando relatórios…</p>
      </Layout>
    )
  }

  // Tudo abaixo é derivado dos mesmos dados que alimentam as outras telas.
  const porStatus = { ativo: 0, a_renovar: 0, vencido: 0 }
  contratos.forEach(c => { porStatus[statusDoContrato(c)] += 1 })

  const documentos = [...imoveis.flatMap(i => i.documentos), ...contratos.flatMap(c => c.documentos)]
  const docs = {
    validos: documentos.filter(d => statusDoDocumento(d) === 'valido').length,
    aRenovar: documentos.filter(d => statusDoDocumento(d) === 'a_renovar').length,
    vencidos: documentos.filter(d => statusDoDocumento(d) === 'vencido').length,
  }

  // Receita equivalente mensal dos contratos vigentes.
  const receitaMensal = contratos
    .filter(c => statusDoContrato(c) !== 'vencido')
    .reduce((soma, c) => {
      const meses = mesesPorPeriodo[c.periodicidade]
      return soma + (meses ? c.valor / meses : 0)
    }, 0)
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
          <p className="text-xs text-grafite-claro mt-3" data-testid="datas-periodo">
            Este relatório cobre de {new Date().toLocaleDateString('pt-BR')} até {new Date(Date.now() + periodo * 86400000).toLocaleDateString('pt-BR')}, gerado em {new Date().toLocaleString('pt-BR')}.
          </p>
        </div>

        <section className="bg-white p-5 shadow-sm border-t-2 border-dourado" data-testid="relatorio-mensal" aria-labelledby="t-mensal">
          <h2 id="t-mensal" className="text-lg">Relatório mensal automático</h2>
          <p className="text-sm text-grafite mt-1">No dia 1 de cada mês, às 8h, a plataforma gera o relatório do mês anterior em PDF (contratos, imóveis, casos, horas, honorários, intimações, assinaturas, compliance e IA) e envia por e-mail à sócia. {ultimo ? `Último enviado: ${ultimo.mes.slice(5, 7)}/${ultimo.mes.slice(0, 4)}${ultimo.enviado_em ? ` em ${new Date(ultimo.enviado_em).toLocaleDateString('pt-BR')} a ${ultimo.destinatarios} pessoa(s)` : ''}.` : 'O primeiro vai no próximo dia 1.'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={testarMensal} disabled={ocupado} data-testid="testar-mensal" className="min-h-[44px] px-4 text-sm bg-navy text-white disabled:opacity-60">Enviar-me o relatório agora (teste)</button>
            <button type="button" onClick={baixarMensal} disabled={ocupado} data-testid="baixar-mensal" className="min-h-[44px] px-4 text-sm border border-navy text-navy disabled:opacity-60">Baixar o PDF deste mês</button>
          </div>
          {msgMensal && <p className="text-sm mt-2" role="status" data-testid="msg-mensal">{msgMensal}</p>}
        </section>

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
              <Vazio titulo="Nenhum compromisso neste horizonte" texto="Escolha um horizonte maior ou cadastre prazos nos contratos." />
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
