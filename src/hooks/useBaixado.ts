import { useEffect, useMemo, useState } from 'react'
import { avisoTemporario } from '@/lib/avisoTemporario'

// Gancho único dos botões de download: devolve [baixado, marcarBaixado].
// O rótulo "Baixado" volta ao normal em 3 s e o temporizador é cancelado ao sair da tela. Passo 381.
export function useBaixado(ms = 3000): [boolean, () => void] {
  const [baixado, setBaixado] = useState(false)
  const aviso = useMemo(() => avisoTemporario(setBaixado, ms), [ms])
  useEffect(() => () => aviso.limpar(), [aviso])
  return [baixado, aviso.marcar]
}
