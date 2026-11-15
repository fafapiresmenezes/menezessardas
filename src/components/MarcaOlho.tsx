/**
 * A logo do olho do Instituto THEYE. "THEYE" se lê como "the eye" (o olho), e o domínio é
 * theyeofgod.org — o olho é o símbolo da marca. É um desenho em traço, numa cor só (herda a cor
 * do texto ao redor: branco no escuro, escuro no claro), para ficar nítido em qualquer fundo e em
 * qualquer tamanho, do favicon à porta.
 *
 * Pedido de M em 14/11/2026: a logo do olho tinha sumido do lockup (que era só texto). Voltou aqui.
 */
interface Props { tamanho?: number; className?: string; titulo?: string }

export default function MarcaOlho({ tamanho = 40, className = '', titulo = 'Instituto THEYE' }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      role="img"
      aria-label={titulo}
      className={className}
      fill="none"
      stroke="currentColor"
      data-testid="marca-olho"
    >
      {/* contorno do olho (amêndoa) */}
      <path d="M6 32 C 18 16, 46 16, 58 32 C 46 48, 18 48, 6 32 Z" strokeWidth="2.5" strokeLinejoin="round" />
      {/* íris */}
      <circle cx="32" cy="32" r="10.5" strokeWidth="2.5" />
      {/* pupila */}
      <circle cx="32" cy="32" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
