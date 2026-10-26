import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useAlertas } from '@/hooks/useAlertas'
import { formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { BellOff, Circle } from 'lucide-react'

export default function AlertasPage() {
  const { alertas, loading, getCriticos } = useAlertas()
  const navigate = useNavigate()

  if (loading) {
    return (
      <Layout title="Alertas">
        <p className="text-grafite-claro">Carregando alertas…</p>
      </Layout>
    )
  }

  const vencidos = alertas.filter(a => a.diasRestantes < 0).length
  const documentos = alertas.filter(a => a.tipo === 'documento').length

  const indicadores = [
    { rotulo: 'Total', valor: alertas.length, cor: 'text-navy' },
    { rotulo: 'Vencidos', valor: vencidos, cor: 'text-critico' },
    { rotulo: 'Vencem em 30 dias', valor: getCriticos(), cor: 'text-atencao' },
    { rotulo: 'Documentos a vencer', valor: documentos, cor: 'text-navy' },
  ]

  return (
    <Layout title="Alertas">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-grafite-claro mb-6">
            Todos os vencimentos cadastrados, ordenados por urgência. Clique em um alerta para gerenciar o contrato correspondente.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {indicadores.map(ind => (
              <div key={ind.rotulo} className="bg-white border-t-2 border-dourado p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-grafite-claro">{ind.rotulo}</p>
                <p className={`font-serif text-4xl mt-2 ${ind.cor}`}>{ind.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {alertas.length === 0 ? (
          <div className="bg-white p-12 text-center shadow-sm border-l-4 border-regular">
            <BellOff className="mx-auto mb-4 text-regular/40" size={40} aria-hidden="true" />
            <p className="text-grafite-claro font-medium mb-2">Nenhum alerta no momento</p>
            <p className="text-sm text-grafite-claro">Você está em dia com todos os compromissos.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm divide-y divide-navy/10">
            {alertas.map(alerta => {
              const situacao = situacaoPorPrazo(alerta.diasRestantes)
              return (
                <button
                  key={alerta.id}
                  onClick={() => navigate(`/contrato/${alerta.imovelId}`)}
                  className="w-full text-left p-5 hover:bg-pergaminho transition flex items-start justify-between gap-4 min-h-[88px]"
                  aria-label={`${alerta.titulo} - ${alerta.imovel} - ${textoPrazo(alerta.diasRestantes)}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Circle size={18} className="text-dourado fill-dourado flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium text-navy">{alerta.titulo}</p>
                      <p className="text-sm text-grafite-claro mt-1 truncate">{alerta.imovel}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <SeloSituacao situacao={situacao} texto={textoPrazo(alerta.diasRestantes)} />
                    <p className="text-xs text-grafite-claro mt-2">{formatarData(alerta.dataEvento)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
