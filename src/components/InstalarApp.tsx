/**
 * App de telefone, Fase A (trilho v2, P13): instalar a plataforma no ecrã inicial.
 * No Android/Chrome usa o pedido nativo de instalação; no iPhone mostra o caminho (Partilhar →
 * Adicionar ao ecrã principal). Quando já está instalada (modo standalone), não aparece.
 */
import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'

type PedidoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function InstalarApp() {
  const [pedido, setPedido] = useState<PedidoInstalar | null>(null)
  const [mostrarIos, setMostrarIos] = useState(false)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) { setInstalado(true); return }
    } catch { /* sem matchMedia */ }
    const guardar = (e: Event) => { e.preventDefault(); setPedido(e as PedidoInstalar) }
    window.addEventListener('beforeinstallprompt', guardar)
    const ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ehIos) setMostrarIos(true)
    return () => window.removeEventListener('beforeinstallprompt', guardar)
  }, [])

  if (instalado || (!pedido && !mostrarIos)) return null
  return (
    <div className="w-full max-w-6xl mb-8 -mt-4 border border-white/30 text-white p-4 flex flex-wrap items-center gap-3 text-sm" data-testid="instalar-app">
      <Smartphone className="w-5 h-5 text-dourado shrink-0" aria-hidden />
      {pedido ? (
        <>
          <span>A plataforma também é um aplicativo: instala no telemóvel e abre com um toque, sem navegador.</span>
          <button
            type="button"
            data-testid="botao-instalar-app"
            title="Instala a plataforma no ecrã inicial do aparelho, como um aplicativo"
            onClick={() => { pedido.prompt().catch(() => undefined) }}
            className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-xs"
          >
            Instalar no telemóvel
          </button>
        </>
      ) : (
        <span data-testid="instalar-ios">No iPhone: toca em <strong>Partilhar</strong> e depois em <strong>Adicionar ao ecrã principal</strong> — a plataforma vira um aplicativo.</span>
      )}
    </div>
  )
}
