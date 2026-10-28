/** Marca um ou mais avisos antes do prazo (ex.: 10, 7 e 3 dias). */
export const OPCOES_AVISO = [1, 3, 7, 10, 15, 30, 60, 90]

export default function EscolhaAvisos({ id, valor, onChange }: { id: string; valor: number[]; onChange: (dias: number[]) => void }) {
  const alternar = (d: number) => {
    const novo = valor.includes(d) ? valor.filter(x => x !== d) : [...valor, d]
    if (novo.length) onChange(novo.sort((a, b) => b - a))
  }
  return (
    <div id={id} role="group" aria-label="Dias de antecedência dos avisos" className="flex flex-wrap gap-2">
      {OPCOES_AVISO.map(d => (
        <button key={d} type="button" aria-pressed={valor.includes(d)} onClick={() => alternar(d)}
          className={`min-h-[44px] min-w-[44px] px-3 rounded-sm border text-sm ${valor.includes(d) ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy hover:bg-pergaminho'}`}>
          {d} {d === 1 ? 'dia' : 'dias'}
        </button>
      ))}
    </div>
  )
}
