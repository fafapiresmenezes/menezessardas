import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, ShieldAlert, Atom } from 'lucide-react'

// Pedido de M (06/11/2026): cibersegurança e computação quântica na ótica do direito, como temas do Instituto THEYE,
// com ferramentas utilizáveis. Aqui ficam as duas contas mais usadas no dia a dia do escritório; as versões completas
// (teste de risco, mapa de normas, inventário de criptografia, linha do tempo e agenda de pesquisa) estão no site do Instituto.
export const INSTITUTO_URL = 'https://instituto-theye.vercel.app'

function pascoa(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(y, mes - 1, dia))
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Feriados nacionais (sem Carnaval e Corpus Christi, que são ponto facultativo: a contagem fica do lado seguro). */
export function feriadosNacionais(y: number): Set<string> {
  const s = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(f => `${y}-${f}`))
  s.add(iso(new Date(pascoa(y).getTime() - 2 * 864e5)))
  return s
}
/** Soma n dias úteis (seg. a sex., sem feriados nacionais) a partir do dia seguinte à data ISO informada. */
export function somarDiasUteis(dataISO: string, n: number): string {
  let d = new Date(`${dataISO}T00:00:00Z`), k = 0
  while (k < n) { d = new Date(d.getTime() + 864e5); const w = d.getUTCDay(); if (w !== 0 && w !== 6 && !feriadosNacionais(d.getUTCFullYear()).has(iso(d))) k++ }
  return iso(d)
}
/** Teste de Mosca: há risco quando sigilo (x) + migração (y) passa da chegada do computador quântico (z). */
export const testeMosca = (x: number, y: number, z: number) => ({ risco: x + y > z, folga: z - (x + y) })

const br = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

export default function CiberQuantica() {
  const [data, setData] = useState('')
  const [pequeno, setPequeno] = useState(false)
  const [x, setX] = useState(10), [y, setY] = useState(3), [z, setZ] = useState(10)
  const prazo = useMemo(() => data ? { anpd: somarDiasUteis(data, pequeno ? 6 : 3), comp: somarDiasUteis(data, pequeno ? 40 : 20) } : null, [data, pequeno])
  const m = testeMosca(x, y, z)
  const campo = 'border border-navy/20 px-3 min-h-[44px] w-full bg-white'
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1 flex items-center gap-2"><ShieldAlert size={18} aria-hidden="true" /> Cibersegurança e direito</h2>
        <p className="text-sm text-grafite-claro mb-4">Prazo para comunicar um incidente de segurança à ANPD e aos titulares: 3 dias úteis contados de quando o escritório soube que dados pessoais foram afetados (Resolução CD/ANPD nº 15/2024); agente de pequeno porte tem prazo em dobro (Resolução CD/ANPD nº 2/2022).</p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <label className="text-sm grid gap-1">Dia em que soube do incidente<input type="date" value={data} onChange={e => setData(e.target.value)} className={campo} data-testid="ciber-data" /></label>
          <label className="text-sm flex items-center gap-2 min-h-[44px] self-end"><input type="checkbox" checked={pequeno} onChange={e => setPequeno(e.target.checked)} className="w-5 h-5" /> Agente de pequeno porte</label>
        </div>
        <div className="mt-4 p-4 border-l-4 border-dourado bg-gray-50" aria-live="polite" data-testid="ciber-prazo">
          {prazo ? <><p>Comunicar à ANPD e aos titulares até <strong>{br(prazo.anpd)}</strong>.</p><p className="text-sm text-grafite-claro">Complementar as informações até {br(prazo.comp)}. Guarde o registro do incidente por pelo menos 5 anos.</p></>
            : <p className="text-sm text-grafite-claro">Escolha a data para ver o prazo.</p>}
        </div>
        <p className="text-xs text-grafite-claro mt-2">Conta em dias úteis sem feriados nacionais. Isto é uma conta, não um parecer.</p>
        <a href={`${INSTITUTO_URL}/ciber.html`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-navy underline min-h-[44px]">Teste de risco do escritório e mapa de 18 normas no Instituto <ExternalLink size={14} aria-hidden="true" /></a>
      </section>
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1 flex items-center gap-2"><Atom size={18} aria-hidden="true" /> Computação quântica e direito</h2>
        <p className="text-sm text-grafite-claro mb-4">Teste de Mosca: se os anos que o documento precisa ficar sigiloso ou com assinatura confiável (x) somados aos anos para migrar a criptografia (y) passam dos anos até um computador quântico capaz de quebrar RSA (z), o documento já está em risco. O NIST proíbe RSA e curvas elípticas a partir de 2035; a IN ITI nº 35/2026 abriu a ICP-Brasil para algoritmos pós-quânticos.</p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl">
          <label className="text-sm grid gap-1">x · anos de sigilo<input type="number" min={0} max={100} value={x} onChange={e => setX(Number(e.target.value) || 0)} className={campo} data-testid="mosca-x" /></label>
          <label className="text-sm grid gap-1">y · anos para migrar<input type="number" min={0} max={30} value={y} onChange={e => setY(Number(e.target.value) || 0)} className={campo} /></label>
          <label className="text-sm grid gap-1">z · cenário<select value={z} onChange={e => setZ(Number(e.target.value))} className={campo}><option value={7}>Otimista: 2033</option><option value={10}>Central: 2036</option><option value={15}>Distante: 2041</option></select></label>
        </div>
        <p className={`mt-4 p-4 border-l-4 ${m.risco ? 'border-red-700' : 'border-dourado'} bg-gray-50`} aria-live="polite" data-testid="mosca-res">
          {m.risco ? `Em risco: faltam ${-m.folga} ano(s) de proteção. Prefira carimbo de tempo por hash, AES-256 e assinatura pós-quântica assim que a ICP-Brasil liberar.` : `Fora de risco neste cenário, com ${m.folga} ano(s) de folga.`}
        </p>
        <a href={`${INSTITUTO_URL}/quantico.html`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-navy underline min-h-[44px]">Inventário de criptografia e linha do tempo no Instituto <ExternalLink size={14} aria-hidden="true" /></a>
      </section>
      <p className="text-sm">Dúvida específica? <Link to="/assistente?agente=pesquisa" className="underline text-navy">Pergunte ao pesquisador do Instituto</Link> ou aos agentes de cibersegurança e de computação quântica no <a href={`${INSTITUTO_URL}/agentes.html#lote6`} target="_blank" rel="noopener noreferrer" className="underline text-navy">site do Instituto</a>.</p>
    </div>
  )
}
