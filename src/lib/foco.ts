// Passo A27: toda tela vazia diz o que fazer primeiro e traz um botão que faz.
// Quando o próximo passo é preencher um campo desta mesma tela, o botão leva o cursor até ele.
export function irParaCampo(seletor: string) {
  if (typeof document === 'undefined') return
  const campo = document.querySelector(seletor) as HTMLElement | null
  if (!campo) return
  campo.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  campo.focus?.()
}
