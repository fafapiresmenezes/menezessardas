/**
 * Ecrã C03 — Contratos e obrigações (fundos internacionais, DEMONSTRAÇÃO, dados fictícios).
 * Cada contrato com partes, valor, lei e foro, e as obrigações extraídas como prazos com dono.
 * Nada lê nem grava no banco.
 */
import Layout from '@/components/Layout'
import { CONTRATOS_DEMO } from '@/data/contratosDemo'
import { DATA_REFERENCIA_LEGIVEL, diasAte } from '@/data/referenciaDemo'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'
import { recorte } from '@/lib/visaoFundos'

const money = (v: number, m: string) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)} ${m}`
const dia = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('pt-PT')

export default function ContratosPage() {
  const quem = usePessoaFundos()
  const vis = recorte(quem, CONTRATOS_DEMO)
  return (
    <Layout title="Contratos e obrigações">
      <SoParaNiveis rota="/contratos-obrigacoes">
      <div className="max-w-5xl mx-auto space-y-4">
        <VerComoFundos />
        <SaberDaMateria rota="/contratos-obrigacoes" />
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Cada contrato com as partes, o valor, a lei e o foro, e as obrigações como prazos com dono. Os dias contam-se a partir de {DATA_REFERENCIA_LEGIVEL}.</p>
        <ul className="space-y-3" data-testid="contratos">
          {vis.map(c => (
            <li key={c.id} className="border border-navy/15 rounded-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{c.objecto}</p>
                  <p className="text-xs text-grafite-claro">{c.projeto} · {c.contraparte}</p>
                  <p className="text-xs text-grafite-claro">Lei: {c.lei} · Foro: {c.foro} · {dia(c.inicio)} a {dia(c.fim)}</p>
                </div>
                <p className="text-sm text-navy whitespace-nowrap">{money(c.valor, c.moeda)}</p>
              </div>
              <ul className="mt-3 space-y-1 border-t border-navy/10 pt-2" data-testid={`obrig-${c.id}`}>
                {[...c.obrigacoes].sort((a, b) => a.prazo.localeCompare(b.prazo)).map((o, i) => {
                  const d = diasAte(o.prazo)
                  const cor = d < 15 ? 'text-red-700' : d < 45 ? 'text-amber-700' : 'text-grafite'
                  return (
                    <li key={i} className="text-sm flex items-center justify-between gap-2">
                      <span className="text-navy">{o.texto} <span className="text-grafite-claro">({o.dono})</span></span>
                      <span className={`whitespace-nowrap ${cor}`}>{dia(o.prazo)}{d < 45 ? ` · ${d} dias` : ''}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
          {vis.length === 0 && <li className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</li>}
        </ul>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
