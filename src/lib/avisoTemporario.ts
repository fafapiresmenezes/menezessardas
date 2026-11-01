// Aviso temporário: liga um sinal (por exemplo, "Baixado") e desliga sozinho depois de alguns segundos.
// Uma única chamada de limpar() cancela o temporizador, para não atualizar uma tela que já foi fechada. Passo 381.
export function avisoTemporario(definir: (ligado: boolean) => void, ms = 3000) {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  return {
    marcar() {
      definir(true)
      if (temporizador) clearTimeout(temporizador)
      temporizador = setTimeout(() => { definir(false); temporizador = undefined }, ms)
    },
    limpar() {
      if (temporizador) clearTimeout(temporizador)
      temporizador = undefined
    },
  }
}
