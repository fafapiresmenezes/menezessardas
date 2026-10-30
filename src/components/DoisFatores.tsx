import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'

// Autenticação em dois fatores (TOTP): a pessoa lê o QR no Google Authenticator, Microsoft Authenticator
// ou Authy e, a partir daí, o site pede o código de 6 dígitos depois da senha.
interface Fator { id: string; status: string; friendly_name?: string | null }

export default function DoisFatores() {
  const [fatores, setFatores] = useState<Fator[]>([])
  const [qr, setQr] = useState('')
  const [segredo, setSegredo] = useState('')
  const [fatorId, setFatorId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = async () => {
    if (!supabaseConfigurado) return
    const { data } = await supabase.auth.mfa.listFactors()
    setFatores((data?.totp ?? []) as Fator[])
  }
  useEffect(() => { carregar() }, [])

  const ativar = async () => {
    setMsg(''); setOcupado(true)
    try {
      // remove rascunhos antigos não verificados para não acumular
      for (const f of fatores.filter(f => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id })
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'GMenezes ' + new Date().toLocaleDateString('pt-BR') })
      if (error || !data) { setMsg('Não foi possível iniciar: ' + (error?.message ?? '')); return }
      setQr(data.totp.qr_code); setSegredo(data.totp.secret); setFatorId(data.id)
    } finally { setOcupado(false) }
  }

  const confirmar = async () => {
    setMsg(''); setOcupado(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo.replace(/\s/g, '') })
      if (error) { setMsg('Código não confere. Confira o relógio do celular e tente de novo.'); return }
      setQr(''); setSegredo(''); setFatorId(''); setCodigo(''); setMsg('Dois fatores ativados. No próximo acesso o site vai pedir o código do aplicativo.')
      await carregar()
    } finally { setOcupado(false) }
  }

  const desativar = async (id: string) => {
    if (!window.confirm('Desativar a verificação em dois fatores desta conta?')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    setMsg(error ? 'Não foi possível desativar: ' + error.message : 'Dois fatores desativados.')
    await carregar()
  }

  const ativos = fatores.filter(f => f.status === 'verified')
  return (
    <section aria-labelledby="dois-fatores" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado">
      <h2 id="dois-fatores" className="text-lg mb-3 flex items-center gap-2">
        <ShieldCheck size={18} className="text-dourado" aria-hidden="true" /> Verificação em dois fatores
      </h2>
      {!supabaseConfigurado ? <p className="text-sm text-grafite-claro">Disponível na produção.</p> : (
        <>
          <p className="text-sm text-grafite mb-3">
            {ativos.length ? 'Ativa: além da senha, o site pede o código de 6 dígitos do aplicativo autenticador.' : 'Recomendado para toda a equipe: mesmo que a senha vaze, ninguém entra sem o código do seu celular.'}
          </p>
          {ativos.map(f => (
            <div key={f.id} className="flex items-center justify-between text-sm border px-3 py-2 mb-2">
              <span>{f.friendly_name || 'Aplicativo autenticador'}</span>
              <button onClick={() => desativar(f.id)} className="text-critico underline text-xs">Desativar</button>
            </div>
          ))}
          {!qr && !ativos.length && (
            <button data-testid="ativar-2fa" onClick={ativar} disabled={ocupado} className="bg-navy text-white px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm">Ativar dois fatores</button>
          )}
          {qr && (
            <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-start">
              <img src={qr} alt="QR code para o aplicativo autenticador" width={180} height={180} className="border" />
              <div className="space-y-2 text-sm">
                <p>1. Abra o Google Authenticator, Microsoft Authenticator ou Authy e leia o QR.</p>
                <p className="text-xs text-grafite-claro break-all">Sem câmera? Digite a chave: <code data-testid="segredo-2fa">{segredo}</code></p>
                <p>2. Digite o código de 6 dígitos que apareceu:</p>
                <div className="flex gap-2">
                  <input aria-label="Código de 6 dígitos" inputMode="numeric" maxLength={7} value={codigo} onChange={e => setCodigo(e.target.value)} className="border px-3 py-2 w-32 tracking-widest" />
                  <button data-testid="confirmar-2fa" onClick={confirmar} disabled={ocupado || codigo.length < 6} className="bg-dourado text-navy px-4 py-2 text-sm uppercase tracking-wider">Confirmar</button>
                </div>
              </div>
            </div>
          )}
          {msg && <p role="status" className="text-sm mt-3">{msg}</p>}
        </>
      )}
    </section>
  )
}
