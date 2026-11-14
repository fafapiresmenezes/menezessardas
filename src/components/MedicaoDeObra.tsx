// Medição de obra com indicadores que o cliente muda (passo E14 do plano mestre THEYE v4).
//
// Pedido de M em 13/11/2026 às 21h23: a plataforma de engenharia tem de lembrar "medições e
// indicadores de medição de obra mutáveis, sob medida por cliente". Por isso aqui não há lista fixa
// de serviços: há uma lista que começa num modelo, se chama como o cliente quiser, e se corta,
// renomeia e repesa na própria tela.
//
// A conta mora em src/lib/engenharia/medicao.ts, com teste próprio; esta tela só mostra e deixa
// mexer. Onde a lista fica guardada está dito na própria tela, sem rodeio: neste navegador, porque a
// engenharia ainda está em demonstração.
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'
import {
  SUGESTOES, medirObra, desvioDeAvanco, boletimDeMedicao,
  type Indicador, type Lancamento,
} from '@/lib/engenharia/medicao'
import { AVISO_ENGENHARIA } from '@/lib/engenharia/calculo'

const CHAVE = 'theye-medicao-obra'
const TIPOS = Object.keys(SUGESTOES)

interface Obra {
  cliente: string
  nome: string
  tipo: string
  periodo: string
  previstoNoCronograma: number
  indicadores: Indicador[]
  lancamentos: Lancamento[]
}

