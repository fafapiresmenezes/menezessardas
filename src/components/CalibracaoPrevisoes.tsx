import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

// Passo 08: calibração das previsões. Brier score = média de (probabilidade prevista − desfecho real)²:
// 0 é perfeito, 0,25 equivale a chute (50%). Só conta contratos com desfecho registrado em Previsões.
export type Calibracao = {
  contratos_com_desfecho: number; previsoes_registradas: number
  brier_inadimplencia: number | null; n_inadimplencia: number; acerto_inadimplencia_pct: number | null
  brier_renovacao: number | null; n_renovacao: number; acerto_renovacao_pct: number | null
}
export async function lerCalibracao(): Promise<Calibracao | null> {
  if (!supabaseConfigurado) return null
  const r = await supabase.rpc('calibracao_previsoes')
  return (r.data as Calibracao) ?? null
}
const nivel = (b: number | null) => b === null ? '—' : b <= 0.1 ? 'excelente' : b <= 0.18 ? 'boa' : b <= 0.25 ? 'fraca' : 'pior que chute'

export default function CalibracaoPrevisoes({ compacto = false, versao = 0 }: { compacto?: boolean; versao?: number }) {
  const [c, setC] = useState<Calibracao | null>(null)
  useEffect(() => { lerCalibracao().then(setC) }, [versao])
  if (!c) return null
  const linhas: [string, number | null, number, number | null][] = [
    ['Inadimplência', c.brier_inadimplencia, c.n_inadimplencia, c.acerto_inadimplencia_pct],
    ['Renovação', c.brier_renovacao, c.n_renovacao, c.acerto_renovacao_pct],
  ]
  return (
    <section data-testid="calibracao" className={`bg-white shadow-sm ${compacto ? 'border-t-2 border-dourado p-5' : 'p-6'}`} aria-labelledby="t-calib">
      <h2 id="t-calib" className={compacto ? 'text-xs uppercase tracking-wider text-grafite-claro' : 'text-lg mb-1'}>Calibração das previsões (Brier)</h2>
      <p className="text-sm text-grafite-claro mt-1">
        {c.contratos_com_desfecho} de {c.previsoes_registradas} contratos previstos já têm desfecho real registrado.
        {c.contratos_com_desfecho === 0 && ' Registre em Previsões o que aconteceu de fato (pagou ou não, renovou ou não) para medir o acerto.'}
      </p>
      <table className="mt-3 w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1">Previsão</th><th>Brier</th><th>Qualidade</th><th>Acerto</th><th>Casos</th></tr></thead>
        <tbody>
          {linhas.map(([nome, brier, n, acerto]) => (
            <tr key={nome} className="border-t border-navy/10" data-testid={`calib-${nome.toLowerCase()}`}>
              <td className="py-1 text-navy">{nome}</td>
              <td className="font-serif text-lg">{brier === null ? '—' : brier.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
              <td>{nivel(brier)}</td>
              <td>{acerto === null ? '—' : `${acerto}%`}</td>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-grafite-claro mt-2">Brier score: média de (probabilidade prevista − desfecho)². 0 = perfeito; 0,25 = o mesmo que chutar 50%. Fonte: registro_previsoes (uma fotografia por dia por contrato; vale a última antes do desfecho).</p>
    </section>
  )
}
