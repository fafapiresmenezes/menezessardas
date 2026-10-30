import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import { PenLine, Trash2 } from 'lucide-react'

// Assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I): o escritório escreve o documento (contrato de honorários,
// procuração, termo), o cliente assina pelo link do portal com nome e CPF/CNPJ; fica o hash e a hora.
type Assinatura = { id: string; titulo: string; hash_texto: string; assinante_nome: string | null; assinante_documento: string | null; assinado_em: string | null; hash_assinatura: string | null; criado_em: string }
const MODELO = (cliente: string | null) => `CONTRATO DE HONORÁRIOS ADVOCATÍCIOS

Contratante: ${cliente ?? '[nome do cliente]'}.
Contratada: GMenezes Advogados Associados, CNPJ 10.945.994/0001-72, Lagoa, Rio de Janeiro.

1. Objeto: [descrever o serviço].
2. Honorários: R$ [valor], pagos [forma e prazo].
3. Despesas processuais correm por conta do contratante.
4. Foro: Comarca da Capital do Rio de Janeiro.

Ao assinar, o contratante declara ter lido e aceito estas condições.`

export default function AssinaturasCaso({ tarefaId, cliente }: { tarefaId: string; cliente: string | null }) {
  const [lista, setLista] = useState<Assinatura[]>([])
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('Contrato de honorários')
  const [texto, setTexto] = useState(() => MODELO(cliente))
  const [erro, setErro] = useState('')
  const carregar = async () => {
    const { data, error } = await supabase.from('assinaturas_eletronicas').select('id,titulo,hash_texto,assinante_nome,assinante_documento,assinado_em,hash_assinatura,criado_em').eq('tarefa_id', tarefaId).order('criado_em')
    if (error) setErro(error.message); else setLista((data ?? []) as Assinatura[])
  }
  useEffect(() => { carregar() }, [tarefaId])
  const pedir = async () => {
    setErro('')
    const { error } = await supabase.from('assinaturas_eletronicas').insert({ tarefa_id: tarefaId, titulo: titulo.trim(), texto })
    if (error) return setErro(error.message)
    setAberto(false); carregar()
  }
  const apagar = async (id: string) => {
    const { error } = await supabase.from('assinaturas_eletronicas').delete().eq('id', id)
    if (error) setErro(error.message); else carregar()
  }
  return (
    <section aria-labelledby="t-assin" className="bg-white shadow-sm p-5" data-testid="assinaturas-caso">
      <h2 id="t-assin" className="text-lg mb-1 flex items-center gap-2"><PenLine size={18} className="text-dourado" aria-hidden="true" /> Assinatura eletrônica</h2>
      <p className="text-xs text-grafite-claro mb-3">O cliente assina pelo mesmo link do portal, informando nome e CPF/CNPJ. A plataforma guarda o hash do texto, do aceite e a hora (assinatura eletrônica simples, Lei 14.063/2020). O selo diário em blockchain cobre o registro.</p>
      {erro && <p role="alert" className="text-sm text-critico mb-2">{erro}</p>}
      <ul className="divide-y divide-navy/5 text-sm mb-3">
        {lista.map(a => (
          <li key={a.id} className="py-2 flex items-start justify-between gap-3">
            <span><span className="text-navy font-medium">{a.titulo}</span>
              <span className="block text-xs text-grafite-claro">{a.assinado_em ? `Assinado por ${a.assinante_nome} (${a.assinante_documento}) em ${formatarData(a.assinado_em.slice(0, 10))} · hash ${a.hash_assinatura?.slice(0, 16)}…` : `Aguardando assinatura · pedido em ${formatarData(a.criado_em.slice(0, 10))}`}</span></span>
            {a.assinado_em ? <span className="text-xs uppercase tracking-wider text-regular whitespace-nowrap" data-testid="assinado">Assinado</span>
              : <button onClick={() => apagar(a.id)} aria-label={`Cancelar pedido ${a.titulo}`} className="min-h-[36px] px-2 text-grafite-claro hover:text-critico"><Trash2 size={14} /></button>}
          </li>
        ))}
        {!lista.length && <li className="py-2 text-grafite-claro">Nenhum documento para assinar ainda.</li>}
      </ul>
      {!aberto ? <button onClick={() => setAberto(true)} className="min-h-[44px] px-4 border border-dourado text-navy text-sm uppercase tracking-wider" data-testid="pedir-assinatura">Pedir assinatura</button> : (
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-grafite">Título<input value={titulo} onChange={e => setTitulo(e.target.value)} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="assin-titulo" /></label>
          <label className="block text-xs uppercase tracking-wider text-grafite">Texto do documento<textarea value={texto} onChange={e => setTexto(e.target.value)} rows={10} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal text-sm" data-testid="assin-texto" /></label>
          <div className="flex gap-3">
            <button onClick={pedir} disabled={!titulo.trim() || texto.trim().length < 20} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:bg-grafite-claro/40" data-testid="enviar-assinatura">Enviar para assinatura</button>
            <button onClick={() => setAberto(false)} className="min-h-[44px] px-4 border border-navy/20 text-sm">Cancelar</button>
          </div>
          <p className="text-xs text-grafite-claro">Depois, toque em "Link para o cliente" e envie o link: o documento aparece no portal para assinar.</p>
        </div>
      )}
    </section>
  )
}
