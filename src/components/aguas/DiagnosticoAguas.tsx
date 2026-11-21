import { GUANDU, LUANDA, type Rotulo } from '@/data/aguasDiagnostico'

const cor: Record<Rotulo, string> = { MEDIDO: 'bg-green-100 text-green-900', '2 FONTES': 'bg-sky-100 text-sky-900', ESTIMADO: 'bg-amber-100 text-amber-900', 'A CONFIRMAR': 'bg-red-100 text-red-900' }
const Tag = ({ r }: { r: Rotulo }) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cor[r]}`}>{r}</span>
const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR'))
const classeCor = (c: string) => (c === 'RUIM' || c === 'MUITO RUIM' ? 'bg-orange-400' : c === 'MÉDIA' ? 'bg-yellow-300' : 'bg-green-500')

/** Casos Guandu (RJ) e Luanda (AO) do Trilho Águas v2: de onde vem o problema e quanto tempo de aviso a ETA tem. */
export default function DiagnosticoAguas() {
  const maxDbo = Math.max(...GUANDU.cargas.map(c => c.dbo))
  return (
    <section className="bg-white shadow-sm p-6 space-y-6" data-testid="aguas-diagnostico">
      <div>
        <h2 className="font-serif text-xl">Diagnóstico: de onde vem o problema da água</h2>
        <p className="text-sm text-grafite mt-1">Dois casos, com o tempo que a água leva até a captação. Isto é diagnóstico, não previsão: nada vira previsto antes da calibração.</p>
      </div>

      <div className="space-y-3" data-testid="caso-guandu">
        <h3 className="font-medium text-lg">Guandu (Rio de Janeiro)</h3>
        <p className="text-sm text-grafite">{GUANDU.municipios} municípios têm rio que corre para a captação. Esgoto estimado a montante: cerca de {n(GUANDU.dboCentral)} kg de DBO por dia (até {n(GUANDU.dboAlta)}). <Tag r="ESTIMADO" /></p>
        <ul className="space-y-1">
          {GUANDU.cargas.map(c => (
            <li key={c.municipio} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 truncate">{c.municipio}</span>
              <span className="h-3 rounded bg-red-700/80" style={{ width: `${Math.max(4, (c.dbo / maxDbo) * 55)}%` }} />
              <span className="text-xs text-grafite whitespace-nowrap">{n(c.dbo)} kg/dia · {c.horas} h · {c.semColeta}% sem coleta</span>
            </li>
          ))}
        </ul>
        <p className="text-sm">O que o INEA mediu em 2025 (índice de 0 a 100) <Tag r="MEDIDO" /></p>
        <ul className="space-y-1">
          {GUANDU.iqa.map(e => (
            <li key={e.estacao} className="flex items-center gap-2 text-sm">
              <span className="w-44 shrink-0 truncate">{e.estacao} · {e.rio}</span>
              <span className={`h-3 rounded ${classeCor(e.classe)}`} style={{ width: `${e.media * 0.55}%` }} />
              <span className="text-xs text-grafite">{e.media.toFixed(0)} · {e.classe}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-grafite">Os rios que chegam em menos de 1 dia (Poços, Queimados) são os piores medidos; o Guandu fica entre média e boa. Estimativa e medição apontam na mesma direção.</p>
      </div>

      <div className="space-y-3" data-testid="caso-luanda">
        <h3 className="font-medium text-lg">Luanda (Angola)</h3>
        <p className="text-sm">Prédios a até 1 km do rio, por tempo de viagem até a captação <Tag r="ESTIMADO" /></p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead><tr className="text-left text-grafite"><th className="pr-3">Rio</th><th className="pr-3">até 1 dia</th><th className="pr-3">1 a 3 dias</th><th className="pr-3">3 a 7 dias</th><th>mais de 7</th></tr></thead>
            <tbody>{LUANDA.predios.map(p => (<tr key={p.ponto}><td className="pr-3">{p.ponto}</td><td className="pr-3">{n(p.ate24h)}</td><td className="pr-3">{n(p.de1a3dias)}</td><td className="pr-3">{n(p.de3a7dias)}</td><td>{n(p.mais7dias)}</td></tr>))}</tbody>
          </table>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {LUANDA.etas.map(e => (
            <li key={e.nome} className="border border-grafite-claro p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="font-medium">{e.nome}</span><Tag r={e.confirmada ? '2 FONTES' : 'A CONFIRMAR'} /></div>
              <p className="text-grafite">{e.rio}{e.capacidade ? ` · ${n(e.capacidade)} m³/dia` : ''}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-grafite">Cólera em Angola: {n(LUANDA.colera.casos)} casos e {n(LUANDA.colera.mortes)} mortes de {LUANDA.colera.desde} a {LUANDA.colera.ate}. Entra como efeito observado, nunca como prova de causa. <Tag r="MEDIDO" /></p>
      </div>
    </section>
  )
}
