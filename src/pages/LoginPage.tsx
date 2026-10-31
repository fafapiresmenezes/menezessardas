import { useEffect, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { entrarDemo } from '@/lib/authDemo'
import Marca from '@/components/Marca'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoRecuperacao, setAvisoRecuperacao] = useState(false)
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false)
  const [avisoCadastro, setAvisoCadastro] = useState('')
  const [pedirCodigo, setPedirCodigo] = useState(false)
  const [codigo, setCodigo] = useState('')
  const navigate = useNavigate()


  // Dois fatores: se a conta tem aplicativo autenticador, a sessão só vale depois do código (nível aal2).
  const precisaCodigo = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  }
  useEffect(() => { if (supabaseConfigurado) precisaCodigo().then(p => { if (p) setPedirCodigo(true) }) }, [])
  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setCarregando(true)
    try {
      const { data: f } = await supabase.auth.mfa.listFactors()
      const fator = f?.totp?.find(x => x.status === 'verified')
      if (!fator) { setErro('Nenhum aplicativo autenticador ativo nesta conta.'); return }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.replace(/\s/g, '') })
      if (error) setErro('Código não confere. Tente de novo.')
      else navigate('/inicio')
    } finally { setCarregando(false) }
  }

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setAvisoRecuperacao(false)
    setCarregando(true)

    if (!supabaseConfigurado) {
      if (entrarDemo(email, senha)) {
        navigate('/inicio')
        window.location.reload()
      } else {
        setErro('E-mail ou senha incorretos.')
      }
      setCarregando(false)
      return
    }

    if (primeiroAcesso) {
      if (senha.length < 8) {
        setErro('A senha precisa ter pelo menos 8 caracteres.')
        setCarregando(false)
        return
      }
      try {
        const { error } = await supabase.auth.signUp({ email, password: senha })
        if (error) setErro('Não foi possível criar o acesso: ' + mensagemAmigavel(error))
        else {
          setAvisoCadastro('Cadastro recebido. Um administrador do escritório vai liberar o seu acesso; depois é só entrar com este e-mail e senha.')
          setPrimeiroAcesso(false)
        }
      } catch {
        setErro('Não foi possível criar o acesso. Tente novamente.')
      } finally {
        setCarregando(false)
      }
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (!error) { if (await precisaCodigo()) setPedirCodigo(true); else navigate('/inicio') }
      else if (error.status === 400 || error.status === 401 || /invalid/i.test(mensagemAmigavel(error))) setErro('E-mail ou senha incorretos.')
      else setErro('Não foi possível falar com o servidor (' + mensagemAmigavel(error) + '). Verifique a conexão e tente de novo.')
    } catch {
      setErro('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Marca tamanho="grande" />
        </div>

        <div className="bg-white rounded-sm shadow-xl border-t-2 border-dourado p-8">
          <h1 className="font-serif text-2xl text-navy text-center">Gestão Contratual</h1>
          <p className="text-sm text-grafite-claro text-center mt-2 mb-7">
            Acesso restrito aos profissionais do escritório
          </p>

          {erro && (
            <div role="alert" className="mb-5 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
              {erro}
            </div>
          )}

          {avisoCadastro && (
            <div role="status" className="mb-5 p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
              {avisoCadastro}
            </div>
          )}

          {primeiroAcesso && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              Crie sua conta com e-mail e senha. O acesso é liberado por um administrador do escritório,
              que escolhe a sua função (operador ou leitor).
            </div>
          )}

          {avisoRecuperacao && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              {supabaseConfigurado
                ? 'Peça a uma pessoa administradora do escritório uma senha provisória (menu Equipe). Depois de entrar, troque-a em Configurações → Senha.'
                : 'Na demonstração, entre com admin@exemplo.com e a senha senha123.'}
            </div>
          )}

          {pedirCodigo ? (
            <form onSubmit={verificarCodigo} className="space-y-5" data-testid="form-2fa">
              <p className="text-sm text-grafite">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
              <input aria-label="Código de 6 dígitos" inputMode="numeric" autoFocus maxLength={7} value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm tracking-widest" />
              {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
              <button type="submit" disabled={carregando} className="w-full bg-navy text-white py-3 rounded-sm uppercase tracking-wider text-sm">Confirmar código</button>
              <button type="button" onClick={async () => { await supabase.auth.signOut(); setPedirCodigo(false); setCodigo('') }} className="w-full text-sm underline text-grafite">Entrar com outra conta</button>
            </form>
          ) : (
          <form onSubmit={entrar} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-grafite mb-2">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-xs uppercase tracking-wider text-grafite mb-2">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete={primeiroAcesso ? 'new-password' : 'current-password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-navy hover:bg-navy-700 disabled:bg-grafite-claro text-white tracking-wider uppercase text-sm py-3 rounded-sm transition"
            >
              {carregando ? 'Aguarde…' : primeiroAcesso ? 'Criar acesso' : 'Entrar'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setErro('')
                setAvisoRecuperacao(true)
              }}
              className="inline-flex items-center min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
            >
              Esqueci minha senha
            </button>
            {supabaseConfigurado && (
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setAvisoCadastro('')
                  setPrimeiroAcesso(v => !v)
                }}
                className="block mx-auto mt-3 min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
              >
                {primeiroAcesso ? 'Já tenho acesso' : 'Criar conta'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-8">
          GMenezes Advogados Associados
        </p>
      </div>
    </main>
  )
}
