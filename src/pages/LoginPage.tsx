import { useState } from 'react'
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
  const navigate = useNavigate()

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setAvisoRecuperacao(false)
    setCarregando(true)

    if (!supabaseConfigurado) {
      if (entrarDemo(email, senha)) {
        navigate('/dashboard')
        window.location.reload()
      } else {
        setErro('E-mail ou senha incorretos.')
      }
      setCarregando(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro('E-mail ou senha incorretos.')
      else navigate('/dashboard')
    } catch {
      setErro('Não foi possível entrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
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

          {avisoRecuperacao && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              Se este e-mail estiver cadastrado, você receberá as instruções de redefinição em
              instantes.
            </div>
          )}

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
                autoComplete="current-password"
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
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setErro('')
                setAvisoRecuperacao(true)
              }}
              className="text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-8">
          Leticia Sardas &amp; Menezes Advogados Associados
        </p>
      </div>
    </div>
  )
}
