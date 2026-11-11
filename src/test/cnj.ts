/** Gera um número CNJ válido (dígito pelo módulo 97), para testes. */
export function cnj(seq: number, ano = 2023, j = '8', tr = '19', o = '0001') {
  const n = String(seq).padStart(7, '0')
  const dv = String(98 - Number(BigInt(`${n}${ano}${j}${tr}${o}00`) % 97n)).padStart(2, '0')
  return `${n}-${dv}.${ano}.${j}.${tr}.${o}`
}
