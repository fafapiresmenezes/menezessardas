import { supabase } from '@/lib/supabase'

/**
 * Criar conta e trocar a senha pelo envio de e-mail da própria casa (função `acesso-email`).
 * O envio embutido do Supabase só manda poucos e-mails por hora; por isso ele fica só de reserva:
 * quando a função não responde, `indisponivel` vem verdadeiro e a tela usa o caminho antigo.
 */
export type RespostaAcesso = { ok: boolean; erro?: string; indisponivel?: boolean }

export async function acessoEmail(corpo: Record<string, unknown>): Promise<RespostaAcesso> {
  try {
    const { data, error } = await supabase.functions.invoke('acesso-email', { body: corpo })
    if (!error) return { ok: !!(data as { ok?: boolean } | null)?.ok, erro: (data as { erro?: string } | null)?.erro }
    const resp = (error as { context?: Response }).context
    if (resp && typeof resp.json === 'function' && resp.status >= 400 && resp.status < 500 && resp.status !== 404 && resp.status !== 401) {
      const j = await resp.json().catch(() => ({})) as { erro?: string }
      if (j.erro) return { ok: false, erro: j.erro }
    }
    return { ok: false, indisponivel: true }
  } catch {
    return { ok: false, indisponivel: true }
  }
}

/** Código de uso único que vem no link do e-mail (`&th=`). */
export function codigoDoLink(busca: string = window.location.search): string {
  return new URLSearchParams(busca).get('th') ?? ''
}
