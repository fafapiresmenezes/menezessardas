import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Passo 39 (Onda D): marca de cada escritório parceiro (nome de exibição, cor e logo) usada no Portal do cliente e nos e-mails.
type Marca = { nome_exibicao: string; cor: string; logo_url: string }
const PADRAO: Marca = { nome_exibicao: '', cor: '#14213D', logo_url: '' }

export default function MarcaParceiros({ escritorios }: { escritorios: { id: string; nome: string }[] }) {
  const [marcas, setMarcas] = useState<Record<string, Marca>>({})
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (escritorios.length === 0) return
    supabase.from('escritorios').select('id,nome_exibicao,cor,logo_url').in('id', escritorios.map(e => e.id)).then(({ data }) => {
      const m: Record<string, Marca> = {}
      for (const r of (data ?? []) as { id: string; nome_exibicao: string | null; cor: string | null; logo_url: string | null }[]) m[r.id] = { nome_exibicao: r.nome_exibicao ?? '', cor: r.cor ?? '#14213D', logo_url: r.logo_url ?? '' }
      setMarcas(m)
    })
  }, [escritorios.map(e => e.id).join(',')])
  const mudar = (id: string, campo: keyof Marca, valor: string) => setMarcas(m => ({ ...m, [id]: { ...(m[id] ?? PADRAO), [campo]: valor } }))
  const salvar = async (id: string) => {
    const m = marcas[id] ?? PADRAO
    const { error } = await supabase.rpc('definir_marca', { p_escritorio: id, p_nome: m.nome_exibicao, p_cor: m.cor, p_logo_url: m.logo_url })
    setMsg(error ? error.message : 'Marca salva. O Portal do cliente e os e-mails desse escritório já usam a nova marca.')
  }
  if (escritorios.length === 0) return null
  return (
    <div className="border border-navy/10 p-4 mt-4" data-testid="marca-parceiros">
      <h3 className="font-semibold flex items-center gap-2"><Palette size={16} className="text-dourado" aria-hidden="true" /> Marca de cada escritório parceiro</h3>
      <p className="text-xs text-grafite-claro mt-1 mb-3">Nome de exibição, cor e logo (endereço https) aparecem no Portal do cliente e nos e-mails dos casos desse escritório. O rodapé mantém "plataforma GMenezes, desenvolvida pelo Instituto THEYE".</p>
      <ul className="space-y-2">
        {escritorios.map(e => { const m = marcas[e.id] ?? PADRAO; return (
          <li key={e.id} className="grid sm:grid-cols-5 gap-2 items-center text-sm" data-testid="marca-item">
            <span className="truncate">{e.nome}</span>
            <input aria-label={`Nome de exibição de ${e.nome}`} placeholder="Nome de exibição" value={m.nome_exibicao} onChange={ev => mudar(e.id, 'nome_exibicao', ev.target.value)} className="border px-2 py-1" data-testid="marca-nome" />
            <span className="flex items-center gap-1"><input aria-label={`Cor de ${e.nome}`} type="color" value={/^#[0-9A-Fa-f]{6}$/.test(m.cor) ? m.cor : '#14213D'} onChange={ev => mudar(e.id, 'cor', ev.target.value)} className="h-9 w-12 border" data-testid="marca-cor" /><span className="text-xs">{m.cor}</span></span>
            <input aria-label={`Logo de ${e.nome}`} placeholder="https://…/logo.png" value={m.logo_url} onChange={ev => mudar(e.id, 'logo_url', ev.target.value)} className="border px-2 py-1" data-testid="marca-logo" />
            <button onClick={() => salvar(e.id)} className="min-h-[40px] border border-navy px-3 text-xs uppercase tracking-wider" data-testid="marca-salvar">Salvar</button>
          </li>) })}
      </ul>
      {msg && <p role="status" className="text-sm mt-2" data-testid="marca-msg">{msg}</p>}
    </div>
  )
}