const novoId = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`

function doModelo(tipo: string): Indicador[] {
  return (SUGESTOES[tipo] ?? []).map(s => ({ ...s, id: novoId() }))
}

function obraInicial(): Obra {
  return {
    cliente: '', nome: '', tipo: TIPOS[0], periodo: new Date().toISOString().slice(0, 7),
    previstoNoCronograma: 0, indicadores: doModelo(TIPOS[0]), lancamentos: [],
  }
}

/** Guarda e lê no navegador, sem explodir quando o navegador recusa (janela privada, cookies travados). */
function guardado(): Obra | null {
  try {
    const t = localStorage.getItem(CHAVE)
    return t ? (JSON.parse(t) as Obra) : null
  } catch { return null }
}

const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')) || 0)
const fmt = (v: number, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const dinheiro = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  URL.revokeObjectURL(url)
}

export default function MedicaoDeObra() {
  const [obra, setObra] = useState<Obra>(() => guardado() ?? obraInicial())

  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify(obra)) } catch { /* navegador recusou guardar; a tela segue funcionando */ }
  }, [obra])

  const acumulado = (id: string) =>
    obra.lancamentos.find(l => l.indicadorId === id && l.periodo === obra.periodo)?.quantidadeAcumulada ?? 0

  function lancar(id: string, valor: number) {
    setObra(o => {
      const outros = o.lancamentos.filter(l => !(l.indicadorId === id && l.periodo === o.periodo))
      return { ...o, lancamentos: [...outros, { indicadorId: id, periodo: o.periodo, quantidadeAcumulada: valor }] }
    })
  }

  function mudar(id: string, campo: keyof Indicador, valor: string) {
    setObra(o => ({
      ...o,
      indicadores: o.indicadores.map(i => {
        if (i.id !== id) return i
        if (campo === 'quantidadePrevista') return { ...i, quantidadePrevista: num(valor) }
        if (campo === 'precoUnitario') return { ...i, precoUnitario: valor === '' ? undefined : num(valor) }
        if (campo === 'pesoPorcento') return { ...i, pesoPorcento: valor === '' ? undefined : num(valor) }
        return { ...i, [campo]: valor }
      }),
    }))
  }

  const r = useMemo(() => medirObra(obra.indicadores, obra.lancamentos, obra.periodo), [obra])
  const desvio = useMemo(
    () => desvioDeAvanco(r.valores.avancoFisicoPorcento, obra.previstoNoCronograma),
    [r.valores.avancoFisicoPorcento, obra.previstoNoCronograma],
  )

  const boletim = () => boletimDeMedicao(
    obra.nome || 'Obra sem nome',
    obra.cliente || 'Cliente não informado',
    r.valores,
    [...r.passos, ...(obra.previstoNoCronograma > 0 ? desvio.passos : [])],
    [...r.avisos, ...desvio.avisos],
  )

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 shadow-sm">
        <h3 className="text-navy font-medium mb-1">A obra e o período</h3>
        <p className="text-xs text-grafite-claro mb-4 max-w-3xl">
          A lista de serviços abaixo é sua: começa num modelo, e você renomeia, corta, acrescenta e repesa
          o que quiser. Nesta versão de demonstração ela fica guardada neste navegador, neste computador;
          na versão do escritório fica no servidor, por cliente, com quem mediu e quando.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <label className="block" title="Nome de quem contratou a obra. Aparece no cabeçalho do boletim de medição">
            <span className="block text-xs uppercase text-grafite-claro mb-1">Cliente</span>
            <input className="w-full border border-navy/20 px-2 py-1" value={obra.cliente} placeholder="Prefeitura de ..."
              onChange={e => setObra(o => ({ ...o, cliente: e.target.value }))} data-testid="medicao-cliente" />
          </label>
          <label className="block" title="Nome da obra, como está no contrato">
            <span className="block text-xs uppercase text-grafite-claro mb-1">Obra</span>
            <input className="w-full border border-navy/20 px-2 py-1" value={obra.nome} placeholder="Rede de esgoto do bairro ..."
              onChange={e => setObra(o => ({ ...o, nome: e.target.value }))} data-testid="medicao-obra" />
          </label>
          <label className="block" title="Trocar o tipo de obra carrega outro modelo de serviços e apaga a lista atual">
            <span className="block text-xs uppercase text-grafite-claro mb-1">Tipo de obra</span>
            <select className="w-full border border-navy/20 px-2 py-1" value={obra.tipo} data-testid="medicao-tipo"
              onChange={e => setObra(o => ({ ...o, tipo: e.target.value, indicadores: doModelo(e.target.value), lancamentos: [] }))}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block" title="Mês da medição. Trocar o mês mostra os acumulados daquele mês; o que se paga é a diferença contra o mês anterior">
            <span className="block text-xs uppercase text-grafite-claro mb-1">Período</span>
            <input type="month" className="w-full border border-navy/20 px-2 py-1" value={obra.periodo}
              onChange={e => setObra(o => ({ ...o, periodo: e.target.value }))} data-testid="medicao-periodo" />
          </label>
        </div>
      </section>

      <section className="bg-white p-5 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-navy font-medium">Serviços medidos</h3>
          <button type="button" data-testid="medicao-novo-servico" title="Acrescenta uma linha em branco para um serviço que o modelo não previu"
            className="inline-flex items-center gap-1 border border-navy text-navy px-3 py-1.5 text-sm"
            onClick={() => setObra(o => ({ ...o, indicadores: [...o.indicadores, { id: novoId(), nome: '', unidade: 'm', quantidadePrevista: 0, comoMedir: '' }] }))}>
            <Plus className="w-4 h-4" aria-hidden />Acrescentar serviço
          </button>
        </div>
        <table className="w-full text-sm min-w-[980px]">
          <thead>
            <tr className="text-left text-xs uppercase text-grafite-claro">
              <th className="py-2 pr-2">Serviço</th>
              <th className="pr-2" title="Unidade de medida: m, m², m³, kg, un, ou vb para verba">Unidade</th>
              <th className="pr-2" title="Quantidade que o contrato prevê para este serviço">Previsto</th>
              <th className="pr-2" title="Preço unitário do contrato. Sem ele, a medição sai só em porcentagem">Preço</th>
              <th className="pr-2" title="Quanto este serviço vale no avanço da obra. Em branco, o peso sai do valor do serviço, como na planilha orçamentária">Peso</th>
              <th className="pr-2" title="Quantidade acumulada medida até este período, não a do período">Acumulado</th>
              <th className="pr-2" title="Quanto deste serviço já está pronto">Pronto</th>
              <th className="pr-2" title="Quanto se paga por este serviço neste período">A pagar</th>
              <th />
            </tr>
          </thead>
          <tbody data-testid="medicao-linhas">
            {obra.indicadores.map(i => {
              const a = r.valores.porIndicador.find(x => x.indicador.id === i.id)
              return (
                <tr key={i.id} className="border-t border-navy/10 align-top">
                  <td className="py-2 pr-2">
                    <input className="w-full border border-navy/20 px-2 py-1" value={i.nome} placeholder="Nome do serviço"
                      title="Nome do serviço como aparece no boletim de medição" onChange={e => mudar(i.id, 'nome', e.target.value)} />
                    <input className="w-full border border-navy/10 px-2 py-1 mt-1 text-xs" value={i.comoMedir} placeholder="Como se mede este serviço"
                      title="O combinado de como se mede: o que conta, o que não conta, que ensaio ou teste comprova" onChange={e => mudar(i.id, 'comoMedir', e.target.value)} />
                  </td>
                  <td className="pr-2"><input className="w-16 border border-navy/20 px-2 py-1" value={i.unidade} title="Unidade de medida deste serviço" onChange={e => mudar(i.id, 'unidade', e.target.value)} /></td>
                  <td className="pr-2"><input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={i.quantidadePrevista}
                    title="Quantidade prevista no contrato" onChange={e => mudar(i.id, 'quantidadePrevista', e.target.value)} /></td>
                  <td className="pr-2"><input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={i.precoUnitario ?? ''} placeholder="—"
                    title="Preço unitário contratado, em reais. Deixe em branco se o contrato não tem preço para este serviço" onChange={e => mudar(i.id, 'precoUnitario', e.target.value)} /></td>
                  <td className="pr-2"><input type="number" step="any" className="w-20 border border-navy/20 px-2 py-1 text-right" value={i.pesoPorcento ?? ''} placeholder="auto"
                    title="Peso deste serviço no avanço, em porcentagem. Em branco, a plataforma calcula pelo valor do serviço" onChange={e => mudar(i.id, 'pesoPorcento', e.target.value)} /></td>
                  <td className="pr-2"><input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={acumulado(i.id)}
                    title="Quantidade acumulada medida até este período" onChange={e => lancar(i.id, num(e.target.value))} data-testid={`medicao-acumulado-${i.id}`} /></td>
                  <td className="pr-2 whitespace-nowrap">{a?.avancoPorcento === null || a === undefined ? <span className="text-grafite-claro" title="Sem quantidade prevista, não dá para dizer quanto está pronto">—</span> : `${fmt(a.avancoPorcento)}%`}
                    <div className="text-xs text-grafite-claro">peso {fmt(a?.pesoPorcento ?? 0)}%</div></td>
                  <td className="pr-2 whitespace-nowrap">{a?.valorDoPeriodo === null || a === undefined ? <span className="text-grafite-claro" title="Sem preço no contrato, este serviço só entra na porcentagem">—</span> : dinheiro(a.valorDoPeriodo)}</td>
                  <td>
                    <button type="button" title="Tira este serviço da lista desta obra" aria-label={`Tirar ${i.nome || 'serviço sem nome'} da lista`}
                      className="text-grafite-claro hover:text-red-700 p-1"
                      onClick={() => setObra(o => ({ ...o, indicadores: o.indicadores.filter(x => x.id !== i.id), lancamentos: o.lancamentos.filter(l => l.indicadorId !== i.id) }))}>
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {obra.indicadores.length === 0 && (
          <p className="text-sm text-grafite-claro py-4">Nenhum serviço na lista. Acrescente um serviço ou escolha outro tipo de obra para carregar um modelo.</p>
        )}
      </section>

      <section className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white p-5 shadow-sm">
          <div className="grid sm:grid-cols-4 gap-3 mb-4" data-testid="medicao-resumo">
            {[
              ['Obra pronta', `${fmt(r.valores.avancoFisicoPorcento)}%`],
              ['A pagar no período', r.valores.valorDoPeriodo === null ? '—' : dinheiro(r.valores.valorDoPeriodo)],
              ['Medido até aqui', r.valores.valorAcumulado === null ? '—' : dinheiro(r.valores.valorAcumulado)],
              ['Valor do contrato', r.valores.valorDoContrato === null ? '—' : dinheiro(r.valores.valorDoContrato)],
            ].map(([k, v]) => (
              <div key={k} className="border border-navy/10 p-3"><div className="text-xs text-grafite-claro">{k}</div><div className="text-lg text-navy">{v}</div></div>
            ))}
          </div>
          {(r.avisos.length > 0 || desvio.avisos.length > 0) && (
            <ul className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm space-y-1" role="alert" data-testid="medicao-avisos">
              {[...r.avisos, ...(obra.previstoNoCronograma > 0 ? desvio.avisos : [])].map(a => <li key={a}>{a}</li>)}
            </ul>
          )}
          <ol className="space-y-3 text-sm" data-testid="medicao-passos">
            {[...r.passos, ...(obra.previstoNoCronograma > 0 ? desvio.passos : [])].map((p, k) => (
              <li key={k} className="border-b border-navy/10 pb-2">
                <div className="font-medium text-navy">{k + 1}. {p.titulo}</div>
                <div className="font-mono text-xs">{p.formula}</div>
                <div className="font-mono text-xs break-all">{p.conta} = <strong>{p.resultado.toLocaleString('pt-BR')} {p.unidade}</strong></div>
                {p.referencia && <div className="text-xs text-grafite-claro">{p.referencia}</div>}
              </li>
            ))}
          </ol>
        </div>
        <aside className="bg-white p-5 shadow-sm space-y-4 text-sm h-fit">
          <div>
            <label className="block" title="Quanto o cronograma do contrato prometia ter pronto neste período. Deixe zero se não quiser comparar">
              <span className="block text-xs uppercase text-grafite-claro mb-1">Previsto no cronograma (%)</span>
              <input type="number" step="any" className="w-full border border-navy/20 px-2 py-1 text-right" value={obra.previstoNoCronograma}
                onChange={e => setObra(o => ({ ...o, previstoNoCronograma: num(e.target.value) }))} data-testid="medicao-cronograma" />
            </label>
            {obra.previstoNoCronograma > 0 && (
              <p className="mt-2" data-testid="medicao-desvio">
                A obra está <strong>{desvio.valores.situacao}</strong>, {fmt(Math.abs(desvio.valores.desvioPorcento))} ponto(s) de diferença.
              </p>
            )}
          </div>
          <button type="button" data-testid="medicao-boletim" title="Baixa o boletim de medição em texto, com os serviços, a conta inteira e o campo de assinatura do responsável técnico"
            className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white px-4 py-2"
            onClick={() => baixar(`boletim-de-medicao-${obra.periodo}.txt`, boletim())}>
            <Download className="w-4 h-4" aria-hidden />Baixar boletim de medição
          </button>
          <button type="button" data-testid="medicao-recomecar" title="Apaga esta obra deste navegador e volta ao modelo do tipo de obra escolhido"
            className="w-full border border-navy/30 text-navy px-4 py-2"
            onClick={() => setObra(obraInicial())}>Começar outra obra</button>
          <p className="text-xs text-grafite-claro">{AVISO_ENGENHARIA}</p>
        </aside>
      </section>
    </div>
  )
}
