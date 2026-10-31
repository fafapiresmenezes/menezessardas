import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

// Passo 60: central de notificações. Intimações novas, tarefas atribuídas a você,
// normas que afetam contratos ou casos e faturas chegam aqui, com contador no sino.
interface Notificacao { id: number; tipo: string; titulo: string; link: string | null; criado_em: string; lida_em: string | null }

const ROTULO: Record<string, string> = { intimacao: 'Intimação', tarefa: 'Tarefa', legislacao: 'Legislação', fatura: 'Fatura', sistema: 'Aviso' }

function quando(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function SinoNotificacoes() {
  const [lista, setLista] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const carregar = () => {
    if (!supabaseConfigurado) return
    supabase.from('notificacoes').select('id,tipo,titulo,link,criado_em,lida_em').order('criado_em', { ascending: false }).limit(30)
      .then(({ data }) => setLista((data ?? []) as Notificacao[]))
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 120000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  if (!supabaseConfigurado) return null
  const naoLidas = lista.filter(n => !n.lida_em).length

  const abrir = async (n: Notificacao) => {
    setAberto(false)
    if (!n.lida_em) { setLista(l => l.map(x => x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x)); await supabase.rpc('marcar_notificacoes_lidas', { p_ids: [n.id] }) }
    if (n.link) navigate(n.link)
  }
  const todasLidas = async () => {
    setLista(l => l.map(x => ({ ...x, lida_em: x.lida_em ?? new Date().toISOString() })))
    await supabase.rpc('marcar_notificacoes_lidas', { p_ids: null })
  }

  return (
    <div className="relative" ref={caixa}>
      <button type="button" onClick={() => setAberto(a => !a)} data-testid="sino"
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lida(s)` : 'Notificações: nenhuma nova'} aria-expanded={aberto} aria-haspopup="dialog"
        className="relative flex items-center justify-center min-h-[44px] min-w-[44px] border border-navy/20 text-navy hover:border-dourado transition">
        <Bell size={18} aria-hidden="true" />
        {naoLidas > 0 && <span data-testid="sino-contador" className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-critico text-white text-[11px] font-semibold flex items-center justify-center">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div role="dialog" aria-label="Notificações" data-testid="sino-painel"
          className="absolute right-0 mt-2 w-[min(92vw,380px)] bg-white shadow-2xl border-t-2 border-dourado z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy/10">
            <p className="text-sm font-medium text-navy">Notificações</p>
            {naoLidas > 0 && <button type="button" onClick={todasLidas} className="text-xs underline text-navy min-h-[44px]">Marcar todas como lidas</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-navy/10">
            {lista.length === 0 && <li className="px-4 py-6 text-sm text-grafite-claro text-center">Nada por aqui. Quando chegar intimação, tarefa ou norma que afete seus casos, aparece aqui.</li>}
            {lista.map(n => (
              <li key={n.id}>
                <button type="button" onClick={() => abrir(n)} data-testid="sino-item"
                  className={`w-full text-left px-4 py-3 min-h-[44px] hover:bg-pergaminho ${n.lida_em ? 'opacity-70' : 'border-l-2 border-dourado'}`}>
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-dourado-escuro">{ROTULO[n.tipo] ?? n.tipo} · {quando(n.criado_em)}</span>
                  <span className="block text-sm text-navy">{n.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
