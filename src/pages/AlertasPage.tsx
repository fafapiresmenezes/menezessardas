import { useEffect, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { SkeletonIndicator, SkeletonTable } from '@/components/Skeleton'
import { useAlertas } from '@/hooks/useAlertas'
import { formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { meuAlcance, filtrarPorUsuario, ALCANCE_FECHADO, rotuloCargo, type Alcance } from '@/lib/hierarquia'
import { BellOff, Circle } from 'lucide-react'
import Vazio from '@/components/Vazio'

export default function AlertasPage() {
  const { alertas, loading, getCriticos } = useAlertas()
  // Novidades das buscas salvas em Fontes (comunicações do Comunica PJe ainda não lidas).
  type Novidade = { id: number; oab: string; data_disponibilizacao: string; tribunal: string | null; tipo: string | null; numero_processo: string | null; link: string | null }
  const [novidades, setNovidades] = useState<Novidade[]>([])
  // Passo 06: avisos de 80%/100% do teto mensal de IA (gravados pelo verificador de hora em hora).
  type AvisoTeto = { id: number; mes: string; nivel: number; pct: number; gasto_brl: number; teto_brl: number; criado_em: string; email_enviado_em: string | null }
  const [avisosTeto, setAvisosTeto] = useState<AvisoTeto[]>([])
  // Passo 26: contrapartes cuja checagem KYC mudou de status na reconsulta e ainda não foi vista.
  type MudancaKyc = { id: number; cnpj: string; nome: string | null; risco: string; risco_anterior: string | null; consultado_em: string; usuario_id?: string | null }
  const [mudancasKyc, setMudancasKyc] = useState<MudancaKyc[]>([])
  // Privacidade por advogado: a checagem de contraparte do colega e a intimação do caso dele não são alerta de quem não os vê.
  // Enquanto não se sabe quem olha, vale o alcance mais estreito: esconder incomoda, mostrar vaza o caso do colega.
  const [alcance, setAlcance] = useState<Alcance | null>(null)
  const alc = alcance ?? ALCANCE_FECHADO
  useEffect(() => { meuAlcance().then(setAlcance).catch(() => setAlcance(ALCANCE_FECHADO)) }, [])
  // Dono do caso de cada número de processo: a intimação segue o caso (mesma regra da migração 124 e de Meu dia).
  const [donoPorProcesso, setDonoPorProcesso] = useState<Map<string, string | null>>(new Map())
  useEffect(() => {
    supabase.from('tarefas').select('numero_processo,responsavel_id').eq('nivel', 'projeto')
      .then(({ data }) => setDonoPorProcesso(new Map(((data ?? []) as { numero_processo: string | null; responsavel_id: string | null }[])
        .map(t => [String(t.numero_processo ?? '').replace(/\D/g, ''), t.responsavel_id]))))
  }, [])
  const carregarKyc = () => supabase.from('checagens_kyc').select('id,cnpj,nome,risco,risco_anterior,consultado_em,usuario_id').eq('mudou', true).is('visto_em', null).order('consultado_em', { ascending: false }).limit(20)
    .then(({ data }) => setMudancasKyc((data ?? []) as MudancaKyc[]))
  useEffect(() => { carregarKyc() }, [])
  const verKyc = async (id: number) => { await supabase.from('checagens_kyc').update({ visto_em: new Date().toISOString() }).eq('id', id); carregarKyc() }
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
  // Passo 88: os indicadores viram filtros e a página mostra a preferência de e-mail da pessoa.
  // Passo 152: o filtro escolhido é lembrado neste navegador.
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | '30dias' | 'documentos'>(() => { try { const v = localStorage.getItem('lsm-alertas-filtro'); return v === 'vencidos' || v === '30dias' || v === 'documentos' ? v : 'todos' } catch { return 'todos' } })
  useEffect(() => { try { localStorage.setItem('lsm-alertas-filtro', filtro) } catch { /* sem armazenamento */ } }, [filtro])
  const [prefEmail, setPrefEmail] = useState<{ alertas_email: boolean; dias_antecedencia: number } | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 270
  const [baixado, marcarBaixado] = useBaixado() // Passo 391
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('preferencias_usuario').select('alertas_email,dias_antecedencia').eq('usuario_id', data.user.id).maybeSingle()
        .then(({ data: pr }) => setPrefEmail(pr ?? { alertas_email: true, dias_antecedencia: 30 }))
    }).catch(() => undefined)
  }, [])

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

  // Só o que quem olha pode ver: checagem feita por ele (ou sem dono) e intimação de caso dele (ou sem caso).
  const kycVisiveis = alc.veTudo ? mudancasKyc : filtrarPorUsuario(mudancasKyc, alc)
  const novidadesVisiveis = alc.veTudo ? novidades : novidades.filter(n => {
    const dono = donoPorProcesso.get(String(n.numero_processo ?? '').replace(/\D/g, ''))
    return !dono || dono === alc.id
  })

  const vencidos = alertas.filter(a => a.diasRestantes < 0).length
  const documentos = alertas.filter(a => a.tipo === 'documento').length

  const indicadores: { rotulo: string; valor: number; cor: string; chave: typeof filtro }[] = [
    { rotulo: 'Total', valor: alertas.length, cor: 'text-navy', chave: 'todos' },
    { rotulo: 'Vencidos', valor: vencidos, cor: 'text-critico', chave: 'vencidos' },
    { rotulo: 'Vencem em 30 dias', valor: getCriticos(), cor: 'text-atencao', chave: '30dias' },
    { rotulo: 'Documentos a vencer', valor: documentos, cor: 'text-navy', chave: 'documentos' },
  ]
  const visiveis = alertas.filter(a =>
    filtro === 'vencidos' ? a.diasRestantes < 0
    : filtro === '30dias' ? a.diasRestantes >= 0 && a.diasRestantes <= 30
    : filtro === 'documentos' ? a.tipo === 'documento'
    : true)

  return (
    <Layout title="Alertas">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-grafite-claro mb-6">
            Todos os vencimentos cadastrados, ordenados por urgência. Clique em um alerta para gerenciar o contrato correspondente.
          </p>
          {!alc.veTudo && (
            <p className="bg-white border-l-2 border-dourado p-3 text-sm mb-6" data-testid="alertas-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
              Você está vendo <strong>os alertas dos seus casos</strong> ({rotuloCargo[alc.cargo ?? 'nenhum']}) e os do escritório (contratos e imóveis). Prazo sem responsável aparece para todos; sócios e o gestor veem o conjunto.
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {indicadores.map(ind => (
              <button type="button" key={ind.rotulo} onClick={() => setFiltro(ind.chave)} aria-pressed={filtro === ind.chave} data-testid={`filtro-${ind.chave}`} title={`Filtra a lista abaixo para mostrar apenas os alertas de "${ind.rotulo}"`}
                className={`text-left bg-white border-t-2 p-5 shadow-sm hover:bg-pergaminho transition ${filtro === ind.chave ? 'border-navy ring-1 ring-navy' : 'border-dourado'}`}>
                <p className="text-xs uppercase tracking-wider text-grafite-claro">{ind.rotulo}</p>
                <p className={`font-serif text-4xl mt-2 ${ind.cor}`}>{ind.valor}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-grafite-claro mt-2" data-testid="filtro-ativo">
            {filtro === 'todos' ? 'Clique em um número para filtrar a lista.' : <>Mostrando {visiveis.length} de {alertas.length}. <button type="button" onClick={() => setFiltro('todos')} title="Remove o filtro e volta a mostrar todos os alertas" className="underline text-navy">ver todos</button></>}
            {/* Passo 119: alertas visíveis em texto (imóvel, compromisso, data, dias), para a reunião ou o e-mail da sócia. */}
            {visiveis.length > 0 && <button type="button" data-testid="copiar-alertas" title="Copia os alertas visíveis em texto (imóvel, compromisso, data e dias) para colar em e-mail ou reunião" onClick={() => navigator.clipboard?.writeText(`Alertas · ${new Date().toLocaleDateString('pt-BR')} · ${visiveis.length} de ${alertas.length}\n` + visiveis.map(a => `${a.diasRestantes < 0 ? 'VENCIDO há ' + (-a.diasRestantes) + ' dia(s)' : a.diasRestantes === 0 ? 'HOJE' : 'em ' + a.diasRestantes + ' dia(s)'} · ${a.imovel} · ${a.titulo} · ${formatarData(a.dataEvento)}`).join('\n')).catch(() => undefined)} className="ml-3 underline text-navy">copiar lista</button>}
            {visiveis.length > 0 && <button type="button" data-testid="imprimir-alertas" title="Abre a tela de impressão do navegador com a lista de alertas visível" onClick={() => window.print()} className="ml-3 underline text-navy print:hidden">imprimir</button>}{/* Passo 186 */}
            {visiveis.length > 0 && <button type="button" data-testid="copiar-link-alertas" title="Copia o endereço desta página de alertas para compartilhar com a equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="ml-3 underline text-navy print:hidden">{linkCopiado ? 'link copiado' : 'copiar link'}</button>}{/* Passo 231 */}
            {visiveis.length > 0 && <button type="button" data-testid="baixar-alertas" title="Baixa a lista de alertas visíveis em arquivo CSV para abrir em planilha" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['imóvel;tipo;título;data do evento;dias restantes', ...visiveis.map(a => `${a.imovel};${a.tipo};${a.titulo.replace(/;/g, ',')};${a.dataEvento};${a.diasRestantes}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'alertas.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden">{baixado ? 'baixado' : 'baixar CSV'}</button>}{/* Passo 298 */}
          </p>
          {prefEmail && (
            <p className="text-sm mt-3 p-3 bg-white shadow-sm border-l-4 border-dourado" data-testid="pref-email">
              {prefEmail.alertas_email ? `Você recebe estes avisos por e-mail com até ${prefEmail.dias_antecedencia} dias de antecedência.` : 'Você escolheu não receber estes avisos por e-mail.'}{' '}
              <button type="button" onClick={() => navigate('/settings')} title="Abre a página de Configurações para mudar o recebimento de avisos por e-mail" className="underline text-navy">alterar em Configurações</button>
            </p>
          )}
        </div>

        {avisosTeto.length > 0 && (
          <section role="alert" className={`shadow-sm border-l-4 p-5 ${avisosTeto[0].nivel >= 100 ? 'bg-criticoFundo border-critico' : 'bg-atencaoFundo border-atencao'}`} data-testid="aviso-teto-ia">
            <h2 className="font-serif text-lg">{avisosTeto[0].nivel >= 100 ? 'Teto mensal de IA atingido: inteligência artificial pausada' : 'Atenção: 80% do teto mensal de IA já foi usado'}</h2>
            <p className="text-sm mt-1">
              {avisosTeto[0].gasto_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {avisosTeto[0].teto_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({avisosTeto[0].pct}%) em {formatarData(avisosTeto[0].criado_em.slice(0, 10))}.
              {avisosTeto[0].email_enviado_em ? ' Administradores avisados por e-mail.' : ' E-mail aos administradores ainda não enviado.'}
            </p>
            <button type="button" onClick={() => navigate('/consumo')} title="Abre a página de Consumo para ver o gasto de IA do mês em detalhe" className="mt-2 underline text-navy text-sm">Abrir Consumo</button>
          </section>
        )}
        {kycVisiveis.length > 0 && (
          <section role="alert" className="shadow-sm border-l-4 border-atencao bg-atencaoFundo p-5" data-testid="kyc-mudancas">
            <h2 className="font-serif text-lg">Contraparte mudou de status na checagem KYC</h2>
            <p className="text-sm mt-1">A reconsulta automática (a cada 90 dias) encontrou mudança no risco destas empresas. Confira antes de seguir com o contrato.</p>
            <ul className="mt-3 divide-y divide-navy/10 text-sm">
              {kycVisiveis.map(m => (
                <li key={m.id} className="py-2 flex flex-wrap items-center gap-2" data-testid="kyc-mudanca">
                  <span className="text-grafite-claro">{formatarData(m.consultado_em)}</span>
                  <span className="font-medium text-navy">{m.nome ?? m.cnpj}</span>
                  <span>era <strong>{m.risco_anterior}</strong>, agora <strong>{m.risco}</strong></span>
                  <button type="button" onClick={() => navigate('/kyc')} title="Abre a tela de checagem cadastral (KYC) para ver os detalhes da conferência desta empresa" className="ml-auto underline text-navy">abrir a checagem</button>
                  <button type="button" onClick={() => verKyc(m.id)} title="Marca esta mudança de status como vista e a remove desta lista de alertas" className="underline text-navy" data-testid="kyc-visto">marcar como visto</button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {novidadesVisiveis.length > 0 && (
          <section className="bg-white shadow-sm border-l-4 border-dourado p-5" data-testid="novidades-buscas">
            <h2 className="font-serif text-lg">Novidades das buscas salvas</h2>
            <p className="text-sm text-grafite-claro mt-1">Comunicações encontradas pelas buscas que você salvou em Fontes do advogado. Marque como lidas em Intimações.</p>
            <ul className="mt-3 divide-y divide-navy/10 text-sm">
              {novidadesVisiveis.map(n => (
                <li key={n.id} className="py-2 flex flex-wrap gap-2">
                  <span className="text-grafite-claro">{formatarData(n.data_disponibilizacao)}</span>
                  <span className="font-medium text-navy">{(n.oab ?? '').replace(/^busca:/, '')}</span>
                  <span>{[n.tribunal, n.tipo, n.numero_processo].filter(Boolean).join(' · ')}</span>
                  <button type="button" onClick={() => navigate('/intimacoes')} title="Abre a página de Intimações para ler esta comunicação e marcá-la como lida" className="ml-auto underline text-navy">ver</button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {visiveis.length === 0 ? (
          <div className="bg-white shadow-sm border-l-4 border-regular">
            <Vazio
              testid="alertas-vazio"
              icone={<BellOff size={28} />}
              titulo={filtro === 'todos' ? 'Nenhum alerta no momento' : 'Nenhum alerta neste filtro'}
              texto={filtro === 'todos' ? 'Você está em dia: nenhum contrato vence nem reajusta por agora. Confira o mês na agenda.' : 'Este filtro está vazio. Veja todos os alertas para saber o que existe.'}
              acao={filtro === 'todos'
                ? { rotulo: 'Ver a agenda do mês', para: '/agenda', dica: 'Abre a agenda com audiências, prazos e compromissos do mês' }
                : { rotulo: 'Ver todos os alertas', onClick: () => setFiltro('todos'), dica: 'Tira o filtro e mostra todos os alertas' }}
            />
          </div>
        ) : (
          <div className="bg-white shadow-sm divide-y divide-navy/10">
            {visiveis.map(alerta => {
              const situacao = situacaoPorPrazo(alerta.diasRestantes)
              return (
                <button
                  key={alerta.id}
                  onClick={() => navigate(`/contrato/${alerta.imovelId}`)}
                  title="Abre o contrato deste imóvel para gerenciar o compromisso do alerta"
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
