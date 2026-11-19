// R8: saber se estamos dentro do aplicativo Android (Capacitor) ou no navegador.
// O MESMO código serve os dois. A única diferença é a porta de entrada: no aplicativo
// "THEYE Geo", o titular abre direto na casa do geomapeamento, sem passar pelo site.

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }
  }
}

/** true só dentro do app empacotado (Android/iOS), nunca no navegador. */
export function dentroDoApp(): boolean {
  try {
    const c = window.Capacitor
    if (!c) return false
    return typeof c.isNativePlatform === 'function' ? c.isNativePlatform() : true
  } catch {
    return false
  }
}

/**
 * No app, a tela inicial é a casa /geo. Só age quando não há rota nenhuma na barra:
 * se o titular já está em outra tela (ou voltou de um link), a escolha dele manda.
 * Roda antes do React montar, então não existe piscar de tela.
 */
export function portaDoApp(): void {
  if (!dentroDoApp()) return
  const h = window.location.hash
  if (h === '' || h === '#' || h === '#/' || h === '#/inicio') window.location.hash = '#/geo'
}
