import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { SkeletonIndicator, SkeletonCard, SkeletonTable } from '@/components/Skeleton'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { formatarData, situacaoPorPrazo, textoPrazo, type Situacao } from '@/lib/datas'
import { rotulosTipoImovel } from '@/lib/rotulos'
import { AlertTriangle, CheckCircle2, Clock, Building2, Plus } from 'lucide-react'

// Cartões brancos (padrão premium): a urgência aparece só na borda lateral e no selo.
const molduraPorSituacao: Record<Situacao, string> = {
  vencido: 'border-critico',
  critico: 'border-critico',
  atencao: 'border-atencao',
  regular: 'border-regular',
  sem_prazo: 'border-grafite-claro/30',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { imoveis, loading: carregandoImoveis } = useImoveis()
  const { alertas, loading: carregandoAlertas } = useAlertas()

  if (carregandoImoveis || carregandoAlertas) {
    return (
      <Layout title="Painel">
        <div className="space-y-8">
          <SkeletonIndicator count={4} />
          <div>
            <div className="h-6 bg-navy/10 rounded w-40 mb-4 animate-pulse"></div>
            <SkeletonCard count={3} className="mb-4" />
          </div>
          <div>
            <div className="h-6 bg-navy/10 rounded w-48 mb-4 animate-pulse"></div>
            <SkeletonTable />
          </div>
        </div>
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
              <div key={ind.rotulo} className="bg-gradient-to-br from-white to-pergaminho/50 border-t-2 border-dourado p-5 shadow-md hover:shadow-lg transition duration-300">
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
            A cor e o rótulo indicam a urgência do compromisso mais próximo. Clique em um imóvel para gerenciar contratos.
          </p>
          {imoveis.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-pergaminho/30 p-12 text-center shadow-md rounded-sm border-l-4 border-grafite-claro/30">
              <Building2 size={40} className="mx-auto text-grafite-claro/40 mb-3" aria-hidden="true" />
              <p className="text-grafite-claro font-medium mb-4">Nenhum imóvel cadastrado</p>
              <p className="text-sm text-grafite-claro mb-6">Comece adicionando um imóvel à sua carteira para rastrear contratos e prazos.</p>
              <button
                onClick={() => navigate('/imoveis/novo')}
                className="inline-flex items-center gap-2 bg-navy text-white px-5 py-3 rounded-sm uppercase tracking-wider text-sm hover:bg-navy-700 transition"
              >
                <Plus size={16} aria-hidden="true" /> Novo imóvel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {imoveis.map((imovel, idx) => {
                const dias = prazoDoImovel(imovel.id)
                const situacao = situacaoPorPrazo(dias)
                const qtdAlertas = alertas.filter(a => a.imovelId === imovel.id).length
                return (
                  <button
                    key={imovel.id}
                    onClick={() => navigate(`/imoveis/${imovel.id}`)}
                    className={`bg-gradient-to-br from-white to-pergaminho/30 shadow-md p-5 border-l-[4px] text-left transition hover:shadow-lg hover:-translate-y-1 min-h-[120px] animate-fade-in rounded-sm ${molduraPorSituacao[situacao]}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    aria-label={`${imovel.endereco} - ${textoPrazo(dias)}`}
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
          )}
        </section>

        <section aria-labelledby="titulo-compromissos">
          <h2 id="titulo-compromissos" className="text-xl mb-1">
            Próximos compromissos
          </h2>
          <p className="text-sm text-grafite-claro mb-4">
            Compromissos ordenados por urgência. Clique em um imóvel para gerenciar vencimentos.
          </p>
          {proximos.length === 0 ? (
            <div className="bg-white p-12 text-center shadow-sm border-l-4 border-regular">
              <CheckCircle2 size={40} className="mx-auto text-regular/40 mb-3" aria-hidden="true" />
              <p className="text-grafite-claro font-medium mb-2">Nenhum compromisso próximo</p>
              <p className="text-sm text-grafite-claro">Você está em dia! Todos os vencimentos estão sob controle.</p>
            </div>
          ) : (
            <div className="relative bg-white shadow-lg overflow-x-auto rounded-sm" tabIndex={0} role="region" aria-label="Tabela de próximos compromissos">
              <table className="w-full">
                <caption className="sr-only">
                  Compromissos contratuais ordenados do mais urgente para o menos urgente
                </caption>
                <thead className="bg-gradient-to-r from-navy to-navy-700 text-white">
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
                    <tr key={alerta.id} className="hover:bg-gradient-to-r hover:from-dourado/5 hover:to-transparent transition duration-200">
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
          )}
        </section>
      </div>
    </Layout>
  )
}
