/**
 * Ecrã C12 — Biblioteca e especialistas (casa de fundos, DEMONSTRAÇÃO).
 * O repositório interno: onde se estuda (teses e cursos abertos, com ligação e licença)
 * e o catálogo de especialistas formados por essa estante. Catalogar e citar, nunca copiar.
 */
import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import VerComoFundos, { SoParaNiveis } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'
import { REPOSITORIOS_TESES, CURSOS_ABERTOS } from '@/data/bibliotecaDemo'
import { ESPECIALISTAS_FUNDOS } from '@/data/especialistasFundos'

export default function BibliotecaTesesPage() {
  const [busca, setBusca] = useState('')
  const vis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return ESPECIALISTAS_FUNDOS
    return ESPECIALISTAS_FUNDOS.filter(e => `${e.nome} ${e.disciplina} ${e.ambito}`.toLowerCase().includes(q))
  }, [busca])
  return (
    <Layout title="Biblioteca e especialistas">
      <SoParaNiveis rota="/biblioteca-teses">
      <div className="max-w-4xl mx-auto space-y-6">
        <VerComoFundos />
        <SaberDaMateria rota="/biblioteca-teses" />
        <p className="text-sm text-grafite-claro">
          A biblioteca interna da casa: os repositórios de teses das melhores escolas do mundo e os cursos abertos,
          cada um com a ligação oficial e a licença, e o catálogo de especialistas formados por essa estante.
          Regra fixa: catalogar e citar, nunca copiar texto protegido. A colheita automática (OAI-PMH) entra na versão real.
        </p>

        <section>
          <h2 className="font-semibold text-navy mb-2">Repositórios de teses ligados</h2>
          <ul className="space-y-2" data-testid="repositorios">
            {REPOSITORIOS_TESES.map(r => (
              <li key={r.id} className="border border-navy/15 rounded-sm p-3">
                <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-navy underline" title={`Abrir o repositório ${r.nome} no sítio oficial`}>{r.nome}</a>
                <p className="text-sm text-grafite mt-1">{r.oQueDa}</p>
                <p className="text-xs text-grafite-claro">Protocolo: {r.protocolo} · Licença: {r.licenca}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-navy mb-2">Cursos abertos na estante</h2>
          <ul className="space-y-1" data-testid="cursos">
            {CURSOS_ABERTOS.map(c => (
              <li key={c.id} className="text-sm text-navy">
                <a href={c.url} target="_blank" rel="noreferrer" className="underline" title={`Abrir ${c.escola} no sítio oficial`}>{c.nome}</a>
                <span className="text-grafite-claro"> — {c.escola} · licença {c.licenca}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-navy mb-2">Catálogo de especialistas ({ESPECIALISTAS_FUNDOS.length})</h2>
          <p className="text-sm text-grafite-claro mb-2">
            Cada especialista nasce de uma especialidade e de uma estante com fontes abertas; os desdobramentos por país
            e por tipo de obra herdam a estante e acrescentam as fontes próprias. Quem os chama é o agente maestro.
          </p>
          <label className="block text-sm text-grafite-claro mb-2">Procurar no catálogo:
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="ml-2 border border-navy/20 rounded-sm px-2 py-1 text-navy w-64 max-w-full"
              title="Procurar especialistas por nome, disciplina ou âmbito"
              placeholder="Ex.: caixa, FIDIC, Angola…"
            />
          </label>
          <p className="text-xs text-grafite-claro mb-2" data-testid="conta-especialistas">{vis.length} especialistas no filtro.</p>
          <ul className="space-y-1 max-h-96 overflow-y-auto border border-navy/10 rounded-sm p-2" data-testid="especialistas">
            {vis.map(e => (
              <li key={e.id} className="text-sm border-b border-navy/5 pb-1">
                <span className="text-navy font-medium">{e.nome}</span>
                <span className="block text-xs text-grafite-claro">{e.disciplina} · estante: {e.estante}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
