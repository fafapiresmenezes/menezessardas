import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { repositorio, type Imovel } from '@/lib/repositorio'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { formatarData, diasAte } from '@/lib/datas'
import { FolderKanban, Plus, ChevronRight } from 'lucide-react'

// Gestão de projetos do escritório em hierarquia (Projeto → Tarefa → Subtarefa), no estilo Monday:
// quadro por situação, dono de cada tarefa, prazo, prioridade, horas e ligação com imóvel.
type Situacao = 'a_fazer' | 'fazendo' | 'revisao' | 'feito'
interface Tarefa {
  id: string; pai_id: string | null; nivel: 'projeto' | 'tarefa' | 'subtarefa'; titulo: string
  situacao: Situacao; prioridade: 'alta' | 'media' | 'baixa'; responsavel_id: string | null
  imovel_id: string | null; prazo: string | null; horas: number
}
const COLUNAS: { valor: Situacao; rotulo: string }[] = [
  { valor: 'a_fazer', rotulo: 'A fazer' }, { valor: 'fazendo', rotulo: 'Fazendo' },
  { valor: 'revisao', rotulo: 'Em revisão' }, { valor: 'feito', rotulo: 'Feito' },
]
const COR_PRIORIDADE = { alta: 'border-critico', media: 'border-dourado', baixa: 'border-grafite-claro' }

