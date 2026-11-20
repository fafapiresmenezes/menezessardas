// Escolha de idioma do visitante. Guarda em localStorage para valer na próxima visita.
// Pedido de M (13/11/2026): a entrada do instituto fala várias línguas. Em 20/11/2026 M tirou o
// chinês e pôs o alemão: português, inglês, espanhol e alemão.
// Os textos traduzidos ficam em src/lib/i18n.ts; aqui só mora a escolha e a lista de idiomas.
export type Idioma = 'pt' | 'en' | 'es' | 'de'

const CHAVE = 'theye-idioma'

// Cada idioma aparece escrito na própria língua; o nome traduzido vem do dicionário (i18n).
export const IDIOMAS: { codigo: Idioma; nativo: string }[] = [
  { codigo: 'pt', nativo: 'Português' },
  { codigo: 'en', nativo: 'English' },
  { codigo: 'es', nativo: 'Español' },
  { codigo: 'de', nativo: 'Deutsch' },
]

export function idiomaEscolhido(): Idioma | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'pt' || v === 'en' || v === 'es' || v === 'de' ? v : null
  } catch {
    return null
  }
}

export function definirIdioma(codigo: Idioma): void {
  try { localStorage.setItem(CHAVE, codigo) } catch { /* sem localStorage, segue a sessão */ }
}
