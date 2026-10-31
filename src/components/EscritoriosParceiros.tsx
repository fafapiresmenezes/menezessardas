import { useEffect, useState } from 'react'
import { Building, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FaturasParceiros from '@/components/FaturasParceiros'
import MarcaParceiros from '@/components/MarcaParceiros'
import { criarEscritorio, escritorioDasPessoas, listarEscritorios, moverParaEscritorio, SEDE_ID, type Escritorio, type Pessoa } from '@/lib/equipe'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Só a sede vê: cria escritórios parceiros, coloca pessoas neles e acompanha a cobrança mensal por usuário (Value Pas).
export default function EscritoriosParceiros({ pessoas, aoMudar }: { pessoas: Pessoa[]; aoMudar: () => void }) {
  const [lista, setLista] = useState<Escritorio[]>([])
  const [onde, setOnde] = useState<Record<string, string>>({})
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  // Passo 36: convite por e-mail.
  const [conv, setConv] = useState({ nome_escritorio: '', email: '', funcao: 'operador' })
  const [convites, setConvites] = useState<{ id: string; nome_escritorio: string; email: string; funcao: string; criado_em: string; expira_em: string; aceito_em: string | null }[]>([])
  const [linkConvite, setLinkConvite] = useState('')
  const carregarConvites = async () => { const { data } = await supabase.from('convites_escritorio').select('id,nome_escritorio,email,funcao,criado_em,expira_em,aceito_em').order('criado_em', { ascending: false }).limit(20); setConvites(data ?? []) }
  const convidar = async () => {
    setMsg(''); setLinkConvite(''); setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convidar-parceiro', { body: { convidar: conv } })
      if (error || data?.erro) throw new Error(data?.erro ?? error?.message ?? 'Erro')
      setLinkConvite(data.link); setMsg(data.enviado ? `Convite enviado para ${conv.email}.` : `Convite criado, mas o e-mail não saiu (${data.detalhe ?? 'sem provedor'}). Envie o link manualmente.`)
      setConv({ nome_escritorio: '', email: '', funcao: 'operador' }); await carregarConvites()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') } finally { setOcupado(false) }
  }

  const carregar = async () => {
    try { setLista(await listarEscritorios()); setOnde(await escritorioDasPessoas()) } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') }
  }
  useEffect(() => { carregar(); carregarConvites() }, [pessoas.length])

  const criar = async () => {
    setMsg(''); setOcupado(true)
    try { await criarEscritorio(nome); setNome(''); setMsg('Escritório criado. Agora mova as pessoas dele na lista abaixo.'); await carregar() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') } finally { setOcupado(false) }
  }
  const mover = async (p: Pessoa, esc: string) => {
    setMsg(''); setOcupado(true)
    try { await moverParaEscritorio(p.id, esc); setOnde({ ...onde, [p.id]: esc }); await carregar(); aoMudar() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') } finally { setOcupado(false) }
  }
  const total = lista.filter(e => e.id !== SEDE_ID).reduce((s, e) => s + e.mensal, 0)

  return (
    <section className="bg-white shadow-sm p-6" aria-labelledby="parceiros" data-testid="escritorios-parceiros">
      <h2 id="parceiros" className="text-lg flex items-center gap-2 mb-1"><Building size={18} className="text-dourado" aria-hidden="true" /> Escritórios parceiros e cobrança por usuário</h2>
      <p className="text-sm text-grafite-claro mb-4">Outro escritório ou empresa gere os próprios casos, horas, honorários e portal do cliente aqui, sem ver nada da sede. Preço (Value Pas): R$ 390 por operador e R$ 120 por leitor ao mês, 30% de desconto no 1º ano.</p>
      <div className="flex gap-2 mb-4">
        <input aria-label="Nome do novo escritório" placeholder="Nome do escritório ou empresa" value={nome} onChange={e => setNome(e.target.value)} className="border px-3 py-2 flex-1" />
        <button data-testid="criar-escritorio" onClick={criar} disabled={ocupado || nome.trim().length < 3} className="min-h-[44px] bg-navy text-white px-4 text-sm uppercase tracking-wider inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" /> Criar</button>
      </div>
      <div className="border border-navy/10 p-4 mb-4" data-testid="convite-parceiro-form">
        <h3 className="text-sm uppercase tracking-wider text-grafite mb-2">Convidar escritório parceiro por e-mail</h3>
        <div className="grid sm:grid-cols-4 gap-2">
          <input aria-label="Nome do escritório convidado" placeholder="Nome do escritório" value={conv.nome_escritorio} onChange={e => setConv({ ...conv, nome_escritorio: e.target.value })} className="border px-3 py-2 sm:col-span-2" data-testid="convite-escritorio" />
          <input aria-label="E-mail do responsável" type="email" placeholder="E-mail do responsável" value={conv.email} onChange={e => setConv({ ...conv, email: e.target.value })} className="border px-3 py-2" data-testid="convite-email" />
          <select aria-label="Função do convidado" value={conv.funcao} onChange={e => setConv({ ...conv, funcao: e.target.value })} className="border px-3 py-2" data-testid="convite-funcao"><option value="operador">Operador (R$ 390)</option><option value="leitor">Leitor (R$ 120)</option></select>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button data-testid="convidar-parceiro" onClick={convidar} disabled={ocupado || conv.nome_escritorio.trim().length < 3 || !conv.email.includes('@')} className="min-h-[44px] bg-navy text-white px-4 text-sm uppercase tracking-wider disabled:bg-grafite-claro/40">Enviar convite</button>
          <span className="text-xs text-grafite-claro">O convidado escolhe nome e senha pelo link (vale 14 dias) e entra direto no escritório dele.</span>
        </div>
        {linkConvite && <p className="text-xs mt-2 break-all" data-testid="link-convite">Link: <a href={linkConvite} className="underline text-navy">{linkConvite}</a></p>}
        {convites.length > 0 && (
          <ul className="mt-3 divide-y divide-navy/5 text-sm" data-testid="lista-convites">
            {convites.map(c => <li key={c.id} className="py-1 flex flex-wrap gap-2 justify-between" data-testid="convite-item"><span>{c.nome_escritorio} · {c.email} · {c.funcao}</span><span className="text-xs text-grafite-claro">{c.aceito_em ? `aceito em ${new Date(c.aceito_em).toLocaleDateString('pt-BR')}` : new Date(c.expira_em) < new Date() ? 'expirado' : `pendente, vale até ${new Date(c.expira_em).toLocaleDateString('pt-BR')}`}</span></li>)}
          </ul>
        )}
      </div>
      <table className="w-full text-sm mb-4" data-testid="tabela-cobranca">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite border-b"><th className="py-2">Escritório</th><th>Operadores</th><th>Leitores</th><th>Mensal</th><th>1º ano (−30%)</th></tr></thead>
        <tbody>{lista.map(e => (
          <tr key={e.id} className="border-b border-navy/5"><td className="py-2">{e.nome}{e.id === SEDE_ID && <span className="text-xs text-grafite-claro"> (sede, sem cobrança)</span>}</td><td>{e.operadores}</td><td>{e.leitores}</td><td>{e.id === SEDE_ID ? '—' : brl(e.mensal)}</td><td>{e.id === SEDE_ID ? '—' : brl(e.mensal1Ano)}</td></tr>
        ))}</tbody>
        <tfoot><tr className="font-medium"><td className="py-2" colSpan={3}>Receita mensal dos parceiros</td><td colSpan={2}>{brl(total)}</td></tr></tfoot>
      </table>
      {lista.length > 1 && (
        <ul className="divide-y divide-navy/5">
          {pessoas.filter(p => p.funcao).map(p => (
            <li key={p.id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex-1 text-sm truncate">{p.nome} <span className="text-xs text-grafite-claro">{p.email}</span></span>
              <select aria-label={`Escritório de ${p.nome}`} value={onde[p.id] ?? SEDE_ID} disabled={ocupado} onChange={e => mover(p, e.target.value)} className="border px-2 py-1 text-sm">
                {lista.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
      {msg && <p role="status" className="text-sm mt-3">{msg}</p>}
      <MarcaParceiros escritorios={lista.filter(e => e.id !== SEDE_ID).map(e => ({ id: e.id, nome: e.nome }))} />
      <FaturasParceiros nomes={Object.fromEntries(lista.map(e => [e.id, e.nome]))} />
    </section>
  )
}
