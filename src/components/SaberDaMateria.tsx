/**
 * «O que manda a literatura» (trilho v2, 19/11/2026): o saber da matéria dentro do ecrã,
 * com cada regra resumida por palavras próprias e a fonte ao lado (algoritmo de PI da casa).
 */
import { BookOpen } from 'lucide-react'
import { saberDaRota } from '@/data/saberMaterias'

export default function SaberDaMateria({ rota }: { rota: string }) {
  const materias = saberDaRota(rota)
  if (materias.length === 0) return null
  return (
    <details className="border border-navy/15 rounded-sm bg-white/60" data-testid="saber-materia">
      <summary className="cursor-pointer select-none p-3 text-sm text-navy flex items-center gap-2 min-h-[44px]" title="Abre as regras da literatura de referência que este ecrã segue, cada uma com a fonte">
        <BookOpen className="w-4 h-4 text-dourado shrink-0" aria-hidden />
        O que manda a literatura — {materias.map(m => m.nome).join(' · ')}
      </summary>
      <div className="px-3 pb-3 space-y-3">
        {materias.map(m => (
          <ul key={m.id} className="space-y-2" aria-label={m.nome}>
            {m.regras.map((r, i) => (
              <li key={i} className="text-sm text-grafite">
                {r.texto}{' '}
                <a href={r.fonte.url} target="_blank" rel="noreferrer" className="text-xs underline text-navy whitespace-nowrap" title={`Abre a fonte: ${r.fonte.nome}`}>({r.fonte.nome})</a>
              </li>
            ))}
          </ul>
        ))}
        <p className="text-[11px] text-grafite-claro">Regra da casa: toda a ideia externa entra resumida por palavras próprias e com a fonte ao lado; texto protegido nunca é copiado.</p>
      </div>
    </details>
  )
}
