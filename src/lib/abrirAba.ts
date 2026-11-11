// Abre um endereço que só fica pronto depois de um await (ex.: link assinado do Storage).
// Safari e celulares bloqueiam window.open chamado depois de um await; por isso a aba é aberta já no clique
// e só recebe o endereço quando ele chega. Se a aba for bloqueada mesmo assim, abre na mesma aba.
export async function abrirEmNovaAba(obterUrl: () => Promise<string | null | undefined>): Promise<void> {
  const aba = window.open('', '_blank')
  try {
    const url = await obterUrl()
    if (!url) { aba?.close(); throw new Error('O arquivo não está disponível agora.') }
    if (aba) { try { aba.opener = null } catch { /* sem acesso */ } aba.location.href = url } else window.location.assign(url)
  } catch (e) {
    aba?.close()
    throw e
  }
}

/** Escapa texto que vai para dentro de um HTML montado à mão (cartas e recibos para imprimir). */
export function escaparHtml(t: unknown): string {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
