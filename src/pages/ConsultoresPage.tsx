import { useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { perguntar, type Consulta, type Especialidade } from '@/lib/assistente'
import { render } from '@/pages/AssistentePage'
import { Briefcase, Send, Sparkles } from 'lucide-react'

// Um consultor de IA para cada nível do escritório. O botão "Diagnóstico agora" envia a fotografia
// atual do escritório (só números agregados, sem dados de clientes) e pede prioridades ao consultor.
const NIVEIS: { chave: Especialidade; nivel: string; titulo: string; foco: string }[] = [
  { chave: 'nivel_socio_gestor', nivel: 'Sociedade', titulo: 'Sócia-gestora', foco: 'Estratégia, governança, metas e sucessão' },
  { chave: 'nivel_socio_area', nivel: 'Sociedade', titulo: 'Sócio de área e captação', foco: 'Clientes, honorários por valor, novos negócios' },
  { chave: 'nivel_compliance', nivel: 'Sociedade', titulo: 'Compliance e risco', foco: 'Integridade, lavagem de dinheiro, conflito de interesses' },
  { chave: 'nivel_coordenador', nivel: 'Advocacia', titulo: 'Advogado sênior e coordenador', foco: 'Equipe, revisão de peças, carteira' },
  { chave: 'nivel_pleno', nivel: 'Advocacia', titulo: 'Advogado pleno', foco: 'Estratégia processual, negociação, tempo' },
  { chave: 'nivel_junior', nivel: 'Advocacia', titulo: 'Advogado júnior', foco: 'Pesquisa, peças, prazos, carreira' },
  { chave: 'nivel_estagiario', nivel: 'Advocacia', titulo: 'Estagiário', foco: 'Limites legais, organização, aprendizado' },
  { chave: 'nivel_controladoria', nivel: 'Operação', titulo: 'Controladoria jurídica', foco: 'Prazos, intimações, padronização' },
  { chave: 'nivel_pmo', nivel: 'Operação', titulo: 'Escritório de projetos (PMO)', foco: 'PMBOK, Kanban, riscos, portfólio' },
  { chave: 'nivel_secretaria', nivel: 'Operação', titulo: 'Secretaria e recepção', foco: 'Atendimento, agenda, sigilo' },
  { chave: 'nivel_financeiro', nivel: 'Gestão', titulo: 'Financeiro e controller', foco: 'Rentabilidade, caixa, inadimplência, tributos' },
  { chave: 'nivel_rh', nivel: 'Gestão', titulo: 'Pessoas e RH', foco: 'Carreira, desempenho, contratação' },
  { chave: 'nivel_ti_dpo', nivel: 'Gestão', titulo: 'Tecnologia e LGPD (DPO)', foco: 'Segurança, dados pessoais, IA segura' },
  { chave: 'nivel_marketing', nivel: 'Gestão', titulo: 'Marketing jurídico', foco: 'Reputação e conteúdo dentro do Provimento 205' },
]

async function fotografia(): Promise<string> {
  const hoje = new Date().toISOString().slice(0, 10)
  const em60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  const conta = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const [imoveis, contratos, vencendo, tarefas, atrasadas, intimacoes, horas] = await Promise.all([
    conta(supabase.from('imoveis').select('id', { count: 'exact', head: true })),
    conta(supabase.from('contratos').select('id', { count: 'exact', head: true }).is('encerrado_em', null)),
    conta(supabase.from('contratos').select('id', { count: 'exact', head: true }).is('encerrado_em', null).gte('data_vencimento', hoje).lte('data_vencimento', em60)),
    conta(supabase.from('tarefas').select('id', { count: 'exact', head: true }).neq('situacao', 'feito')),
    conta(supabase.from('tarefas').select('id', { count: 'exact', head: true }).neq('situacao', 'feito').lt('prazo', hoje)),
    conta(supabase.from('intimacoes').select('id', { count: 'exact', head: true }).eq('lida', false)),
    supabase.from('lancamentos_horas').select('minutos,faturavel').then(r => r.data ?? []),
  ])
  const min = horas.reduce((s, h) => s + (h.minutos ?? 0), 0)
  const fat = horas.filter(h => h.faturavel).reduce((s, h) => s + (h.minutos ?? 0), 0)
  return `Fotografia do escritório em ${hoje}: ${imoveis} imóveis na carteira; ${contratos} contratos ativos, ${vencendo} vencendo em 60 dias; ${tarefas} tarefas abertas, ${atrasadas} atrasadas; ${intimacoes} intimações não lidas; ${Math.round(min / 60)} horas lançadas, ${min ? Math.round((fat / min) * 100) : 0}% faturáveis.`
}

export default function ConsultoresPage() {
  const [sel, setSel] = useState(NIVEIS[0])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resposta, setResposta] = useState<Consulta | null>(null)

  const consultar = async (texto: string) => {
    setCarregando(true); setErro(''); setResposta(null)
    try {
      const ctx = await fotografia()
      setResposta(await perguntar(texto, sel.chave, [], 'responder', ctx))
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao consultar.') } finally { setCarregando(false) }
  }
  const diagnostico = () => consultar(`Faça o diagnóstico do escritório do ponto de vista de ${sel.titulo.toLowerCase()}: as 5 ações prioritárias para os próximos 30 dias, a métrica de cada uma e o principal risco.`)

  const grupos = [...new Set(NIVEIS.map(n => n.nivel))]
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-dourado">Consultores do escritório</p>
        <h1 className="font-serif text-3xl text-navy mt-1">Um consultor especialista para cada função</h1>
        <p className="text-grafite mt-2 max-w-3xl">Cada consultor reúne o núcleo dos programas de mestrado e doutorado em gestão de serviços profissionais e as normas da OAB. O diagnóstico usa só números agregados do escritório, sem dados de clientes.</p>
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 mt-8">
          <nav aria-label="Funções" className="space-y-5">
            {grupos.map(g => (
              <div key={g}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-grafite/70 mb-2">{g}</p>
                <div className="space-y-1">
                  {NIVEIS.filter(n => n.nivel === g).map(n => (
                    <button key={n.chave} type="button" data-testid={`consultor-${n.chave}`} onClick={() => { setSel(n); setResposta(null); setErro('') }}
                      className={`w-full text-left px-4 py-3 border min-h-[44px] ${sel.chave === n.chave ? 'bg-navy text-white border-navy' : 'bg-white border-navy/10 hover:border-dourado'}`}>
                      <span className="block font-medium text-sm">{n.titulo}</span>
                      <span className={`block text-xs ${sel.chave === n.chave ? 'text-white/70' : 'text-grafite'}`}>{n.foco}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <section className="bg-white border border-navy/10 p-6">
            <div className="flex items-center gap-3"><Briefcase className="text-dourado" size={22} aria-hidden="true" /><h2 className="font-serif text-2xl text-navy">{sel.titulo}</h2></div>
            <p className="text-sm text-grafite mt-1">{sel.foco}</p>
            <button type="button" data-testid="diagnostico" onClick={diagnostico} disabled={carregando}
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50">
              <Sparkles size={16} aria-hidden="true" /> Diagnóstico agora
            </button>
            <form className="mt-5 flex gap-2" onSubmit={e => { e.preventDefault(); if (pergunta.trim().length >= 5) consultar(pergunta) }}>
              <label className="sr-only" htmlFor="perg-consultor">Pergunta ao consultor</label>
              <input id="perg-consultor" value={pergunta} onChange={e => setPergunta(e.target.value)} placeholder="Ou pergunte algo específico a este consultor"
                className="flex-1 min-h-[44px] border border-navy/20 px-3 text-sm" />
              <button type="submit" disabled={carregando} className="min-h-[44px] px-4 border border-navy text-navy" aria-label="Enviar"><Send size={16} /></button>
            </form>
            {carregando && <p className="text-sm text-grafite mt-6">O consultor está analisando o escritório…</p>}
            {erro && <p role="alert" className="text-sm text-red-700 mt-6">{erro}</p>}
            {resposta && <div data-testid="resposta-consultor" className="text-sm text-grafite mt-6 space-y-2" dangerouslySetInnerHTML={{ __html: render(resposta.resposta) }} />}
          </section>
        </div>
      </div>
    </Layout>
  )
}
