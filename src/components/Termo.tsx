import { useId, useState } from 'react'
import { definicao, marcarTermos } from '@/data/glossario'

// Termo jurídico sublinhado; explica ao passar o mouse, focar ou tocar.
export function Termo({ children }: { children: string }) {
  const [aberto, setAberto] = useState(false); const id = useId(); const d = definicao(children)
  if (!d) return <>{children}</>
  return (
    <span className="relative inline">
      <button type="button" data-testid="termo" aria-describedby={aberto ? id : undefined} onClick={() => setAberto(true)} onKeyDown={e => { if (e.key === "Escape") setAberto(false) }} onMouseEnter={() => setAberto(true)} onMouseLeave={() => setAberto(false)} onFocus={() => setAberto(true)} onBlur={() => setAberto(false)} className="underline decoration-dotted decoration-dourado underline-offset-2 cursor-help text-inherit">{children}</button>
      {aberto && <span id={id} role="tooltip" data-testid="termo-explicacao" className="absolute left-0 top-full z-20 mt-1 w-64 bg-navy text-white text-xs normal-case tracking-normal p-2 shadow-lg">{d}</span>}
    </span>
  )
}

export function TextoComTermos({ texto }: { texto: string }) {
  return <>{marcarTermos(texto).map((p, i) => p.termo ? <Termo key={i}>{p.t}</Termo> : <span key={i}>{p.t}</span>)}</>
}
