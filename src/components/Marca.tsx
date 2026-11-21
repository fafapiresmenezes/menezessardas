import type { MarcaEscritorio } from '@/lib/marca'
import { NOME_PLATAFORMA, SUBTITULO_INSTITUTO, NOME_INSTITUTO_COMPLETO, NOME_PRODUTO_PROJECTOS } from '@/lib/plataforma'
import MarcaOlho from '@/components/MarcaOlho'

interface MarcaProps {
  tamanho?: 'pequena' | 'grande'
  comSubtitulo?: boolean
  className?: string
  /** Passo D22: marca do escritório parceiro (white-label). Sem ela, o lockup THEYE Institute. */
  marca?: MarcaEscritorio | null
  /** Subtítulo já traduzido. Sem ele, fica o português padrão da plataforma. */
  subtitulo?: string
  /**
   * Variante do lockup. `'instituto'` (M, 13/11/2026 23h11) mostra "INSTITUTO THEYE" em vez de
   * "THEYE / PLATAFORMA", porque a casa inteira se chama Instituto THEYE; "Theye.club" segue sendo
   * só o nome da plataforma de software.
   */
  tipo?: 'plataforma' | 'instituto'
}

/**
 * Lockup tipográfico provisório. Quando o escritório enviar o arquivo da
 * logo oficial, basta trocar o conteúdo deste componente por uma <img>.
 */
export default function Marca({ tamanho = 'pequena', comSubtitulo = true, className = '', marca = null, subtitulo, tipo = 'plataforma' }: MarcaProps) {
  const grande = tamanho === 'grande'
  // Sem subtítulo pedido, fica a linha do Instituto. "Suporte Jurídico" só aparece onde a tela é do
  // nicho jurídico e o pede (M, 21/11/2026: a entrada jurídica fica só no nicho jurídico).
  const legenda = subtitulo ?? SUBTITULO_INSTITUTO
  if (marca) {
    return (
      <div className={`flex flex-col items-center ${className}`} data-testid="marca-parceiro">
        {marca.logo_url ? <img src={marca.logo_url} alt={marca.nome} className={`${grande ? 'max-h-20' : 'max-h-10'} max-w-full object-contain`} />
          : <div className={`font-serif tracking-[0.12em] text-white text-center leading-tight ${grande ? 'text-3xl' : 'text-base'}`}>{marca.nome}</div>}
        {comSubtitulo && <div className={`font-sans uppercase text-neutral-300 tracking-[0.18em] ${grande ? 'text-xs mt-2' : 'text-[12px] mt-1'}`} data-testid="marca-produto">{marca.perfil === 'projectos' ? NOME_PRODUTO_PROJECTOS : NOME_PLATAFORMA}</div>}
      </div>
    )
  }
  if (tipo === 'instituto') {
    return (
      <div className={`flex flex-col items-center ${className}`} data-testid="marca-instituto">
        <span className="sr-only">Instituto THEYE, {NOME_INSTITUTO_COMPLETO}</span>
        <MarcaOlho tamanho={grande ? 56 : 28} className="text-[#fff] mb-3" />
        <div className={`font-serif tracking-[0.22em] text-[#fff] ${grande ? 'text-4xl' : 'text-xl'}`} aria-hidden="true">
          INSTITUTO
        </div>
        <div className={`font-serif tracking-[0.18em] text-[#fff] ${grande ? 'text-4xl mt-1' : 'text-xl mt-0.5'}`} aria-hidden="true">
          THEYE
        </div>
        <div className={`font-serif italic text-neutral-200 text-center max-w-[22rem] ${grande ? 'text-base mt-3' : 'text-[11px] mt-1'}`} data-testid="nome-instituto-completo">
          {NOME_INSTITUTO_COMPLETO}
        </div>
        {comSubtitulo && (
          <>
            <div className={`h-px bg-neutral-400 ${grande ? 'w-24 my-3' : 'w-12 my-1.5'}`} aria-hidden="true" />
            <div className={`font-sans uppercase text-neutral-300 tracking-[0.18em] text-center ${grande ? 'text-xs' : 'text-[12px]'}`}>
              {legenda}
            </div>
          </>
        )}
      </div>
    )
  }
  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="marca-theye">
      <span className="sr-only">{NOME_PLATAFORMA}</span>
      <MarcaOlho tamanho={grande ? 56 : 28} className="text-[#fff] mb-3" />
      <div
        className={`font-serif tracking-[0.22em] text-[#fff] ${grande ? 'text-4xl' : 'text-xl'}`}
        aria-hidden="true"
      >
        THEYE
      </div>
      <div
        className={`font-sans uppercase text-neutral-200 tracking-[0.4em] ${grande ? 'text-xs mt-1' : 'text-[12px] mt-0.5'}`}
        aria-hidden="true"
      >
        Plataforma
      </div>
      {comSubtitulo && (
        <>
          <div className={`h-px bg-neutral-400 ${grande ? 'w-24 my-3' : 'w-12 my-1.5'}`} aria-hidden="true" />
          <div
            className={`font-sans uppercase text-neutral-300 tracking-[0.18em] text-center ${
              grande ? 'text-xs' : 'text-[12px]'
            }`}
          >
            {legenda}
          </div>
        </>
      )}
    </div>
  )
}
