import { isoLocal } from '@/lib/datas'

export type Janela = { inicio: string; fim: string }

/** Blocos de 30 dias, colados um no outro, do mais recente para o mais antigo: cobrem `meses` meses sem falha nem repetição. */
export function janelas(meses: number, hoje: Date = new Date()): Janela[] {
  const total = Math.max(1, Math.min(60, Math.round(meses)))
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)
  const dia = (n: number) => isoLocal(new Date(base.getTime() - n * 86400000))
  return Array.from({ length: total }, (_, k) => ({ fim: dia(30 * k), inicio: dia(30 * k + 29) }))
}

/** "123456/rj, 98.765 / SP" -> ["123456/RJ", "98765/SP"]; devolve também o que não deu para entender. */
export function lerOabs(texto: string): { oabs: string[]; invalidas: string[] } {
  const oabs: string[] = []; const invalidas: string[] = []
  for (const parte of texto.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)) {
    const m = parte.replace(/[.\s]/g, '').match(/^(\d{1,7})\/([A-Za-z]{2})$/)
    if (!m) { invalidas.push(parte); continue }
    const o = `${Number(m[1])}/${m[2].toUpperCase()}`
    if (!oabs.includes(o)) oabs.push(o)
  }
  return { oabs, invalidas }
}
