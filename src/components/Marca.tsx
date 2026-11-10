import type { MarcaEscritorio } from '@/lib/marca'

interface MarcaProps {
  tamanho?: 'pequena' | 'grande'
  comSubtitulo?: boolean
  className?: string
  /** Passo D22: marca do escritório parceiro (white-label). Sem ela, o lockup Theye Suporte Jurídico. */
  marca?: MarcaEscritorio | null
}

/**
 * Lockup tipográfico provisório. Quando o escritório enviar o arquivo da
 * logo oficial, basta trocar o conteúdo deste componente por uma <img>.
 */
export default function Marca({ tamanho = 'pequena', comSubtitulo = true, className = '', marca = null }: MarcaProps) {
  const grande = tamanho === 'grande'
  if (marca) {
    return (
      <div className={`flex flex-col items-center ${className}`} data-testid="marca-parceiro">
        {marca.logo_url ? <img src={marca.logo_url} alt={marca.nome} className={`${grande ? 'max-h-20' : 'max-h-10'} max-w-full object-contain`} />
          : <div className={`font-serif tracking-[0.12em] text-white text-center leading-tight ${grande ? 'text-3xl' : 'text-base'}`}>{marca.nome}</div>}
        {comSubtitulo && <div className={`font-sans uppercase text-white/60 tracking-[0.18em] ${grande ? 'text-[11px] mt-2' : 'text-[9px] mt-1'}`}>Theye Suporte Jurídico</div>}
      </div>
    )
  }
  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="marca-theye">
      <div
        className={`font-serif tracking-[0.22em] text-dourado ${grande ? 'text-4xl' : 'text-xl'}`}
        aria-hidden="true"
      >
        THEYE
      </div>
      <div className={`h-px bg-dourado/50 ${grande ? 'w-24 my-3' : 'w-12 my-1.5'}`} aria-hidden="true" />
      <div
        className={`font-serif text-center leading-tight text-white ${
          grande ? 'text-xl' : 'text-sm'
        }`}
      >
        <span className="sr-only">Theye </span>Suporte Jurídico
      </div>
      {comSubtitulo && (
        <div
          className={`font-sans uppercase text-white/60 tracking-[0.18em] text-center ${
            grande ? 'text-[11px] mt-2' : 'text-[9px] mt-1'
          }`}
        >
          Instituto THEYE
        </div>
      )}
    </div>
  )
}
