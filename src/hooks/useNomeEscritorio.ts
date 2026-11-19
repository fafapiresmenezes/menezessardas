import { useEffect, useState } from 'react'
import { nomeDoEscritorio } from '@/lib/equipe'

/** Nome neutro usado enquanto o escritório não foi identificado (nunca o nome do Instituto, dono da plataforma). */
export const ESCRITORIO_PADRAO = 'Escritório'

/** Nome do escritório da pessoa, para cabeçalhos de documentos, cartas e textos copiados. Enquanto carrega, 'Escritório'. */
export function useNomeEscritorio(): string {
  const [nome, setNome] = useState('')
  useEffect(() => {
    let vivo = true
    ;(async () => { try { const n = await nomeDoEscritorio(); if (vivo && n) setNome(n) } catch { /* sem escritório identificado */ } })()
    return () => { vivo = false }
  }, [])
  return nome || ESCRITORIO_PADRAO
}
