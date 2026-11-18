/**
 * Ecrã C14 — Robôs de projectos para o governo (casa de fundos, DEMONSTRAÇÃO).
 * Os robôs que preparam e apresentam propostas, e a esteira de propostas por estado.
 * Regra fixa: nenhum envio externo automático; tudo passa por aprovação humana; predição fechada.
 */
import Layout from '@/components/Layout'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import { recorte } from '@/lib/visaoFundos'
import type { Item } from '@/lib/hierarquiaCorporativa'

const ROBOS = [
  { id: 'estudos', nome: 'Robô de estudos', faz: 'Prepara estudos no molde fixo (pergunta, método, limites, fontes) a partir dos dados da plataforma e das fontes vivas.', entrega: 'Rascunhos para a aba Estudos para o governo.' },
  { id: 'dossies', nome: 'Robô criador de dossiês', faz: 'Monta o dossiê de projecto (objectivo, estudos de base, equipa, fontes a ligar) pelo Criador de projectos.', entrega: 'Dossiês-rascunho para a direcção rever.' },
  { id: 'apresentador', nome: 'Robô apresentador', faz: 'Transforma um dossiê aprovado em apresentação pronta para a reunião com o governo, em linguagem simples, com as fontes no fim.', entrega: 'A apresentação; quem a leva à reunião é sempre uma pessoa.' },
]

interface Proposta { id: string; titulo: string; estado: 'rascunho' | 'em-revisao' | 'pronta'; dono: string; item: Item }
const PROPOSTAS: Proposta[] = [
  { id: 'pr1', titulo: 'Corredor rodoviário do Planalto — fase de estudos (exemplo)', estado: 'pronta', dono: 'Directora de engenharia', item: { pais: 'AO', setor: 'obra', projeto: 'estrada' } },
  { id: 'pr2', titulo: 'Expansão do tratamento de água — dossiê (exemplo)', estado: 'em-revisao', dono: 'Director executivo', item: { pais: 'AO', setor: 'conformidade', projeto: 'agua' } },
  { id: 'pr3', titulo: 'Plataforma logística — estudo de mercado (exemplo)', estado: 'rascunho', dono: 'Gestor de projecto', item: { pais: 'NA', setor: 'financeiro', projeto: 'logistica' } },
]
const ROT = { rascunho: 'Rascunho do robô', 'em-revisao': 'Em revisão humana', pronta: 'Aprovada — pronta a apresentar' } as const
const COR = { rascunho: 'bg-amber-50 text-amber-900 border-amber-200', 'em-revisao': 'bg-sky-50 text-sky-800 border-sky-200', pronta: 'bg-emerald-50 text-emerald-800 border-emerald-200' } as const

export default function RobosProjectosGovernoPage() {
  const quem = usePessoaFundos()
  const vis = recorte(quem, PROPOSTAS)
  return (
    <Layout title="Robôs de projectos para o governo">
      <SoParaNiveis rota="/robos-governo">
      <div className="max-w-3xl mx-auto space-y-6">
        <VerComoFundos />
        <p className="text-sm text-grafite-claro">
          Demonstração. Os robôs preparam e apresentam; <strong>quem decide e quem entrega é sempre uma pessoa</strong>.
          Nenhum robô envia nada para fora da casa, e a predição continua fechada até calibração provada.
        </p>

        <section>
          <h2 className="font-semibold text-navy mb-2">Os robôs da esteira</h2>
          <ul className="space-y-2" data-testid="robos">
            {ROBOS.map(r => (
              <li key={r.id} className="border border-navy/15 rounded-sm p-3">
                <p className="font-medium text-navy">{r.nome}</p>
                <p className="text-sm text-grafite mt-1">{r.faz}</p>
                <p className="text-xs text-grafite-claro mt-1">Entrega: {r.entrega}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-navy mb-2">Esteira de propostas</h2>
          {vis.length === 0 && <p className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</p>}
          <ul className="space-y-2" data-testid="propostas">
            {vis.map(p => (
              <li key={p.id} className="border border-navy/15 rounded-sm p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{p.titulo}</p>
                  <p className="text-xs text-grafite-claro">Dono da decisão: {p.dono}</p>
                </div>
                <span className={`whitespace-nowrap text-xs px-2 py-0.5 rounded-sm border ${COR[p.estado]}`}>{ROT[p.estado]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </SoParaNiveis>
    </Layout>
  )
}
