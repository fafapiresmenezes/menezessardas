import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { FileText, Search, Plus, Trash2 } from 'lucide-react'

// Biblioteca de modelos: cada modelo abre o agente da área no modo Redigir com o pedido pronto.
// O advogado completa os dados do caso entre colchetes e o agente redige citando a lei do Planalto.
type Modelo = { titulo: string; area: string; agente: string; pedido: string; id?: string; proprio?: boolean }
const MODELOS: Modelo[] = [
  { titulo: 'Contrato de locação comercial', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija contrato de locação não residencial (Lei 8.245/91) com cláusulas de reajuste anual pelo IGP-M, garantia, benfeitorias, renovatória e multa. Locador: [ ]. Locatário: [ ]. Imóvel: [ ]. Aluguel: R$ [ ]. Prazo: [ ] meses.' },
  { titulo: 'Contrato de locação residencial', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija contrato de locação residencial (Lei 8.245/91) com vistoria, garantia, reajuste e devolução do imóvel. Locador: [ ]. Locatário: [ ]. Imóvel: [ ]. Aluguel: R$ [ ]. Prazo: 30 meses.' },
  { titulo: 'Contrato de comodato de imóvel', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija contrato de comodato de imóvel (CC arts. 579 a 585) com prazo, despesas, conservação e restituição. Comodante: [ ]. Comodatário: [ ]. Imóvel: [ ].' },
  { titulo: 'Notificação extrajudicial de aluguel atrasado', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija notificação extrajudicial ao locatário [ ] cobrando aluguéis vencidos de [ ] a [ ], total R$ [ ], com prazo de 10 dias e menção ao despejo (Lei 8.245/91, art. 9º, III, e art. 62).' },
  { titulo: 'Ação de despejo por falta de pagamento', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija petição inicial de despejo por falta de pagamento cumulada com cobrança (Lei 8.245/91, arts. 59 e 62), com pedido liminar se cabível. Autor: [ ]. Réu: [ ]. Imóvel: [ ]. Débito: R$ [ ].' },
  { titulo: 'Ação renovatória', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija petição inicial de ação renovatória de locação comercial (Lei 8.245/91, arts. 51 e 71). Locatário: [ ]. Locador: [ ]. Contrato vigente até [ ]. Proposta de novo aluguel: R$ [ ].' },
  { titulo: 'Aditivo de reajuste de aluguel', area: 'Imobiliário', agente: 'imobiliario', pedido: 'Redija termo aditivo de contrato de locação aplicando reajuste de [ ]% pelo [índice], novo aluguel R$ [ ] a partir de [data].' },
  { titulo: 'Contrato de prestação de serviços com SLA', area: 'Cível', agente: 'civel', pedido: 'Redija contrato de prestação de serviços de [serviço] no imóvel [ ], com níveis de serviço (SLA), indicadores, penalidades, cláusula anticorrupção e LGPD. Contratante: [ ]. Contratada: [ ].' },
  { titulo: 'Acordo de confidencialidade (NDA)', area: 'Empresarial', agente: 'empresarial', pedido: 'Redija acordo de confidencialidade bilateral entre [ ] e [ ], com prazo de [ ] anos, exceções, devolução de informações e multa.' },
  { titulo: 'Reclamação trabalhista: contestação', area: 'Trabalhista', agente: 'trabalhista', pedido: 'Redija contestação trabalhista para a reclamada [ ] na reclamação de [ ], que pede [pedidos]. Fatos da defesa: [ ].' },
  { titulo: 'Divórcio consensual com partilha', area: 'Família', agente: 'familia', pedido: 'Redija petição de divórcio consensual com partilha de bens, guarda e alimentos. Cônjuges: [ ] e [ ]. Filhos: [ ]. Bens: [ ].' },
  { titulo: 'Defesa em execução fiscal (exceção de pré-executividade)', area: 'Tributário', agente: 'tributario', pedido: 'Redija exceção de pré-executividade em execução fiscal de [tributo] contra [ ], alegando [prescrição/ilegitimidade/outro]. CDA: [ ].' },
  { titulo: 'Reclamação de consumidor contra construtora', area: 'Consumidor', agente: 'consumidor', pedido: 'Redija petição inicial do consumidor [ ] contra a construtora [ ] por atraso na entrega do imóvel e vícios construtivos, com pedidos de indenização (CDC).' },
  { titulo: 'Política de privacidade (LGPD) do escritório', area: 'Compliance', agente: 'lgpd', pedido: 'Redija política de privacidade para escritório de advocacia que trata dados de clientes, locatários e fiadores, conforme a LGPD, com bases legais, direitos do titular e contato do encarregado.' },
  { titulo: 'Código de conduta para cliente (programa de integridade)', area: 'Compliance', agente: 'compliance', pedido: 'Redija código de ética e conduta para a empresa [ ], conforme o Decreto 11.129/2022, art. 57, com canal de denúncia e medidas disciplinares.' },
  { titulo: 'Requerimento de aposentadoria: recurso ao INSS', area: 'Previdenciário', agente: 'previdenciario', pedido: 'Redija recurso administrativo ao INSS contra indeferimento de [benefício] de [ ], com tempo de contribuição de [ ] anos e motivo do indeferimento [ ].' },
]

export default function ModelosPage() {
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('Todas')
  // Modelos próprios do escritório (Passo 05): cadastrados pela equipe, visíveis para todo o escritório.
  const [proprios, setProprios] = useState<Modelo[]>([])
  const [form, setForm] = useState({ titulo: '', area: 'Escritório', agente: 'civel', pedido: '' })
  const [aberto, setAberto] = useState(false)
  const [msg, setMsg] = useState('')
  const carregar = async () => {
    const { data } = await supabase.from('modelos_escritorio').select('id, titulo, area, agente, pedido').order('criado_em')
    setProprios((data ?? []).map(d => ({ ...d, proprio: true })) as Modelo[])
  }
  useEffect(() => { carregar() }, [])
  const salvar = async () => {
    setMsg('')
    const { error } = await supabase.from('modelos_escritorio').insert({ titulo: form.titulo.trim(), area: form.area.trim() || 'Escritório', agente: form.agente, pedido: form.pedido.trim() })
    if (error) return setMsg(error.message)
    setMsg('Modelo cadastrado e visível para todo o escritório.')
    setForm({ titulo: '', area: 'Escritório', agente: 'civel', pedido: '' })
    setAberto(false)
    carregar()
  }
  const apagar = async (id: string) => { await supabase.from('modelos_escritorio').delete().eq('id', id); carregar() }
  const todos = [...proprios, ...MODELOS]
  const areas = ['Todas', ...new Set(todos.map(m => m.area))]
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const lista = todos.filter(m => (area === 'Todas' || m.area === area) && n(m.titulo + ' ' + m.pedido).includes(n(busca)))
  const AGENTES = ['imobiliario', 'civel', 'trabalhista', 'familia', 'tributario', 'empresarial', 'consumidor', 'previdenciario', 'penal', 'compliance', 'lgpd']
  const abrir = (m: Modelo) => { window.location.href = `${window.location.pathname}?agente=${m.agente}&modo=redigir&pedido=${encodeURIComponent(m.pedido)}#/assistente` }
  return (
    <Layout title="Modelos de peças e contratos">
      <div className="space-y-5">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <p className="text-sm mb-3">Escolha o modelo: o agente da área abre pronto para redigir. Troque os <strong>[ ]</strong> pelos dados do caso e clique em enviar. O texto sai com a lei citada e uma lista do que conferir.</p>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-grafite-claro" aria-hidden />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar modelo (ex.: despejo, comodato, NDA)" className="flex-1 border px-3 py-2" aria-label="Procurar modelo" data-testid="busca-modelo" />
          </div>
          <button type="button" onClick={() => setAberto(v => !v)} data-testid="novo-modelo" aria-expanded={aberto} className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 border border-navy text-navy text-sm uppercase tracking-wider"><Plus size={16} aria-hidden /> Cadastrar modelo do escritório</button>
          {aberto && (
            <form onSubmit={e => { e.preventDefault(); salvar() }} className="mt-3 grid gap-3 md:grid-cols-2 border-t border-navy/10 pt-3" data-testid="form-modelo">
              <label className="text-sm">Título<input required minLength={3} maxLength={120} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} id="modelo-titulo" className="mt-1 w-full border px-3 py-2" placeholder="Ex.: Contrato padrão de honorários do escritório" /></label>
              <label className="text-sm">Área<input maxLength={40} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} id="modelo-area" className="mt-1 w-full border px-3 py-2" placeholder="Ex.: Escritório, Imobiliário" /></label>
              <label className="text-sm">Agente que vai redigir<select value={form.agente} onChange={e => setForm({ ...form, agente: e.target.value })} id="modelo-agente" className="mt-1 w-full border px-3 py-2">{AGENTES.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
              <label className="text-sm md:col-span-2">Texto do modelo ou instruções (use [ ] para os campos a preencher)<textarea required minLength={20} rows={6} value={form.pedido} onChange={e => setForm({ ...form, pedido: e.target.value })} id="modelo-pedido" className="mt-1 w-full border px-3 py-2" placeholder="Cole aqui o modelo do escritório. Ex.: Redija contrato de honorários entre [escritório] e [cliente], objeto [ ], valor R$ [ ], forma de pagamento [ ]…" /></label>
              <div className="md:col-span-2 flex gap-2"><button type="submit" data-testid="salvar-modelo" className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider">Salvar modelo</button><button type="button" onClick={() => setAberto(false)} className="min-h-[44px] px-4 text-sm underline">Cancelar</button></div>
            </form>
          )}
          {msg && <p role="status" data-testid="msg-modelo" className="mt-3 p-3 text-sm border-l-2 bg-regularFundo border-regular text-regular">{msg}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {areas.map(a => <button key={a} type="button" onClick={() => setArea(a)} aria-pressed={area === a} className={`min-h-[36px] px-3 text-sm border ${area === a ? 'bg-navy text-white' : ''}`}>{a}</button>)}
          </div>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map(m => (
            <div key={m.id ?? m.titulo} className="relative">
              <button type="button" onClick={() => abrir(m)} data-testid={m.proprio ? 'modelo-proprio' : 'modelo'} className="w-full text-left bg-white shadow-sm p-4 hover:border-dourado border border-transparent">
                <p className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-dourado" aria-hidden />{m.titulo}</p>
                <p className="text-xs text-grafite-claro mt-1">{m.area}{m.proprio && ' · modelo do escritório'}</p>
              </button>
              {m.proprio && m.id && <button type="button" onClick={() => apagar(m.id!)} aria-label={`Apagar modelo ${m.titulo}`} className="absolute top-2 right-2 p-2 text-critico"><Trash2 size={16} aria-hidden /></button>}
            </div>
          ))}
          {!lista.length && <p className="text-sm text-grafite-claro">Nenhum modelo com esse termo. Peça ao agente no Assistente jurídico, modo Redigir.</p>}
        </div>
      </div>
    </Layout>
  )
}
