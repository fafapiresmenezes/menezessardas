import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Passo 62: atalhos de teclado. "?" mostra a lista; "g" + letra vai para a tela; "/" abre a busca.
export const ATALHOS: { teclas: string; acao: string; rota?: string }[] = [
  { teclas: '?', acao: 'Mostrar ou esconder esta lista' },
  { teclas: '/ ou Ctrl+K', acao: 'Abrir a busca global' },
  { teclas: 'g i', acao: 'Ir para a Entrada por área', rota: '/inicio' },
  { teclas: 'g p', acao: 'Ir para o Painel', rota: '/dashboard' },
  { teclas: 'g m', acao: 'Ir para Meu dia', rota: '/meu-dia' },
  { teclas: 'g c', acao: 'Ir para Casos e projetos', rota: '/projetos' },
  { teclas: 'g a', acao: 'Ir para a Agenda', rota: '/agenda' },
  { teclas: 'g n', acao: 'Ir para Intimações', rota: '/intimacoes' },
  { teclas: 'g h', acao: 'Ir para Honorários', rota: '/honorarios' },
  { teclas: 'g j', acao: 'Ir para o Assistente jurídico', rota: '/assistente' },
  { teclas: 'g s', acao: 'Ir para Configurações', rota: '/settings' },
  { teclas: 'Esc', acao: 'Fechar janela, busca ou menu aberto' },
  { teclas: 'Tab / Shift+Tab', acao: 'Andar entre campos e botões (o foco aparece com anel dourado)' },
]

const digitando = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export default function Atalhos() {
  const [aberto, setAberto] = useState(false)
  const g = useRef(0)
  const navigate = useNavigate()
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || digitando(e.target)) return
      if (e.key === '?') { e.preventDefault(); setAberto(a => !a); return }
      if (e.key === 'Escape') { setAberto(false); return }
      if (e.key === '/') { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); return }
      if (e.key === 'g') { g.current = Date.now(); return }
      if (Date.now() - g.current < 1500) {
        const alvo = ATALHOS.find(a => a.rota && a.teclas === `g ${e.key.toLowerCase()}`)
        g.current = 0
        if (alvo?.rota) { e.preventDefault(); navigate(alvo.rota) }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [navigate])
  useEffect(() => { if (aberto) setTimeout(() => fechar.current?.focus(), 20) }, [aberto])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 bg-navy/60 flex items-start justify-center p-4 pt-[10vh]" role="presentation" onClick={() => setAberto(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="atalhos-titulo" data-testid="atalhos" className="w-full max-w-lg bg-white shadow-2xl border-t-2 border-dourado p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="atalhos-titulo" className="font-serif text-2xl text-navy">Atalhos de teclado</h2>
          <button ref={fechar} type="button" onClick={() => setAberto(false)} className="min-h-[44px] px-3 text-sm underline text-navy">Fechar</button>
        </div>
        <table className="w-full text-sm mt-3">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1 pr-3">Teclas</th><th className="py-1">O que faz</th></tr></thead>
          <tbody>
            {ATALHOS.map(a => (
              <tr key={a.teclas} className="border-t border-navy/10">
                <td className="py-2 pr-3 whitespace-nowrap"><kbd className="text-xs border border-grafite-claro/40 rounded px-1.5 py-0.5">{a.teclas}</kbd></td>
                <td className="py-2">{a.acao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