export default function ProjetosPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [projeto, setProjeto] = useState<string>('')
  const [novo, setNovo] = useState({ titulo: '', nivel: 'tarefa', responsavel_id: '', prazo: '', prioridade: 'media', imovel_id: '' })
  const [erro, setErro] = useState('')

  const carregar = async () => {
    const { data, error } = await supabase.from('tarefas').select('id,pai_id,nivel,titulo,situacao,prioridade,responsavel_id,imovel_id,prazo,horas').order('criado_em')
    if (error) return setErro(error.message)
    setTarefas((data ?? []) as Tarefa[])
  }
  useEffect(() => {
    carregar()
    listarPessoas().then(setPessoas).catch(() => {})
    repositorio.listarImoveis().then(setImoveis).catch(() => {})
  }, [])

  const projetos = tarefas.filter(t => t.nivel === 'projeto')
  // Tarefas do projeto escolhido, incluindo subtarefas (descendentes em qualquer nível).
  const visiveis = useMemo(() => {
    if (!projeto) return tarefas.filter(t => t.nivel !== 'projeto')
    const ids = new Set([projeto])
    let mudou = true
    while (mudou) { mudou = false; for (const t of tarefas) if (t.pai_id && ids.has(t.pai_id) && !ids.has(t.id)) { ids.add(t.id); mudou = true } }
    return tarefas.filter(t => t.id !== projeto && ids.has(t.id))
  }, [tarefas, projeto])
  const nome = (id: string | null) => pessoas.find(p => p.id === id)?.nome ?? '—'
  const titulo = (id: string | null) => tarefas.find(t => t.id === id)?.titulo

  const criar = async () => {
    setErro('')
    if (!novo.titulo.trim()) return setErro('Escreva o título.')
    const pai = novo.nivel === 'projeto' ? null : projeto || null
    const { error } = await supabase.from('tarefas').insert({
      titulo: novo.titulo.trim(), nivel: novo.nivel, pai_id: pai, prioridade: novo.prioridade,
      responsavel_id: novo.responsavel_id || null, prazo: novo.prazo || null, imovel_id: novo.imovel_id || null,
    })
    if (error) return setErro(error.message)
    setNovo({ ...novo, titulo: '', prazo: '' }); carregar()
  }
  const mover = async (t: Tarefa, situacao: Situacao) => {
    setTarefas(ts => ts.map(x => (x.id === t.id ? { ...x, situacao } : x)))
    const { error } = await supabase.from('tarefas').update({ situacao, atualizado_em: new Date().toISOString() }).eq('id', t.id)
    if (error) { setErro(error.message); carregar() }
  }
  const somarHoras = async (t: Tarefa) => {
    const h = Number(prompt('Quantas horas trabalhou nesta tarefa agora?', '1')?.replace(',', '.'))
    if (!h || h <= 0) return
    await supabase.from('tarefas').update({ horas: Number(t.horas) + h }).eq('id', t.id); carregar()
  }

  const feitas = visiveis.filter(t => t.situacao === 'feito').length
  const atrasadas = visiveis.filter(t => t.situacao !== 'feito' && t.prazo && (diasAte(t.prazo) ?? 0) < 0).length
  const horas = visiveis.reduce((s, t) => s + Number(t.horas), 0)

  return (
    <Layout title="Projetos">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="projeto" className="block text-xs uppercase tracking-wider text-grafite mb-1">Projeto</label>
              <select id="projeto" value={projeto} onChange={e => setProjeto(e.target.value)} className="border px-3 py-2 min-w-[220px]">
                <option value="">Todas as tarefas</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </div>
            <dl className="flex gap-6 text-sm">
              <div><dt className="text-grafite-claro">Concluído</dt><dd className="text-2xl font-serif text-navy" data-testid="progresso">{visiveis.length ? Math.round((feitas / visiveis.length) * 100) : 0}%</dd></div>
              <div><dt className="text-grafite-claro">Atrasadas</dt><dd className={`text-2xl font-serif ${atrasadas ? 'text-critico' : 'text-navy'}`}>{atrasadas}</dd></div>
              <div><dt className="text-grafite-claro">Horas</dt><dd className="text-2xl font-serif text-navy">{horas.toLocaleString('pt-BR')}</dd></div>
            </dl>
          </div>
        </section>

        <section aria-labelledby="t-novo" className="bg-white shadow-sm p-5">
          <h2 id="t-novo" className="text-lg mb-3 flex items-center gap-2"><Plus size={18} className="text-dourado" aria-hidden="true" /> Novo item</h2>
          <div className="grid gap-3 sm:grid-cols-6">
            <input aria-label="Título" placeholder="Ex.: Renovatória da loja 3" value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
            <select aria-label="Nível" value={novo.nivel} onChange={e => setNovo({ ...novo, nivel: e.target.value })} className="border px-3 py-2">
              <option value="projeto">Projeto</option><option value="tarefa">Tarefa</option><option value="subtarefa">Subtarefa</option>
            </select>
            <select aria-label="Responsável" value={novo.responsavel_id} onChange={e => setNovo({ ...novo, responsavel_id: e.target.value })} className="border px-3 py-2">
              <option value="">Responsável</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input aria-label="Prazo" type="date" value={novo.prazo} onChange={e => setNovo({ ...novo, prazo: e.target.value })} className="border px-3 py-2" />
            <select aria-label="Prioridade" value={novo.prioridade} onChange={e => setNovo({ ...novo, prioridade: e.target.value })} className="border px-3 py-2">
              <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
            </select>
            <select aria-label="Imóvel" value={novo.imovel_id} onChange={e => setNovo({ ...novo, imovel_id: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              <option value="">Sem imóvel ligado</option>{imoveis.map(i => <option key={i.id} value={i.id}>{i.endereco}</option>)}
            </select>
            <button onClick={criar} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider sm:col-span-1">Criar</button>
          </div>
          {novo.nivel !== 'projeto' && <p className="text-xs text-grafite-claro mt-2">{projeto ? <>Entra dentro de <strong>{titulo(projeto)}</strong>.</> : 'Escolha um projeto acima para colocar a tarefa dentro dele.'}</p>}
          {erro && <p role="alert" className="text-sm text-critico mt-2">{erro}</p>}
        </section>

        <div className="grid gap-4 md:grid-cols-4" aria-label="Quadro">
          {COLUNAS.map(c => (
            <section key={c.valor} aria-label={c.rotulo} className="bg-pergaminho p-3 min-h-[200px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const t = tarefas.find(x => x.id === e.dataTransfer.getData('text/plain')); if (t) mover(t, c.valor) }}>
              <h2 className="text-sm uppercase tracking-wider text-grafite mb-3">{c.rotulo} ({visiveis.filter(t => t.situacao === c.valor).length})</h2>
              <ul className="space-y-2">
                {visiveis.filter(t => t.situacao === c.valor).map(t => {
                  const dias = t.prazo ? diasAte(t.prazo) : null
                  return (
                    <li key={t.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', t.id)} className={`bg-white p-3 shadow-sm border-l-4 ${COR_PRIORIDADE[t.prioridade]} cursor-grab`}>
                      {t.pai_id && <p className="text-[11px] text-grafite-claro flex items-center gap-1">{titulo(t.pai_id)} <ChevronRight size={10} aria-hidden="true" /></p>}
                      <p className="text-sm text-navy font-medium">{t.nivel === 'subtarefa' ? '↳ ' : ''}{t.titulo}</p>
                      <p className="text-xs text-grafite-claro mt-1">{nome(t.responsavel_id)}{t.prazo && <> · <span className={dias !== null && dias < 0 && t.situacao !== 'feito' ? 'text-critico' : ''}>{formatarData(t.prazo)}</span></>}{Number(t.horas) > 0 && ` · ${t.horas} h`}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <select aria-label={`Mover ${t.titulo}`} value={t.situacao} onChange={e => mover(t, e.target.value as Situacao)} className="text-xs border px-1 py-0.5">
                          {COLUNAS.map(x => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
                        </select>
                        <button onClick={() => somarHoras(t)} className="text-xs underline text-navy">+ horas</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        {!tarefas.length && <p className="text-sm text-grafite-claro flex items-center gap-2"><FolderKanban size={16} aria-hidden="true" /> Comece criando um projeto, por exemplo "Carteira Lagoa 2026", e depois as tarefas dentro dele.</p>}
      </div>
    </Layout>
  )
}
