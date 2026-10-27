export type Tema = 'claro' | 'escuro'

export function temaAtual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro'
}

export function aplicarTema(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'escuro')
  try { localStorage.setItem('lsm-tema', t) } catch { /* navegação privada */ }
}
