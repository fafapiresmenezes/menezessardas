// Escolha de idioma do visitante. Guarda em localStorage para valer na próxima visita.
// Pedido de M (13/11/2026): a entrada do instituto fala português, inglês, chinês e espanhol.
// Os textos traduzidos ficam em src/lib/i18n.ts; aqui só mora a escolha e a lista de idiomas.
export type Idioma = 'pt' | 'en' | 'zh' | 'es'

const CHAVE = 'theye-idioma'

// Cada idioma aparece escrito na própria língua; o nome traduzido vem do dicionário (i18n).
export const IDIOMAS: { codigo: Idioma; nativo: string }[] = [
  { codigo: 'pt', nativo: 'Português' },
  { codigo: 'en', nativo: 'English' },
  { codigo: 'zh', nativo: '中文' },
  { codigo: 'es', nativo: 'Español' },
]

export function idiomaEscolhido(): Idioma | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'pt' || v === 'en' || v === 'zh' || v === 'es' ? v : null
  } catch {
    return null
  }
}

export function definirIdioma(codigo: Idioma): void {
  try { localStorage.setItem(CHAVE, codigo) } catch { /* sem localStorage, segue a sessão */ }
}
