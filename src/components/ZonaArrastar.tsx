import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  rotulo: string
  onArquivo: (arquivo: File) => void
}

/** Área para arrastar um arquivo ou escolher do computador. Acessível por teclado. */
export default function ZonaArrastar({ rotulo, onArquivo }: Props) {
  const [arrastando, setArrastando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const receber = (lista: FileList | null) => {
    if (lista && lista.length > 0) onArquivo(lista[0])
  }

  return (
    <div
      onDragOver={e => {
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={e => {
        e.preventDefault()
        setArrastando(false)
        receber(e.dataTransfer.files)
      }}
      className={`border-2 border-dashed p-8 text-center transition ${
        arrastando ? 'border-dourado bg-pergaminho' : 'border-grafite-claro/40'
      }`}
    >
      <Upload size={28} className="mx-auto text-dourado mb-3" aria-hidden="true" />
      <p className="text-sm text-grafite">
        {rotulo}{' '}
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="text-navy underline underline-offset-4 hover:text-dourado-escuro"
        >
          selecione do computador
        </button>
      </p>
      <p className="text-xs text-grafite-claro mt-2">PDF, imagens ou documentos de texto. Máximo 50 MB.</p>
      <input
        ref={entrada}
        type="file"
        aria-label="Selecionar arquivo para anexar"
        className="sr-only"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={e => {
          receber(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
