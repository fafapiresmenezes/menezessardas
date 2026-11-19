/**
 * Ecrã C13 — Criador de projectos para o governo (casa de fundos, DEMONSTRAÇÃO).
 * Escolhe-se o tipo de projecto e o país; a casa monta o dossiê-rascunho no molde fixo,
 * com os estudos de base, a equipa de agentes e as fontes a ligar. Tudo RASCUNHO até aprovação humana.
 */
import { useState } from 'react'
import Layout from '@/components/Layout'
import VerComoFundos, { SoParaNiveis } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'

const TIPOS = [
  { id: 'estrada', nome: 'Estrada ou ponte', estudos: ['Nota sectorial de obras', 'Impacto económico do corredor'], agentes: ['Gestor de projecto', 'Especialistas em pavimentos e em medição', 'Jurídico (contratação pública)', 'Socioambiental'] },
  { id: 'agua', nome: 'Água e saneamento', estudos: ['Nota sectorial de água', 'Impacto na saúde pública (com fonte oficial)'], agentes: ['Gestor de projecto', 'Especialistas em hidráulica e em licenciamento ambiental', 'Financeiro (garantias)', 'Socioambiental'] },
  { id: 'logistica', nome: 'Logística e portos', estudos: ['Nota sectorial de logística', 'Mercado e procura do corredor'], agentes: ['Gestor de projecto', 'Especialistas em logística portuária e em concessões', 'Jurídico (PPPs)', 'Risco (título e conformidade)'] },
  { id: 'energia', nome: 'Energia', estudos: ['Nota sectorial de energia', 'Impacto económico'], agentes: ['Gestor de projecto', 'Especialistas em instalações electromecânicas', 'Financeiro (câmbio e dívida)', 'Socioambiental'] },
]
const PAISES = [{ id: 'AO', nome: 'Angola' }, { id: 'NA', nome: 'Namíbia' }]

export default function CriadorProjectosGovernoPage() {
  const [tipo, setTipo] = useState(TIPOS[0].id)
  const [pais, setPais] = useState('AO')
  const t = TIPOS.find(x => x.id === tipo)!
  const p = PAISES.find(x => x.id === pais)!
  return (
    <Layout title="Criador de projectos para o governo">
      <SoParaNiveis rota="/criador-projectos">
      <div className="max-w-3xl mx-auto space-y-5">
        <VerComoFundos />
        <SaberDaMateria rota="/criador-projectos" />
        <p className="text-sm text-grafite-claro">
          Demonstração. Escolhe o tipo de projecto e o país, e a casa monta o dossiê-rascunho no molde fixo:
          objectivo, estudos de base, equipa de agentes e fontes a ligar. <strong>Tudo nasce RASCUNHO</strong>:
          só vira proposta depois de uma pessoa da direcção rever e aprovar, e nada é enviado a ninguém automaticamente.
        </p>

        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-grafite-claro">Tipo de projecto:
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy" title="Escolher o tipo de projecto do dossiê">
              {TIPOS.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-grafite-claro">País:
            <select value={pais} onChange={e => setPais(e.target.value)} className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy" title="Escolher o país do dossiê">
              {PAISES.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
        </div>

        <article className="border border-navy/15 rounded-sm p-4 space-y-3" data-testid="dossie">
          <header className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-navy">Dossiê: {t.nome} · {p.nome}</h2>
            <span className="text-xs bg-amber-100 text-amber-900 rounded-sm px-2 py-0.5" data-testid="selo-rascunho">RASCUNHO — exige aprovação humana</span>
          </header>
          <section>
            <h3 className="text-sm font-medium text-navy">Objectivo</h3>
            <p className="text-sm text-grafite">Preparar, para apresentação ao governo de {p.nome}, um projecto de {t.nome.toLowerCase()} com o dossiê completo: estudos com fonte, equipa, riscos e plano de medição. Nenhum número entra sem fonte; estimativa vai com faixa e hipótese.</p>
          </section>
          <section>
            <h3 className="text-sm font-medium text-navy">Estudos de base (da aba Estudos para o governo)</h3>
            <ul className="list-disc pl-5 text-sm text-grafite" data-testid="dossie-estudos">
              {t.estudos.map(e => <li key={e}>{e}</li>)}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-medium text-navy">Equipa de agentes (chamada pelo maestro)</h3>
            <ul className="list-disc pl-5 text-sm text-grafite" data-testid="dossie-agentes">
              {t.agentes.map(a => <li key={a}>{a}</li>)}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-medium text-navy">Fontes a ligar</h3>
            <p className="text-sm text-grafite">Dados oficiais de {p.nome} citados número a número; imagens de satélite abertas (Copernicus/Sentinel, Landsat) para a linha de base do terreno; eventos públicos (GDELT) para o contexto, sempre com a notícia citada. Sem predição até calibração provada.</p>
          </section>
        </article>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
