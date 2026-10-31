import { useEffect, useState } from 'react'
import { FileText, Receipt } from 'lucide-react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import { codigoPix } from '@/lib/pix'
import { gerarPdfTexto } from '@/lib/pdfSimples'

// Passo 38 (Onda D): fatura mensal de cada escritório parceiro (gerada no dia 1 pelo banco; "Gerar agora" para teste),
// com PDF simples e PIX copia e cola/QR da Value Pas (chave PIX da sede, em Configurações). Só a sede vê.
export interface Fatura { id: string; escritorio_id: string; competencia: string; operadores: number; leitores: number; valor_cheio: number; desconto_pct: number; valor: number; vencimento: string; criado_em: string; pago_em: string | null }
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesAno = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
const dataBr = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

export function linhasFatura(f: Fatura, nome: string, pix?: string): { texto: string; tamanho?: number; negrito?: boolean }[] {
  return [
    { texto: `Fatura ${mesAno(f.competencia)}`, tamanho: 16, negrito: true },
    { texto: `Escritório: ${nome}`, tamanho: 11 },
    { texto: `Emitida por: Value Pas (plataforma GMenezes, desenvolvida pelo Instituto THEYE)`, tamanho: 10 },
    { texto: ' ' },
    { texto: `${f.operadores} operador(es) x R$ 390,00 = ${brl(390 * f.operadores)}`, tamanho: 11 },
    { texto: `${f.leitores} leitor(es) x R$ 120,00 = ${brl(120 * f.leitores)}`, tamanho: 11 },
    { texto: `Subtotal: ${brl(f.valor_cheio)}`, tamanho: 11 },
    { texto: `Desconto (${f.desconto_pct}% no primeiro ano): -${brl(f.valor_cheio - f.valor)}`, tamanho: 11 },
    { texto: `Total: ${brl(f.valor)}`, tamanho: 13, negrito: true },
    { texto: `Vencimento: ${dataBr(f.vencimento)}`, tamanho: 11 },
    { texto: f.pago_em ? `Paga em ${new Date(f.pago_em).toLocaleDateString('pt-BR')}` : 'Em aberto', tamanho: 11 },
    { texto: ' ' },
    ...(pix ? [{ texto: 'PIX copia e cola:', tamanho: 10, negrito: true }, { texto: pix, tamanho: 8 }] : [{ texto: 'Chave PIX não configurada (Configurações > PIX).', tamanho: 10 }]),
  ]
}

export default function FaturasParceiros({ nomes }: { nomes: Record<string, string> }) {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [pix, setPix] = useState<{ pix_chave: string; pix_nome: string | null; pix_cidade: string | null } | null>(null)
  const [qr, setQr] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = async () => {
    const { data } = await supabase.from('faturas_escritorio').select('*').order('competencia', { ascending: false }).order('criado_em').limit(60)
    setFaturas((data ?? []) as Fatura[])
  }
  useEffect(() => {
    carregar()
    supabase.rpc('dados_pix').then(({ data }) => { const d = Array.isArray(data) ? data[0] : data; if (d?.pix_chave) setPix(d) })
  }, [])

  const codigo = (f: Fatura) => pix ? codigoPix({ chave: pix.pix_chave, nome: pix.pix_nome ?? 'Value Pas', cidade: pix.pix_cidade ?? 'Rio de Janeiro', valor: Number(f.valor), referencia: `FAT${f.competencia.slice(0, 7).replace('-', '')}`, descricao: `Plataforma ${f.competencia.slice(0, 7)}` }) : ''

  const gerar = async () => {
    setOcupado(true); setMsg('')
    const { data, error } = await supabase.rpc('gerar_faturas_escritorios')
    setOcupado(false)
    if (error) { setMsg(`Não foi possível gerar: ${error.message}`); return }
    setMsg(`${(data ?? []).length} fatura(s) na competência atual.`); carregar()
  }
  const baixar = (f: Fatura) => {
    const pdf = gerarPdfTexto(`Fatura ${f.competencia.slice(0, 7)}`, linhasFatura(f, nomes[f.escritorio_id] ?? 'Escritório parceiro', codigo(f) || undefined))
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = `fatura-${f.competencia.slice(0, 7)}-${(nomes[f.escritorio_id] ?? 'parceiro').replace(/\W+/g, '-')}.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const mostrarQr = async (f: Fatura) => { const c = codigo(f); if (!c) { setMsg('Defina a chave PIX em Configurações para cobrar por PIX.'); return } setQr(q => ({ ...q, [f.id]: '' })); setQr(q => ({ ...q, [f.id]: 'carregando' })); const img = await QRCode.toDataURL(c, { margin: 1, width: 180 }); setQr(q => ({ ...q, [f.id]: img })) }
  const copiar = async (f: Fatura) => { try { await navigator.clipboard.writeText(codigo(f)); setMsg('Código PIX copiado.') } catch { setMsg('Selecione o código no PDF e copie.') } }
  const marcarPaga = async (f: Fatura) => {
    const { error } = await supabase.from('faturas_escritorio').update({ pago_em: new Date().toISOString() }).eq('id', f.id)
    setMsg(error ? error.message : 'Fatura marcada como paga.'); carregar()
  }

  return (
    <div className="border border-navy/10 p-4 mt-4" data-testid="faturas-parceiros">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2"><Receipt size={16} className="text-dourado" aria-hidden="true" /> Faturas mensais (Value Pas)</h3>
        <button data-testid="gerar-faturas" onClick={gerar} disabled={ocupado} className="min-h-[44px] border border-navy px-3 text-sm uppercase tracking-wider">Gerar agora</button>
      </div>
      <p className="text-xs text-grafite-claro mt-1 mb-3">Geradas automaticamente no dia 1 de cada mês (vencimento dia 10) para cada escritório parceiro com pessoas ativas; 30% de desconto no primeiro ano. PDF e PIX usam a chave de Configurações.</p>
      {faturas.length === 0 ? <p className="text-sm text-grafite-claro" data-testid="sem-faturas">Nenhuma fatura ainda.</p> : (
        <ul className="divide-y text-sm" data-testid="lista-faturas">
          {faturas.map(f => (
            <li key={f.id} className="py-2" data-testid="fatura-item">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{nomes[f.escritorio_id] ?? 'Escritório'}</span>
                <span>{mesAno(f.competencia)}</span>
                <span>{f.operadores} op · {f.leitores} leit</span>
                <span className="font-semibold" data-testid="fatura-valor">{brl(f.valor)}</span>
                <span className={f.pago_em ? 'text-green-700' : 'text-amber-700'}>{f.pago_em ? 'Paga' : `Vence ${dataBr(f.vencimento)}`}</span>
                <button onClick={() => baixar(f)} className="underline inline-flex items-center gap-1" data-testid="fatura-pdf"><FileText size={13} aria-hidden="true" /> PDF</button>
                <button onClick={() => mostrarQr(f)} className="underline" data-testid="fatura-qr">QR PIX</button>
                <button onClick={() => copiar(f)} className="underline" data-testid="fatura-copiar">Copiar PIX</button>
                {!f.pago_em && <button onClick={() => marcarPaga(f)} className="underline" data-testid="fatura-paga">Marcar paga</button>}
              </div>
              {qr[f.id] && qr[f.id] !== 'carregando' && <img src={qr[f.id]} alt={`QR PIX da fatura de ${mesAno(f.competencia)}`} className="mt-2 border" width={180} height={180} data-testid="fatura-qr-img" />}
            </li>
          ))}
        </ul>
      )}
      {msg && <p role="status" className="text-sm mt-2" data-testid="faturas-msg">{msg}</p>}
    </div>
  )
}
