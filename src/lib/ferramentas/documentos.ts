// Theye Suporte Jurídico — validação de CPF, CNPJ (inclusive o alfanumérico da IN RFB 2.229/2024) e número CNJ de processo.

export function validarCpf(entrada: string): { valido: boolean; formatado: string; motivo?: string } {
  const d = entrada.replace(/\D/g, '')
  if (d.length !== 11) return { valido: false, formatado: entrada, motivo: 'O CPF tem 11 dígitos.' }
  if (/^(\d)\1{10}$/.test(d)) return { valido: false, formatado: entrada, motivo: 'Sequência repetida não é CPF válido.' }
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  const formatado = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (dv(9) !== Number(d[9]) || dv(10) !== Number(d[10])) return { valido: false, formatado, motivo: 'Dígitos verificadores não conferem.' }
  return { valido: true, formatado }
}

const valorCnpj = (c: string) => c.charCodeAt(0) - 48
function dvCnpj(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const s = [...base].reduce((acc, c, i) => acc + valorCnpj(c) * pesos[i], 0)
  const r = s % 11
  return r < 2 ? 0 : 11 - r
}
/** CNPJ numérico ou alfanumérico (12 posições letras/números + 2 dígitos verificadores). */
export function validarCnpj(entrada: string): { valido: boolean; formatado: string; alfanumerico: boolean; motivo?: string } {
  const c = entrada.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const alfanumerico = /[A-Z]/.test(c)
  if (c.length !== 14) return { valido: false, formatado: entrada, alfanumerico, motivo: 'O CNPJ tem 14 posições.' }
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c)) return { valido: false, formatado: entrada, alfanumerico, motivo: 'Os dois últimos caracteres (dígitos verificadores) são sempre números.' }
  if (/^(\d)\1{13}$/.test(c)) return { valido: false, formatado: entrada, alfanumerico, motivo: 'Sequência repetida não é CNPJ válido.' }
  const formatado = `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
  const d1 = dvCnpj(c.slice(0, 12)), d2 = dvCnpj(c.slice(0, 12) + d1)
  if (d1 !== Number(c[12]) || d2 !== Number(c[13])) return { valido: false, formatado, alfanumerico, motivo: 'Dígitos verificadores não conferem.' }
  return { valido: true, formatado, alfanumerico }
}

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO']
const SEGMENTOS: Record<string, string> = { '1': 'Supremo Tribunal Federal', '2': 'Conselho Nacional de Justiça', '3': 'Superior Tribunal de Justiça', '4': 'Justiça Federal', '5': 'Justiça do Trabalho', '6': 'Justiça Eleitoral', '7': 'Justiça Militar da União', '8': 'Justiça dos Estados e do DF', '9': 'Justiça Militar Estadual' }

function orgao(j: string, tr: string): string {
  const n = Number(tr)
  if (j === '8') return n >= 1 && n <= 27 ? `TJ${UFS[n - 1] === 'DF' ? 'DFT' : UFS[n - 1]}` : 'tribunal desconhecido'
  if (j === '6') return n >= 1 && n <= 27 ? `TRE-${UFS[n - 1]}` : 'tribunal desconhecido'
  if (j === '4') return n >= 1 && n <= 6 ? `TRF da ${n}ª Região` : n === 90 ? 'Conselho da Justiça Federal' : 'tribunal desconhecido'
  if (j === '5') return n >= 1 && n <= 24 ? `TRT da ${n}ª Região` : n === 90 ? 'Conselho Superior da Justiça do Trabalho' : 'tribunal desconhecido'
  if (j === '9') return ({ 13: 'TJM-MG', 21: 'TJM-RS', 26: 'TJM-SP' } as Record<number, string>)[n] ?? 'Justiça Militar Estadual'
  return SEGMENTOS[j] ?? 'segmento desconhecido'
}

/** Número único CNJ (Resolução CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO, dígito pelo módulo 97 (ISO 7064). */
export function validarCnj(entrada: string) {
  const d = entrada.replace(/\D/g, '')
  if (d.length !== 20) return { valido: false, motivo: 'O número CNJ tem 20 dígitos (NNNNNNN-DD.AAAA.J.TR.OOOO).' } as const
  const n = d.slice(0, 7), dv = d.slice(7, 9), ano = d.slice(9, 13), j = d.slice(13, 14), tr = d.slice(14, 16), o = d.slice(16, 20)
  const calc = 98 - Number(BigInt(n + ano + j + tr + o + '00') % 97n)
  const formatado = `${n}-${dv}.${ano}.${j}.${tr}.${o}`
  const base = { formatado, sequencial: n, ano: Number(ano), segmento: SEGMENTOS[j] ?? 'desconhecido', tribunal: orgao(j, tr), origem: o === '0000' ? 'originário do tribunal' : `unidade de origem ${o}`, digitoCorreto: String(calc).padStart(2, '0') }
  if (Number(dv) !== calc) return { valido: false, motivo: `Dígito verificador não confere (o correto seria ${base.digitoCorreto}).`, ...base } as const
  return { valido: true, ...base } as const
}
