import { FunctionRegion } from '@supabase/supabase-js'
import Vazio from '@/components/Vazio'
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { perfilAtual } from '@/lib/equipe'
import { formatarData, diasAte } from '@/lib/datas'
import SeloSituacao from '@/components/SeloSituacao'
import { RefreshCw, ExternalLink } from 'lucide-react'

// Caixa de intimações: publicações do Diário de Justiça Eletrônico Nacional (Comunica PJe, CNJ)
// para as OABs do escritório. Busca diária automática e botão "Buscar agora". Gratuito.
interface Intimacao {
  id: number; oab: string; data_disponibilizacao: string; tribunal: string | null; orgao: string | null
  tipo: string | null; classe: string | null; numero_processo: string | null; texto: string | null; link: string | null; lida: boolean; prazo_dias?: number | null; prazo_final?: string | null; tarefa_id?: string | null
}

export default function IntimacoesPage() {
  const [lista, setLista] = useState<Intimacao[]>([])
  const [admin, setAdmin] = useState(false)
  const [oabs, setOabs] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [filtro, setFiltro] = useState<'novas' | 'todas'>('novas')
  const [aberta, setAberta] = useState<number | null>(null)

  const carregar = async () => {
    const { data } = await supabase.from('intimacoes').select('id,oab,data_disponibilizacao,tribunal,orgao,tipo,classe,numero_processo,texto,link,lida,prazo_dias,prazo_final,tarefa_id').order('data_disponibilizacao', { ascending: false }).limit(300)
    setLista((data ?? []) as Intimacao[])
  }
  useEffect(() => { carregar(); perfilAtual().then(f => setAdmin(f === 'admin')) }, [])

  const buscar = async () => {
    setOcupado(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('intimacoes', { body: { dias: 30 }, region: FunctionRegion.SaEast1 })
    setOcupado(false)
    const d = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (!d || d.erro) return setMsg({ ok: false, texto: d?.erro ?? 'O CNJ não respondeu agora. Tente de novo em instantes.' })
    if (d.aviso) return setMsg({ ok: false, texto: d.aviso })
    setMsg({ ok: !d.falhas?.length, texto: `${d.novas} intimação(ões) nova(s) nos últimos 30 dias para ${d.oabs.join(', ')}.${d.falhas?.length ? ' Falhou: ' + d.falhas.join('; ') : ''}` })
    carregar()
  }
  const salvarOabs = async () => {
    const { error } = await supabase.rpc('definir_configuracao', { p_chave: 'oabs_monitoradas', p_valor: oabs })
    if (error) return setMsg({ ok: false, texto: error.message })
    setOabs(''); buscar()
  }
  const marcarLida = async (i: Intimacao) => {
    setLista(l => l.map(x => (x.id === i.id ? { ...x, lida: true } : x)))
    await supabase.from('intimacoes').update({ lida: true }).eq('id', i.id)
  }
  // Passo 13: urgência pelo prazo estimado (dias úteis, CPC art. 219/224) e tarefa no caso correspondente.
  const urgencia = (i: Intimacao) => {
    if (!i.prazo_final) return null
    const d = diasAte(i.prazo_final) ?? 0
    return { d, situacao: d < 0 ? 'vencido' : d <= 2 ? 'critico' : d <= 5 ? 'atencao' : 'regular', texto: d < 0 ? 'Prazo vencido' : d === 0 ? 'Vence hoje' : `${d} dia(s) corridos` } as const
  }
  const criarTarefa = async (i: Intimacao) => {
    const { data, error } = await supabase.rpc('criar_tarefa_intimacao', { p_id: i.id })
    if (error) setMsg({ ok: false, texto: 'Não deu para criar a tarefa: ' + error.message })
    else { setMsg({ ok: true, texto: 'Tarefa criada em Casos e projetos com o prazo estimado.' }); setLista(l => l.map(x => (x.id === i.id ? { ...x, tarefa_id: String(data) } : x))) }
  }
  const ordem = { vencido: 0, critico: 1, atencao: 2, regular: 3 } as const
  const visiveis = (filtro === 'novas' ? lista.filter(i => !i.lida) : lista).slice().sort((a, b) => (ordem[urgencia(a)?.situacao ?? 'regular'] - ordem[urgencia(b)?.situacao ?? 'regular']) || b.data_disponibilizacao.localeCompare(a.data_disponibilizacao))

  return (
    <Layout title="Intimações">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5 space-y-3">
          <p className="text-sm">Publicações do <strong>Diário de Justiça Eletrônico Nacional</strong> (CNJ) para as OABs do escritório. A busca roda sozinha todo dia às 7h; o botão busca na hora.</p>
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={buscar} disabled={ocupado} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50">
              <RefreshCw size={16} aria-hidden="true" className={ocupado ? 'animate-spin' : ''} /> {ocupado ? 'Buscando…' : 'Buscar agora'}
            </button>
            <label className="text-sm flex items-center gap-2">
              <select aria-label="Quais intimações mostrar" value={filtro} onChange={e => setFiltro(e.target.value as 'novas' | 'todas')} className="border px-2 py-2">
                <option value="novas">Só as não lidas ({lista.filter(i => !i.lida).length})</option>
                <option value="todas">Todas ({lista.length})</option>
              </select>
            </label>
          </div>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`p-3 text-sm border-l-2 ${msg.ok ? 'bg-regularFundo border-regular text-regular' : 'bg-atencaoFundo border-atencao text-atencao'}`}>{msg.texto}</p>}
          {admin && (
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs uppercase tracking-wider text-grafite block">OABs do escritório (número/UF, separadas por vírgula)
                <input value={oabs} onChange={e => setOabs(e.target.value)} placeholder="123456/RJ, 98765/RJ" className="block border px-3 py-2 mt-1 w-72 normal-case" />
              </label>
              <button onClick={salvarOabs} disabled={!oabs.trim()} className="min-h-[44px] px-4 border border-navy text-navy text-sm disabled:opacity-50">Salvar OABs</button>
            </div>
          )}
        </section>
        {visiveis.length ? (
          <ul className="bg-white shadow-sm divide-y divide-navy/10">
            {visiveis.map(i => (
              <li key={i.id} className={`p-4 ${i.lida ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-navy font-medium">{i.tipo ?? 'Comunicação'} · {i.tribunal} · {formatarData(i.data_disponibilizacao)}</p>
                    <p className="text-xs text-grafite-claro">Processo {i.numero_processo} · {i.classe} · {i.orgao} · OAB {i.oab}</p>
                    {(() => { const u = urgencia(i); return u ? (
                      <p className="flex flex-wrap items-center gap-2 mt-1 text-xs" data-testid={`urgencia-${i.id}`}>
                        <SeloSituacao situacao={u.situacao} texto={u.texto} />
                        <span className="text-grafite-claro">prazo estimado até {formatarData(i.prazo_final!)} ({i.prazo_dias} dias úteis; confira nos autos)</span>
                        {i.tarefa_id ? <a href="#/projetos" className="underline text-navy">tarefa criada no caso</a> : <button type="button" onClick={() => criarTarefa(i)} className="underline text-navy" data-testid={`criar-tarefa-${i.id}`}>criar tarefa no caso</button>}
                      </p>) : null })()}
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => setAberta(aberta === i.id ? null : i.id)} className="underline text-navy">{aberta === i.id ? 'Fechar' : 'Ler'}</button>
                    {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" className="underline text-navy inline-flex items-center gap-1">Abrir no tribunal <ExternalLink size={12} aria-hidden="true" /></a>}
                    {!i.lida && <button onClick={() => marcarLida(i)} className="underline text-grafite">Marcar como lida</button>}
                  </div>
                </div>
                {aberta === i.id && <p className="text-sm mt-2 whitespace-pre-wrap">{i.texto}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <Vazio titulo={`Nenhuma intimação ${filtro === 'novas' ? 'não lida' : 'guardada'}`} texto="A busca roda todo dia às 7h para as OABs cadastradas. Se faltar alguma OAB, cadastre em Configurações." acao={{ rotulo: 'Cadastrar OABs', para: '/settings' }} />
        )}
      </div>
    </Layout>
  )
}
