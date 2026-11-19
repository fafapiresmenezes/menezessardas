/** Ecrã C06 — Fornecedores (casa de fundos internacionais, DEMONSTRAÇÃO). Nada lê/grava no banco. */
import LayoutFundos from '@/components/LayoutFundos'
import { FORNECEDORES_DEMO } from '@/data/operacaoDemo'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import { recorte } from '@/lib/visaoFundos'
const ROT = { activo: 'Activo', 'em-avaliacao': 'Em avaliação', suspenso: 'Suspenso' } as const
const COR = { activo: 'bg-emerald-50 text-emerald-800 border-emerald-200', 'em-avaliacao': 'bg-amber-50 text-amber-800 border-amber-200', suspenso: 'bg-red-50 text-red-800 border-red-200' } as const
export default function FornecedoresFundosPage() {
  const quem = usePessoaFundos()
  const vis = recorte(quem, FORNECEDORES_DEMO)
  return (
    <LayoutFundos title="Fornecedores">
      <SoParaNiveis rota="/fornecedores-fundos">
      <div className="max-w-5xl mx-auto space-y-4">
        <VerComoFundos />
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Fornecedores por estado, com o tipo, o país, os projectos e uma nota de desempenho.</p>
        <ul className="space-y-2" data-testid="fornecedores">
          {vis.map(f => (
            <li key={f.id} className="border border-navy/15 rounded-sm p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-navy">{f.nome}</p>
                <p className="text-xs text-grafite-claro">{f.tipo} · {f.pais} · {f.projectos.join(', ')}</p>
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="text-sm text-navy">Nota {(f.nota * 100).toFixed(0)}%</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-sm border ${COR[f.estado]}`}>{ROT[f.estado]}</span>
              </div>
            </li>
          ))}
          {vis.length === 0 && <li className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</li>}
        </ul>
      </div>
      </SoParaNiveis>
    </LayoutFundos>
  )
}
