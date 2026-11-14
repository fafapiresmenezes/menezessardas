import { useEffect, useState } from 'react'
import GuiaDaTela from './GuiaDaTela'
import AguardandoLiberacao from './AguardandoLiberacao'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sairDemo } from '@/lib/authDemo'
import Marca from './Marca'
import { ehSede } from '@/lib/equipe'
import Busca from './Busca'
import BoasVindas from './BoasVindas'
import ParametrizarPlataforma from './ParametrizarPlataforma'
import Ajudante from './Ajudante'
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
import { listarPessoas, perfilAtual, meuEscritorio, esquecerEscritorio, type MeuEscritorio } from '@/lib/equipe'
import { verificarAvisosCriticos } from '@/lib/pwa'
import { minhaMarca, esquecerMarca, type MarcaEscritorio } from '@/lib/marca'
import { emDias } from '@/lib/datas'
import { Menu, X, LogOut, Search, Moon, Sun, UserCog, FlaskConical, ChevronDown, MoreHorizontal, Compass, LayoutGrid } from 'lucide-react'
import { gruposMenu, gruposVisiveis, atalhosDoMenu, frenteDe, DICAS, ROTULO_NIVEL, EXPLICA_NIVEL, type Visao } from './menuTelas'
import { meuAlcance, ALCANCE_FECHADO } from '@/lib/hierarquia'
import { lerMeuJeito, carregarMeuJeito, esquecerMeuJeito, aplicarLetra, EVENTO_JEITO, type MeuJeito } from '@/lib/meuJeito'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const CHAVE_GRUPOS = 'lsm-menu-grupos'
const CHAVE_SIMPLES = 'theye-menu-simples'
const estaAtivo = (href: string, pathname: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === '/fornecedores' && pathname.startsWith('/fornecedor/'))
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
  // Quem entrou mas ainda não pertence a um escritório não vê nada da plataforma: só a tela de espera.
  const [semEscritorio, setSemEscritorio] = useState(false)
  // O nome do escritório fica no topo de toda tela: ninguém trabalha sem saber onde está.
  const [escritorio, setEscritorio] = useState<MeuEscritorio | null>(null)
  useEffect(() => { meuEscritorio().then(setEscritorio).catch(() => setEscritorio(null)) }, [])
  // Hierarquia: sócios e gestor veem os números do conjunto; os demais nem veem esses grupos no menu.
  const [veTudo, setVeTudo] = useState(false)
  useEffect(() => { meuAlcance().then(a => setVeTudo(a.veTudo)).catch(() => setVeTudo(false)) }, [])
  // Meu jeito de trabalhar: o menu simples e o tamanho da letra são os que a pessoa escolheu.
  const [jeito, setJeito] = useState<MeuJeito>(lerMeuJeito)
  useEffect(() => {
    aplicarLetra(lerMeuJeito().letra)
    const reler = () => setJeito(lerMeuJeito())
    window.addEventListener(EVENTO_JEITO, reler)
    carregarMeuJeito().catch(() => undefined)
    return () => window.removeEventListener(EVENTO_JEITO, reler)
  }, [])

  // Área do administrador: só aparece para admin, com o número de cadastros esperando liberação.
  useEffect(() => {
    perfilAtual()
      .then(async f => {
        if (f === null) { setSemEscritorio(true); return }
        if (f !== 'admin') return
        setAdmin(true)
        const pessoas = await listarPessoas()
        setPendentes(pessoas.filter(p => !p.funcao).length)
      })
      .catch(() => undefined)
  }, [])
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const visao: Visao = { veTudo, admin, instituto: escritorio?.instituto === true, sede }
  const gruposDaPessoa = gruposVisiveis(visao)
  // Cada frente do Instituto é uma plataforma à parte: dentro dela, o menu do direito some.
  const frente = frenteDe(pathname)
  const meusAtalhos = atalhosDoMenu(jeito.atalhos, visao)
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
    // Privacidade por advogado: o aviso no celular é do caso de quem está logado. Intimação de processo
    // que ainda não é caso de ninguém avisa todo mundo, para ninguém perder prazo. Compromissos do
    // calendário são da locação e do escritório inteiro, e por isso seguem sem filtro.
    const conferir = () => verificarAvisosCriticos(async () => {
      const [i, c, casos, alc] = await Promise.all([
        supabase.from('intimacoes').select('id,lida,prazo_final,tribunal,numero_processo,tipo').eq('lida', false).not('prazo_final', 'is', null).lte('prazo_final', emDias(2)).limit(50),
        supabase.from('compromissos').select('id,titulo,data_evento').eq('data_evento', emDias(0)).limit(20),
        Promise.resolve(supabase.from('tarefas').select('numero_processo,responsavel_id').eq('nivel', 'projeto')).then(r => (r.data ?? []) as { numero_processo: string | null; responsavel_id: string | null }[], () => []),
        meuAlcance().catch(() => ALCANCE_FECHADO),
      ])
      const so = (n: string | null | undefined) => String(n ?? '').replace(/\D/g, '')
      const meus = new Set(casos.filter(t => t.responsavel_id === alc.id).map(t => so(t.numero_processo)))
      const comDono = new Set(casos.filter(t => t.responsavel_id).map(t => so(t.numero_processo)))
      const visivel = (n: string | null | undefined) => alc.veTudo || !comDono.has(so(n)) || meus.has(so(n))
      return { intimacoes: (i.data ?? []).filter(x => visivel((x as { numero_processo: string | null }).numero_processo)), compromissos: c.data ?? [] }
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
    esquecerMarca(); esquecerEscritorio(); esquecerMeuJeito()
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (semEscritorio) return <AguardandoLiberacao aoEntrar={() => window.location.reload()} />

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
          {frente && (
            <ul className="px-3 pt-3 space-y-1" data-testid="menu-frente" data-frente={frente.id}>
              {menuAberto && (
                <li className="px-4 pb-2 pt-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-dourado">Instituto THEYE</p>
                  <p className="text-base text-white">{frente.nome}</p>
                </li>
              )}
              {frente.itens.map(item => {
                const ativo = estaAtivo(item.href, pathname)
                return (
                  <li key={item.href}>
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
              <li className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/frentes-do-instituto')}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded text-white/85 hover:bg-white/5 hover:text-white"
                  data-testid="menu-frente-voltar"
                  title="Volta para a lista das frentes do Instituto, para abrir outra"
                >
                  <LayoutGrid size={20} className="flex-shrink-0" />
                  {menuAberto && <span className="text-sm">Todas as frentes do Instituto</span>}
                </button>
              </li>
            </ul>
          )}
          {!frente && simples && (
            <ul className="px-3 pt-3 space-y-1" data-testid="menu-simples">
              {meusAtalhos.map((item, i) => {
                const ativo = estaAtivo(item.href, pathname)
                const abreBloco = menuAberto && meusAtalhos[i - 1]?.bloco !== item.bloco
                return (
                  <li key={item.href}>
                    {abreBloco && (
                      <div className={`px-4 pb-1 ${i ? 'pt-4' : 'pt-1'}`} data-bloco={item.bloco}>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-dourado">{item.bloco}</p>
                        <p className="text-xs text-white/60">{item.dica}</p>
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
                  <button type="button" onClick={() => navigate('/meu-jeito')} className="w-full px-4 py-2 min-h-[44px] text-sm text-white/70 hover:text-white underline underline-offset-2 text-left" data-testid="menu-ajustar" title="Escolha quais telas aparecem neste menu, em que ordem, e o tamanho da letra">
                    Ajustar o meu menu
                  </button>
                  <button type="button" onClick={() => mudarSimples(false)} className="w-full px-4 py-2 min-h-[44px] text-sm text-white/70 hover:text-white underline underline-offset-2 text-left" data-testid="menu-ver-tudo" title="Troca para o menu completo, com todas as telas da plataforma agrupadas por assunto">
                    Ver todas as telas
                  </button>
                </li>
              )}
            </ul>
          )}
          {!frente && !simples && menuAberto && (
            <div className="px-4 pt-3">
              <button type="button" onClick={() => mudarSimples(true)} className="text-sm text-dourado hover:underline underline-offset-2 min-h-[36px]" data-testid="menu-voltar-simples" title="Volta ao menu simples, só com as telas usadas todo dia">
                ← Voltar ao menu simples
              </button>
            </div>
          )}
          {!frente && !simples && menuAberto && (
            <div className="px-4 pt-3 flex justify-end">
              {(() => {
                const visiveis = gruposDaPessoa
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
          {!frente && !simples && gruposDaPessoa.map(grupo => {
            const itens = grupo.itens
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
                    <span className="text-left">{grupo.titulo}{grupo.nivel !== 'todos' && <span className="block normal-case tracking-normal text-[10px] text-white/50" data-nivel={grupo.nivel} title={EXPLICA_NIVEL[grupo.nivel]}>{ROTULO_NIVEL[grupo.nivel]}</span>}</span>
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
                            {menuAberto && (
                              <span className="text-sm text-left">
                                <span className="block">{item.label}</span>
                                {item.nivel && item.nivel !== 'todos' && (
                                  <span className="block text-[10px] text-white/50" data-nivel={item.nivel} title={EXPLICA_NIVEL[item.nivel]}>{ROTULO_NIVEL[item.nivel]}</span>
                                )}
                              </span>
                            )}
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
            <div className="min-w-0">
              <h1 className="font-serif text-2xl md:text-3xl text-navy truncate min-w-0" title={title}>{title}</h1>
              {frente && <p className="text-xs text-grafite-claro truncate" data-testid="frente-atual" title="Você está numa frente do Instituto THEYE, separada da plataforma de direito.">Instituto THEYE · <strong className="text-grafite">{frente.nome}</strong></p>}
              {!frente && escritorio && <p className="text-xs text-grafite-claro truncate" data-testid="escritorio-atual" title="Você está trabalhando dentro deste escritório. Só as pessoas dele enxergam estes dados.">Escritório: <strong className="text-grafite">{escritorio.nome}</strong></p>}
            </div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:flex-shrink-0">
          <TourTela />
          <PerguntarTela />
          {!simples && <BotaoExportar />}
          <SinoNotificacoes />
          {admin && !frente && (
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
                  {/* Pedido de M (14/11/2026 07h26): a tela de início só mostra direito, e dá a
                      impressão de que o Instituto é só a parte jurídica. Este item leva a uma tela
                      com todas as áreas, sem mudar o /inicio em si (a Dra. Fátima continua caindo
                      direto no dela todo dia). */}
                  <button
                    onClick={() => { setMaisAberto(false); navigate('/areas') }}
                    className="w-full flex items-center gap-3 min-h-[44px] px-3 text-sm text-navy hover:bg-navy/5 text-left"
                    aria-label="Trocar de área do Instituto"
                    title="Mostra todas as áreas do Instituto THEYE para você escolher para onde ir"
                    data-testid="menu-trocar-area"
                  >
                    <Compass size={16} aria-hidden="true" />
                    Trocar de área
                  </button>
                  {/* Passo A27: o laboratório é do Instituto, não do escritório cliente: só aparece para quem entra pelo Instituto. */}
                  {admin && visao.instituto && (
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
        <main className="flex-1 overflow-auto p-4 md:p-8"><AceiteTermos /><AceiteContratoSaas admin={admin} sede={sede} /><ExigirDoisFatores admin={admin} /><GuiaDaTela caminho={pathname} /><ErroTela chave={pathname}>{children}</ErroTela></main>
        <Atalhos />
      </div>
      <Busca aberta={buscaAberta} fechar={() => setBuscaAberta(false)} />
      <BoasVindas />
      <ParametrizarPlataforma />
      <Ajudante />
    </div>
  )
}
