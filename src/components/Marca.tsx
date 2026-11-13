import type { MarcaEscritorio } from '@/lib/marca'
import { NOME_PLATAFORMA, SUBTITULO_PLATAFORMA } from '@/lib/plataforma'

interface MarcaProps {
  tamanho?: 'pequena' | 'grande'
  comSubtitulo?: boolean
  className?: string
  /** Passo D22: marca do escritório parceiro (white-label). Sem ela, o lockup THEYE Institute. */
  marca?: MarcaEscritorio | null
  /** Subtítulo já traduzido. Sem ele, fica o português padrão da plataforma. */
  subtitulo?: string
}

/**
 * Lockup tipográfico provisório. Quando o escritório enviar o arquivo da
 * logo oficial, basta trocar o conteúdo deste componente por uma <img>.
 */
export default function Marca({ tamanho = 'pequena', comSubtitulo = true, className = '', marca = null, subtitulo }: MarcaProps) {
  const grande = tamanho === 'grande'
  const legenda = subtitulo ?? SUBTITULO_PLATAFORMA
  if (marca) {
    return (
      <div className={`flex flex-col items-center ${className}`} data-testid="marca-parceiro">
        {marca.logo_url ? <img src={marca.logo_url} alt={marca.nome} className={`${grande ? 'max-h-20' : 'max-h-10'} max-w-full object-contain`} />
          : <div className={`font-serif tracking-[0.12em] text-white text-center leading-tight ${grande ? 'text-3xl' : 'text-base'}`}>{marca.nome}</div>}
        {comSubtitulo && <div className={`font-sans uppercase text-neutral-300 tracking-[0.18em] ${grande ? 'text-xs mt-2' : 'text-[9px] mt-1'}`}>{NOME_PLATAFORMA}</div>}
      </div>
    )
  }
  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="marca-theye">
      <span className="sr-only">{NOME_PLATAFORMA}</span>
      <div
        className={`font-serif tracking-[0.22em] text-[#fff] ${grande ? 'text-4xl' : 'text-xl'}`}
        aria-hidden="true"
      >
        THEYE
      </div>
      <div
        className={`font-sans uppercase text-neutral-200 tracking-[0.4em] ${grande ? 'text-xs mt-1' : 'text-[9px] mt-0.5'}`}
        aria-hidden="true"
      >
        Plataforma
      </div>
      {comSubtitulo && (
        <>
          <div className={`h-px bg-neutral-400 ${grande ? 'w-24 my-3' : 'w-12 my-1.5'}`} aria-hidden="true" />
          <div
            className={`font-sans uppercase text-neutral-300 tracking-[0.18em] text-center ${
              grande ? 'text-xs' : 'text-[9px]'
            }`}
          >
            {legenda}
          </div>
        </>
      )}
    </div>
  )
}
