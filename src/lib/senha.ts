/**
 * A regra de senha que o servidor de contas exige: 12 caracteres ou mais, com letra
 * minúscula, letra maiúscula e número. A tela confere antes de enviar, para a pessoa
 * saber na hora o que falta, em vez de receber uma recusa do servidor.
 */
export const REGRA_DA_SENHA = 'Pelo menos 12 caracteres, com letra maiúscula, letra minúscula e número.'
export const SENHA_MINIMO = 12

/** Devolve o que falta na senha, em palavras simples, ou null quando ela serve. */
export function problemaDaSenha(senha: string): string | null {
  const falta: string[] = []
  if (senha.length < SENHA_MINIMO) falta.push(`ter pelo menos ${SENHA_MINIMO} caracteres (tem ${senha.length})`)
  if (!/[a-z]/.test(senha)) falta.push('ter uma letra minúscula')
  if (!/[A-Z]/.test(senha)) falta.push('ter uma letra maiúscula')
  if (!/[0-9]/.test(senha)) falta.push('ter um número')
  if (!falta.length) return null
  return `A senha precisa ${falta.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`
}
