/** Ecrã C09 — Documentos e auditoria (casa de fundos internacionais, DEMONSTRAÇÃO). Nada lê/grava no banco. */
import LayoutFundos from '@/components/LayoutFundos'
import { DOCUMENTOS_DEMO, AUDITORIA_DEMO } from '@/data/documentosDemo'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'
import { recorte } from '@/lib/visaoFundos'
const dia = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('pt-PT')
export default function DocumentosFundosPage() {
  const quem = usePessoaFundos()
  const docs = recorte(quem, DOCUMENTOS_DEMO)
  const eventos = recorte(quem, AUDITORIA_DEMO)
  return (
    <LayoutFundos title="Documentos e auditoria">
      <SoParaNiveis rota="/documentos-fundos">
      <div className="max-w-5xl mx-auto space-y-6">
        <VerComoFundos />
        <SaberDaMateria rota="/documentos-fundos" />
        <p className="text-sm text-grafite-claro">Demonstração com dados inventados. Os documentos do projecto e o registo de quem fez o quê e quando.</p>
        <section>
          <h2 className="text-sm font-medium text-navy mb-2">Documentos</h2>
          <ul className="space-y-2" data-testid="documentos">
            {docs.map(d => (
              <li key={d.id} className="border border-navy/15 rounded-sm p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{d.nome}</p>
                  <p className="text-xs text-grafite-claro">{d.tipo} · {d.projecto} · {d.autor}</p>
                </div>
                <p className="text-xs text-grafite-claro whitespace-nowrap">{dia(d.data)}</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-medium text-navy mb-2">Registo de auditoria</h2>
          <ul className="space-y-1 border-l-2 border-navy/15 pl-3" data-testid="auditoria">
            {eventos.map(e => (
              <li key={e.id} className="text-sm">
                <span className="text-grafite-claro">{e.quando}</span> — <span className="text-navy">{e.quem}</span> {e.acao.toLowerCase()} <span className="text-navy">{e.alvo}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </SoParaNiveis>
    </LayoutFundos>
  )
}
