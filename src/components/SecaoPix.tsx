import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { perfilAtual } from '@/lib/equipe'
import { Banknote } from 'lucide-react'

// Chave PIX do escritório: usada pela cobrança de honorários (sem API bancária, sem custo).
export default function SecaoPix() {
  const [admin, setAdmin] = useState(false)
  const [f, setF] = useState({ chave: '', nome: '', cidade: '' })
  const [salva, setSalva] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const carregar = async () => {
    const { data } = await supabase.rpc('dados_pix')
    const d = (Array.isArray(data) ? data[0] : data) as { pix_chave: string | null; pix_nome: string | null; pix_cidade: string | null } | undefined
    setSalva(d?.pix_chave ?? null)
    if (d?.pix_chave) setF({ chave: d.pix_chave, nome: d.pix_nome ?? '', cidade: d.pix_cidade ?? '' })
  }
  useEffect(() => { if (supabaseConfigurado) { perfilAtual().then(p => setAdmin(p === 'admin')).catch(() => undefined); carregar() } }, [])
  if (!supabaseConfigurado || !admin) return null
  const salvar = async () => {
    setMsg(null)
    const { error } = await supabase.rpc('definir_pix', { p_chave: f.chave, p_nome: f.nome, p_cidade: f.cidade })
    if (error) return setMsg({ tipo: 'erro', texto: error.message })
    await carregar(); setMsg({ tipo: 'ok', texto: 'Chave PIX salva. O botão "Cobrar por PIX" já funciona em Honorários.' })
  }
  return (
    <section aria-labelledby="pix" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado" data-testid="secao-pix">
      <h2 id="pix" className="text-lg mb-1 flex items-center gap-2"><Banknote size={18} className="text-dourado" aria-hidden="true" /> Cobrança por PIX</h2>
      <p className="text-xs text-grafite-claro mb-3">Informe a chave PIX da sociedade (CNPJ, e-mail ou telefone). A plataforma gera o QR e o código copia e cola de cada honorário, sem banco nem API. {salva ? `Chave atual: ${salva}` : 'Nenhuma chave ainda.'}</p>
      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`p-3 text-sm border-l-2 mb-3 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}>{msg.texto}</p>}
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <label className="block"><span className="block text-xs uppercase tracking-wider text-grafite">Chave PIX</span><input value={f.chave} onChange={e => setF({ ...f, chave: e.target.value })} className="w-full border px-3 py-2 mt-1" data-testid="pix-chave" /></label>
        <label className="block"><span className="block text-xs uppercase tracking-wider text-grafite">Nome do recebedor (até 25)</span><input value={f.nome} maxLength={25} onChange={e => setF({ ...f, nome: e.target.value })} className="w-full border px-3 py-2 mt-1" /></label>
        <label className="block"><span className="block text-xs uppercase tracking-wider text-grafite">Cidade (até 15)</span><input value={f.cidade} maxLength={15} onChange={e => setF({ ...f, cidade: e.target.value })} className="w-full border px-3 py-2 mt-1" /></label>
      </div>
      <button onClick={salvar} disabled={!f.chave.trim()} className="mt-3 min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider disabled:bg-grafite-claro/40" data-testid="salvar-pix">Salvar</button>
    </section>
  )
}
