// Escolha de idioma do visitante. Guarda em localStorage para não repetir na próxima visita.
// Pedido de M (13/11/2026): tela anterior ao login com português, inglês, chinês e espanhol.
export type Idioma = 'pt' | 'en' | 'zh' | 'es'

const CHAVE = 'theye-idioma'

export const IDIOMAS: { codigo: Idioma; nome: string; nativo: string }[] = [
  { codigo: 'pt', nome: 'Português', nativo: 'Português' },
  { codigo: 'en', nome: 'English', nativo: 'English' },
  { codigo: 'zh', nome: 'Chinese', nativo: '中文' },
  { codigo: 'es', nome: 'Spanish', nativo: 'Español' },
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
