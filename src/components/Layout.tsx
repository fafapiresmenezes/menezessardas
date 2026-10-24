import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sairDemo } from '@/lib/authDemo'
import Marca from './Marca'
import { Menu, X, LogOut, LayoutGrid, Building2, CalendarDays, Bell, FileBarChart, Settings } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const itensMenu = [
  { icon: LayoutGrid, label: 'Painel', href: '/dashboard' },
  { icon: Building2, label: 'Imóveis', href: '/imoveis' },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
  { icon: Bell, label: 'Alertas', href: '/alertas' },
  { icon: FileBarChart, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
]

export default function Layout({ children, title }: LayoutProps) {
  const [menuAberto, setMenuAberto] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  )
  const navigate = useNavigate()
  const { pathname } = useLocation()

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
              const ativo = pathname.startsWith(item.href)
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

        <div className="p-3 border-t border-white/10">
          <button
            onClick={sair}
            className="w-full flex items-center gap-3 px-4 py-3 rounded hover:bg-white/5 transition text-white/75 hover:text-white"
            title={!menuAberto ? 'Sair' : undefined}
          >
            <LogOut size={19} className="flex-shrink-0" />
            {menuAberto && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-navy/10 px-4 md:px-8 py-5 flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl md:text-3xl text-navy truncate">{title}</h1>
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <span className="h-8 w-px bg-dourado/40" aria-hidden="true" />
            <span className="text-xs uppercase tracking-[0.16em] text-grafite-claro">
              Leticia Sardas &amp; Menezes
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
