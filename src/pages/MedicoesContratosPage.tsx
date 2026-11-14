import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import {
  PLATAFORMAS, NATUREZAS, REGUA, lerContratosEMedicoes, avisos, resumoDoContrato,
  acaoSugerida, grauDoAtraso, dinheiro,
  type Contrato, type MedicaoContrato, type Natureza, type Grau,
} from '@/lib/medicoesContratos'

/**
 * Medições de contrato (pedido de M em 13/11/2026).
 *
 * A tela é organizada em dois níveis, como ele pediu: primeiro projeto público e projeto privado,
 * porque o atraso de um órgão não se trata como o de uma empresa; dentro de cada um, as
 * plataformas. Em cima de tudo, o que precisa de aviso hoje, do pior para o menos grave.
 */
const COR: Record<Grau, string> = {
  em_dia: 'text-regular',
  avisar: 'text-atencao',
  avisar_de_novo: 'text-atencao font-medium',
  parar: 'text-critico font-medium',
}
const NOME_GRAU: Record<Grau, string> = {
  em_dia: 'Em dia', avisar: 'Avisar', avisar_de_novo: 'Avisar de novo', parar: 'Parar o serviço',
}

export default function MedicoesContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [medicoes, setMedicoes] = useState<MedicaoContrato[]>([])
  const [semTabela, setSemTabela] = useState(false)

  useEffect(() => {
    lerContratosEMedicoes().then(r => {
      setContratos(r.contratos); setMedicoes(r.medicoes); setSemTabela(r.semTabela)
    }).catch(() => setSemTabela(true))
  }, [])

  const lista = avisos(contratos, medicoes)

  return (
    <Layout title="Medições">
      <div className="p-6 max-w-5xl">
        <p className="text-sm text-grafite-claro mb-6">
          Cada contrato de serviço é medido por período: mede-se o que foi entregue, aprova-se,
          fatura-se, a fatura vence e o dinheiro cai. Esta tela mostra isso para todas as
          plataformas, separando projeto público de projeto privado, e avisa quando o pagamento
          atrasa.
        </p>

        <h2 className="text-lg font-serif mb-2">Precisa de aviso hoje</h2>
        {!lista.length && <p className="text-sm text-grafite-claro mb-8">Nada em atraso.</p>}
        {!!lista.length && (
          <ul className="space-y-3 mb-8" data-testid="avisos-medicoes">
            {lista.map(a => (
              <li key={a.medicao.id} className="border border-grafite/30 p-3 text-sm">
                <div className="flex justify-between gap-4 flex-wrap">
                  <span>
                    <strong>{a.contrato.cliente}</strong> · {a.medicao.periodo} ·{' '}
                    {PLATAFORMAS.find(p => p.id === a.contrato.plataforma)?.nome} ·{' '}
                    {a.contrato.natureza === 'publico' ? 'projeto público' : 'projeto privado'}
                  </span>
                  <span className={COR[a.grau]}>{NOME_GRAU[a.grau]} · {a.dias} dias</span>
                </div>
                <p className="mt-1 text-grafite-claro">{a.acao}</p>
                {a.automatica && (
                  <p className="mt-1 text-critico">
                    O serviço deste contrato será parado nesta medição, porque o contrato privado
                    tem cláusula de suspensão.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {NATUREZAS.map(nat => (
          <section key={nat.id} className="mb-10">
            <h2 className="text-lg font-serif mb-1">{nat.nome}</h2>
            <p className="text-sm text-grafite-claro mb-1">{nat.porQue}</p>
            <p className="text-sm text-grafite-claro mb-3">
              Régua de atraso: primeiro aviso em {REGUA[nat.id as Natureza].avisar} dia, segundo
              aviso em {REGUA[nat.id as Natureza].avisarDeNovo} dias, e{' '}
              {nat.id === 'publico'
                ? `em ${REGUA.publico.parar} dias a minuta de notificação fica pronta para um advogado decidir — o sistema não para serviço público sozinho.`
                : `em ${REGUA.privado.parar} dias o serviço para, se o contrato tiver a cláusula.`}
            </p>

            {PLATAFORMAS.map(pl => {
              const doGrupo = contratos.filter(c => c.natureza === nat.id && c.plataforma === pl.id)
              if (!doGrupo.length) return null
              return (
                <div key={pl.id} className="mb-5">
                  <h3 className="font-medium mb-2">{pl.nome}</h3>
                  <table className="w-full text-sm border border-grafite/30">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-2">Cliente e objeto</th>
                        <th className="text-right p-2">Medido</th>
                        <th className="text-right p-2">Recebido</th>
                        <th className="text-right p-2">A receber</th>
                        <th className="text-left p-2">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doGrupo.map(c => {
                        const r = resumoDoContrato(c, medicoes)
                        const abertas = medicoes.filter(m => m.contrato_id === c.id && !m.recebida_em)
                        const pior = abertas.map(m => grauDoAtraso(c, m))
                          .sort((a, b) => ({ parar: 3, avisar_de_novo: 2, avisar: 1, em_dia: 0 })[b]
                                        - ({ parar: 3, avisar_de_novo: 2, avisar: 1, em_dia: 0 })[a])[0] ?? 'em_dia'
                        const medicaoPior = abertas.find(m => grauDoAtraso(c, m) === pior)
                        return (
                          <tr key={c.id}>
                            <td className="p-2">
                              <strong>{c.cliente}</strong>
                              <span className="text-grafite-claro"> · {c.objeto} · {r.quantas} medições · {r.doContrato}% do contrato</span>
                              {c.servico_suspenso && <span className="text-critico"> · serviço parado</span>}
                            </td>
                            <td className="p-2 text-right">{dinheiro(r.medido)}</td>
                            <td className="p-2 text-right">{dinheiro(r.recebido)}</td>
                            <td className="p-2 text-right">{dinheiro(r.aReceber)}</td>
                            <td className={`p-2 ${COR[pior]}`}>
                              <span title={medicaoPior ? acaoSugerida(c, medicaoPior) : 'Nenhuma medição em aberto.'}>
                                {NOME_GRAU[pior]}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
            {!contratos.some(c => c.natureza === nat.id) && (
              <p className="text-sm text-grafite-claro">Nenhum contrato deste tipo cadastrado ainda.</p>
            )}
          </section>
        ))}

        {semTabela && (
          <p className="text-sm text-grafite-claro" data-testid="medicoes-sem-banco">
            As tabelas desta tela ainda não existem no banco: falta aplicar a migração 133. A tela
            já funciona, e os contratos aparecem assim que ela for aplicada.
          </p>
        )}
      </div>
    </Layout>
  )
}
