import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { TIPOS_DOCUMENTO, type TipoDocumento } from '@/lib/dominio'

interface Props {
  rotulo: string
  /** Tipo fixo (ex.: 'contrato' para o PDF do instrumento). Se vazio, o usuário escolhe. */
  tipoFixo?: TipoDocumento
  onArquivo: (arquivo: File, tipo: TipoDocumento) => void
}

/** Área para arrastar um arquivo ou escolher do computador, perguntando o tipo em seguida. */
export default function ZonaArrastar({ rotulo, tipoFixo, onArquivo }: Props) {
  const [arrastando, setArrastando] = useState(false)
  const [pendente, setPendente] = useState<File | null>(null)
  const [tipo, setTipo] = useState<TipoDocumento>(tipoFixo ?? 'outro')
  const entrada = useRef<HTMLInputElement>(null)

  const receber = (lista: FileList | null) => {
    if (!lista || lista.length === 0) return
    if (tipoFixo) {
      onArquivo(lista[0], tipoFixo)
      return
    }
    setPendente(lista[0])
    setTipo('outro')
  }

  const confirmar = () => {
    if (pendente) {
      onArquivo(pendente, tipo)
      setPendente(null)
    }
  }

  if (pendente) {
    return (
      <div className="border-2 border-dourado bg-pergaminho p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-sm text-grafite min-w-0">
            Arquivo: <span className="font-medium text-navy break-all">{pendente.name}</span>
          </p>
          <button type="button" onClick={() => setPendente(null)} className="p-1 text-grafite-claro hover:text-critico" aria-label="Cancelar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="tipo-doc" className="block text-xs uppercase tracking-wider text-grafite mb-2">
          Que documento é este?
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            id="tipo-doc"
            value={tipo}
            onChange={e => setTipo(e.target.value as TipoDocumento)}
            className="flex-1 px-3 py-2.5 border border-grafite-claro/40 rounded-sm bg-white text-grafite"
          >
            {TIPOS_DOCUMENTO.map(t => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={confirmar}
            className="bg-navy text-white px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>
    )
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
