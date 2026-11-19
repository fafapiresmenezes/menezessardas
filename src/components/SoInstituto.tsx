import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ehInstituto } from '@/lib/equipe'

/**
 * Tranca de tela do Instituto THEYE (pedido de M, 18/11/2026: "o que é do Instituto não é para o
 * cliente; Sardas e Menezes não pode ver a parte do Instituto de jeito nenhum").
 *
 * O menu já escondia estas telas de quem não administra o Instituto (nivel 'instituto' em
 * menuTelas.ts), mas o endereço digitado à mão abria a tela assim mesmo. Agora quem não é do
 * Instituto volta para o Início, sem mensagem: a tela simplesmente não existe para essa pessoa.
 * O banco continua sendo quem protege os dados; aqui é a porta da tela.
 */
export default function SoInstituto({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<'conferindo' | 'sim' | 'nao'>('conferindo')
  useEffect(() => {
    let vivo = true
    ehInstituto().then(ok => { if (vivo) setEstado(ok ? 'sim' : 'nao') }).catch(() => { if (vivo) setEstado('nao') })
    return () => { vivo = false }
  }, [])
  if (estado === 'conferindo') return <p className="p-6 text-sm text-grafite-claro">A conferir o acesso…</p>
  if (estado === 'nao') {
    return (
      <>
        <p className="p-6 text-sm text-grafite-claro">Esta parte é só dos membros do Instituto. A voltar ao início…</p>
        <Navigate to="/inicio" replace />
      </>
    )
  }
  return <>{children}</>
}
