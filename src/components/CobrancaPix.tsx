import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import { codigoPix } from '@/lib/pix'
import { Copy, Printer, X } from 'lucide-react'

// Cobrança por PIX de um honorário: QR + código copia e cola, usando a chave PIX do escritório (Configurações).
export default function CobrancaPix({ valor, caso, cliente, fechar }: { valor: number; caso: string; cliente: string | null; fechar: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [qr, setQr] = useState('')
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('dados_pix')
      const d = (Array.isArray(data) ? data[0] : data) as { pix_chave: string | null; pix_nome: string | null; pix_cidade: string | null } | undefined
      if (error) return setErro(error.message)
      if (!d?.pix_chave) return setErro('Cadastre a chave PIX do escritório em Configurações → Cobrança por PIX.')
      const c = codigoPix({ chave: d.pix_chave, nome: d.pix_nome ?? 'GMenezes Advogados', cidade: d.pix_cidade ?? 'Rio de Janeiro', valor, referencia: caso.slice(0, 20), descricao: `Honorarios ${caso}` })
      setCodigo(c)
      setQr(await QRCode.toDataURL(c, { margin: 1, width: 220 }))
    })()
  }, [valor, caso])
  const copiar = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true) } catch { setErro('Não foi possível copiar; selecione o código e copie.') } }
  const imprimir = () => {
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>Cobrança PIX</title><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;line-height:1.6;text-align:center}code{display:block;word-break:break-all;font-size:11px;text-align:left;border:1px solid #ccc;padding:8px}</style></head><body><p>GMenezes Advogados Associados</p><h2>Honorários · ${caso}</h2><p>${cliente ?? ''}</p><p><strong>${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p><img src="${qr}" alt="QR PIX"/><p>PIX copia e cola:</p><code>${codigo}</code></body></html>`)
    w.document.close(); w.print()
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pix-titulo" className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4" data-testid="cobranca-pix">
      <div className="bg-white max-w-md w-full p-6 shadow-lg border-t-2 border-dourado">
        <div className="flex items-start justify-between gap-3">
          <h2 id="pix-titulo" className="text-lg font-serif text-navy">Cobrar por PIX · {caso}</h2>
          <button onClick={fechar} aria-label="Fechar" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"><X size={18} /></button>
        </div>
        <p className="text-sm text-grafite mt-1">{cliente ?? 'Cliente'} · {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}
        {qr && <img src={qr} alt="QR code do PIX" className="mx-auto mt-4" width={220} height={220} />}
        {codigo && <>
          <label htmlFor="pix-codigo" className="block text-xs uppercase tracking-wider text-grafite mt-4">PIX copia e cola</label>
          <textarea id="pix-codigo" readOnly value={codigo} rows={4} className="w-full text-xs font-mono border p-2 mt-1" data-testid="pix-codigo" />
          <div className="flex flex-wrap gap-3 mt-3">
            <button onClick={copiar} className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center gap-2"><Copy size={14} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar código'}</button>
            <button onClick={imprimir} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2"><Printer size={14} aria-hidden="true" /> Imprimir ou salvar PDF</button>
          </div>
        </>}
      </div>
    </div>
  )
}
