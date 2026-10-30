import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Marca from '@/components/Marca'

// Passo 36 (Onda D): página pública de aceite do convite de escritório parceiro. Cria o acesso e entra na plataforma.
type Convite = { nome_escritorio: string; email: string; funcao: string; aceito: boolean; expirado: boolean }

export default function ConviteParceiroPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [convite, setConvite] = useState<Convite | null | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { supabase.rpc('convite_parceiro', { p_token: token }).then(r => setConvite((r.data as Convite) ?? null)) }, [token])

  const aceitar = async () => {
    setMsg(''); setOcupado(true)
    try {
      const { data, error } = await supabase.functions.invoke('convidar-parceiro', { body: { aceitar: { token, nome, senha } } })
      if (error || data?.erro) throw new Error(data?.erro ?? error?.message ?? 'Erro')
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: data.email, password: senha })
      if (e2) throw new Error('Acesso criado. Entre com seu e-mail e senha.')
      setMsg('Acesso criado. Entrando…'); navigate('/inicio')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro') } finally { setOcupado(false) }
  }
  return (
    <main className="min-h-screen bg-pergaminho">
      <header className="bg-navy py-6"><Marca /></header>
      <div className="max-w-md mx-auto px-4 py-8">
        {convite === undefined && <p className="text-grafite">Carregando…</p>}
        {convite === null && <p role="alert" className="text-grafite">Convite não encontrado. Peça um novo link à sede.</p>}
        {convite && (
          <article className="bg-white border-t-2 border-dourado shadow-sm p-6" data-testid="convite-parceiro">
            <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Convite de escritório parceiro</p>
            <h1 className="font-serif text-2xl text-navy mt-1" data-testid="convite-nome">{convite.nome_escritorio}</h1>
            <p className="text-sm text-grafite mt-2">Acesso de <strong>{convite.funcao}</strong> para <strong>{convite.email}</strong>. Seu escritório gere os próprios casos, prazos, honorários e portal do cliente, sem ver nada da sede.</p>
            {convite.aceito && <p role="status" className="mt-4 text-sm" data-testid="convite-aceito">Este convite já foi aceito. <button onClick={() => navigate('/login')} className="underline text-navy">Entrar</button></p>}
            {!convite.aceito && convite.expirado && <p role="alert" className="mt-4 text-sm text-critico">Este convite expirou (vale 14 dias). Peça um novo à sede.</p>}
            {!convite.aceito && !convite.expirado && (
              <form className="mt-5 space-y-3" onSubmit={e => { e.preventDefault(); aceitar() }}>
                <label className="block text-xs uppercase tracking-wider text-grafite">Seu nome<input value={nome} onChange={e => setNome(e.target.value)} required className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="convite-nome-pessoa" /></label>
                <label className="block text-xs uppercase tracking-wider text-grafite">Senha (mínimo 8 caracteres)<input type="password" value={senha} onChange={e => setSenha(e.target.value)} minLength={8} required className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="convite-senha" /></label>
                <button type="submit" disabled={ocupado || nome.trim().length < 2 || senha.length < 8} className="min-h-[44px] w-full bg-navy text-white text-sm uppercase tracking-wider disabled:bg-grafite-claro/40" data-testid="convite-aceitar">{ocupado ? 'Criando acesso…' : 'Aceitar e entrar'}</button>
                <p className="text-xs text-grafite-claro">Ao aceitar, você concorda com os termos de uso e a política de privacidade (LGPD), apresentados no primeiro acesso.</p>
              </form>
            )}
            {msg && <p role="status" className="text-sm mt-3" data-testid="convite-msg">{msg}</p>}
          </article>
        )}
      </div>
    </main>
  )
}
