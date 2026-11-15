import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { perguntar, type Consulta, type Especialidade } from '@/lib/assistente'
import { render } from '@/pages/AssistentePage'
import { Briefcase, Send, Sparkles } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'
import { extrairAcoes } from '@/lib/acoesConsultor'
import { hojeLocal, isoLocal } from '@/lib/datas'
import { meuAlcance, podeVer, ALCANCE_FECHADO, rotuloCargo, type Alcance } from '@/lib/hierarquia'

// Um consultor de IA para cada nível do escritório. O botão "Diagnóstico agora" envia a fotografia
// atual do escritório (só números agregados, sem dados de clientes) e pede prioridades ao consultor.
// Privacidade por advogado: a fotografia é a de quem pergunta. Sócio e gestor recebem os números do
// escritório inteiro; pleno e júnior, só os dos próprios casos e das próprias horas — número agregado
// também conta: "47 tarefas abertas" diz quanto trabalho existe na mesa dos colegas.
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

export async function fotografia(alc: Alcance): Promise<string> {
  const hoje = hojeLocal()
  const em60 = isoLocal(new Date(Date.now() + 60 * 864e5))
  const conta = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const so = (n: string | null | undefined) => String(n ?? '').replace(/\D/g, '')
  const [imoveis, contratos, vencendo, casos, intimacoes, horas] = await Promise.all([
    conta(supabase.from('imoveis').select('id', { count: 'exact', head: true })),
    conta(supabase.from('contratos').select('id', { count: 'exact', head: true }).is('encerrado_em', null)),
    conta(supabase.from('contratos').select('id', { count: 'exact', head: true }).is('encerrado_em', null).gte('data_vencimento', hoje).lte('data_vencimento', em60)),
    supabase.from('tarefas').select('prazo,situacao,responsavel_id,numero_processo,nivel').then(r => (r.data ?? []) as { prazo: string | null; situacao: string | null; responsavel_id: string | null; numero_processo: string | null; nivel: string | null }[]),
    supabase.from('intimacoes').select('numero_processo,lida').then(r => (r.data ?? []) as { numero_processo: string | null; lida: boolean | null }[]),
    supabase.from('lancamentos_horas').select('minutos,faturavel,usuario_id').then(r => (r.data ?? []) as { minutos: number | null; faturavel: boolean | null; usuario_id?: string | null }[]),
  ])
  // Tarefas e horas: só o que quem pergunta pode ver. Intimação segue o dono do caso daquele número.
  const minhas = casos.filter(t => podeVer(alc, t.responsavel_id))
  const abertas = minhas.filter(t => t.situacao !== 'feito')
  const atrasadas = abertas.filter(t => t.prazo && t.prazo < hoje).length
  const meusNumeros = new Set(minhas.filter(t => t.nivel === 'projeto').map(t => so(t.numero_processo)))
  const comDono = new Set(casos.filter(t => t.nivel === 'projeto' && t.responsavel_id).map(t => so(t.numero_processo)))
  const naoLidas = intimacoes.filter(i => !i.lida && (alc.veTudo || !comDono.has(so(i.numero_processo)) || meusNumeros.has(so(i.numero_processo)))).length
  const minhasHoras = horas.filter(h => alc.veTudo || !h.usuario_id || h.usuario_id === alc.id)
  const min = minhasHoras.reduce((s, h) => s + (h.minutos ?? 0), 0)
  const fat = minhasHoras.filter(h => h.faturavel).reduce((s, h) => s + (h.minutos ?? 0), 0)
  const quem = alc.veTudo ? 'do escritório' : 'da sua carteira'
  return `Fotografia ${quem} em ${hoje}: ${imoveis} imóveis na carteira; ${contratos} contratos ativos, ${vencendo} vencendo em 60 dias; ${abertas.length} tarefas abertas, ${atrasadas} atrasadas; ${naoLidas} intimações não lidas; ${Math.round(min / 60)} horas lançadas, ${min ? Math.round((fat / min) * 100) : 0}% faturáveis.`
}

