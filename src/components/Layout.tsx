import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sairDemo } from '@/lib/authDemo'
import Marca from './Marca'
import Busca from './Busca'
import BoasVindas from './BoasVindas'
import { aplicarTema, temaAtual } from '@/lib/tema'
import { listarPessoas, perfilAtual } from '@/lib/equipe'
import { Menu, X, LogOut, LayoutGrid, Building2, CalendarDays, Bell, FileBarChart, Gauge, ShieldCheck, Truck, Scale, Settings, Users, Search, Moon, Sun, MessageSquare, UserCog, TrendingUp, FlaskConical, Wallet, Home, Globe, FolderKanban, Inbox, UserCheck, Sunrise } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const itensMenu = [
  { icon: Home, label: 'Trocar de área', href: '/inicio' },
  { icon: LayoutGrid, label: 'Painel', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projetos', href: '/projetos' },
  { icon: Inbox, label: 'Intimações', href: '/intimacoes' },
  { icon: Building2, label: 'Imóveis', href: '/imoveis' },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
  { icon: Bell, label: 'Alertas', href: '/alertas' },
  { icon: Truck, label: 'Fornecedores', href: '/fornecedores' },
  { icon: Scale, label: 'Legislação', href: '/legislacao' },
  { icon: MessageSquare, label: 'Assistente', href: '/assistente' },
  { icon: Sunrise, label: 'Meu dia', href: '/meu-dia' },
  { icon: Globe, label: 'Fontes do advogado', href: '/fontes' },
  { icon: UserCheck, label: 'Checagem de contraparte', href: '/kyc' },
  { icon: ShieldCheck, label: 'Compliance', href: '/compliance' },
  { icon: TrendingUp, label: 'Mercado jurídico', href: '/mercado' },
  { icon: Gauge, label: 'Indicadores', href: '/indicadores' },
  { icon: TrendingUp, label: 'Previsões', href: '/previsoes' },
  { icon: FlaskConical, label: 'Instituto', href: '/instituto' },
  { icon: FileBarChart, label: 'Relatórios', href: '/relatorios' },
  { icon: ShieldCheck, label: 'Trilha', href: '/trilha' },
  { icon: Wallet, label: 'Consumo', href: '/consumo' },
  { icon: Users, label: 'Equipe', href: '/equipe' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
]

export default function Layout({ children, title }: LayoutProps) {
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
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-pergaminho">
      <aside
        className={`${
          menuAberto ? 'w-64' : 'w-20'
        } bg-navy text-white transition-all duration-300 overflow-hidden flex flex-col flex-shrink-0`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
          {menuAberto ? (
            <Marca className="flex-1 min-w-0" />
          ) : (
            <span className="font-serif text-dourado tracking-widest text-lg mx-auto" aria-hidden="true">
              LSM
            </span>
          )}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 hover:bg-white/10 rounded flex-shrink-0"
            aria-label={menuAberto ? 'Recolher menu' : 'Expandir menu'}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto" aria-label="Menu principal">
          <ul className="space-y-1 p-3">
            {itensMenu.map((item) => {
              const ativo = pathname.startsWith(item.href) || (item.href === '/fornecedores' && pathname.startsWith('/fornecedor/'))
              return (
                <li key={item.label}>
                  <button
                    onClick={() => navigate(item.href)}
                    aria-current={ativo ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition border-l-2 ${
                      ativo
                        ? 'bg-white/10 border-dourado text-white'
                        : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                    title={!menuAberto ? item.label : undefined}
                  >
                    <item.icon size={19} className="flex-shrink-0" />
                    {menuAberto && <span className="text-sm">{item.label}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
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
              Instituto THEYE
            </p>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-navy/10 px-4 md:px-8 py-5 flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl md:text-3xl text-navy truncate">{title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
          {admin && (
            <button
              onClick={() => navigate('/equipe')}
              className="relative flex items-center gap-2 min-h-[44px] px-3 sm:px-4 bg-navy text-white rounded-sm text-sm hover:bg-navy-700 transition"
              aria-label={pendentes ? `Área do administrador: ${pendentes} cadastro(s) esperando liberação` : 'Área do administrador'}
            >
              <UserCog size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Área do administrador</span>
              {pendentes > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-dourado text-navy text-xs font-semibold flex items-center justify-center" aria-hidden="true">{pendentes}</span>
              )}
            </button>
          )}
          <button
            onClick={() => { const t = tema === 'escuro' ? 'claro' : 'escuro'; aplicarTema(t); setTema(t) }}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/15 rounded-sm text-grafite-claro hover:border-dourado hover:text-navy transition"
            aria-label={tema === 'escuro' ? 'Usar modo claro' : 'Usar modo escuro'}
            title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
          >
            {tema === 'escuro' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <button
            onClick={() => setBuscaAberta(true)}
            className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 border border-navy/15 rounded-sm text-sm text-grafite-claro hover:border-dourado hover:text-navy transition flex-shrink-0"
            aria-label="Abrir busca global (Ctrl+K)"
            aria-haspopup="dialog"
          >
            <Search size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden md:inline text-[10px] uppercase tracking-wider border border-grafite-claro/30 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
      <Busca aberta={buscaAberta} fechar={() => setBuscaAberta(false)} />
      <BoasVindas />
    </div>
  )
}
