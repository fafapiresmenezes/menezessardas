import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { GUIAS, chaveGuia } from '@/lib/guias'

/** Guia de primeira visita: aparece aberto uma vez por tela e depois fica atrás do botão "Como usar esta tela". */
export default function GuiaDaTela({ caminho }: { caminho: string }) {
  const guia = GUIAS[caminho]
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!guia) return
    let visto = false
    try { visto = localStorage.getItem(chaveGuia(caminho)) === '1' } catch { /* sem memória local: mostra o guia */ }
    setAberto(!visto)
  }, [caminho, guia])

  if (!guia) return null

  const fechar = () => {
    try { localStorage.setItem(chaveGuia(caminho), '1') } catch { /* sem memória local */ }
    setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        data-testid="guia-abrir"
        title="Mostra de novo o passo a passo de como usar esta tela"
        className="mb-4 inline-flex items-center gap-2 min-h-[36px] text-sm text-navy underline underline-offset-4 print:hidden"
      >
        <HelpCircle size={16} aria-hidden="true" />
        Como usar esta tela
      </button>
    )
  }

  return (
    <section data-testid="guia-da-tela" aria-labelledby="guia-titulo" className="mb-6 max-w-4xl bg-dourado/10 border-l-4 border-dourado p-5 print:hidden">
      <h2 id="guia-titulo" className="text-base font-semibold flex items-center gap-2">
        <HelpCircle size={18} className="text-dourado" aria-hidden="true" />
        {guia.titulo}
      </h2>
      <ol className="list-decimal pl-5 mt-3 space-y-1 text-sm text-grafite">
        {guia.passos.map(p => <li key={p}>{p}</li>)}
      </ol>
      <button
        type="button"
        onClick={fechar}
        data-testid="guia-entendi"
        title="Fecha este passo a passo. Para ver de novo, clique em Como usar esta tela"
        className="mt-4 min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider rounded-sm"
      >
        Entendi
      </button>
    </section>
  )
}