export default function ConsultoresPage() {
  // Passo 112: lembra o último consultor escolhido neste navegador e permite limpar a conversa.
  const [sel, setSel] = useState(() => { try { const c = localStorage.getItem('lsm-consultor'); return NIVEIS.find(n => n.chave === c) ?? NIVEIS[0] } catch { return NIVEIS[0] } })
  const [pergunta, setPergunta] = useState(() => { try { return localStorage.getItem('lsm-consultor-pergunta') ?? '' } catch { return '' } }) // Passo 178: rascunho lembrado
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resposta, setResposta] = useState<Consulta | null>(null)
  const [criando, setCriando] = useState(false)
  const [tarefasCriadas, setTarefasCriadas] = useState<number | null>(null)
  const acoes = resposta ? extrairAcoes(resposta.resposta) : []
  // Enquanto não se sabe quem pergunta, vale o alcance mais estreito: esconder incomoda, mostrar vaza o caso do colega.
  const [alcance, setAlcance] = useState<Alcance | null>(null)
  const alc = alcance ?? ALCANCE_FECHADO
  useEffect(() => { meuAlcance().then(setAlcance).catch(() => setAlcance(ALCANCE_FECHADO)) }, [])
  const virarTarefas = async () => {
    setCriando(true); setErro('')
    const prazo = isoLocal(new Date(Date.now() + 7 * 864e5))
    // A tarefa nasce com dono (quem pediu o diagnóstico), em vez de nascer sem responsável e aparecer para o escritório todo.
    const { error } = await supabase.from('tarefas').insert(acoes.map(a => ({ titulo: `${a} (${sel.titulo})`, nivel: 'tarefa', prioridade: 'media', prazo, area: 'Gestão interna', responsavel_id: alc.id || null })))
    setCriando(false)
    if (error) setErro(mensagemAmigavel(error, 'Não deu para criar as tarefas.')); else setTarefasCriadas(acoes.length)
  }
  const [respondidoEm, setRespondidoEm] = useState<Date | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 266

  const consultar = async (texto: string) => {
    setCarregando(true); setErro(''); setResposta(null)
    try {
      // Se o cargo ainda não chegou, espera-se por ele aqui: assim quem é sócio não leva a fotografia
      // estreita só por ter clicado rápido, e quem não tem cargo continua levando a mais estreita.
      const ctx = await fotografia(alcance ?? await meuAlcance().catch(() => ALCANCE_FECHADO))
      setResposta(await perguntar(texto, sel.chave, [], 'responder', ctx)); setRespondidoEm(new Date()); setCopiado(false)
    } catch (e) { setErro(mensagemAmigavel(e, 'O consultor não respondeu agora. Tente de novo em instantes.')) } finally { setCarregando(false) }
  }
  const diagnostico = () => consultar(`Faça o diagnóstico do escritório do ponto de vista de ${sel.titulo.toLowerCase()}: as 5 ações prioritárias para os próximos 30 dias, a métrica de cada uma e o principal risco.`)

  const grupos = [...new Set(NIVEIS.map(n => n.nivel))]
  return (
    <Layout title="Consultores do escritório">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Consultores do escritório</p>
        <h2 className="font-serif text-3xl text-navy mt-1">Um consultor especialista para cada função</h2>
        <p className="text-grafite mt-2 max-w-3xl">Cada consultor reúne o núcleo dos programas de mestrado e doutorado em gestão de serviços profissionais e as normas da OAB. O diagnóstico usa só números agregados do escritório, sem dados de clientes.</p>
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 mt-8">
          <nav aria-label="Funções" className="space-y-5">
            {grupos.map(g => (
              <div key={g}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-grafite-claro mb-2">{g}</p>
                <div className="space-y-1">
                  {NIVEIS.filter(n => n.nivel === g).map(n => (
                    <button key={n.chave} type="button" data-testid={`consultor-${n.chave}`} title={`Seleciona o consultor de ${n.titulo} (foco: ${n.foco.toLowerCase()}) para fazer o diagnóstico ou perguntas`} onClick={() => { setSel(n); setResposta(null); setErro(''); try { localStorage.setItem('lsm-consultor', n.chave) } catch { /* sem memória local */ } }}
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
            {!alc.veTudo && (
              <p className="mt-3 border-l-2 border-dourado p-3 text-sm" data-testid="consultores-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
                O diagnóstico usa <strong>os números da sua carteira</strong> ({rotuloCargo[alc.cargo ?? 'nenhum']}), não os do escritório inteiro. Sócios e o gestor recebem o conjunto.
              </p>
            )}
            <button type="button" data-testid="diagnostico" onClick={diagnostico} disabled={carregando} title="Envia os números agregados do escritório ao consultor e recebe as 5 ações prioritárias para 30 dias"
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50">
              <Sparkles size={16} aria-hidden="true" /> Diagnóstico agora
            </button>
            <form className="mt-5 flex gap-2" onSubmit={e => { e.preventDefault(); if (pergunta.trim().length >= 5) consultar(pergunta) }}>
              <label className="sr-only" htmlFor="perg-consultor">Pergunta ao consultor</label>
              <input id="perg-consultor" value={pergunta} onChange={e => { setPergunta(e.target.value); try { localStorage.setItem('lsm-consultor-pergunta', e.target.value) } catch { /* sem memória local */ } }} placeholder="Ou pergunte algo específico a este consultor"
                className="flex-1 min-h-[44px] border border-navy/20 px-3 text-sm" />
              <button type="submit" disabled={carregando} title="Envia sua pergunta ao consultor selecionado" className="min-h-[44px] px-4 border border-navy text-navy" aria-label="Enviar"><Send size={16} /></button>
            </form>
            {carregando && <p className="text-sm text-grafite mt-6">O consultor está analisando o escritório…</p>}
            {erro && <p role="alert" className="text-sm text-critico mt-6">{erro}</p>}
            {resposta && <div data-testid="resposta-consultor" className="text-sm text-grafite mt-6 space-y-2" dangerouslySetInnerHTML={{ __html: render(resposta.resposta) }} />}
            {resposta && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-grafite-claro" data-testid="acoes-consultor">
                {respondidoEm && <span>Respondido em {respondidoEm.toLocaleString('pt-BR')} pelo {sel.titulo}.</span>}
                <button type="button" onClick={() => navigator.clipboard?.writeText(resposta.resposta).then(() => setCopiado(true)).catch(() => undefined)} title="Copia o texto da resposta do consultor para a área de transferência" className="underline text-navy" data-testid="copiar-resposta">{copiado ? 'Copiado' : 'Copiar resposta'}</button>
                {/* Passo 144: imprimir a resposta do consultor em uma página. */}
                <button type="button" onClick={() => window.print()} title="Abre a tela de impressão do navegador com a resposta do consultor" className="underline text-navy print:hidden" data-testid="imprimir-consultor">Imprimir</button>
                <button type="button" data-testid="copiar-link-consultores" title="Copia o endereço desta página de consultores para compartilhar" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="ml-2 underline text-navy print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>{/* Passo 246 */}
                {resposta && <button type="button" data-testid="baixar-consultor" title="Baixa a pergunta e a resposta do consultor em arquivo de texto" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`Consultor (${resposta.especialidade}) · ${new Date(resposta.criadoEm).toLocaleString('pt-BR')}\n\nPergunta: ${resposta.pergunta}\n\n${resposta.resposta}\n\nFontes: ${resposta.fontes.length}`], { type: 'text/plain;charset=utf-8' })); a.download = 'consultor.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="underline text-navy print:hidden ml-2">Baixar resposta</button>}{/* Passo 304 */}
                <button type="button" onClick={() => { setResposta(null); setPergunta(''); setErro(''); try { localStorage.removeItem('lsm-consultor-pergunta') } catch { /* sem memória local */ } }} title="Limpa a resposta e o campo de pergunta para começar uma nova consulta" className="underline text-navy" data-testid="nova-consulta">Nova consulta</button>
                <a href={`#/projetos?novo=${encodeURIComponent(`Ação do ${sel.titulo}: ${resposta.resposta.replace(/\s+/g, ' ').slice(0, 120)}`)}`} title="Abre Casos e projetos com uma nova tarefa pré-preenchida a partir desta resposta" className="underline text-navy" data-testid="virar-tarefa">Virar tarefa em Casos e projetos</a>
              </div>
            )}
            {/* Passo D02/D03 (Diamante): cada ação do diagnóstico vira tarefa em Casos e projetos com prazo de 7 dias, em 1 clique. */}
            {resposta && acoes.length > 0 && (
              <div className="mt-4 border-t border-navy/10 pt-3" data-testid="acoes-diagnostico">
                <p className="text-xs font-semibold text-navy uppercase tracking-wide">Ações sugeridas ({acoes.length})</p>
                <ul className="mt-2 space-y-1 text-sm text-grafite">
                  {acoes.map((a, i) => <li key={i} className="flex items-start gap-2"><span className="text-dourado-escuro">{i + 1}.</span><span className="flex-1">{a}</span></li>)}
                </ul>
                <button type="button" disabled={criando || tarefasCriadas !== null} onClick={virarTarefas} className="mt-3 min-h-[44px] px-4 bg-navy text-white text-sm disabled:opacity-60" data-testid="virar-tarefas" title="Cria uma tarefa em Casos e projetos para cada ação sugerida, com prazo de 7 dias">
                  {tarefasCriadas !== null ? `${tarefasCriadas} tarefa(s) criada(s) em Casos e projetos` : criando ? 'Criando…' : 'Virar todas em tarefas (prazo: 7 dias)'}
                </button>
                {tarefasCriadas !== null && <a href="#/projetos" title="Abre a página de Casos e projetos para ver as tarefas criadas" className="ml-3 underline text-navy text-sm">Abrir Casos e projetos</a>}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
