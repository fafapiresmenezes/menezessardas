/**
 * Ecrã C10 — Assistente da casa de fundos (DEMONSTRAÇÃO).
 * Perguntas em linguagem simples, respostas simples tiradas dos dados de demonstração.
 * NÃO é um assistente com IA ligada; é uma amostra de como funcionaria. Nada lê/grava no banco.
 */
import { useState } from 'react'
import LayoutFundos from '@/components/LayoutFundos'
import VerComoFundos, { SoParaNiveis } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'

interface QA { p: string; r: string }
const RESPOSTAS: QA[] = [
  { p: 'Qual projecto está em alerta?', r: 'A Estrada do Planalto está em alerta: falta a licença ambiental da fase 2 e há uma divergência de medição com o empreiteiro. A carteira mostra o motivo em cada projecto.' },
  { p: 'O que vence nos próximos dias?', r: 'A caução de garantia da Estação de tratamento de água vence a 30/11. A licença ambiental da fase 2 vence a 15/12. Vê o ecrã de Garantias e licenças, ordenado por validade.' },
  { p: 'Por que um pagamento está retido?', r: 'A fatura de serviços do Parque logístico de Walvis Bay está retida porque falta confirmar o título de concessão do terreno, que é uma obrigação do contrato.' },
  { p: 'Quanto falta pagar?', r: 'A Visão do presidente soma o valor contratado e o que falta pagar em todos os projectos. Os valores aparecem em Kwanzas e em dólares, conforme cada contrato.' },
]

export default function AssistenteFundosPage() {
  const [aberta, setAberta] = useState<number | null>(null)
  return (
    <LayoutFundos title="Assistente">
      <SoParaNiveis rota="/assistente-fundos">
      <div className="max-w-3xl mx-auto space-y-4">
        <VerComoFundos />
        <SaberDaMateria rota="/assistente-fundos" />
        <p className="text-sm text-grafite-claro">
          Demonstração. Perguntas do dia a dia, respondidas em linguagem simples a partir dos dados da plataforma.
          Nesta amostra as respostas são fixas; na versão ligada, o assistente lê os projectos em tempo real.
        </p>
        <ul className="space-y-2" data-testid="assistente">
          {RESPOSTAS.map((qa, i) => (
            <li key={i} className="border border-navy/15 rounded-sm">
              <button
                type="button"
                onClick={() => setAberta(aberta === i ? null : i)}
                className="w-full text-left p-3 font-medium text-navy"
                title={qa.p}
                aria-label={qa.p}
                aria-expanded={aberta === i}
              >
                {qa.p}
              </button>
              {aberta === i && <p className="px-3 pb-3 text-sm text-grafite">{qa.r}</p>}
            </li>
          ))}
        </ul>
      </div>
      </SoParaNiveis>
    </LayoutFundos>
  )
}
