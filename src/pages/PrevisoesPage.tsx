import { useEffect, useMemo, useState } from 'react'
import CalibracaoPrevisoes from '@/components/CalibracaoPrevisoes'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useImoveis } from '@/hooks/useImoveis'
import { repositorio, type Contrato } from '@/lib/repositorio'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { preverCarteira, preverReceita, intervaloWilson, registrarPrevisoes, type Faixa, type PrevisaoContrato } from '@/lib/predicao'
import { TrendingUp, ShieldAlert, Repeat, Scale, ChevronDown, ChevronUp, Info } from 'lucide-react'

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const COR: Record<Faixa, string> = { baixo: 'bg-regular', moderado: 'bg-atencao', alto: 'bg-critico' }
const ROTULO: Record<Faixa, string> = { baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto' }

const ACOES = [
  { valor: 'despejo', rotulo: 'Despejo por falta de pagamento' },
  { valor: 'despejo_cumulado', rotulo: 'Despejo cumulado com cobrança' },
  { valor: 'renovatoria', rotulo: 'Ação renovatória' },
  { valor: 'revisional', rotulo: 'Revisional de aluguel' },
  { valor: 'consignacao', rotulo: 'Consignação em pagamento' },
  { valor: 'execucao', rotulo: 'Execução de título extrajudicial' },
  { valor: 'usucapiao', rotulo: 'Usucapião' },
]
const TRIBUNAIS = ['tjrj', 'tjsp', 'tjmg', 'tjes', 'stj', 'trf2']

interface Jurimetria {
  tribunal: string; acao: string; orgao: string | null; processos: number
  resultados: { procedencia: number; parcial: number; improcedencia: number; semMerito: number; acordo: number }
  chanceExito: number | null; taxaAcordo: number | null; taxaSemMerito: number | null
  amostra: number; confianca: 'alta' | 'media' | 'baixa'; fonte: string; consultadoEm: string
}

function GraficoReceita({ pontos }: { pontos: { mes: string; contratada: number; esperada: number }[] }) {
  const max = Math.max(1, ...pontos.map(p => Math.max(p.contratada, p.esperada)))
  return (
    <figure>
      <div className="flex items-end gap-1 h-40" role="img" aria-label="Receita prevista para os próximos 12 meses">
        {pontos.map(p => (
          <div key={p.mes} className="flex-1 flex flex-col items-center justify-end h-full" title={`${p.mes}: contratada ${moeda(p.contratada)}, esperada ${moeda(p.esperada)}`}>
            <div className="w-full flex items-end gap-px h-full">
              <span className="flex-1 bg-navy/70" style={{ height: `${(p.contratada / max) * 100}%` }} />
              <span className="flex-1 bg-dourado" style={{ height: `${(p.esperada / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-grafite-claro mt-1">{p.mes}</span>
          </div>
        ))}
      </div>
      <figcaption className="text-xs text-grafite-claro mt-2 flex gap-4">
        <span><span className="inline-block w-3 h-3 bg-navy/70 align-middle mr-1" />Contratada (só contratos vigentes)</span>
        <span><span className="inline-block w-3 h-3 bg-dourado align-middle mr-1" />Esperada (reajuste + chance de renovação)</span>
      </figcaption>
    </figure>
  )
}

function LinhaContrato({ p, aoRegistrar }: { p: PrevisaoContrato; aoRegistrar?: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [msg, setMsg] = useState('')
  // Passo 08: desfecho real para calibrar a previsão (grava em registro_previsoes.desfecho).
  async function desfecho(d: { inadimplente?: boolean; renovou?: boolean }) {
    if (!supabaseConfigurado) { setMsg('Disponível só com o banco conectado.'); return }
    const { data, error } = await supabase.rpc('registrar_desfecho', { p_referencia: p.contrato.id, p_desfecho: d })
    if (error) setMsg('Não deu para registrar: ' + error.message)
    else if (!data) setMsg('Ainda não há previsão gravada para este contrato; volte amanhã, a fotografia é diária.')
    else { setMsg(`Desfecho registrado (${data} previsão${data > 1 ? 'ões' : ''}). A calibração já considera.`); aoRegistrar?.() }
  }
  return (
    <li className="border-b border-navy/10 py-3">
      <button onClick={() => setAberto(!aberto)} className="w-full text-left grid gap-2 sm:grid-cols-[1fr_180px_140px_24px] items-center" aria-expanded={aberto}>
        <span>
          <span className="block text-sm text-navy font-medium">{p.contrato.parte}</span>
          <span className="block text-xs text-grafite-claro truncate">{p.imovel?.endereco ?? 'Imóvel'}</span>
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="flex-1 h-2 bg-navy/10"><span className={`block h-2 ${COR[p.faixaRisco]}`} style={{ width: `${p.risco}%` }} /></span>
          <span className="w-20">Risco {ROTULO[p.faixaRisco].toLowerCase()} ({p.risco})</span>
        </span>
        <span className="text-xs text-grafite">Renovação ~{p.renovacao}%</span>
        {aberto ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      {aberto && (
        <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Por que esse risco</p>
            <ul className="space-y-1">{p.fatoresRisco.map(f => <li key={f.fator} className="flex justify-between gap-2"><span>{f.fator}</span><span className="text-grafite-claro">+{f.pontos}</span></li>)}</ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Por que essa chance de renovação</p>
            <ul className="space-y-1">{p.fatoresRenovacao.map(f => <li key={f.fator} className="flex justify-between gap-2"><span>{f.fator}</span><span className="text-grafite-claro">{f.pontos > 0 ? '+' : ''}{f.pontos}</span></li>)}</ul>
          </div>
          <p className="md:col-span-2 bg-pergaminho border-l-2 border-dourado px-3 py-2"><b>Ação sugerida:</b> {p.acao} <Link className="underline decoration-dourado ml-1" to={`/contrato/${p.contrato.id}`}>Abrir contrato</Link></p>
          <div className="md:col-span-2 border-t border-navy/10 pt-3" data-testid={`desfecho-${p.contrato.id}`}>
            <p className="text-xs uppercase tracking-wider text-grafite-claro mb-2">O que aconteceu de fato? (calibra a previsão)</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => desfecho({ inadimplente: false })} className="min-h-[40px] px-3 border border-navy text-navy text-xs">Pagou em dia</button>
              <button type="button" onClick={() => desfecho({ inadimplente: true })} className="min-h-[40px] px-3 border border-critico text-critico text-xs">Ficou inadimplente</button>
              <button type="button" onClick={() => desfecho({ renovou: true })} className="min-h-[40px] px-3 border border-navy text-navy text-xs">Renovou</button>
              <button type="button" onClick={() => desfecho({ renovou: false })} className="min-h-[40px] px-3 border border-atencao text-atencao text-xs">Não renovou</button>
            </div>
            {msg && <p role="status" className="text-xs mt-2 text-grafite" data-testid="msg-desfecho">{msg}</p>}
          </div>
        </div>
      )}
    </li>
  )
}

function PainelJurimetria() {
  const [acao, setAcao] = useState('despejo')
  const [tribunal, setTribunal] = useState('tjrj')
  const [orgao, setOrgao] = useState('')
  const [res, setRes] = useState<Jurimetria | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const consultar = async () => {
    setOcupado(true); setErro('')
    try {
      if (!supabaseConfigurado) {
        setRes({ tribunal: 'TJRJ', acao: 'Despejo por Falta de Pagamento', orgao: null, processos: 4200, resultados: { procedencia: 610, parcial: 140, improcedencia: 90, semMerito: 380, acordo: 260 }, chanceExito: 81, taxaAcordo: 18, taxaSemMerito: 26, amostra: 840, confianca: 'alta', fonte: 'Exemplo da demonstração', consultadoEm: new Date().toISOString() })
        return
      }
      const { data, error } = await supabase.functions.invoke('jurimetria', { body: { acao, tribunal, orgao } })
      if (error) throw new Error(error.message)
      if (data?.erro) throw new Error(data.erro)
      setRes(data)
      registrarPrevisoes([{ tipo: 'jurimetria', referencia: `${data.tribunal}|${data.acao}|${data.orgao ?? ''}`, previsto: { chanceExito: data.chanceExito, resultados: data.resultados, taxaAcordo: data.taxaAcordo }, amostra: data.amostra, fonte: data.fonte }])
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha na consulta ao CNJ.') } finally { setOcupado(false) }
  }
  const ic = res ? intervaloWilson(res.resultados.procedencia + res.resultados.parcial / 2, res.amostra) : null
  const campo = 'w-full min-h-[44px] border border-navy/15 px-3 text-sm bg-white focus:outline-none focus:border-dourado'
  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="t-juri">
      <h2 id="t-juri" className="text-lg flex items-center gap-2 mb-1"><Scale size={18} aria-hidden="true" /> Chance de êxito por tipo de ação</h2>
      <p className="text-sm text-grafite-claro mb-4">Estatística pública do DataJud (CNJ): sentenças registradas de procedência, procedência parcial e improcedência. Mostra a margem de erro (95%) e avisa quando a amostra é pequena.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs uppercase tracking-wider text-grafite-claro">Ação
          <select value={acao} onChange={e => setAcao(e.target.value)} className={campo}>{ACOES.map(a => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}</select>
        </label>
        <label className="text-xs uppercase tracking-wider text-grafite-claro">Tribunal
          <select value={tribunal} onChange={e => setTribunal(e.target.value)} className={campo}>{TRIBUNAIS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
        </label>
        <label className="text-xs uppercase tracking-wider text-grafite-claro">Vara (opcional)
          <input value={orgao} onChange={e => setOrgao(e.target.value)} className={campo} placeholder="Ex.: 10ª Vara Cível" />
        </label>
      </div>
      <button onClick={consultar} disabled={ocupado} className="mt-3 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm disabled:opacity-50">{ocupado ? 'Consultando o CNJ…' : 'Calcular'}</button>
      {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}
      {res && (
        <div className="mt-5 border-t border-navy/10 pt-4 space-y-3">
          {res.chanceExito === null ? (
            <p className="text-sm text-atencao">O CNJ não tem sentenças com resultado registrado para esse filtro. Sem amostra, não estimamos.</p>
          ) : (
            <>
              <p className="font-serif text-3xl text-navy">{res.chanceExito}% <span className="text-base text-grafite">de êxito do autor</span></p>
              {ic && <p className="text-sm text-grafite">Margem (95%): entre {ic.min}% e {ic.max}% · amostra de {res.amostra.toLocaleString('pt-BR')} sentenças · confiança {res.confianca === 'alta' ? 'alta' : res.confianca === 'media' ? 'média' : 'baixa'}</p>}
              {ic && (
                <div className="relative h-3 bg-navy/10" aria-hidden="true">
                  <span className="absolute h-3 bg-dourado/50" style={{ left: `${ic.min}%`, width: `${ic.max - ic.min}%` }} />
                  <span className="absolute h-3 w-1 bg-navy" style={{ left: `${res.chanceExito}%` }} />
                </div>
              )}
              {res.confianca === 'baixa' && <p className="text-sm text-atencao flex gap-1"><Info size={16} aria-hidden="true" /> Amostra pequena: use como indício, não como previsão.</p>}
              <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[['Procedência', res.resultados.procedencia], ['Parcial', res.resultados.parcial], ['Improcedência', res.resultados.improcedencia], ['Acordo', res.resultados.acordo], ['Sem mérito', res.resultados.semMerito]].map(([n, v]) => (
                  <li key={n as string} className="bg-pergaminho p-2"><span className="block text-grafite-claro">{n}</span><span className="text-navy text-base">{(v as number).toLocaleString('pt-BR')}</span></li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-grafite-claro">Fonte: {res.fonte} · {res.tribunal} · {res.acao}{res.orgao ? ` · ${res.orgao}` : ''} · {res.processos.toLocaleString('pt-BR')} processos. O DataJud registra o movimento da sentença, não o mérito de cada caso: o número mede tendência, não o seu processo.</p>
        </div>
      )}
    </section>
  )
}

export default function PrevisoesPage() {
  const { imoveis } = useImoveis()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [indices, setIndices] = useState<Record<string, number>>({})
  useEffect(() => { repositorio.listarContratos().then(setContratos).catch(() => setContratos([])) }, [])
  useEffect(() => {
    if (!supabaseConfigurado) { setIndices({ igpm: 3.35, ipca: 4.5, inpc: 4.3 }); return }
    Promise.all(['igpm', 'ipca', 'inpc'].map(i => supabase.functions.invoke('indice-reajuste', { body: { indice: i } }).then(r => [i, r.data?.acumulado12m] as const).catch(() => [i, undefined] as const)))
      .then(l => setIndices(Object.fromEntries(l.filter(([, v]) => typeof v === 'number')) as Record<string, number>))
  }, [])
  const previsoes = useMemo(() => preverCarteira(imoveis, contratos), [imoveis, contratos])
  const receita = useMemo(() => preverReceita(previsoes, indices), [previsoes, indices])
  // Uma fotografia por dia das previsões de cada contrato, para calibrar com o desfecho real.
  useEffect(() => {
    if (!previsoes.length || !Object.keys(indices).length) return
    const chave = `lsm-previsoes-${new Date().toISOString().slice(0, 10)}`
    try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1') } catch { /* sem armazenamento */ }
    registrarPrevisoes([
      ...previsoes.map(p => ({ tipo: 'risco_contrato', referencia: p.contrato.id, previsto: { risco: p.risco, faixa: p.faixaRisco, renovacao: p.renovacao, fatores: p.fatoresRisco.map(f => f.fator) }, fonte: 'regras declaradas v1' })),
      { tipo: 'receita', previsto: receita, fonte: 'BCB SGS + carteira' },
    ])
  }, [previsoes, indices, receita])
  const totalContratada = receita.reduce((s, p) => s + p.contratada, 0)
  const totalEsperada = receita.reduce((s, p) => s + p.esperada, 0)
  const altos = previsoes.filter(p => p.faixaRisco === 'alto').length
  const renovMedia = previsoes.length ? Math.round(previsoes.reduce((s, p) => s + p.renovacao, 0) / previsoes.length) : 0
  const [versaoCalib, setVersaoCalib] = useState(0)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <header>
          <h1 className="text-3xl text-navy">Previsões</h1>
          <p className="text-sm text-grafite-claro mt-1">Risco, renovação e receita da carteira, e chance de êxito na Justiça. Cada número mostra de onde vem; nada é estimado sem dado.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            [TrendingUp, 'Receita contratada (12 meses)', moeda(totalContratada)],
            [TrendingUp, 'Receita esperada (12 meses)', moeda(totalEsperada)],
            [ShieldAlert, 'Contratos com risco alto', String(altos)],
            [Repeat, 'Chance média de renovação', `${renovMedia}%`],
          ].map(([Icone, rotulo, valor]) => {
            const I = Icone as typeof TrendingUp
            return (
              <div key={rotulo as string} className="bg-white p-4 shadow-sm">
                <I size={18} className="text-dourado" aria-hidden="true" />
                <p className="text-xs uppercase tracking-wider text-grafite-claro mt-2">{rotulo as string}</p>
                <p className="font-serif text-2xl text-navy">{valor as string}</p>
              </div>
            )
          })}
        </div>
        <section className="bg-white p-6 shadow-sm" aria-labelledby="t-receita">
          <h2 id="t-receita" className="text-lg mb-1">Receita dos próximos 12 meses</h2>
          <p className="text-sm text-grafite-claro mb-4">Reajuste aplicado no aniversário pelo índice oficial dos últimos 12 meses (Banco Central{Object.keys(indices).length ? `: ${Object.entries(indices).map(([k, v]) => `${k.toUpperCase()} ${v.toLocaleString('pt-BR')}%`).join(', ')}` : ''}). Depois do vencimento, conta só a fração da chance de renovação.</p>
          <GraficoReceita pontos={receita} />
        </section>
        <section className="bg-white p-6 shadow-sm" aria-labelledby="t-risco">
          <h2 id="t-risco" className="text-lg mb-1">Risco de inadimplência e chance de renovação, por contrato</h2>
          <p className="text-sm text-grafite-claro mb-2">Pontuação por regras declaradas (garantia, reajuste, vencimento, documentos, preço por m² frente à carteira). Clique para ver os fatores. Enquanto o escritório não registra pagamentos, é um índice de exposição, não uma probabilidade calibrada.</p>
          {previsoes.length ? <ul>{previsoes.map(p => <LinhaContrato key={p.contrato.id} p={p} aoRegistrar={() => setVersaoCalib(v => v + 1)} />)}</ul> : <p className="text-sm text-grafite-claro">Nenhum contrato vigente.</p>}
        </section>
        <CalibracaoPrevisoes versao={versaoCalib} />
        <PainelJurimetria />
      </div>
    </Layout>
  )
}
