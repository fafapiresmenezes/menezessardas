import { mensagemAmigavel } from '@/lib/erros'
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { REPOSITORIOS_ABERTOS, ROTULO_TIPO, filtrar, guardarNaBiblioteca, type ItemBiblioteca, type TipoBiblioteca } from '@/lib/biblioteca'
import { BookOpen, Library, Trash2 } from 'lucide-react'

// Bloco B04: tudo o que já foi pesquisado (Assistente, Fontes, Parte adversa e notas), com busca e etiquetas.
export default function BibliotecaPage() {
  const [itens, setItens] = useState<ItemBiblioteca[]>([])
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<TipoBiblioteca | 'todos'>('todos')
  const [aberto, setAberto] = useState<number | null>(null)
  const [nota, setNota] = useState({ titulo: '', conteudo: '', etiquetas: '' })
  const [msg, setMsg] = useState('')
  const carregar = () => supabase.from('biblioteca_pesquisas').select('id,tipo,titulo,conteudo,etiquetas,caso,criado_em').order('criado_em', { ascending: false }).limit(500)
    .then(({ data }) => setItens((data ?? []) as ItemBiblioteca[]))
  useEffect(() => { carregar() }, [])
  const visiveis = filtrar(itens, busca, tipo)
  const salvarNota = async () => {
    const ok = await guardarNaBiblioteca({ tipo: 'nota', titulo: nota.titulo, conteudo: nota.conteudo, etiquetas: nota.etiquetas.split(',') })
    setMsg(ok ? 'Nota guardada.' : 'Não foi possível guardar agora. Tente de novo.')
    if (ok) { setNota({ titulo: '', conteudo: '', etiquetas: '' }); carregar() }
  }
  const apagar = async (i: ItemBiblioteca) => {
    if (!window.confirm(`Apagar "${i.titulo}" da biblioteca?`)) return
    const { error } = await supabase.from('biblioteca_pesquisas').delete().eq('id', i.id)
    setMsg(error ? mensagemAmigavel(error, 'Não foi possível apagar agora. Tente de novo.') : 'Apagado.')
    carregar()
  }
  return (
    <Layout title="Repositório e biblioteca">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6" data-testid="repositorio-aberto">
          <h2 className="font-serif text-xl mb-1 flex items-center gap-2"><BookOpen className="w-5 h-5 text-dourado" aria-hidden />Repositório aberto para pesquisa</h2>
          <p className="text-sm text-grafite-claro mb-3">Fontes oficiais e gratuitas de legislação, jurisprudência e teses, para qualquer pessoa do escritório pesquisar. Os <Link to="/consultores" className="underline" title="500 especialidades catalogadas a partir das ementas das melhores faculdades.">500 consultores por especialidade</Link> foram montados a partir destas fontes.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {REPOSITORIOS_ABERTOS.map(g => (
              <div key={g.grupo}>
                <h3 className="text-xs uppercase tracking-wider text-dourado-escuro mb-1">{g.grupo}</h3>
                <ul className="text-sm space-y-1">
                  {g.itens.map(i => (
                    <li key={i.url}><a href={i.url} target="_blank" rel="noreferrer" className="underline text-navy" title={i.desc}>{i.nome}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <p className="text-sm text-grafite-claro">Tudo o que a equipe já buscou fica aqui: respostas do Assistente, buscas em Fontes do advogado, fichas de parte adversa e notas. CPF é escondido automaticamente.</p>
          <div className="flex flex-wrap gap-2">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar (palavras, etiqueta ou caso)" aria-label="Procurar na biblioteca" className="flex-1 min-w-[220px] border px-3 py-2 min-h-[44px]" />
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoBiblioteca | 'todos')} aria-label="Tipo" className="border px-3 min-h-[44px]">
              <option value="todos">Todos</option>
              {(Object.keys(ROTULO_TIPO) as TipoBiblioteca[]).map(t => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
            </select>
          </div>
        </section>
        <section className="bg-white shadow-sm p-6" data-testid="biblioteca-lista">
          <h2 className="font-serif text-xl mb-2 flex items-center gap-2"><Library className="w-5 h-5 text-dourado" aria-hidden />{visiveis.length} item(ns)</h2>
          {itens.length === 0 ? <Vazio testid="biblioteca-vazia" titulo="Nada guardado ainda" texto="Use o botão Guardar na biblioteca no Assistente, ou monte uma ficha de parte adversa: tudo aparece aqui." /> : (
            <ul className="divide-y divide-navy/10 text-sm">
              {visiveis.map(i => (
                <li key={i.id} className="py-2" data-testid="biblioteca-item">
                  <div className="flex flex-wrap items-start gap-2">
                    <button type="button" onClick={() => setAberto(aberto === i.id ? null : i.id)} aria-expanded={aberto === i.id} className="flex-1 min-w-[200px] text-left min-h-[44px]">
                      <span className="text-xs uppercase tracking-wider text-dourado-escuro">{ROTULO_TIPO[i.tipo]}</span> <strong>{i.titulo}</strong>
                      <span className="block text-grafite-claro">{new Date(i.criado_em).toLocaleDateString('pt-BR')}{i.caso && ` · ${i.caso}`}{i.etiquetas.length > 0 && ` · ${i.etiquetas.map(e => `#${e}`).join(' ')}`}</span>
                    </button>
                    <button type="button" onClick={() => apagar(i)} aria-label={`Apagar ${i.titulo}`} className="min-h-[44px] px-3 border border-navy/20"><Trash2 className="w-4 h-4" aria-hidden /></button>
                  </div>
                  {aberto === i.id && <pre className="whitespace-pre-wrap font-sans text-sm mt-2 p-3 bg-navy/5" data-testid="biblioteca-conteudo">{i.conteudo}</pre>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bg-white shadow-sm p-6 space-y-2">
          <h2 className="font-serif text-xl">Nova nota</h2>
          <input value={nota.titulo} onChange={e => setNota({ ...nota, titulo: e.target.value })} aria-label="Título da nota" placeholder="Título" className="block w-full border px-3 py-2 min-h-[44px]" />
          <textarea value={nota.conteudo} onChange={e => setNota({ ...nota, conteudo: e.target.value })} aria-label="Conteúdo da nota" rows={4} className="block w-full border px-3 py-2" />
          <input value={nota.etiquetas} onChange={e => setNota({ ...nota, etiquetas: e.target.value })} aria-label="Etiquetas" placeholder="Etiquetas separadas por vírgula" className="block w-full border px-3 py-2 min-h-[44px]" />
          <button type="button" onClick={salvarNota} disabled={nota.titulo.trim().length < 2 || !nota.conteudo.trim()} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50">Guardar nota</button>
          {msg && <p role="status" className="text-sm">{msg}</p>}
        </section>
      </div>
    </Layout>
  )
}
