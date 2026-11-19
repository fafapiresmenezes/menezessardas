/**
 * Agentes do Instituto (pedido de M, 18/11/2026): quadradinho trancado — só membros do Instituto
 * (SoInstituto confere no banco; o menu já esconde de quem não é). Reúne num só lugar:
 * 1) os agentes especialistas nascidos do ACERVO do Instituto (análise dos inventários de 18/11),
 * 2) o catálogo dos 500 consultores com ementa académica.
 * Agentes aqui são fichas de especialista com evidência — quem decide e assina é sempre uma pessoa.
 */
import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import SoInstituto from '@/components/SoInstituto'
import CatalogoConsultores from '@/components/CatalogoConsultores'
import { AGENTES_ACERVO, PRATICAS_DA_CASA, ACERVO_RESUMO } from '@/data/agentesAcervo'

const fmtMB = (b: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(b / 1_000_000)} MB`

export default function AgentesInstitutoPage() {
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('')
  const areas = useMemo(() => [...new Set(AGENTES_ACERVO.map(a => a.area))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [])
  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return AGENTES_ACERVO.filter(a => (!area || a.area === area) && (!t || `${a.nome} ${a.area} ${a.oQueSabe}`.toLowerCase().includes(t)))
  }, [busca, area])
  return (
    <SoInstituto>
    <Layout title="Agentes do Instituto">
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-sm text-grafite-claro">
          Só para membros do Instituto. Cada agente é uma ficha de especialista ancorada em evidência — do acervo da casa ou de fonte académica aberta.
          Nenhum agente decide nem assina: quem decide é sempre uma pessoa.{' '}
          <a href="#/qualidade" className="underline text-navy" title="Abre a régua de qualidade da casa: os 11 parâmetros, com o valor medido, a data e o método">Ver a régua de qualidade da casa</a>.
        </p>

        <section aria-label="Agentes do acervo">
          <h2 className="font-serif text-xl text-navy">Agentes do acervo da casa</h2>
          <p className="text-xs text-grafite-claro mb-2" data-testid="acervo-resumo">
            Nascidos da análise do acervo de 18/11/2026: {ACERVO_RESUMO.ficheiros.toLocaleString('pt-PT')} ficheiros inventariados, {ACERVO_RESUMO.temas} temas, {AGENTES_ACERVO.length} agentes com massa real de trabalho.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <label className="text-sm text-grafite-claro">Procurar:
              <input value={busca} onChange={e => setBusca(e.target.value)} title="Procurar agentes do acervo por nome, área ou saber" className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy" placeholder="ex.: água, portal, ontologia" data-testid="busca-acervo" />
            </label>
            <label className="text-sm text-grafite-claro">Área:
              <select value={area} onChange={e => setArea(e.target.value)} title="Filtrar os agentes do acervo por área" className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy">
                <option value="">Todas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <ul className="space-y-2" data-testid="agentes-acervo">
            {visiveis.map(a => (
              <li key={a.id} className="border border-navy/15 rounded-sm p-3">
                <p className="font-medium text-navy">{a.nome} <span className="text-xs text-grafite-claro">· {a.area}</span></p>
                <p className="text-sm text-grafite mt-1">{a.oQueSabe}</p>
                <p className="text-xs text-grafite-claro mt-1">Evidência no acervo: {a.evidencia.ficheiros.toLocaleString('pt-PT')} ficheiros · {fmtMB(a.evidencia.bytes)} · ex.: {a.evidencia.exemplos[0]}</p>
                <p className="text-xs text-grafite-claro">Pergunta-se-lhe: {a.perguntaTipo}</p>
              </li>
            ))}
            {visiveis.length === 0 && <li className="text-sm text-grafite-claro" data-testid="acervo-vazio">Nenhum agente com esse filtro.</li>}
          </ul>
        </section>

        <section aria-label="Práticas da casa">
          <h2 className="font-serif text-xl text-navy">Práticas da casa (lidas do próprio acervo)</h2>
          <ul className="list-disc ml-5 text-sm text-grafite space-y-1" data-testid="praticas-casa">
            {PRATICAS_DA_CASA.map(p => <li key={p.titulo}><strong>{p.titulo}.</strong> {p.texto}</li>)}
          </ul>
        </section>

        <section aria-label="Catálogo dos 500 consultores">
          <h2 className="font-serif text-xl text-navy mb-2">Catálogo dos 500 consultores (fontes académicas abertas)</h2>
          <CatalogoConsultores />
        </section>
      </div>
    </Layout>
    </SoInstituto>
  )
}
