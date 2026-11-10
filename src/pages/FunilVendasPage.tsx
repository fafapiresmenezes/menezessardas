import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { formatarData, hojeLocal } from '@/lib/datas'
import { ETAPAS, ORIGENS, MOTIVOS_PERDA, resumoFunil, proximaEtapa, validarMudanca, telefoneWhatsapp, mensagemRetorno, casoDoLead, rotuloEtapa, type Lead, type Etapa } from '@/lib/escritorio/funil'
import { tabelaAusente } from '@/lib/escritorio/tabelaAusente'
import { Filter, Plus, MessageCircle, ArrowRight, Trash2 } from 'lucide-react'

// Funil de vendas do escritório: do primeiro contato ao contrato fechado, que vira caso com honorário no financeiro.
const AREAS = ['Imobiliário', 'Cível', 'Trabalhista', 'Família e sucessões', 'Tributário', 'Empresarial', 'Consumidor', 'Previdenciário', 'Penal', 'Compliance']
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const VAZIO = { nome: '', telefone: '', email: '', origem: 'indicacao', area: 'Cível', assunto: '', valor_estimado: '', proximo_contato: '', observacoes: '', responsavel_id: '' }
const CAMPOS = 'id,nome,telefone,email,origem,area,assunto,etapa,valor_estimado,proximo_contato,motivo_perda,observacoes,responsavel_id,caso_id,criado_em,etapa_desde'

