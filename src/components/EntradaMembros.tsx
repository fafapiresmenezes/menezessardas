import { Link } from 'react-router-dom'
import { entradaPara } from '@/lib/destino'

/**
 * Entrada de membros, no alto à direita da porta (pedido de M, 20/11/2026). Bem discreta.
 * O símbolo é o do ouro alquímico (o círculo com um ponto, o Sol) seguido de uma seta para a
 * direita, o infinito e um mais — "entrar e seguir sem fim". Leva à área de membros, que é a
 * plataforma de gestão da fundação do Instituto inteiro (/instituto). Quem não é membro volta
 * ao início; é só a porta da tela, o banco é quem guarda os dados.
 */
export default function EntradaMembros() {
  return (
    <Link
      to={entradaPara('/instituto')}
      data-testid="entrada-membros"
      aria-label="Entrada de membros"
      title="Entrada de membros — área de gestão da fundação"
      className="group inline-flex items-center opacity-45 transition hover:opacity-100"
    >
      {/* o traço usa o dourado da marca */}
      <svg width="76" height="20" viewBox="0 0 76 20" fill="none" aria-hidden="true" className="text-[#C9A24A]">
        {/* ouro alquímico: círculo com um ponto no centro (o Sol) */}
        <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        {/* seta para a direita */}
        <path d="M22 10 H33 M30 7.2 L33 10 L30 12.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        {/* infinito */}
        <path d="M41 10 C41 7.4 44.2 7.4 45.8 10 C47.4 12.6 50.6 12.6 50.6 10 C50.6 7.4 47.4 7.4 45.8 10 C44.2 12.6 41 12.6 41 10 Z" stroke="currentColor" strokeWidth="1.1" />
        {/* mais */}
        <path d="M64 5.5 V14.5 M59.5 10 H68.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </Link>
  )
}
