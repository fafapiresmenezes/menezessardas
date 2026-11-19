/**
 * A moldura da casa própria dos fundos (pedido de M, 19/11/2026): marca e menu DELA,
 * sem nada da plataforma de direito. O menu mostra só os ecrãs que o nível de quem olha abre
 * (veEcra), o início é /fundos, e a única porta para fora é o site do Instituto.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Home } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sairDemo } from '@/lib/authDemo'
import { ECRAS_FUNDOS, GRUPOS_FUNDOS } from '@/data/ecrasFundos'
import { usePessoaFundos } from '@/components/VerComoFundos'
import { veEcra } from '@/lib/visaoFundos'

export default function LayoutFundos({ children, title }: { children: React.ReactNode; title?: string }) {
  const [menuAberto, setMenuAberto] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pessoa = usePessoaFundos()
  const sair = async () => {
    try { if (supabaseConfigurado) await supabase.auth.signOut() } catch { /* sai na mesma */ }
    sairDemo()
    navigate('/login')
  }
  return (
    <div className="min-h-screen flex bg-areia text-navy">
      {menuAberto && (
        <aside className="w-64 shrink-0 bg-navy text-white flex flex-col min-h-screen" aria-label="Menu da casa de fundos">
          <div className="p-4 border-b border-white/15">
            <Link to="/fundos" title="Volta ao início da plataforma de fundos" className="block">
              <p className="font-serif text-xl tracking-wide">THEYE</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-dourado">Fundos internacionais</p>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-2" aria-label="Ecrãs da casa">
            <Link to="/fundos" title="O início da plataforma de fundos, com todos os ecrãs do seu nível"
              className={`flex items-center gap-2 px-3 min-h-[40px] text-sm rounded-sm ${pathname === '/fundos' ? 'bg-white/15' : 'hover:bg-white/10'}`}>
              <Home className="w-4 h-4 shrink-0 text-dourado" aria-hidden /> Início
            </Link>
            {GRUPOS_FUNDOS.map(grupo => {
              const itens = ECRAS_FUNDOS.filter(e => e.grupo === grupo && veEcra(pessoa, e.rota))
              if (itens.length === 0) return null
              return (
                <div key={grupo} className="mt-3">
                  <p className="px-3 text-[11px] uppercase tracking-wider text-white/50">{grupo}</p>
                  {itens.map(e => (
                    <Link key={e.rota} to={e.rota} title={e.resumo}
                      className={`flex items-center gap-2 px-3 min-h-[40px] text-sm rounded-sm ${pathname === e.rota ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                      <e.icone className="w-4 h-4 shrink-0 text-dourado" aria-hidden />
                      <span className="truncate">{e.nome}</span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </nav>
          <div className="p-3 border-t border-white/15 space-y-1">
            <Link to="/fundos-internacionais" title="Abre a página pública desta frente no site do Instituto" className="block px-3 py-2 text-xs text-white/70 hover:text-white underline decoration-white/30">Site do Instituto</Link>
            <button type="button" onClick={sair} title="Sai da plataforma e volta à entrada"
              className="w-full flex items-center gap-2 px-3 min-h-[40px] text-sm hover:bg-white/10 rounded-sm text-left">
              <LogOut className="w-4 h-4 shrink-0" aria-hidden /> Sair
            </button>
          </div>
        </aside>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-navy/15 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setMenuAberto(a => !a)} title={menuAberto ? 'Esconde o menu' : 'Mostra o menu'}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/20 rounded-sm">
            {menuAberto ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
          </button>
          <h1 className="font-serif text-xl text-navy truncate">{title ?? 'Fundos internacionais'}</h1>
          <span className="ml-auto text-[11px] uppercase tracking-wider text-grafite-claro hidden sm:block">Demonstração · dados de exemplo</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
