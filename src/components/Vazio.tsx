import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import { Inbox } from 'lucide-react'

// Passo 55: estado vazio padrão: ícone, uma frase do que não há e o próximo passo (botão ou link).
export default function Vazio({ titulo, texto, acao, icone, testid }: { titulo: string; texto?: string; acao?: { rotulo: string; para?: string; onClick?: () => void; dica?: string }; icone?: ReactNode; testid?: string }) {
  // Passo A27: o estado vazio é usado em telas montadas fora do roteador (prévias e testes); sem ele, o endereço
  // vira link comum (a plataforma roda com o endereço depois de "#").
  const comRoteador = useInRouterContext()
  return (
    <div className="text-center py-8 px-4" data-testid={testid ?? 'vazio'}>
      <div className="mx-auto w-10 h-10 flex items-center justify-center text-dourado" aria-hidden="true">{icone ?? <Inbox size={28} />}</div>
      <p className="text-grafite font-medium mt-2">{titulo}</p>
      {texto && <p className="text-sm text-grafite-claro mt-1 max-w-md mx-auto">{texto}</p>}
      {acao && (acao.para
        ? (comRoteador
          ? <Link to={acao.para} title={acao.dica ?? texto ?? titulo} className="inline-flex items-center min-h-[44px] px-4 mt-3 bg-navy text-white text-sm uppercase tracking-wider">{acao.rotulo}</Link>
          : <a href={`#${acao.para}`} title={acao.dica ?? texto ?? titulo} className="inline-flex items-center min-h-[44px] px-4 mt-3 bg-navy text-white text-sm uppercase tracking-wider">{acao.rotulo}</a>)
        : <button type="button" onClick={acao.onClick} title={acao.dica ?? texto ?? titulo} className="inline-flex items-center min-h-[44px] px-4 mt-3 bg-navy text-white text-sm uppercase tracking-wider">{acao.rotulo}</button>)}
    </div>
  )
}
