import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { codigoDoLink } from '@/lib/acessoEmail'

/**
 * Tela aberta pelo link "Confirmar e entrar" do e-mail de conta nova (?confirmar=1&th=código).
 * Confere o código de uso único, abre a sessão e leva a pessoa para dentro da plataforma.
 */
export default function ConfirmarContaPage() {
  const [falhou, setFalhou] = useState(false)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const th = codigoDoLink()
      if (!supabaseConfigurado || !th) { if (vivo) setFalhou(true); return }
      try {
        let { error } = await supabase.auth.verifyOtp({ token_hash: th, type: 'signup' })
        if (error) ({ error } = await supabase.auth.verifyOtp({ token_hash: th, type: 'email' }))
        if (error) { if (vivo) setFalhou(true); return }
        window.location.replace(`${window.location.origin}/#/inicio`)
      } catch { if (vivo) setFalhou(true) }
    })()
    return () => { vivo = false }
  }, [])
  const irParaEntrada = () => { window.location.replace(`${window.location.origin}/#/login?ir=/inicio`) }
  return (
    <main className="min-h-screen bg-navy px-4 py-16 text-white" data-testid="confirmar-conta">
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-serif text-2xl">{falhou ? 'Este link não serve mais' : 'Confirmando a sua conta…'}</h1>
        {falhou && (
          <>
            <p className="mt-4 text-sm text-neutral-200">Cada link só vale uma vez e por pouco tempo. Se a conta já foi confirmada, é só entrar com o seu e-mail e a sua senha. Se esqueceu a senha, use "Esqueci minha senha" na entrada.</p>
            <button type="button" onClick={irParaEntrada} title="Abre a tela de entrada da plataforma" className="mt-6 min-h-[44px] bg-white px-6 text-sm font-semibold uppercase tracking-wider text-black">Ir para a entrada</button>
          </>
        )}
      </div>
    </main>
  )
}
