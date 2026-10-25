import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { formatarData, situacaoPorPrazo, textoPrazo, type Situacao } from '@/lib/datas'
import { rotulosTipoImovel } from '@/lib/rotulos'
import { AlertTriangle, CheckCircle2, Clock, Building2 } from 'lucide-react'

const molduraPorSituacao: Record<Situacao, string> = {
  vencido: 'bg-criticoFundo border-critico',
  critico: 'bg-criticoFundo border-critico',
  atencao: 'bg-atencaoFundo border-atencao',
  regular: 'bg-regularFundo border-regular',
  sem_prazo: 'bg-white border-grafite-claro/30',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { imoveis, loading: carregandoImoveis } = useImoveis()
  const { alertas, loading: carregandoAlertas } = useAlertas()

  if (carregandoImoveis || carregandoAlertas) {
    return (
      <Layout title="Painel">
        <p className="text-grafite-claro">Carregando painel…</p>
      </Layout>
    )
  }

  // O prazo de cada imóvel é o compromisso mais próximo: alerta ou vencimento cadastrado.
  const prazoDoImovel = (imovelId: string): number | null => {
    const prazos = alertas.filter(a => a.imovelId === imovelId).map(a => a.diasRestantes)
    return prazos.length ? Math.min(...prazos) : null
  }

  const situacoes = imoveis.map(i => situacaoPorPrazo(prazoDoImovel(i.id)))
  const vencidos = situacoes.filter(s => s === 'vencido').length
  const criticos = situacoes.filter(s => s === 'critico').length
  const regulares = situacoes.filter(s => s === 'regular' || s === 'atencao' || s === 'sem_prazo').length

  const indicadores = [
    { rotulo: 'Imóveis', valor: imoveis.length, icone: Building2, cor: 'text-navy' },
    { rotulo: 'Vencidos', valor: vencidos, icone: AlertTriangle, cor: 'text-critico' },
    { rotulo: 'Vencem em 30 dias', valor: criticos, icone: Clock, cor: 'text-atencao' },
    { rotulo: 'Em dia', valor: regulares, icone: CheckCircle2, cor: 'text-regular' },
  ]

  const proximos = [...alertas].sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 10)

  return (
    <Layout title="Painel">
      <div className="space-y-10">
        <section aria-label="Indicadores gerais">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicadores.map(ind => (
              <div key={ind.rotulo} className="bg-white border-t-2 border-dourado p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-grafite-claro">{ind.rotulo}</p>
                    <p className={`font-serif text-4xl mt-2 ${ind.cor}`}>{ind.valor}</p>
                  </div>
                  <ind.icone className={ind.cor} size={22} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="titulo-carteira">
          <h2 id="titulo-carteira" className="text-xl mb-1">
            Carteira de imóveis
          </h2>
          <p className="text-sm text-grafite-claro mb-4">
            A cor e o rótulo indicam a urgência do compromisso mais próximo de cada imóvel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {imoveis.map(imovel => {
              const dias = prazoDoImovel(imovel.id)
              const situacao = situacaoPorPrazo(dias)
              const qtdAlertas = alertas.filter(a => a.imovelId === imovel.id).length
              return (
                <button
                  key={imovel.id}
                  onClick={() => navigate(`/contrato/${imovel.id}`)}
                  className={`p-4 border-l-2 text-left transition hover:shadow-md ${molduraPorSituacao[situacao]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-navy leading-snug">{imovel.endereco}</p>
                    <SeloSituacao situacao={situacao} />
                  </div>
                  <p className="text-sm text-grafite-claro mt-2">{rotulosTipoImovel[imovel.tipo] ?? imovel.tipo}</p>
                  <p className="text-xs text-grafite mt-2">
                    {textoPrazo(dias)}
                    {qtdAlertas > 0 && ` · ${qtdAlertas} ${qtdAlertas === 1 ? 'alerta' : 'alertas'}`}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="titulo-compromissos">
          <h2 id="titulo-compromissos" className="text-xl mb-4">
            Próximos compromissos
          </h2>
          <div className="relative bg-white shadow-sm overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de próximos compromissos">
            <table className="w-full">
              <caption className="sr-only">
                Compromissos contratuais ordenados do mais urgente para o menos urgente
              </caption>
              <thead className="bg-navy text-white">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Data</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Compromisso</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Imóvel</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Prazo</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/10">
                {proximos.map(alerta => (
                  <tr key={alerta.id} className="hover:bg-pergaminho">
                    <td className="px-5 py-3.5 text-sm whitespace-nowrap">{formatarData(alerta.dataEvento)}</td>
                    <td className="px-5 py-3.5 text-sm">{alerta.titulo}</td>
                    <td className="px-5 py-3.5 text-sm text-grafite-claro">{alerta.imovel}</td>
                    <td className="px-5 py-3.5 text-sm whitespace-nowrap">{textoPrazo(alerta.diasRestantes)}</td>
                    <td className="px-5 py-3.5">
                      <SeloSituacao situacao={situacaoPorPrazo(alerta.diasRestantes)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  )
}
