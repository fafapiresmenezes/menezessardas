import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sairDemo } from '@/lib/authDemo'
import Marca from './Marca'
import { ehSede } from '@/lib/equipe'
import Busca from './Busca'
import BoasVindas from './BoasVindas'
import TourTela from './TourTela'
import PerguntarTela from './PerguntarTela'
import SinoNotificacoes from './SinoNotificacoes'
import BotaoExportar from './BotaoExportar'
import Atalhos from './Atalhos'
import FaixaConexao from './FaixaConexao'
import ErroTela from './ErroTela'
import ExigirDoisFatores from './ExigirDoisFatores'
import AceiteContratoSaas from './AceiteContratoSaas'
import AceiteTermos from './AceiteTermos'
import { aplicarTema, temaAtual } from '@/lib/tema'
import { NOME_PLATAFORMA } from '@/lib/plataforma'
import { listarPessoas, perfilAtual } from '@/lib/equipe'
import { verificarAvisosCriticos } from '@/lib/pwa'
import { minhaMarca, esquecerMarca, type MarcaEscritorio } from '@/lib/marca'
import { emDias } from '@/lib/datas'
import { Menu, X, LogOut, LayoutGrid, Building2, CalendarDays, Bell, FileBarChart, Gauge, ShieldCheck, Truck, Scale, Settings, Users, Search, Moon, Sun, MessageSquare, UserCog, TrendingUp, FlaskConical, Wallet, Home, Globe, FolderKanban, Inbox, UserCheck, Sunrise, Timer, FileText, Radar, Briefcase, Cloud, Banknote, ClipboardList, FileSearch, Library, Vote, KeySquare, Wrench, GraduationCap, Gavel, Filter, PiggyBank, ChevronDown, MoreHorizontal, SearchCheck, CalendarClock, UserPlus, PenLine, BookOpen, Compass, FolderInput, Store } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const SO_SEDE = ['/imoveis', '/fornecedores', '/alertas', '/instituto']
const gruposMenu = [
  { id: 'hoje', titulo: 'Hoje', itens: [
    { icon: Home, label: 'Trocar de área', href: '/inicio' },
    { icon: Sunrise, label: 'Meu dia', href: '/meu-dia' },
    { icon: UserPlus, label: 'Inserir processos antigos', href: '/processos-antigos' },
    { icon: FolderInput, label: 'Trazer do sistema antigo', href: '/migracao' },
    { icon: LayoutGrid, label: 'Painel', href: '/dashboard' },
    { icon: Inbox, label: 'Intimações', href: '/intimacoes' },
    { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
    { icon: CalendarClock, label: 'Prazos por código', href: '/prazos' },
  ] },
  { id: 'processos', titulo: 'Processos e casos', itens: [
    { icon: FolderKanban, label: 'Casos e projetos', href: '/projetos' },
    { icon: Gavel, label: 'Carteira de processos', href: '/processos' },
    { icon: SearchCheck, label: 'Pesquisa e due diligence', href: '/pesquisa' },
    { icon: Compass, label: 'Leitura do caso e predição', href: '/leitura-do-caso' },
    { icon: Radar, label: 'Monitoramento de processos', href: '/monitoramento' },
    { icon: FileSearch, label: 'Parte adversa', href: '/parte-adversa' },
    { icon: UserCheck, label: 'Checagem de contraparte', href: '/kyc' },
    { icon: ClipboardList, label: 'Perfil do cliente', href: '/perfil-cliente' },
  ] },
  { id: 'financeiro', titulo: 'Clientes e dinheiro', itens: [
    { icon: Filter, label: 'Funil de vendas', href: '/funil' },
    { icon: PiggyBank, label: 'Financeiro', href: '/financeiro' },
    { icon: Banknote, label: 'Honorários', href: '/honorarios' },
    { icon: Timer, label: 'Horas e honorários', href: '/horas' },
  ] },
  { id: 'imoveis', titulo: 'Imóveis e locação', itens: [
    { icon: Building2, label: 'Imóveis', href: '/imoveis' },
    { icon: KeySquare, label: 'Administração de locação', href: '/administracao' },
    { icon: Truck, label: 'Fornecedores', href: '/fornecedores' },
    { icon: Bell, label: 'Alertas', href: '/alertas' },
  ] },
  { id: 'pesquisa', titulo: 'Pesquisa e redação', itens: [
    { icon: Scale, label: 'Legislação', href: '/legislacao' },
    { icon: MessageSquare, label: 'Assistente', href: '/assistente' },
    { icon: FileText, label: 'Modelos de peças', href: '/modelos' },
    { icon: Globe, label: 'Fontes do advogado', href: '/fontes' },
    { icon: Library, label: 'Repositório e biblioteca', href: '/biblioteca' },
    { icon: BookOpen, label: 'Parâmetros de escrita', href: '/parametros-escrita' },
  ] },
  { id: 'ferramentas', titulo: 'Ferramentas do dia a dia', itens: [
    { icon: Wrench, label: 'Ferramentas do dia a dia', href: '/ferramentas' },
  ] },
  { id: 'gestao', titulo: 'Gestão e conformidade', itens: [
    { icon: ShieldCheck, label: 'Compliance', href: '/compliance' },
    { icon: Gauge, label: 'Indicadores', href: '/indicadores' },
    { icon: FileBarChart, label: 'Relatórios', href: '/relatorios' },
    { icon: ShieldCheck, label: 'Trilha', href: '/trilha' },
  ] },
  { id: 'instituto', titulo: 'THEYE Institute: pesquisa e estudos', itens: [
    { icon: FlaskConical, label: 'Instituto', href: '/instituto' },
    { icon: Briefcase, label: 'Consultores', href: '/consultores' },
    { icon: GraduationCap, label: 'Estudos para entidades', href: '/estudos' },
    { icon: Vote, label: 'Enquetes do direito', href: '/enquetes' },
    { icon: TrendingUp, label: 'Mercado jurídico', href: '/mercado' },
    { icon: TrendingUp, label: 'Previsões', href: '/previsoes' },
  ] },
  { id: 'solucoes', titulo: 'Soluções jurídicas', itens: [
    { icon: Store, label: 'Soluções jurídicas', href: '/solucoes' },
  ] },
  { id: 'admin', titulo: 'Escritório e administração', itens: [
    { icon: Cloud, label: 'Nuvem', href: '/nuvem' },
    { icon: Wallet, label: 'Consumo', href: '/consumo' },
    { icon: Users, label: 'Equipe', href: '/equipe' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ] },
]
// Autoexplicativo: ao passar o mouse em qualquer item do menu, uma frase diz para que a tela serve.
const DICAS: Record<string, string> = {
  '/inicio': 'Escolher a área do direito em que você vai trabalhar agora',
  '/meu-dia': 'O que vence hoje e nos próximos dias, separado por área do direito',
  '/processos-antigos': 'Trazer processos de antes da plataforma: planilha ou busca no tribunal',
  '/migracao': 'Importar tudo do sistema antigo do escritório, com como desfazer',
  '/dashboard': 'Números gerais do escritório em um só painel',
  '/intimacoes': 'Publicações e intimações recebidas, com o que fazer em cada uma',
  '/agenda': 'Audiências, reuniões e compromissos, com avisos por e-mail',
  '/prazos': 'Prazo certo por código: CPC, CLT, CPP, Juizados e outros',
  '/projetos': 'Casos e projetos do escritório, com tarefas dentro de cada um',
  '/processos': 'Carteira de processos com andamentos e prazos de cada um',
  '/pesquisa': 'Pesquisa e due diligence sobre pessoas e empresas em fontes públicas',
  '/leitura-do-caso': 'Contexto do caso, chance de êxito e roteiro de perguntas',
  '/monitoramento': 'Vigiar processos no tribunal e avisar quando algo sair',
  '/parte-adversa': 'O que se sabe da parte contrária em fontes públicas',
  '/kyc': 'Checar quem é a contraparte antes de contratar ou processar',
  '/perfil-cliente': 'Ficha de cada cliente: casos, contatos e preferências',
  '/funil': 'Clientes em potencial, da primeira conversa ao contrato',
  '/financeiro': 'Entradas, saídas e saldo do escritório',
  '/honorarios': 'Honorários combinados, cobrados e recebidos',
  '/horas': 'Lançar horas trabalhadas e ver o ritmo da meta',
  '/imoveis': 'Imóveis administrados, contratos e documentos',
  '/administracao': 'Administração de locações: cobranças, repasses e reajustes',
  '/fornecedores': 'Fornecedores do escritório e dos imóveis',
  '/alertas': 'Avisos de vencimento e reajuste de contratos',
  '/legislacao': 'Ler a lei direto do Planalto, artigo por artigo',
  '/assistente': 'Perguntar, redigir peça ou comparar caminhos com a IA',
  '/modelos': 'Modelos prontos de peças e documentos do escritório',
  '/fontes': 'Tribunais, diários e fontes oficiais em um só lugar',
  '/biblioteca': 'Tudo o que já foi pesquisado e os repositórios abertos de teses, legislação e jurisprudência',
  '/parametros-escrita': 'Como o robô escreve: redatores, tom e formatação das peças',
  '/meu-estilo': 'Ensinar à plataforma o seu jeito de escrever',
  '/ferramentas': 'Calculadoras, validadores e listas de verificação do dia a dia',
  '/compliance': 'LGPD, integridade e conformidade do escritório',
  '/indicadores': 'Indicadores e metas (OKRs) do escritório',
  '/relatorios': 'Relatórios prontos para imprimir ou exportar',
  '/trilha': 'Registro do que foi feito, com carimbo que prova a data',
  '/instituto': 'Pesquisa e estudos do THEYE Institute',
  '/consultores': 'Consultores de IA por nível e por especialidade',
  '/estudos': 'Estudos para entidades, órgãos e associações',
  '/enquetes': 'Enquetes sobre temas do direito',
  '/mercado': 'O mercado jurídico em números',
  '/previsoes': 'Previsões e riscos da carteira',
  '/solucoes': 'A plataforma oferecida a outros escritórios (vertente comercial)',
  '/nuvem': 'Arquivos do escritório na nuvem',
  '/consumo': 'Quanto cada pessoa consome de IA e quanto custa',
  '/equipe': 'Pessoas do escritório, funções e permissões',
  '/settings': 'Configurações da conta e da plataforma',
}
const CHAVE_GRUPOS = 'lsm-menu-grupos'
const CHAVE_SIMPLES = 'theye-menu-simples'
// Menu simples (padrão): só o que se usa todo dia, com nomes do dia a dia. "Ver todas as telas" abre o menu completo.
const menuEssencial = [
  { bloco: 'Todo dia', dica: 'Comece por aqui', icon: Home, label: 'Início', href: '/inicio' },
  { bloco: 'Todo dia', dica: '', icon: Sunrise, label: 'O que vence', href: '/meu-dia' },
  { bloco: 'Todo dia', dica: '', icon: CalendarDays, label: 'Agenda', href: '/agenda' },
  { bloco: 'Processos', dica: 'Ver, incluir e acompanhar', icon: Gavel, label: 'Meus processos', href: '/processos' },
  { bloco: 'Processos', dica: '', icon: UserPlus, label: 'Inserir processos antigos', href: '/processos-antigos' },
  { bloco: 'Processos', dica: '', icon: Inbox, label: 'Intimações', href: '/intimacoes' },
  { bloco: 'Escrever peças', dica: 'Como o robô escreve por você', icon: PenLine, label: 'Meu jeito de escrever', href: '/meu-estilo' },
  { bloco: 'Escrever peças', dica: '', icon: BookOpen, label: 'Parâmetros de escrita', href: '/parametros-escrita' },
]
const estaAtivo = (href: string, pathname: string) => pathname.startsWith(href) || (href === '/fornecedores' && pathname.startsWith('/fornecedor/'))
const grupoDe = (pathname: string) => gruposMenu.find(g => g.itens.some(i => estaAtivo(i.href, pathname)))?.id

export default function Layout({ children, title }: LayoutProps) {
  const [sede, setSede] = useState(true)
  useEffect(() => { ehSede().then(setSede).catch(() => setSede(true)) }, [])
  // Passo D22: white-label — parceiro vê a própria marca e cor no menu.
  const [marca, setMarca] = useState<MarcaEscritorio | null>(null)
  useEffect(() => { minhaMarca().then(setMarca).catch(() => setMarca(null)) }, [])
  const [menuAberto, setMenuAberto] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  )
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [tema, setTema] = useState(temaAtual)
  const [admin, setAdmin] = useState(false)
  const [pendentes, setPendentes] = useState(0)

  // Área do administrador: só aparece para admin, com o número de cadastros esperando liberação.
  useEffect(() => {
    perfilAtual()
      .then(async f => {
        if (f !== 'admin') return
        setAdmin(true)
        const pessoas = await listarPessoas()
        setPendentes(pessoas.filter(p => !p.funcao).length)
      })
      .catch(() => undefined)
  }, [])
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Com o menu recolhido só há o ícone, então a dica começa pelo nome da tela.
  const dicaDe = (item: { href: string; label: string }) =>
    menuAberto ? (DICAS[item.href] ?? item.label) : `${item.label}${DICAS[item.href] ? ` — ${DICAS[item.href]}` : ''}`

  // Menu em grupos recolhíveis: o grupo da tela atual e "Hoje" começam abertos; a escolha da pessoa é lembrada.
  const [grupos, setGrupos] = useState<Record<string, boolean>>(() => {
    let salvo: Record<string, boolean> = {}
    try { salvo = JSON.parse(localStorage.getItem(CHAVE_GRUPOS) || '{}') } catch { /* sem armazenamento */ }
    return { hoje: true, ...salvo, ...(grupoDe(pathname) ? { [grupoDe(pathname)!]: true } : {}) }
  })
  useEffect(() => {
    const g = grupoDe(pathname)
    if (g) setGrupos(a => (a[g] ? a : { ...a, [g]: true }))
  }, [pathname])
  const mudarGrupos = (proximo: Record<string, boolean>) => {
    setGrupos(proximo)
    try { localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(proximo)) } catch { /* sem armazenamento */ }
  }
  const alternarGrupo = (id: string) => mudarGrupos({ ...grupos, [id]: !grupos[id] })
  const [maisAberto, setMaisAberto] = useState(false)
  const [simples, setSimples] = useState<boolean>(() => {
    try { return localStorage.getItem(CHAVE_SIMPLES) !== 'nao' } catch { return true }
  })
  const mudarSimples = (v: boolean) => {
    setSimples(v)
    try { localStorage.setItem(CHAVE_SIMPLES, v ? 'sim' : 'nao') } catch { /* sem armazenamento */ }
  }

  // Passo D19: app instalável e avisos no celular (prazos em até 2 dias, intimações vencidas, compromissos de hoje),
  // conferidos ao abrir e a cada 30 minutos enquanto a tela estiver aberta.
  useEffect(() => {
    if (!supabaseConfigurado) return
    const conferir = () => verificarAvisosCriticos(async () => {
      const [i, c] = await Promise.all([
        supabase.from('intimacoes').select('id,lida,prazo_final,tribunal,numero_processo,tipo').eq('lida', false).not('prazo_final', 'is', null).lte('prazo_final', emDias(2)).limit(50),
        supabase.from('compromissos').select('id,titulo,data_evento').eq('data_evento', emDias(0)).limit(20),
      ])
      return { intimacoes: i.data ?? [], compromissos: c.data ?? [] }
    }).catch(() => undefined)
    conferir()
    const t = setInterval(conferir, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Ctrl/⌘ + K abre a busca global em qualquer tela.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta(a => !a)
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  const sair = async () => {
    if (!supabaseConfigurado) {
      sairDemo()
      navigate('/login')
      window.location.reload()
      return
    }
    esquecerMarca()
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-pergaminho">
      {/* Passo D23 (usabilidade): no celular o menu recolhido some (a tela ganha 80px) e, aberto, vira gaveta sobre o conteúdo. */}
      {menuAberto && <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="md:hidden fixed inset-0 bg-black/40 z-30" />}
      <aside
        className={`${
          menuAberto ? 'w-64 fixed inset-y-0 left-0 z-40 md:static' : 'w-0 md:w-20'
        } bg-navy text-white transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0`}
        style={marca ? { backgroundColor: marca.cor } : undefined}
        data-marca={marca ? 'parceiro' : 'sede'}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
          {menuAberto ? (
            <Marca className="flex-1 min-w-0" marca={marca} />
          ) : (
            <span className="font-serif text-dourado tracking-widest text-lg mx-auto" aria-hidden="true">
              {marca ? marca.nome.slice(0, 2).toUpperCase() : 'TH'}
            </span>
          )}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 hover:bg-white/10 rounded flex-shrink-0"
            aria-label={menuAberto ? 'Recolher menu' : 'Expandir menu'}
            aria-expanded={menuAberto}
            title={menuAberto ? 'Recolhe o menu lateral, deixando só os ícones' : 'Expande o menu lateral, mostrando os nomes das telas'}
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto" aria-label="Menu principal">
          {simples && (
            <ul className="px-3 pt-3 space-y-1" data-testid="menu-simples">
              {menuEssencial.map((item, i) => {
                const ativo = estaAtivo(item.href, pathname)
                const abreBloco = menuAberto && menuEssencial[i - 1]?.bloco !== item.bloco
                return (
                  <li key={item.href}>
                    {abreBloco && (
                      <div className={`px-4 pb-1 ${i ? 'pt-4' : 'pt-1'}`} data-bloco={item.bloco}>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-dourado">{item.bloco}</p>
                        {item.dica && <p className="text-xs text-white/60">{item.dica}</p>}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(item.href)}
                      aria-current={ativo ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded transition border-l-2 ${ativo ? 'bg-white/10 border-dourado text-white' : 'border-transparent text-white/85 hover:bg-white/5 hover:text-white'}`}
                      title={dicaDe(item)}
                    >
                      <item.icon size={20} className="flex-shrink-0" />
                      {menuAberto && <span className="text-base">{item.label}</span>}
                    </button>
                  </li>
                )
              })}
              {menuAberto && (
                <li className="pt-4">
                  <button type="button" onClick={() => mudarSimples(false)} className="w-full px-4 py-2 min-h-[44px] text-sm text-white/70 hover:text-white underline underline-offset-2 text-left" data-testid="menu-ver-tudo" title="Troca para o menu completo, com todas as telas da plataforma agrupadas por assunto">
                    Ver todas as telas
                  </button>
                </li>
              )}
            </ul>
          )}
          {!simples && menuAberto && (
            <div className="px-4 pt-3">
              <button type="button" onClick={() => mudarSimples(true)} className="text-sm text-dourado hover:underline underline-offset-2 min-h-[36px]" data-testid="menu-voltar-simples" title="Volta ao menu simples, só com as telas usadas todo dia">
                ← Voltar ao menu simples
              </button>
            </div>
          )}
          {!simples && menuAberto && (
            <div className="px-4 pt-3 flex justify-end">
              {(() => {
                const visiveis = gruposMenu.filter(g => g.itens.some(i => sede || !SO_SEDE.includes(i.href)))
                const todosAbertos = visiveis.every(g => grupos[g.id])
                return (
                  <button
                    type="button"
                    onClick={() => mudarGrupos(Object.fromEntries(visiveis.map(g => [g.id, g.id === 'hoje' || !todosAbertos])))}
                    className="text-[11px] uppercase tracking-wider text-white/70 hover:text-white underline-offset-2 hover:underline min-h-[32px]"
                    data-testid="menu-alternar-tudo"
                    title={todosAbertos ? 'Recolhe todos os grupos do menu, deixando só os títulos' : 'Abre todos os grupos do menu de uma vez'}
                  >
                    {todosAbertos ? 'Recolher grupos' : 'Abrir todos os grupos'}
                  </button>
                )
              })()}
            </div>
          )}
          {!simples && gruposMenu.map(grupo => {
            const itens = grupo.itens.filter(item => sede || !SO_SEDE.includes(item.href))
            if (!itens.length) return null
            const aberto = !menuAberto || !!grupos[grupo.id]
            const grupoAtivo = itens.some(i => estaAtivo(i.href, pathname))
            return (
              <div key={grupo.id} className={menuAberto ? 'px-3 py-1' : 'px-3 py-1 border-t border-white/10 first:border-t-0'} data-grupo={grupo.id}>
                {menuAberto && (
                  <button
                    type="button"
                    onClick={() => alternarGrupo(grupo.id)}
                    aria-expanded={aberto}
                    aria-controls={`grupo-${grupo.id}`}
                    title={aberto ? `Recolhe o grupo "${grupo.titulo}" no menu` : `Abre o grupo "${grupo.titulo}" para ver suas telas`}
                    className={`w-full flex items-center justify-between px-4 py-2 min-h-[40px] text-[11px] uppercase tracking-[0.16em] rounded hover:bg-white/5 ${grupoAtivo ? 'text-dourado' : 'text-white/70'}`}
                  >
                    <span>{grupo.titulo}</span>
                    <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${aberto ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {aberto && (
                  <ul id={`grupo-${grupo.id}`} className="space-y-1">
                    {itens.map(item => {
                      const ativo = estaAtivo(item.href, pathname)
                      return (
                        <li key={item.label}>
                          <button
                            onClick={() => navigate(item.href)}
                            aria-current={ativo ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded transition border-l-2 ${
                              ativo
                                ? 'bg-white/10 border-dourado text-white'
                                : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
                            }`}
                            title={dicaDe(item)}
                          >
                            <item.icon size={19} className="flex-shrink-0" />
                            {menuAberto && <span className="text-sm">{item.label}</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-3">
          <button
            onClick={sair}
            className="w-full flex items-center gap-3 px-4 py-3 rounded hover:bg-white/5 transition text-white/75 hover:text-white"
            title={!menuAberto ? 'Sair' : undefined}
          >
            <LogOut size={19} className="flex-shrink-0" />
            {menuAberto && <span className="text-sm">Sair</span>}
          </button>
          {menuAberto && (
            <p className="text-[11px] text-white/70 px-4 text-center">
              Desenvolvido pelo<br />
              THEYE Institute
            </p>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-navy/10 px-4 md:px-8 py-4 md:py-5 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 min-w-0 max-w-full">
            {!menuAberto && <button type="button" onClick={() => setMenuAberto(true)} aria-label="Abrir menu" title="Abre o menu lateral com as telas da plataforma" className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/20 text-navy rounded-sm"><Menu size={20} /></button>}
            {/* Em notebooks os rótulos dos botões somem (só ícones) para o título da tela caber inteiro. */}
            <h1 className="font-serif text-2xl md:text-3xl text-navy truncate min-w-0" title={title}>{title}</h1>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:flex-shrink-0">
          <TourTela />
          <PerguntarTela />
          {!simples && <BotaoExportar />}
          <SinoNotificacoes />
          {admin && (
            <button
              onClick={() => navigate('/equipe')}
              className="relative flex items-center gap-2 min-h-[44px] px-3 sm:px-4 bg-navy text-white rounded-sm text-sm hover:bg-navy-700 transition"
              aria-label={pendentes ? `Área do administrador: ${pendentes} cadastro(s) esperando liberação` : 'Área do administrador'}
              title="Área do administrador"
            >
              <UserCog size={16} aria-hidden="true" />
              <span className="hidden 2xl:inline">Área do administrador</span>
              {pendentes > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-dourado text-navy text-xs font-semibold flex items-center justify-center" aria-hidden="true">{pendentes}</span>
              )}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMaisAberto(a => !a)}
              aria-expanded={maisAberto}
              aria-haspopup="true"
              aria-label="Mais opções"
              title="Mais opções"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/15 rounded-sm text-grafite-claro hover:border-dourado hover:text-navy transition"
              data-testid="mais-opcoes"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
            {maisAberto && (
              <>
                <button type="button" aria-label="Fechar opções" tabIndex={-1} onClick={() => setMaisAberto(false)} className="fixed inset-0 z-40 cursor-default" />
                <div role="group" aria-label="Mais opções" className="absolute right-0 mt-2 z-50 w-64 bg-white border border-navy/15 shadow-lg p-2 space-y-1">
                  <button
                    onClick={() => { const t = tema === 'escuro' ? 'claro' : 'escuro'; aplicarTema(t); setTema(t); setMaisAberto(false) }}
                    className="w-full flex items-center gap-3 min-h-[44px] px-3 text-sm text-navy hover:bg-navy/5 text-left"
                    aria-label={tema === 'escuro' ? 'Usar modo claro' : 'Usar modo escuro'}
                    title={tema === 'escuro' ? 'Muda as cores da plataforma para o modo claro' : 'Muda as cores da plataforma para o modo escuro'}
                  >
                    {tema === 'escuro' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                    {tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
                  </button>
                  {admin && (
                    <button
                      onClick={() => { setMaisAberto(false); navigate('/laboratorio-admin') }}
                      className="w-full flex items-center gap-3 min-h-[44px] px-3 text-sm text-navy hover:bg-navy/5 text-left"
                      aria-label="Laboratório de autoavaliação, só para administradores"
                      title="Abre o laboratório de autoavaliação da plataforma, visível só para administradores"
                      data-testid="menu-laboratorio-admin"
                    >
                      <FlaskConical size={16} aria-hidden="true" />
                      Laboratório
                    </button>
                  )}
                  <p className="px-3 pt-1 text-[11px] text-grafite-claro">{NOME_PLATAFORMA}</p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setBuscaAberta(true)}
            className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 border border-navy/15 rounded-sm text-sm text-grafite-claro hover:border-dourado hover:text-navy transition flex-shrink-0"
            aria-label="Abrir busca global (Ctrl+K)"
            aria-haspopup="dialog"
            title="Abre a busca em todas as telas da plataforma (atalho Ctrl+K)"
          >
            <Search size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden md:inline text-[10px] uppercase tracking-wider border border-grafite-claro/30 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
          </div>
        </header>

        <FaixaConexao />
        <main className="flex-1 overflow-auto p-4 md:p-8"><AceiteTermos /><AceiteContratoSaas admin={admin} sede={sede} /><ExigirDoisFatores admin={admin} /><ErroTela chave={pathname}>{children}</ErroTela></main>
        <Atalhos />
      </div>
      <Busca aberta={buscaAberta} fechar={() => setBuscaAberta(false)} />
      <BoasVindas />
    </div>
  )
}
