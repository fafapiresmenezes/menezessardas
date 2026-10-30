import { useEffect, useState } from 'react'
import { Building, Plus } from 'lucide-react'
import { criarEscritorio, escritorioDasPessoas, listarEscritorios, moverParaEscritorio, SEDE_ID, type Escritorio, type Pessoa } from '@/lib/equipe'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Só a sede vê: cria escritórios parceiros, coloca pessoas neles e acompanha a cobrança mensal por usuário (Value Pas).
export default function EscritoriosParceiros({ pessoas, aoMudar }: { pessoas: Pessoa[]; aoMudar: () => void }) {
  const [lista, setLista] = useState<Escritorio[]>([])
  const [onde, setOnde] = useState<Record<string, string>>({})
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = async () => {
    try { setLista(await listarEscritorios()); setOnde(await escritorioDasPessoas()) } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') }
  }
  useEffect(() => { carregar() }, [pessoas.length])

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
    </section>
  )
}