export default function FunilVendasPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [novo, setNovo] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ausente, setAusente] = useState(false)
  const [perdendo, setPerdendo] = useState<{ id: string; motivo: string } | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = async () => {
    const { data, error } = await supabase.from('leads').select(CAMPOS).order('criado_em', { ascending: false })
    if (tabelaAusente(error)) return setAusente(true)
    if (error) return setErro(mensagemAmigavel(error))
    setLeads((data ?? []) as Lead[])
  }
  useEffect(() => { carregar(); listarPessoas().then(setPessoas).catch(() => {}) }, [])

  const resumo = useMemo(() => resumoFunil(leads), [leads])
  const filtrados = leads.filter(l => !busca || `${l.nome} ${l.assunto ?? ''} ${l.telefone ?? ''}`.toLowerCase().includes(busca.toLowerCase()))
  const nome = (id: string | null) => pessoas.find(p => p.id === id)?.nome

  const criar = async () => {
    setErro(''); setMsg('')
    if (novo.nome.trim().length < 2) return setErro('Escreva o nome de quem procurou o escritório.')
    const valor = Number(String(novo.valor_estimado).replace(/\./g, '').replace(',', '.')) || 0
    const { error } = await supabase.from('leads').insert({
      nome: novo.nome.trim(), telefone: novo.telefone.trim() || null, email: novo.email.trim() || null, origem: novo.origem, area: novo.area,
      assunto: novo.assunto.trim() || null, valor_estimado: valor, proximo_contato: novo.proximo_contato || null, observacoes: novo.observacoes.trim() || null, responsavel_id: novo.responsavel_id || null,
    })
    if (tabelaAusente(error)) return setAusente(true)
    if (error) return setErro(mensagemAmigavel(error))
    setNovo(VAZIO); setMsg('Contato incluído no funil.'); carregar()
  }
  const mover = async (l: Lead, etapa: Etapa, motivo?: string) => {
    setErro('')
    const problema = validarMudanca(l, etapa, motivo)
    if (problema) { if (etapa === 'perdido') setPerdendo({ id: l.id, motivo: '' }); return setErro(problema) }
    const { error } = await supabase.from('leads').update({ etapa, motivo_perda: etapa === 'perdido' ? motivo : null }).eq('id', l.id)
    if (error) return setErro(mensagemAmigavel(error))
    setPerdendo(null); carregar()
  }
  const atualizar = async (l: Lead, campos: Partial<Lead>) => {
    const { error } = await supabase.from('leads').update(campos).eq('id', l.id)
    if (error) return setErro(mensagemAmigavel(error))
    carregar()
  }
  const converter = async (l: Lead) => {
    setErro('')
    const { data, error } = await supabase.from('tarefas').insert(casoDoLead(l)).select('id').single()
    if (error || !data) return setErro(error ? mensagemAmigavel(error) : 'Não foi possível criar o caso.')
    const vinculo = await supabase.from('leads').update({ caso_id: (data as { id: string }).id, etapa: 'ganho' }).eq('id', l.id)
    if (vinculo.error) { setErro(`O caso foi criado, mas o contato não foi marcado como ganho (${mensagemAmigavel(vinculo.error)}). Marque à mão para não criar o caso de novo.`); carregar(); return }
    setMsg(`Caso criado para ${l.nome}, com honorários de ${brl(Number(l.valor_estimado))}.`); carregar()
  }
  const apagar = async (l: Lead) => {
    if (!window.confirm(`Apagar ${l.nome} do funil?`)) return
    const { error } = await supabase.from('leads').delete().eq('id', l.id)
    if (error) setErro(mensagemAmigavel(error))
    carregar()
  }

  if (ausente) return (
    <Layout title="Funil de vendas">
      <section className="bg-white shadow-sm border-l-4 border-dourado p-5" role="status" data-testid="funil-ausente">
        <p className="text-sm">O funil de vendas está pronto, mas a tabela dele ainda não foi criada no banco de dados. Um administrador aplica a atualização <code>108_funil_financeiro.sql</code> e a tela passa a funcionar na hora.</p>
      </section>
    </Layout>
  )

  return (
    <Layout title="Funil de vendas">
      <div className="space-y-5">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6" data-testid="funil-resumo">
          {[['Em aberto', String(resumo.abertos)], ['Valor no funil', brl(resumo.valorAberto)], ['Previsão (ponderada)', brl(resumo.previsao)], ['Fechado', brl(resumo.valorGanho)], ['Conversão', pct(resumo.conversao)], ['Ticket médio', brl(resumo.ticket)]].map(([r, v]) => (
            <div key={r} className="bg-white shadow-sm p-4 border-t-2 border-dourado"><span className="block text-xs uppercase tracking-wider text-grafite-claro">{r}</span><span className="block text-xl font-serif text-navy">{v}</span></div>
          ))}
        </div>

        {(resumo.followUps.length > 0 || resumo.parados.length > 0) && (
          <section className="bg-white shadow-sm border-l-4 border-critico p-4 text-sm" data-testid="funil-retornos">
            {resumo.followUps.length > 0 && <p><strong>Retornar hoje ({resumo.followUps.length}):</strong> {resumo.followUps.map(l => `${l.nome}${l.proximo_contato! < hojeLocal() ? ` (atrasado desde ${formatarData(l.proximo_contato!)})` : ''}`).join(' · ')}</p>}
            {resumo.parados.length > 0 && <p className="mt-1"><strong>Parados há mais de 14 dias na mesma etapa:</strong> {resumo.parados.map(l => l.nome).join(' · ')}</p>}
          </section>
        )}

        <section className="bg-white shadow-sm p-5" aria-labelledby="t-lead">
          <h2 id="t-lead" className="text-lg mb-3 flex items-center gap-2"><Plus size={18} className="text-dourado" aria-hidden /> Novo contato</h2>
          <div className="grid gap-3 sm:grid-cols-6 text-sm">
            <input aria-label="Nome" placeholder="Nome" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} className="border px-3 py-2 sm:col-span-2" data-testid="lead-nome" />
            <input aria-label="Telefone / WhatsApp" placeholder="Telefone / WhatsApp" value={novo.telefone} onChange={e => setNovo({ ...novo, telefone: e.target.value })} className="border px-3 py-2 sm:col-span-2" data-testid="lead-telefone" />
            <input aria-label="E-mail" placeholder="E-mail" type="email" value={novo.email} onChange={e => setNovo({ ...novo, email: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
            <select aria-label="Origem" value={novo.origem} onChange={e => setNovo({ ...novo, origem: e.target.value })} className="border px-2 py-2 sm:col-span-2">{ORIGENS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select>
            <select aria-label="Área do caso" value={novo.area} onChange={e => setNovo({ ...novo, area: e.target.value })} className="border px-2 py-2">{AREAS.map(a => <option key={a}>{a}</option>)}</select>
            <input aria-label="Assunto" placeholder="Assunto (ex.: despejo)" value={novo.assunto} onChange={e => setNovo({ ...novo, assunto: e.target.value })} className="border px-3 py-2 sm:col-span-3" data-testid="lead-assunto" />
            <input aria-label="Honorários estimados (R$)" placeholder="Honorários estimados (R$)" inputMode="decimal" value={novo.valor_estimado} onChange={e => setNovo({ ...novo, valor_estimado: e.target.value })} className="border px-3 py-2 sm:col-span-2" data-testid="lead-valor" />
            <label className="sm:col-span-2 text-xs text-grafite">Próximo contato<input type="date" value={novo.proximo_contato} onChange={e => setNovo({ ...novo, proximo_contato: e.target.value })} className="border px-3 py-2 w-full text-sm" data-testid="lead-proximo" /></label>
            <select aria-label="Responsável" value={novo.responsavel_id} onChange={e => setNovo({ ...novo, responsavel_id: e.target.value })} className="border px-2 py-2 sm:col-span-2"><option value="">Responsável</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <input aria-label="Observações" placeholder="Observações" value={novo.observacoes} onChange={e => setNovo({ ...novo, observacoes: e.target.value })} className="border px-3 py-2 sm:col-span-4" />
            <button type="button" onClick={criar} data-testid="lead-criar" className="min-h-[44px] bg-navy text-white px-5 uppercase tracking-wider sm:col-span-2">Incluir no funil</button>
          </div>
          {(erro || msg) && <p role={erro ? 'alert' : 'status'} className={`text-sm mt-3 ${erro ? 'text-critico' : ''}`} data-testid="funil-msg">{erro || msg}</p>}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm"><Filter size={14} aria-hidden /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no funil" aria-label="Buscar no funil" className="border px-3 py-2 min-h-[44px]" /></label>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid gap-3 grid-flow-col auto-cols-[minmax(230px,1fr)]" aria-label="Quadro do funil">
            {ETAPAS.map(e => {
              const cards = filtrados.filter(l => l.etapa === e.valor)
              return (
                <section key={e.valor} aria-label={e.rotulo} data-testid={`coluna-${e.valor}`} className="bg-pergaminho p-3 min-h-[200px]" onDragOver={ev => ev.preventDefault()} onDrop={ev => { const l = leads.find(x => x.id === ev.dataTransfer.getData('text/plain')); if (l) mover(l, e.valor) }}>
                  <h2 className="text-xs uppercase tracking-wider text-grafite">{e.rotulo} ({cards.length})</h2>
                  <p className="text-[11px] text-grafite-claro mb-2">{brl(cards.reduce((s, l) => s + Number(l.valor_estimado || 0), 0))} · {Math.round(e.chance * 100)}% de chance</p>
                  <ul className="space-y-2">
                    {cards.map(l => {
                      const wa = telefoneWhatsapp(l.telefone)
                      const prox = proximaEtapa(l.etapa)
                      return (
                        <li key={l.id} draggable onDragStart={ev => ev.dataTransfer.setData('text/plain', l.id)} className="bg-white p-3 shadow-sm text-sm" data-testid="lead-card">
                          <p className="font-medium text-navy">{l.nome}</p>
                          <p className="text-xs text-grafite-claro">{[l.assunto, l.area, ORIGENS.find(o => o[0] === l.origem)?.[1]].filter(Boolean).join(' · ')}</p>
                          <p className="text-xs mt-1">{brl(Number(l.valor_estimado))}{nome(l.responsavel_id) ? ` · ${nome(l.responsavel_id)}` : ''}</p>
                          {l.motivo_perda && <p className="text-xs text-critico">Motivo: {l.motivo_perda}</p>}
                          {!['ganho', 'perdido'].includes(l.etapa) && <label className="block text-[11px] text-grafite-claro mt-1">Próximo contato<input type="date" value={l.proximo_contato ?? ''} onChange={ev => atualizar(l, { proximo_contato: ev.target.value || null })} className="border px-1 py-0.5 block text-xs" aria-label={`Próximo contato de ${l.nome}`} /></label>}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <select value={l.etapa} onChange={ev => mover(l, ev.target.value as Etapa)} aria-label={`Etapa de ${l.nome}`} className="text-xs border px-1 py-0.5">{ETAPAS.map(x => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}</select>
                            {prox && <button type="button" onClick={() => mover(l, prox)} className="text-xs underline text-navy inline-flex items-center gap-1" data-testid="lead-avancar">{rotuloEtapa(prox)} <ArrowRight size={12} aria-hidden /></button>}
                            {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(mensagemRetorno(l))}`} target="_blank" rel="noreferrer" className="text-xs underline text-navy inline-flex items-center gap-1" data-testid="lead-whatsapp"><MessageCircle size={12} aria-hidden /> WhatsApp</a>}
                            {l.etapa === 'ganho' && !l.caso_id && <button type="button" onClick={() => converter(l)} className="text-xs underline text-navy" data-testid="lead-converter">Criar caso</button>}
                            {l.caso_id && <Link to={`/projetos?caso=${l.caso_id}`} className="text-xs underline text-navy">Ver caso</Link>}
                            <button type="button" onClick={() => apagar(l)} aria-label={`Apagar ${l.nome}`} className="text-xs text-grafite-claro"><Trash2 size={12} aria-hidden /></button>
                          </div>
                          {perdendo?.id === l.id && (
                            <div className="mt-2 flex flex-wrap gap-1" data-testid="lead-motivo">
                              <select value={perdendo.motivo} onChange={ev => setPerdendo({ id: l.id, motivo: ev.target.value })} aria-label="Motivo da perda" className="text-xs border px-1 py-0.5"><option value="">Motivo da perda</option>{MOTIVOS_PERDA.map(m => <option key={m}>{m}</option>)}</select>
                              <button type="button" onClick={() => mover(l, 'perdido', perdendo.motivo)} className="text-xs underline text-critico" data-testid="lead-confirmar-perda">Confirmar</button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-[11px] text-grafite-claro mt-2">{e.dica}</p>
                </section>
              )
            })}
          </div>
        </div>

        {(resumo.porOrigem.length > 0 || resumo.motivos.length > 0) && (
          <section className="bg-white shadow-sm p-5 grid gap-6 md:grid-cols-2 text-sm" data-testid="funil-analise">
            <div><h2 className="font-serif text-lg mb-2">De onde vêm os clientes</h2>
              <table className="w-full"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th>Origem</th><th>Contatos</th><th>Fechados</th><th>Conversão</th></tr></thead>
                <tbody>{resumo.porOrigem.map(o => <tr key={o.origem}><td>{o.origem}</td><td>{o.total}</td><td>{o.ganhos}</td><td>{pct(o.conversao)}</td></tr>)}</tbody></table></div>
            <div><h2 className="font-serif text-lg mb-2">Por que perdemos</h2>
              {resumo.motivos.length ? <ul>{resumo.motivos.map(m => <li key={m.motivo}>{m.motivo}: <strong>{m.quantidade}</strong></li>)}</ul> : <p className="text-grafite-claro">Nenhuma perda registrada.</p>}</div>
          </section>
        )}
      </div>
    </Layout>
  )
}
