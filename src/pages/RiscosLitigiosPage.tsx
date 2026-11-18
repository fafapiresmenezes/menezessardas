/** Ecrã C08 — Riscos e litígios (fundos internacionais, DEMONSTRAÇÃO). Nada lê/grava no banco. */
import Layout from '@/components/Layout'
import { RISCOS_DEMO, type NivelRisco } from '@/data/operacaoDemo'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import { recorte } from '@/lib/visaoFundos'
const ROT: Record<NivelRisco, string> = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }
const COR: Record<NivelRisco, string> = { alto: 'bg-red-50 text-red-800 border-red-200', medio: 'bg-amber-50 text-amber-800 border-amber-200', baixo: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
export default function RiscosLitigiosPage() {
  const quem = usePessoaFundos()
  const ordem: NivelRisco[] = ['alto', 'medio', 'baixo']
  const lista = recorte(quem, RISCOS_DEMO).sort((a, b) => ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel) || a.projecto.localeCompare(b.projecto))
  return (
    <Layout title="Riscos e litígios">
      <SoParaNiveis rota="/riscos-litigios">
      <div className="max-w-5xl mx-auto space-y-4">
        <VerComoFundos />
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Riscos e litígios por nível, cada um com a medida proposta.</p>
        <ul className="space-y-2" data-testid="riscos">
          {lista.map(r => (
            <li key={r.id} className="border border-navy/15 rounded-sm p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.titulo}</p>
                  <p className="text-xs text-grafite-claro">{r.tipo} · {r.projecto}</p>
                </div>
                <span className={`whitespace-nowrap text-xs px-2 py-0.5 rounded-sm border ${COR[r.nivel]}`}>{ROT[r.nivel]}</span>
              </div>
              <p className="text-sm text-grafite mt-2">{r.medida}</p>
            </li>
          ))}
          {lista.length === 0 && <li className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</li>}
        </ul>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
