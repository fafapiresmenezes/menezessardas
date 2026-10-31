import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import { TextoComTermos } from './Termo'
import { PenLine, CheckCircle2 } from 'lucide-react'

// Lado do cliente no portal: lê o documento, informa nome e CPF/CNPJ, aceita e assina.
type Doc = { id: string; titulo: string; texto: string; hash_texto: string; assinante_nome: string | null; assinado_em: string | null; hash_assinatura: string | null }
export default function AssinarPortal({ token }: { token: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [form, setForm] = useState<Record<string, { nome: string; doc: string; aceite: boolean }>>({})
  const [erro, setErro] = useState('')
  const carregar = async () => { const { data } = await supabase.rpc('portal_assinaturas', { p_token: token }); setDocs((data as Doc[]) ?? []) }
  useEffect(() => { carregar() }, [token])
  const assinar = async (d: Doc) => {
    const f = form[d.id] ?? { nome: '', doc: '', aceite: false }
    setErro('')
    const { error } = await supabase.rpc('portal_assinar', { p_token: token, p_id: d.id, p_nome: f.nome, p_documento: f.doc })
    if (error) return setErro(error.message)
    carregar()
  }
  if (!docs.length) return null
  return (
    <section className="mt-6 border-t border-navy/10 pt-4 text-sm" data-testid="portal-assinaturas">
      <h2 className="font-medium text-navy flex items-center gap-2"><PenLine size={16} className="text-dourado" aria-hidden="true" /> Documentos para assinar</h2>
      <p className="text-xs text-grafite-claro mt-1">Termos sublinhados têm explicação: toque ou passe o mouse.</p>
      {erro && <p role="alert" className="text-critico mt-2">{erro}</p>}
      {docs.map(d => {
        const f = form[d.id] ?? { nome: '', doc: '', aceite: false }
        return (
          <article key={d.id} className="mt-4 border border-navy/10 p-4">
            <h3 className="font-serif text-lg text-navy">{d.titulo}</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm text-grafite mt-2 max-h-72 overflow-auto bg-pergaminho p-3"><TextoComTermos texto={d.texto} /></pre>
            <p className="text-xs text-grafite-claro mt-2">Impressão digital do texto (SHA-256): {d.hash_texto.slice(0, 24)}…</p>
            {d.assinado_em ? (
              <p className="mt-3 flex items-center gap-2 text-regular" data-testid="portal-assinado"><CheckCircle2 size={16} aria-hidden="true" /> Assinado por {d.assinante_nome} em {formatarData(d.assinado_em.slice(0, 10))}. Comprovante: {d.hash_assinatura?.slice(0, 24)}…</p>
            ) : (
              <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); assinar(d) }}>
                <label className="block text-xs uppercase tracking-wider text-grafite">Nome completo<input required value={f.nome} onChange={e => setForm({ ...form, [d.id]: { ...f, nome: e.target.value } })} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="assin-nome" /></label>
                <label className="block text-xs uppercase tracking-wider text-grafite">CPF ou CNPJ<input required value={f.doc} onChange={e => setForm({ ...form, [d.id]: { ...f, doc: e.target.value } })} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="assin-doc" /></label>
                <label className="sm:col-span-2 flex items-start gap-2 text-grafite"><input type="checkbox" required checked={f.aceite} onChange={e => setForm({ ...form, [d.id]: { ...f, aceite: e.target.checked } })} className="mt-1" data-testid="assin-aceite" /> Li o documento acima e concordo em assiná-lo eletronicamente. Entendo que ficam registrados meu nome, documento, data e hora.</label>
                <button type="submit" disabled={!f.aceite} className="sm:col-span-2 min-h-[44px] bg-navy text-white text-sm uppercase tracking-wider disabled:bg-grafite-claro/40" data-testid="assinar">Assinar</button>
              </form>
            )}
          </article>
        )
      })}
    </section>
  )
}
