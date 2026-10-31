import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'

// Passo 55: estado vazio padrão: ícone, uma frase do que não há e o próximo passo (botão ou link).
export default function Vazio({ titulo, texto, acao, icone, testid }: { titulo: string; texto?: string; acao?: { rotulo: string; para?: string; onClick?: () => void }; icone?: ReactNode; testid?: string }) {
  return (
    <div className="text-center py-8 px-4" data-testid={testid ?? 'vazio'}>
      <div className="mx-auto w-10 h-10 flex items-center justify-center text-dourado" aria-hidden="true">{icone ?? <Inbox size={28} />}</div>
      <p className="text-grafite font-medium mt-2">{titulo}</p>
      {texto && <p className="text-sm text-grafite-claro mt-1 max-w-md mx-auto">{texto}</p>}
      {acao && (acao.para
        ? <Link to={acao.para} className="inline-flex items-center min-h-[44px] px-4 mt-3 bg-navy text-white text-sm uppercase tracking-wider">{acao.rotulo}</Link>
        : <button type="button" onClick={acao.onClick} className="inline-flex items-center min-h-[44px] px-4 mt-3 bg-navy text-white text-sm uppercase tracking-wider">{acao.rotulo}</button>)}
    </div>
  )
}
