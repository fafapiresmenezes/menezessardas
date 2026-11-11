import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

export interface Passo { titulo: string; ajuda: string; feito: boolean }

/** Lista numerada de passos: o primeiro que falta fica destacado com "Você está aqui". */
export default function PassosImportacao({ passos }: { passos: Passo[] }) {
  const atual = passos.findIndex(p => !p.feito)
  return (
    <ol className="space-y-2" data-testid="passos-importacao" aria-label="Passo a passo">
      {passos.map((p, i) => {
        const aqui = i === atual
        return (
          <li key={p.titulo} data-feito={p.feito} data-atual={aqui} className={`flex gap-3 items-start p-3 border ${aqui ? 'border-dourado bg-pergaminho' : 'border-transparent'}`}>
            {p.feito ? <CheckCircle2 size={20} className="text-regular shrink-0 mt-0.5" aria-label="Feito" /> : aqui ? <ArrowRight size={20} className="text-dourado shrink-0 mt-0.5" aria-hidden /> : <Circle size={20} className="text-grafite-claro shrink-0 mt-0.5" aria-hidden />}
            <div className="text-sm">
              <p className="font-medium">Passo {i + 1}: {p.titulo}{aqui && <span className="ml-2 text-xs uppercase tracking-wider text-dourado">Você está aqui</span>}</p>
              <p className="text-xs text-grafite-claro mt-0.5">{p.ajuda}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
