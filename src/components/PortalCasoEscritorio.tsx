import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { urlAssinada } from '@/lib/arquivos'
import { formatarData } from '@/lib/datas'
import { MessageSquare, Paperclip, Send } from 'lucide-react'

// Passo D18 (Diamante), lado do escritório: conversa com o cliente do caso e documentos que ele enviou pelo Portal.
type Msg = { id: number; autor: 'cliente' | 'escritorio'; autor_nome: string | null; texto: string; criado_em: string; lido_em: string | null }
type Doc = { id: number; nome: string; caminho: string; tamanho: number; enviado_em: string; visto_em: string | null }
export default function PortalCasoEscritorio({ tarefaId, cliente }: { tarefaId: string; cliente: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const carregar = async () => {
    const [m, d] = await Promise.all([
      supabase.from('mensagens_portal').select('id,autor,autor_nome,texto,criado_em,lido_em').eq('tarefa_id', tarefaId).order('criado_em'),
      supabase.from('documentos_portal').select('id,nome,caminho,tamanho,enviado_em,visto_em').eq('tarefa_id', tarefaId).order('enviado_em', { ascending: false }),
    ])
    setMsgs((m.data as Msg[]) ?? []); setDocs((d.data as Doc[]) ?? [])
    // Mensagens do cliente ficam lidas ao abrir o caso.
    if ((m.data ?? []).some(x => x.autor === 'cliente' && !x.lido_em)) await supabase.from('mensagens_portal').update({ lido_em: new Date().toISOString() }).eq('tarefa_id', tarefaId).eq('autor', 'cliente').is('lido_em', null)
  }
  useEffect(() => { carregar() }, [tarefaId])
  const responder = async () => {
    if (texto.trim().length < 2) return setErro('Escreva a resposta.')
    setErro('')
    const { data: u } = await supabase.auth.getUser()
    const nome = (u?.user?.user_metadata?.nome_completo as string | undefined) || u?.user?.email?.split('@')[0] || 'Escritório'
    const { error } = await supabase.from('mensagens_portal').insert({ tarefa_id: tarefaId, autor: 'escritorio', autor_nome: nome, texto: texto.trim() })
    if (error) return setErro(mensagemAmigavel(error))
    setTexto(''); carregar()
  }
  const abrir = async (d: Doc) => {
    try {
      window.open(await urlAssinada(d.caminho), '_blank', 'noopener')
      if (!d.visto_em) { await supabase.from('documentos_portal').update({ visto_em: new Date().toISOString() }).eq('id', d.id); carregar() }
    } catch (e) { setErro(mensagemAmigavel(e)) }
  }
  const naoLidas = msgs.filter(m => m.autor === 'cliente' && !m.lido_em).length
  return (
    <section aria-labelledby="t-portal-conversa" className="bg-white shadow-sm p-5" data-testid="portal-escritorio">
      <h2 id="t-portal-conversa" className="text-lg mb-1 flex items-center gap-2"><MessageSquare size={18} className="text-dourado" aria-hidden="true" /> Conversa e documentos do Portal{naoLidas > 0 && <span className="text-xs bg-dourado/20 text-dourado-escuro px-2 py-0.5" data-testid="portal-nao-lidas">{naoLidas} nova(s)</span>}</h2>
      <p className="text-xs text-grafite-claro mb-3">O que {cliente ?? 'o cliente'} escreve e envia pelo link do Portal aparece aqui; sua resposta chega ao Portal na hora.</p>
      {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
      <ol className="space-y-2 max-h-72 overflow-y-auto text-sm" data-testid="portal-escritorio-mensagens">
        {msgs.map(m => <li key={m.id} className={`p-2 max-w-[85%] ${m.autor === 'escritorio' ? 'ml-auto bg-pergaminho' : 'bg-dourado/15'}`} data-testid={`esc-msg-${m.autor}`}><p className="text-xs text-grafite-claro">{m.autor === 'escritorio' ? m.autor_nome || 'Escritório' : m.autor_nome || 'Cliente'} · {new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p><p className="whitespace-pre-wrap">{m.texto}</p></li>)}
        {!msgs.length && <li className="text-grafite-claro">Nenhuma mensagem. Gere o link do Portal e mande ao cliente.</li>}
      </ol>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} maxLength={4000} placeholder="Responder ao cliente" aria-label="Resposta ao cliente" className="border px-3 py-2 flex-1 min-h-[44px] text-sm" data-testid="esc-texto" />
        <button type="button" onClick={responder} className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center justify-center gap-2" data-testid="esc-responder"><Send size={14} aria-hidden="true" /> Responder</button>
      </div>
      {docs.length > 0 && (
        <div className="mt-4 text-sm">
          <h3 className="font-medium text-navy flex items-center gap-2"><Paperclip size={16} className="text-dourado" aria-hidden="true" /> Documentos enviados pelo cliente</h3>
          <ul className="mt-1 space-y-1" data-testid="esc-documentos">{docs.map(d => <li key={d.id}><button type="button" onClick={() => abrir(d)} className="underline text-navy" data-testid="esc-abrir-doc">{d.nome}</button> · {Math.max(1, Math.round(d.tamanho / 1024))} KB · {formatarData(d.enviado_em.slice(0, 10))}{d.visto_em ? '' : <span className="ml-2 text-xs bg-dourado/20 text-dourado-escuro px-1">novo</span>}</li>)}</ul>
        </div>
      )}
    </section>
  )
}
