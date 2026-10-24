const CHAVE = 'demo-sessao'

export const CREDENCIAIS_DEMO = {
  email: 'admin@exemplo.com',
  senha: 'senha123',
}

export function sessaoDemoAtiva() {
  return localStorage.getItem(CHAVE) === '1'
}

export function entrarDemo(email: string, senha: string) {
  if (email.trim().toLowerCase() !== CREDENCIAIS_DEMO.email || senha !== CREDENCIAIS_DEMO.senha) {
    return false
  }
  localStorage.setItem(CHAVE, '1')
  return true
}

export function sairDemo() {
  localStorage.removeItem(CHAVE)
}
