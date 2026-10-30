import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { SkeletonIndicator, SkeletonTable } from '@/components/Skeleton'
import { useAlertas } from '@/hooks/useAlertas'
import { formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { BellOff, Circle } from 'lucide-react'

export default function AlertasPage() {
  const { alertas, loading, getCriticos } = useAlertas()
  // Novidades das buscas salvas em Fontes (comunicações do Comunica PJe ainda não lidas).
  type Novidade = { id: number; oab: string; data_disponibilizacao: string; tribunal: string | null; tipo: string | null; numero_processo: string | null; link: string | null }
  const [novidades, setNovidades] = useState<Novidade[]>([])
  // Passo 06: avisos de 80%/100% do teto mensal de IA (gravados pelo verificador de hora em hora).
  type AvisoTeto = { id: number; mes: string; nivel: number; pct: number; gasto_brl: number; teto_brl: number; criado_em: string; email_enviado_em: string | null }
  const [avisosTeto, setAvisosTeto] = useState<AvisoTeto[]>([])
  useEffect(() => {
    const mes = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
    supabase.from('avisos_teto_ia').select('*').eq('mes', mes).order('nivel', { ascending: false }).limit(2)
      .then(({ data }) => setAvisosTeto((data ?? []) as AvisoTeto[]))
  }, [])
  useEffect(() => {
    supabase.from('intimacoes').select('id, oab, data_disponibilizacao, tribunal, tipo, numero_processo, link').like('oab', 'busca:%').eq('lida', false).order('data_disponibilizacao', { ascending: false }).limit(20)
      .then(({ data }) => setNovidades((data ?? []) as Novidade[]))
  }, [])
  const navigate = useNavigate()

  if (loading) {
    return (
      <Layout title="Alertas">
        <div className="space-y-6">
          <SkeletonIndicator count={4} />
          <SkeletonTable />
        </div>
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

        {avisosTeto.length > 0 && (
          <section role="alert" className={`shadow-sm border-l-4 p-5 ${avisosTeto[0].nivel >= 100 ? 'bg-criticoFundo border-critico' : 'bg-atencaoFundo border-atencao'}`} data-testid="aviso-teto-ia">
            <h2 className="font-serif text-lg">{avisosTeto[0].nivel >= 100 ? 'Teto mensal de IA atingido: inteligência artificial pausada' : 'Atenção: 80% do teto mensal de IA já foi usado'}</h2>
            <p className="text-sm mt-1">
              {avisosTeto[0].gasto_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {avisosTeto[0].teto_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({avisosTeto[0].pct}%) em {formatarData(avisosTeto[0].criado_em.slice(0, 10))}.
              {avisosTeto[0].email_enviado_em ? ' Administradores avisados por e-mail.' : ' E-mail aos administradores ainda não enviado.'}
            </p>
            <button type="button" onClick={() => navigate('/consumo')} className="mt-2 underline text-navy text-sm">Abrir Consumo</button>
          </section>
        )}
        {novidades.length > 0 && (
          <section className="bg-white shadow-sm border-l-4 border-dourado p-5" data-testid="novidades-buscas">
            <h2 className="font-serif text-lg">Novidades das buscas salvas</h2>
            <p className="text-sm text-grafite-claro mt-1">Comunicações encontradas pelas buscas que você salvou em Fontes do advogado. Marque como lidas em Intimações.</p>
            <ul className="mt-3 divide-y divide-navy/10 text-sm">
              {novidades.map(n => (
                <li key={n.id} className="py-2 flex flex-wrap gap-2">
                  <span className="text-grafite-claro">{formatarData(n.data_disponibilizacao)}</span>
                  <span className="font-medium text-navy">{n.oab.slice(6)}</span>
                  <span>{[n.tribunal, n.tipo, n.numero_processo].filter(Boolean).join(' · ')}</span>
                  <button type="button" onClick={() => navigate('/intimacoes')} className="ml-auto underline text-navy">ver</button>
                </li>
              ))}
            </ul>
          </section>
        )}
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
