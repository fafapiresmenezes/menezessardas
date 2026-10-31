import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

// Decisão de M (30/10/2026): dois fatores obrigatório para administradores, com 7 dias de aviso.
export const PRAZO_2FA = new Date('2026-11-06T23:59:59-03:00')

export async function adminSemDoisFatores(): Promise<boolean> {
  if (!supabaseConfigurado) return false
  try {
    const { data } = await supabase.auth.mfa.listFactors()
    const verificados = (data?.totp ?? []).filter(f => f.status === 'verified')
    return verificados.length === 0
  } catch { return false }
}

export default function ExigirDoisFatores({ admin }: { admin: boolean }) {
  const [sem2fa, setSem2fa] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    if (!admin) return
    adminSemDoisFatores().then(setSem2fa)
  }, [admin, pathname])
  if (!admin || !sem2fa) return null
  const agora = new Date()
  const dias = Math.max(0, Math.ceil((PRAZO_2FA.getTime() - agora.getTime()) / 86400000))
  const venceu = agora > PRAZO_2FA
  if (venceu && pathname !== '/settings') {
    return (
      <div role="alertdialog" aria-labelledby="t2fa" data-testid="bloqueio-2fa" className="fixed inset-0 z-50 flex items-center justify-center bg-azul-marinho/80 p-4">
        <div className="max-w-md w-full bg-white dark:bg-grafite rounded-2xl p-8 shadow-xl text-center">
          <ShieldAlert className="mx-auto mb-4 text-dourado-escuro" size={40} aria-hidden="true" />
          <h2 id="t2fa" className="font-serif text-2xl font-semibold mb-2">Verificação em dois fatores obrigatória</h2>
          <p className="text-grafite-claro mb-6">Desde 7 de novembro de 2026, administradores só usam a plataforma com o código do celular ativado. Leva dois minutos.</p>
          <Link to="/settings" className="inline-block px-5 py-3 rounded-lg bg-azul-marinho text-white font-medium">Ativar agora em Configurações</Link>
        </div>
      </div>
    )
  }
  if (venceu) return null
  return (
    <div role="status" data-testid="aviso-2fa" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dourado-escuro/40 bg-dourado/10 px-4 py-3 text-sm">
      <ShieldAlert className="text-dourado-escuro" size={18} aria-hidden="true" />
      <span>Administradores precisam ativar a verificação em dois fatores até 6 de novembro ({dias} {dias === 1 ? 'dia' : 'dias'}).</span>
      <Link to="/settings" className="inline-flex items-center min-h-[44px] px-2 font-medium underline text-azul-marinho dark:text-dourado">Ativar agora</Link>
    </div>
  )
}
