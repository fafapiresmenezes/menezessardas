import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { codigoDoLink } from '@/lib/acessoEmail'
import { problemaDaSenha, REGRA_DA_SENHA, SENHA_MINIMO } from '@/lib/senha'
import { casaDaPessoa, entradaDaPessoa } from '@/lib/destino'

/**
 * Tela de criar ou redefinir a senha, aberta pelo link que o Supabase envia por e-mail.
 * O link volta para https://theye.club/?redefinir=1 e o próprio cliente do Supabase lê o
 * token da URL (#access_token…) e abre uma sessão de recuperação. Só esta tela aparece
 * nesse caso; depois de gravar a senha, a sessão é encerrada e a pessoa entra de novo com a
 * senha nova. Não guarda a senha em lugar nenhum.
 */
export default function RedefinirSenhaPage() {
  const [pronta, setPronta] = useState<boolean | null>(null)
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [concluida, setConcluida] = useState(false)

  useEffect(() => {
    if (!supabaseConfigurado) { setPronta(false); return }
    let vivo = true
    // Link do e-mail da casa: traz o código de uso único em &th=. Confere o código e abre a sessão de troca.
    const th = codigoDoLink()
    const abrir = th ? supabase.auth.verifyOtp({ token_hash: th, type: 'recovery' }).then(() => undefined, () => undefined) : Promise.resolve()
    abrir.then(() => supabase.auth.getSession())
      .then(({ data }) => { if (vivo) setPronta(!!data.session) })
      .catch(() => { if (vivo) setPronta(false) })
    return () => { vivo = false }
  }, [])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const falta = problemaDaSenha(nova)
    if (falta) { setMsg({ tipo: 'erro', texto: falta }); return }
    if (nova !== confirma) { setMsg({ tipo: 'erro', texto: 'As duas senhas não são iguais.' }); return }
    setOcupado(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: nova })
      if (error) throw new Error(mensagemAmigavel(error))
      // A pessoa acabou de provar que é dona do e-mail e criou a senha: já entra direto,
      // sem passar pela tela de entrada de novo (M, 19/11/2026, depois de "senha não confere" em série).
      setConcluida(true)
    } catch (err) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(err) })
    } finally {
      setOcupado(false)
    }
  }

  // Sai do modo de redefinição (sem ?redefinir=1) e abre a entrada normal.
  const irParaEntrada = () => { window.location.replace(`${window.location.origin}/#${entradaDaPessoa()}`) }
  // Com a sessão aberta pelo link do e-mail, vai direto para dentro da plataforma.
  const irParaDentro = () => { window.location.replace(`${window.location.origin}/#${casaDaPessoa()}`) }

  const campo = 'w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white'

  return (
    <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <section aria-labelledby="redefinir-titulo" className="w-full max-w-md bg-white p-6 shadow-sm border-t-2 border-dourado" data-testid="redefinir-senha">
        <h1 id="redefinir-titulo" className="font-serif text-2xl">Criar ou trocar a senha</h1>

        {pronta === null && <p className="mt-4 text-sm text-grafite">Conferindo o link…</p>}

        {pronta === false && (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm text-critico">Este link não está mais válido. Peça um novo na tela de entrada, em “Esqueci a senha”.</p>
            <button type="button" onClick={irParaEntrada} title="Volta para a tela de entrada" className="inline-flex min-h-[44px] items-center text-sm text-navy underline underline-offset-4">Ir para a entrada</button>
          </div>
        )}

        {pronta && !concluida && (
          <form onSubmit={salvar} className="mt-4 space-y-4">
            <label className="block text-sm">
              Nova senha
              <input type="password" autoComplete="new-password" title="Digite a senha nova: 12 caracteres ou mais, com letra maiúscula, minúscula e número" aria-describedby="regra-senha" value={nova} onChange={e => setNova(e.target.value)} className={`${campo} mt-1`} required minLength={SENHA_MINIMO} />
              <span id="regra-senha" className="mt-1 block text-xs text-grafite">{REGRA_DA_SENHA}</span>
            </label>
            <label className="block text-sm">
              Repita a nova senha
              <input type="password" autoComplete="new-password" title="Repita a mesma senha para confirmar" value={confirma} onChange={e => setConfirma(e.target.value)} className={`${campo} mt-1`} required minLength={SENHA_MINIMO} />
            </label>
            {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`text-sm ${msg.tipo === 'erro' ? 'text-critico' : 'text-regular'}`}>{msg.texto}</p>}
            <button type="submit" disabled={ocupado} title="Grava a senha nova e encerra esta sessão de recuperação" className="w-full min-h-[44px] bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-60">
              {ocupado ? 'Gravando…' : 'Gravar a senha'}
            </button>
          </form>
        )}

        {concluida && (
          <div className="mt-4 space-y-4">
            <p role="status" className="text-sm text-regular">Senha gravada. Você já está dentro.</p>
            <button type="button" onClick={irParaDentro} title="Abre a plataforma, já com a sua entrada feita" className="inline-flex min-h-[44px] items-center px-4 bg-navy text-white text-sm uppercase tracking-wider">Abrir a plataforma</button>
          </div>
        )}
      </section>
    </main>
  )
}
