import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { ROTAS_TELAS } from '@/data/rotas'

// Passo 59: em qualquer tela, um toque abre o Assistente já sabendo onde a pessoa está
// (nome da tela, rota, registro aberto e um resumo do que aparece) e com a pergunta pronta para editar.
export function resumoDaTela(): string {
  const main = document.querySelector('main') ?? document.body
  const titulos = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent?.trim()).filter(Boolean).slice(0, 8)
  const numeros = [...main.querySelectorAll('[data-testid], dt, dd, th')].map(e => e.textContent?.trim().replace(/\s+/g, ' ')).filter(t => t && t.length < 60).slice(0, 12)
  return [titulos.length ? 'Seções: ' + titulos.join(' · ') : '', numeros.length ? 'Itens visíveis: ' + numeros.join(' · ') : ''].filter(Boolean).join('\n').slice(0, 1500)
}

export default function PerguntarTela() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (pathname.startsWith('/assistente')) return null
  const tela = ROTAS_TELAS.find(r => r.rota === pathname)?.nome ?? document.querySelector('header h1')?.textContent?.trim() ?? pathname
  const id = pathname.split('/')[2] && !['novo', 'importar'].includes(pathname.split('/')[2]) ? pathname.split('/')[2] : ''
  const abrir = () => {
    const contexto = `Tela: ${tela} (${pathname})${id ? `\nRegistro aberto: ${id}` : ''}\n${resumoDaTela()}`
    const pedido = `Estou na tela "${tela}". Explique em linguagem simples o que ela mostra, o que merece atenção agora e qual o próximo passo recomendado.`
    navigate(`/assistente?pedido=${encodeURIComponent(pedido)}&contexto=${encodeURIComponent(contexto)}`)
  }
  return (
    <button type="button" onClick={abrir} data-testid="perguntar-tela"
      className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 border border-navy/20 text-navy text-sm hover:border-dourado transition"
      aria-label={`Perguntar ao Assistente sobre a tela ${tela}`} title="Perguntar sobre esta tela">
      <MessageCircle size={18} aria-hidden="true" />
      <span className="hidden lg:inline">Perguntar sobre esta tela</span>
    </button>
  )
}
