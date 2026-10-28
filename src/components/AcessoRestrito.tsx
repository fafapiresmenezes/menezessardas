import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { listarPessoas, perfilAtual, type Pessoa } from '@/lib/equipe'
import { Lock } from 'lucide-react'

// Sigilo por imóvel: o admin marca o imóvel como restrito e escolhe quem da equipe vê ele,
// seus contratos e documentos. O banco aplica a regra (pode_ver_imovel), não só a tela.
export default function AcessoRestrito({ imovelId }: { imovelId: string }) {
  const [admin, setAdmin] = useState(false)
  const [restrito, setRestrito] = useState(false)
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [com, setCom] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    perfilAtual().then(async f => {
      if (f !== 'admin') return
      setAdmin(true)
      const [{ data: im }, { data: ac }, lista] = await Promise.all([
        supabase.from('imoveis').select('restrito').eq('id', imovelId).single(),
        supabase.from('imovel_acesso').select('usuario_id').eq('imovel_id', imovelId),
        listarPessoas(),
      ])
      setRestrito(!!im?.restrito)
      setCom(new Set((ac ?? []).map(a => a.usuario_id as string)))
      setPessoas(lista.filter(p => p.funcao && p.funcao !== 'admin'))
    })
  }, [imovelId])
  if (!admin) return null

  const alternarRestrito = async () => {
    const { error } = await supabase.from('imoveis').update({ restrito: !restrito }).eq('id', imovelId)
    if (error) return setMsg(error.message)
    setRestrito(!restrito); setMsg(!restrito ? 'Imóvel restrito: só os marcados abaixo (e os administradores) veem.' : 'Imóvel aberto para toda a equipe.')
  }
  const alternarPessoa = async (p: Pessoa) => {
    const tem = com.has(p.id)
    const { error } = tem
      ? await supabase.from('imovel_acesso').delete().eq('imovel_id', imovelId).eq('usuario_id', p.id)
      : await supabase.from('imovel_acesso').insert({ imovel_id: imovelId, usuario_id: p.id })
    if (error) return setMsg(error.message)
    const n = new Set(com); if (tem) n.delete(p.id); else n.add(p.id); setCom(n)
  }

  return (
    <section aria-labelledby="t-acesso" className="bg-white shadow-sm p-5 border-l-4 border-dourado">
      <h2 id="t-acesso" className="text-xl mb-2 flex items-center gap-2"><Lock size={18} className="text-dourado-escuro" aria-hidden="true" /> Quem pode ver este imóvel</h2>
      <label className="flex items-center gap-3 text-sm cursor-pointer">
        <input type="checkbox" checked={restrito} onChange={alternarRestrito} className="w-5 h-5" data-testid="restrito" />
        Acesso restrito (sigilo): só as pessoas marcadas veem este imóvel, os contratos e os documentos
      </label>
      {restrito && (
        <ul className="mt-3 grid sm:grid-cols-2 gap-2">
          {pessoas.length ? pessoas.map(p => (
            <li key={p.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={com.has(p.id)} onChange={() => alternarPessoa(p)} className="w-4 h-4" />
                {p.nome || p.email}
              </label>
            </li>
          )) : <li className="text-sm text-grafite-claro">Nenhuma pessoa da equipe além dos administradores.</li>}
        </ul>
      )}
      {msg && <p role="status" className="text-xs text-grafite-claro mt-2">{msg}</p>}
    </section>
  )
}
