import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { veredito, casosPorFaixa, type Par } from '@/lib/calibragem'

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
/** B08: pares (probabilidade prevista, desfecho real) para medir o erro de calibragem. */
export async function lerPares(): Promise<{ inad: Par[]; renov: Par[] }> {
  const vazio = { inad: [] as Par[], renov: [] as Par[] }
  if (!supabaseConfigurado) return vazio
  try {
    const { data } = await supabase.from('registro_previsoes').select('previsto,desfecho').eq('tipo', 'risco_contrato').not('desfecho', 'is', null).limit(10000)
    for (const r of (data ?? []) as { previsto: { risco?: number; renovacao?: number }; desfecho: { inadimplente?: boolean; renovou?: boolean } }[]) {
      if (typeof r.previsto?.risco === 'number' && typeof r.desfecho?.inadimplente === 'boolean') vazio.inad.push({ p: r.previsto.risco / 100, y: r.desfecho.inadimplente ? 1 : 0 })
      if (typeof r.previsto?.renovacao === 'number' && typeof r.desfecho?.renovou === 'boolean') vazio.renov.push({ p: r.previsto.renovacao / 100, y: r.desfecho.renovou ? 1 : 0 })
    }
  } catch { /* sem banco: a tabela de Brier continua aparecendo */ }
  return vazio
}
const pctBR = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`
const nivel = (b: number | null) => b === null ? '—' : b <= 0.1 ? 'excelente' : b <= 0.18 ? 'boa' : b <= 0.25 ? 'fraca' : 'pior que chute'

export default function CalibracaoPrevisoes({ compacto = false, versao = 0 }: { compacto?: boolean; versao?: number }) {
  const [c, setC] = useState<Calibracao | null>(null)
  const [pares, setPares] = useState<{ inad: Par[]; renov: Par[] }>({ inad: [], renov: [] })
  useEffect(() => { lerCalibracao().then(setC); lerPares().then(setPares) }, [versao])
  if (!c) return null
  const linhas: [string, number | null, number, number | null][] = [
    // `?? null` de propósito: campo ausente é diferente de `null` em JavaScript, e a tabela abaixo
    // só sabe desenhar o travessão quando recebe `null`. Sem isto, uma linha sem o número vinda do
    // banco derruba a tela inteira em vez de mostrar "—".
    ['Inadimplência', c.brier_inadimplencia ?? null, c.n_inadimplencia ?? 0, c.acerto_inadimplencia_pct ?? null],
    ['Renovação', c.brier_renovacao ?? null, c.n_renovacao ?? 0, c.acerto_renovacao_pct ?? null],
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
      {!compacto && (
        <div className="mt-4 pt-3 border-t border-navy/10" data-testid="meta-calibragem">
          <h3 className="text-sm font-medium text-navy">Meta: erro de calibragem entre 1% e 5%</h3>
          <p className="text-xs text-grafite-claro">Quer dizer: quando a plataforma diz 70%, o fato precisa acontecer entre 65% e 75% das vezes. Só declaramos a meta cumprida quando o limite de cima do intervalo de 95% fica abaixo de 5% e há pelo menos 100 desfechos. Para ±5% em cada faixa são precisos {casosPorFaixa(0.05)} desfechos por faixa.</p>
          <ul className="text-sm mt-2 space-y-1">
            {([['Inadimplência', pares.inad], ['Renovação', pares.renov]] as [string, Par[]][]).map(([nome, ps]) => {
              const v = veredito(ps)
              return <li key={nome} data-testid={`meta-${nome.toLowerCase()}`}><strong>{nome}:</strong> {v.veredito === 'sem dados' ? 'sem desfechos registrados ainda.' : `erro ${pctBR(v.ece!)}${v.intervalo ? ` (intervalo ${pctBR(v.intervalo.min)} a ${pctBR(v.intervalo.max)})` : ''} com ${v.n} desfecho(s): ${v.veredito}.`}</li>
            })}
          </ul>
        </div>
      )}
      <p className="text-xs text-grafite-claro mt-2">Brier score: média de (probabilidade prevista − desfecho)². 0 = perfeito; 0,25 = o mesmo que chutar 50%. Fonte: registro_previsoes (uma fotografia por dia por contrato; vale a última antes do desfecho).</p>
    </section>
  )
}
