/**
 * A logo do olho do Instituto THEYE. "THEYE" se lê como "the eye" (o olho), e o domínio é
 * theyeofgod.org — o olho é o símbolo da marca. É um desenho em traço, numa cor só (herda a cor
 * do texto ao redor: branco no escuro, escuro no claro), para ficar nítido em qualquer fundo e em
 * qualquer tamanho, do favicon à porta.
 *
 * Pedido de M em 14/11/2026: a logo do olho tinha sumido do lockup (que era só texto). Voltou aqui.
 */
interface Props {
  tamanho?: number
  className?: string
  titulo?: string
  /**
   * Pedido de M em 20/11/2026: na primeira faixa da página inicial, uma estrela de oito raios (a
   * estrela do caos) dentro da pupila, "muito disfarçada". Ela é desenhada na cor do fundo, fina e
   * quase transparente, por cima da pupila: só quem olha de perto percebe. Fora da página inicial a
   * logo continua sem ela.
   */
  estrela?: boolean
}

// Oito raios saindo do centro da pupila, cada um com uma ponta de seta pequena.
const RAIOS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4
  const p = (r: number, d = 0) => `${(32 + r * Math.cos(a + d)).toFixed(2)} ${(32 + r * Math.sin(a + d)).toFixed(2)}`
  return `M${p(0.55)} L${p(3.05)} M${p(2.35, 0.32)} L${p(3.05)} L${p(2.35, -0.32)}`
}).join(' ')

export default function MarcaOlho({ tamanho = 40, className = '', titulo = 'Instituto THEYE', estrela = false }: Props) {
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
      {/* contorno do olho (lente/amêndoa), com o traço fino e gracioso da logo nova (20/11/2026) */}
      <path d="M4 32 C 16 17.5, 48 17.5, 60 32 C 48 46.5, 16 46.5, 4 32 Z" strokeWidth="1.8" strokeLinejoin="round" />
      {/* íris: anel duplo, dá o ar de lente/joia */}
      <circle cx="32" cy="32" r="11" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="7" strokeWidth="1" strokeOpacity="0.55" />
      {/* pupila */}
      <circle cx="32" cy="32" r="3.2" fill="currentColor" stroke="none" />
      {estrela && (
        <path
          d={RAIOS}
          stroke="#000"
          strokeOpacity="0.16"
          strokeWidth="0.22"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid="estrela-na-pupila"
        />
      )}
    </svg>
  )
}
