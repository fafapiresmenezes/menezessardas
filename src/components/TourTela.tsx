import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { tourDaRota } from '@/data/tours'

// Passo 52: botão "Como usar esta tela" no cabeçalho; 3 passos com destaque dourado no elemento da tela.
const CHAVE = 'lsm-tours-vistos'
function lerLocal(): string[] { try { return JSON.parse(localStorage.getItem(CHAVE) || '[]') } catch { return [] } }

export default function TourTela() {
  const { pathname } = useLocation()
  const tour = tourDaRota(pathname)
  const [aberto, setAberto] = useState(false)
  const [i, setI] = useState(0)
  const [vistos, setVistos] = useState<string[]>(lerLocal)
  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.from('preferencias_usuario').select('tours_vistos').maybeSingle().then(({ data }) => {
      const v = Array.isArray(data?.tours_vistos) ? (data!.tours_vistos as string[]) : []
      if (v.length) { const u = Array.from(new Set([...lerLocal(), ...v])); setVistos(u); try { localStorage.setItem(CHAVE, JSON.stringify(u)) } catch { /* sem armazenamento */ } }
    })
  }, [])
  useEffect(() => { setAberto(false); setI(0) }, [pathname])
  useEffect(() => {
    document.querySelectorAll('.tour-destaque').forEach(e => e.classList.remove('tour-destaque'))
    if (!aberto || !tour) return
    const sel = tour.passos[i]?.seletor
    if (!sel) return
    let el: Element | null = null
    for (const s of sel.split(',')) { try { el = document.querySelector(s.trim()) } catch { el = null } if (el) break }
    if (el) { el.classList.add('tour-destaque'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
    return () => { el?.classList.remove('tour-destaque') }
  }, [aberto, i, tour])
  if (!tour) return null
  const visto = vistos.includes(tour.rota)
  const fechar = () => {
    setAberto(false); setI(0)
    if (!visto) {
      const u = [...vistos, tour.rota]; setVistos(u)
      try { localStorage.setItem(CHAVE, JSON.stringify(u)) } catch { /* sem armazenamento */ }
      if (supabaseConfigurado) supabase.rpc('marcar_tour_visto', { p_rota: tour.rota }).then(() => undefined, () => undefined)
    }
  }
  const p = tour.passos[i]
  return (
    <>
      <button type="button" onClick={() => { setI(0); setAberto(true) }} data-testid="tour-abrir"
        className="relative min-h-[44px] inline-flex items-center gap-2 px-3 border border-navy/15 rounded-sm text-sm text-grafite-claro hover:border-dourado hover:text-navy transition flex-shrink-0"
        aria-label={`Como usar esta tela: ${tour.nome}`} title="Como usar esta tela">
        <HelpCircle size={16} aria-hidden="true" /><span className="hidden lg:inline">Como usar</span>
        {!visto && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-dourado" aria-hidden="true" data-testid="tour-novo" />}
      </button>
      {aberto && (
        <div className="fixed inset-x-0 bottom-0 sm:bottom-6 sm:right-6 sm:left-auto z-[60] sm:w-[380px]" role="dialog" aria-modal="false" aria-labelledby="tour-titulo" data-testid="tour-dialogo">
          <div className="bg-navy text-white shadow-xl border-t-2 border-dourado p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-wider text-dourado">Como usar · {tour.nome} · passo {i + 1} de {tour.passos.length}</p>
              <button type="button" onClick={fechar} aria-label="Fechar tour" className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center hover:text-dourado"><X size={16} aria-hidden="true" /></button>
            </div>
            <h2 id="tour-titulo" className="font-serif text-lg mt-1" data-testid="tour-passo-titulo">{p.titulo}</h2>
            <p className="text-sm text-white/85 mt-1">{p.texto}</p>
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="min-h-[40px] px-3 text-sm inline-flex items-center gap-1 disabled:opacity-30"><ChevronLeft size={14} aria-hidden="true" /> Anterior</button>
              {i < tour.passos.length - 1
                ? <button type="button" onClick={() => setI(i + 1)} data-testid="tour-proximo" className="min-h-[40px] px-4 bg-dourado text-navy text-sm font-medium inline-flex items-center gap-1">Próximo <ChevronRight size={14} aria-hidden="true" /></button>
                : <button type="button" onClick={fechar} data-testid="tour-concluir" className="min-h-[40px] px-4 bg-dourado text-navy text-sm font-medium">Entendi</button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
