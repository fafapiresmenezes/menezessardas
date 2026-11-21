import { Link } from 'react-router-dom'
import { entradaPara, ROTA_ADMIN } from '@/lib/destino'

/**
 * O símbolo da administração: o ouro alquímico (o círculo com um ponto, o Sol), uma seta para a
 * direita, o infinito e um mais — "entrar e seguir sem fim". Usado na porta e na entrada administrativa.
 */
export function SimboloOuro({ largura = 76, className = '' }: { largura?: number; className?: string }) {
  return (
    <svg width={largura} height={(largura * 20) / 76} viewBox="0 0 76 20" fill="none" aria-hidden="true" className={`text-[#C9A24A] ${className}`}>
      <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <path d="M22 10 H33 M30 7.2 L33 10 L30 12.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M41 10 C41 7.4 44.2 7.4 45.8 10 C47.4 12.6 50.6 12.6 50.6 10 C50.6 7.4 47.4 7.4 45.8 10 C44.2 12.6 41 12.6 41 10 Z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M64 5.5 V14.5 M59.5 10 H68.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Entrada da administração do Instituto, no alto à direita da porta (M, 20/11 e 21/11/2026).
 * Leva à entrada administrativa (login e senha só da administração), e dali à plataforma de gestão
 * do Instituto inteiro. Antes ficava quase apagada no canto; agora é um selo dourado legível.
 * É só a porta da tela: quem decide quem administra é o banco (eh_admin_instituto).
 */
export default function EntradaMembros() {
  return (
    <Link
      to={entradaPara(ROTA_ADMIN)}
      data-testid="entrada-membros"
      aria-label="Área administrativa do Instituto"
      title="Área administrativa — gestão do Instituto THEYE inteiro"
      className="group inline-flex items-center gap-3 rounded-full border border-[#C9A24A]/60 bg-black/40 px-4 py-2 text-[#C9A24A] no-underline backdrop-blur transition hover:border-[#C9A24A] hover:bg-[#C9A24A]/10 hover:shadow-[0_0_18px_rgba(201,162,74,0.35)]"
    >
      <SimboloOuro largura={64} />
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Administração</span>
    </Link>
  )
}
