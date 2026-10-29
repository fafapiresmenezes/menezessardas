import { useState } from 'react'
import Layout from '@/components/Layout'
import { FileText, Search } from 'lucide-react'

// Biblioteca de modelos: cada modelo abre o agente da área no modo Redigir com o pedido pronto.
// O advogado completa os dados do caso entre colchetes e o agente redige citando a lei do Planalto.
type Modelo = { titulo: string; area: string; agente: string; pedido: string }
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
  const areas = ['Todas', ...new Set(MODELOS.map(m => m.area))]
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const lista = MODELOS.filter(m => (area === 'Todas' || m.area === area) && n(m.titulo + ' ' + m.pedido).includes(n(busca)))
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
          <div className="flex flex-wrap gap-2 mt-3">
            {areas.map(a => <button key={a} type="button" onClick={() => setArea(a)} aria-pressed={area === a} className={`min-h-[36px] px-3 text-sm border ${area === a ? 'bg-navy text-white' : ''}`}>{a}</button>)}
          </div>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map(m => (
            <button key={m.titulo} type="button" onClick={() => abrir(m)} data-testid="modelo" className="text-left bg-white shadow-sm p-4 hover:border-dourado border border-transparent">
              <p className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-dourado" aria-hidden />{m.titulo}</p>
              <p className="text-xs text-grafite-claro mt-1">{m.area}</p>
            </button>
          ))}
          {!lista.length && <p className="text-sm text-grafite-claro">Nenhum modelo com esse termo. Peça ao agente no Assistente jurídico, modo Redigir.</p>}
        </div>
      </div>
    </Layout>
  )
}
