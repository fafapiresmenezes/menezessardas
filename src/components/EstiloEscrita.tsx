import { useEffect, useRef, useState } from 'react'
import { PenLine, Trash2, Upload } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { extrairTextoPdf } from '../lib/pdf'

interface Peca { id: string; titulo: string; texto: string; criado_em: string }
const LIMITE = 10

// Estilo de escrita próprio: cada usuário envia até 10 peças suas; o Assistente redige imitando a forma (pedido de M, 30/10/2026).
export default function EstiloEscrita() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    if (!supabaseConfigurado) return
    const { data } = await supabase.from('estilos_escrita').select('id, titulo, texto, criado_em').order('criado_em')
    setPecas((data ?? []) as Peca[])
  }
  useEffect(() => { carregar() }, [])

  const lerArquivo = async (f: File) => {
    setMsg('')
    try {
      const t = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ? await extrairTextoPdf(f) : await f.text()
      setTexto(t.trim().slice(0, 60000))
      if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, '').slice(0, 120))
    } catch { setMsg('Não consegui ler o arquivo. Cole o texto no campo.') }
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (texto.trim().length < 200) { setMsg('A peça precisa ter pelo menos 200 caracteres.'); return }
    setOcupado(true); setMsg('')
    const { error } = await supabase.from('estilos_escrita').insert({ titulo: titulo.trim() || 'Peça sem título', texto: texto.trim() })
    setOcupado(false)
    if (error) { setMsg(error.message); return }
    setTitulo(''); setTexto(''); if (arquivo.current) arquivo.current.value = ''
    setMsg('Peça guardada. O Assistente já usa o seu estilo ao redigir.')
    carregar()
  }

  const apagar = async (id: string) => {
    await supabase.from('estilos_escrita').delete().eq('id', id)
    carregar()
  }

  if (!supabaseConfigurado) return null
  return (
    <section className="bg-white dark:bg-grafite p-6 shadow-sm mt-6" aria-labelledby="t-estilo" data-testid="secao-estilo">
      <h2 id="t-estilo" className="text-lg mb-1 flex items-center gap-2"><PenLine size={18} aria-hidden="true" /> Meu estilo de escrita</h2>
      <p className="text-sm text-grafite-claro mb-4">Envie até {LIMITE} peças suas (petições, pareceres, contratos, e-mails formais). O Assistente passa a redigir com o seu vocabulário, ritmo e forma de citar a lei. Só você vê as suas peças.</p>
      <ul className="divide-y divide-navy/10 mb-4" aria-label="Peças enviadas">
        {pecas.length === 0 && <li className="py-2 text-sm text-grafite-claro">Nenhuma peça ainda.</li>}
        {pecas.map(p => (
          <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
            <span><strong>{p.titulo}</strong> <span className="text-grafite-claro">· {p.texto.length.toLocaleString('pt-BR')} caracteres · {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span></span>
            <button type="button" onClick={() => apagar(p.id)} className="min-h-[44px] px-3 text-grafite-claro hover:text-red-700 flex items-center gap-1" aria-label={`Apagar ${p.titulo}`}><Trash2 size={16} aria-hidden="true" /> Apagar</button>
          </li>
        ))}
      </ul>
      {pecas.length < LIMITE ? (
        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label htmlFor="estilo-titulo" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Título da peça</label>
            <input id="estilo-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} className="w-full border border-navy/15 p-2 text-sm" placeholder="Ex.: Contestação em ação de despejo (2025)" />
          </div>
          <div>
            <label htmlFor="estilo-arquivo" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Arquivo (PDF ou TXT) ou cole o texto abaixo</label>
            <input id="estilo-arquivo" ref={arquivo} type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) lerArquivo(f) }} className="text-sm" />
          </div>
          <div>
            <label htmlFor="estilo-texto" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Texto da peça</label>
            <textarea id="estilo-texto" value={texto} onChange={e => setTexto(e.target.value.slice(0, 60000))} rows={6} className="w-full border border-navy/15 p-2 text-sm" placeholder="Cole aqui o texto integral da peça (mínimo 200 caracteres)." />
            <p className="text-xs text-grafite-claro mt-1">{texto.length.toLocaleString('pt-BR')} / 60.000 caracteres · {pecas.length} de {LIMITE} peças</p>
          </div>
          <button type="submit" disabled={ocupado} data-testid="salvar-estilo" className="min-h-[44px] px-4 bg-navy text-white text-sm flex items-center gap-2 disabled:opacity-50"><Upload size={16} aria-hidden="true" /> Guardar peça</button>
        </form>
      ) : <p className="text-sm text-grafite-claro">Limite de {LIMITE} peças atingido. Apague uma para enviar outra.</p>}
      {msg && <p role="status" className="text-sm mt-3">{msg}</p>}
    </section>
  )
}
