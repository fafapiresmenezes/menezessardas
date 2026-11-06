import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import { situacaoParcela } from '@/lib/parcelas'
import CobrancaPix from '@/components/CobrancaPix'
import { MessageSquare, Paperclip, QrCode, Send } from 'lucide-react'

// Passo D18 (Diamante), lado do cliente no Portal: conversa com o advogado, envio de documentos e
// pagamento de parcela por PIX com QR do valor exato. Tudo pelo código secreto do link, sem login.
type Msg = { id: number; autor: 'cliente' | 'escritorio'; autor_nome: string | null; texto: string; criado_em: string }
type Doc = { id: number; nome: string; tamanho: number; enviado_em: string; visto_em: string | null }
type Parcela = { id: number; numero: number; vencimento: string; valor: number; pago_em: string | null }
type Pix = { chave: string; nome: string | null; cidade: string | null } | null
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function PortalMensagens({ token, caso }: { token: string; caso: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [pix, setPix] = useState<Pix>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [cobrar, setCobrar] = useState<Parcela | null>(null)
  const carregar = async () => {
    const [m, d, p] = await Promise.all([supabase.rpc('portal_mensagens', { p_token: token }), supabase.rpc('portal_documentos', { p_token: token }), supabase.rpc('portal_parcelas', { p_token: token })])
    setMsgs((m.data as Msg[]) ?? []); setDocs((d.data as Doc[]) ?? [])
    const pp = p.data as { pix: Pix; parcelas: Parcela[] } | null
    setParcelas(pp?.parcelas ?? []); setPix(pp?.pix ?? null)
  }
  useEffect(() => { carregar(); supabase.rpc('portal_marcar_lidas', { p_token: token }).then(() => undefined, () => undefined) }, [token])
  const enviar = async () => {
    if (texto.trim().length < 2) return setErro('Escreva a mensagem.')
    setOcupado(true); setErro('')
    const { error } = await supabase.rpc('portal_enviar_mensagem', { p_token: token, p_texto: texto.trim() })
    setOcupado(false)
    if (error) return setErro(error.message)
    setTexto(''); setAviso('Mensagem enviada ao escritório.'); carregar()
  }
  const enviarArquivo = async (f: File | undefined) => {
    if (!f) return
    setOcupado(true); setErro(''); setAviso('')
    const corpo = new FormData(); corpo.append('token', token); corpo.append('arquivo', f)
    const { data, error } = await supabase.functions.invoke('portal-documento', { body: corpo })
    setOcupado(false)
    const resp = data as { ok?: boolean; erro?: string } | null
    if (error || !resp?.ok) return setErro(resp?.erro ?? 'Não foi possível enviar o arquivo. Tente de novo.')
    setAviso(`"${f.name}" enviado ao escritório.`); carregar()
  }
  const abertas = parcelas.filter(p => !p.pago_em)
  return (
    <section className="mt-6 border-t border-navy/10 pt-4 text-sm" data-testid="portal-conversa">
      <h2 className="font-medium text-navy flex items-center gap-2"><MessageSquare size={16} className="text-dourado" aria-hidden="true" /> Fale com o escritório</h2>
      <p className="text-xs text-grafite-claro mt-1">Suas mensagens e documentos chegam direto ao advogado do caso. Para urgências, ligue.</p>
      {erro && <p role="alert" className="text-critico mt-2" data-testid="portal-erro">{erro}</p>}
      {aviso && <p role="status" className="text-navy mt-2" data-testid="portal-aviso">{aviso}</p>}
      <ol className="mt-3 space-y-2 max-h-80 overflow-y-auto" data-testid="portal-mensagens">
        {msgs.map(m => (
          <li key={m.id} className={`p-3 max-w-[85%] ${m.autor === 'cliente' ? 'ml-auto bg-dourado/15' : 'bg-pergaminho'}`} data-testid={`msg-${m.autor}`}>
            <p className="text-xs text-grafite-claro">{m.autor === 'cliente' ? 'Você' : m.autor_nome || 'Escritório'} · {new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="whitespace-pre-wrap">{m.texto}</p>
          </li>
        ))}
        {!msgs.length && <li className="text-grafite-claro">Nenhuma mensagem ainda. Escreva abaixo.</li>}
      </ol>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} maxLength={4000} placeholder="Escreva sua mensagem ao advogado" aria-label="Mensagem ao escritório" className="border px-3 py-2 flex-1 min-h-[44px]" data-testid="portal-texto" />
        <button type="button" onClick={enviar} disabled={ocupado} className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50" data-testid="portal-enviar"><Send size={14} aria-hidden="true" /> Enviar</button>
      </div>
      <div className="mt-5">
        <h3 className="font-medium text-navy flex items-center gap-2"><Paperclip size={16} className="text-dourado" aria-hidden="true" /> Seus documentos</h3>
        <label className="inline-flex items-center gap-2 mt-2 min-h-[44px] px-4 border border-navy text-navy cursor-pointer text-sm">
          Enviar documento (PDF, foto ou Word, até 10 MB)
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={e => { enviarArquivo(e.target.files?.[0]); e.target.value = '' }} disabled={ocupado} data-testid="portal-arquivo" />
        </label>
        {docs.length > 0 && <ul className="mt-2 space-y-1 text-grafite" data-testid="portal-documentos">{docs.map(d => <li key={d.id}>{d.nome} · {kb(d.tamanho)} · enviado em {formatarData(d.enviado_em.slice(0, 10))}{d.visto_em ? ' · visto pelo escritório' : ''}</li>)}</ul>}
      </div>
      {parcelas.length > 0 && (
        <div className="mt-5" data-testid="portal-parcelas">
          <h3 className="font-medium text-navy flex items-center gap-2"><QrCode size={16} className="text-dourado" aria-hidden="true" /> Parcelas dos honorários</h3>
          <ol className="mt-2 space-y-1">
            {parcelas.map(p => { const st = situacaoParcela(p); return (
              <li key={p.id} className={`flex flex-wrap items-center gap-2 ${st.codigo === 'atrasada' ? 'text-critico' : ''}`} data-testid="portal-parcela">
                <span>{p.numero}ª · {formatarData(p.vencimento)} · {brl(Number(p.valor))} · {st.rotulo}</span>
                {!p.pago_em && pix && <button type="button" onClick={() => setCobrar(p)} className="underline text-navy" aria-label={`Pagar parcela ${p.numero} por PIX`}>Pagar por PIX</button>}
              </li>) })}
          </ol>
          {abertas.length > 0 && !pix && <p className="text-xs text-grafite-claro mt-1">Para pagar, combine com o escritório (PIX ainda não cadastrado).</p>}
        </div>
      )}
      {cobrar && pix && <CobrancaPix valor={Number(cobrar.valor)} caso={caso} cliente={null} referencia={`${caso.slice(0, 14)}P${cobrar.numero}`} descricao={`Parcela ${cobrar.numero} ${caso}`} dados={{ pix_chave: pix.chave, pix_nome: pix.nome, pix_cidade: pix.cidade }} fechar={() => setCobrar(null)} />}
    </section>
  )
}
