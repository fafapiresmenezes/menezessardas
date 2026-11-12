import { useEffect, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { entrarDemo } from '@/lib/authDemo'
import Marca from '@/components/Marca'
import { NOME_PLATAFORMA } from '@/lib/plataforma'
import { marcaPorDominio, esquecerMarca, type MarcaEscritorio } from '@/lib/marca'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [armadilha, setArmadilha] = useState('')
  const [abertoEm] = useState(() => Date.now())
  // Passo D22: em domínio próprio de parceiro, a tela de entrada mostra a marca dele.
  const [marca, setMarca] = useState<MarcaEscritorio | null>(null)
  useEffect(() => { esquecerMarca(); marcaPorDominio().then(setMarca).catch(() => setMarca(null)) }, [])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoRecuperacao, setAvisoRecuperacao] = useState(false)
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false)
  const [escritorio, setEscritorio] = useState('')
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
      // Anti-robô simples: campo invisível preenchido ou formulário enviado em menos de 3 s = robô.
      if (armadilha || Date.now() - abertoEm < 3000) {
        setErro('Não foi possível criar o acesso. Tente novamente em alguns segundos.')
        setCarregando(false)
        return
      }
      if (senha.length < 8) {
        setErro('A senha precisa ter pelo menos 8 caracteres.')
        setCarregando(false)
        return
      }
      try {
        // O nome do escritório segue o padrão da casa: tudo em letras maiúsculas, sem espaços sobrando.
        const nomeEscritorio = escritorio.toUpperCase().replace(/\s+/g, ' ').trim()
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { escritorio: nomeEscritorio } } })
        if (error) setErro(/rate limit/i.test(error.message ?? '') ? 'Muitas contas criadas em pouco tempo. Aguarde alguns minutos e tente de novo.' : 'Não foi possível criar o acesso: ' + mensagemAmigavel(error))
        else if (data?.session) navigate('/inicio') // sem confirmação de e-mail: já entra; se o escritório existe, cai na tela de espera
        else {
          setAvisoCadastro('Conta criada. Abra o e-mail que enviamos e toque no link de confirmação; depois entre com este e-mail e senha. Se o seu escritório já usa a plataforma, a pessoa que administra lá precisa liberar a sua entrada.')
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
      else if (/not confirmed/i.test(error.message ?? '')) setErro('Falta confirmar o seu e-mail: abra a mensagem que enviamos quando a conta foi criada e toque no link. Depois entre de novo.')
      else if (error.status === 400 || error.status === 401 || /invalid/i.test(mensagemAmigavel(error))) setErro('E-mail ou senha incorretos.')
      else setErro('Não foi possível falar com o servidor (' + mensagemAmigavel(error) + '). Verifique a conexão e tente de novo.')
    } catch {
      setErro('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center p-4" style={marca ? { backgroundColor: marca.cor } : undefined}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Marca tamanho="grande" marca={marca} />
        </div>

        <div className="bg-white rounded-sm shadow-xl border-t-2 border-dourado p-8">
          <h1 className="font-serif text-2xl text-navy text-center">{NOME_PLATAFORMA}</h1>
          <p className="text-sm text-grafite-claro text-center mt-2 mb-7">
            {primeiroAcesso ? 'Crie a sua conta e diga de qual escritório você é' : 'Entre com o seu e-mail e a sua senha'}
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
              Crie sua conta com e-mail, senha e o nome do seu escritório. Se o escritório já usa a
              plataforma, o seu pedido vai para quem administra lá e você só entra depois que essa pessoa
              liberar. Se ele ainda não usa, é criado agora, vazio, e você passa a administrá-lo.
            </div>
          )}

          {avisoRecuperacao && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              {supabaseConfigurado
                ? 'Esqueceu a senha? Peça a uma pessoa administradora da sua equipe uma senha provisória (menu Equipe). Depois de entrar, troque-a em Configurações → Senha.'
                : 'Na demonstração, entre com admin@exemplo.com e a senha senha123.'}
            </div>
          )}

          {pedirCodigo ? (
            <form onSubmit={verificarCodigo} className="space-y-5" data-testid="form-2fa">
              <p className="text-sm text-grafite">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
              <input aria-label="Código de 6 dígitos" inputMode="numeric" autoFocus maxLength={7} value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm tracking-widest" />
              {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
              <button type="submit" disabled={carregando} title="Confere o código do aplicativo autenticador e conclui a entrada na plataforma" className="w-full bg-navy text-white py-3 rounded-sm uppercase tracking-wider text-sm">Confirmar código</button>
              <button type="button" onClick={async () => { await supabase.auth.signOut(); setPedirCodigo(false); setCodigo('') }} title="Sai desta conta e volta à tela de e-mail e senha para entrar com outra" className="w-full text-sm underline text-grafite">Entrar com outra conta</button>
            </form>
          ) : (
          <form onSubmit={entrar} className="space-y-5">
            <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" value={armadilha} onChange={e => setArmadilha(e.target.value)} className="absolute opacity-0 h-0 w-0 pointer-events-none" />
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

            {primeiroAcesso && (
              <div>
                <label htmlFor="escritorio" className="block text-xs uppercase tracking-wider text-grafite mb-2" title="Escreva o nome do escritório de advocacia a que você pertence. O padrão da plataforma é tudo em LETRAS MAIÚSCULAS, para todo mundo escrever igual e ninguém errar.">
                  Escritório (em letras maiúsculas)
                </label>
                <input
                  id="escritorio"
                  name="escritorio"
                  type="text"
                  data-testid="campo-escritorio"
                  value={escritorio}
                  onChange={(e) => setEscritorio(e.target.value.toUpperCase())}
                  required
                  placeholder="EX.: SARDAS E MENEZES"
                  title="Nome do seu escritório, sempre em letras maiúsculas (a tela já converte sozinha). Quem é do mesmo escritório escreve o mesmo nome, igualzinho."
                  className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado uppercase"
                />
                <p className="text-xs text-grafite-claro mt-1">Padrão da casa: TUDO EM LETRAS MAIÚSCULAS, exatamente igual para todos do mesmo escritório. A tela converte sozinha enquanto você digita.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              title={primeiroAcesso ? 'Cria a sua conta e envia o pedido de entrada ao escritório informado (ou cria o escritório, se ele ainda não existe)' : 'Entra na plataforma com o e-mail e a senha informados'}
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
              title="Mostra as instruções para recuperar a senha com uma pessoa administradora da sua equipe"
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
                title={primeiroAcesso ? 'Volta à tela de entrada para quem já tem conta' : 'Muda o formulário para criar uma conta nova e dizer de qual escritório você é'}
                className="block mx-auto mt-3 min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
              >
                {primeiroAcesso ? 'Já tenho acesso' : 'Criar conta'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-8">
          Theye.club
        </p>
      </div>
    </main>
  )
}
