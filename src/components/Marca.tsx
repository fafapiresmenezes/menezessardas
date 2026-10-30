interface MarcaProps {
  tamanho?: 'pequena' | 'grande'
  comSubtitulo?: boolean
  className?: string
}

/**
 * Lockup tipográfico provisório. Quando o escritório enviar o arquivo da
 * logo oficial, basta trocar o conteúdo deste componente por uma <img>.
 */
export default function Marca({ tamanho = 'pequena', comSubtitulo = true, className = '' }: MarcaProps) {
  const grande = tamanho === 'grande'
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`font-serif tracking-[0.22em] text-dourado ${grande ? 'text-4xl' : 'text-xl'}`}
        aria-hidden="true"
      >
        GM
      </div>
      <div className={`h-px bg-dourado/50 ${grande ? 'w-24 my-3' : 'w-12 my-1.5'}`} aria-hidden="true" />
      <div
        className={`font-serif text-center leading-tight text-white ${
          grande ? 'text-xl' : 'text-sm'
        }`}
      >
        <span className="text-dourado">G</span>Menezes
      </div>
      {comSubtitulo && (
        <div
          className={`font-sans uppercase text-white/60 tracking-[0.18em] ${
            grande ? 'text-[11px] mt-2' : 'text-[9px] mt-1'
          }`}
        >
          Advogados Associados
        </div>
      )}
    </div>
  )
}
