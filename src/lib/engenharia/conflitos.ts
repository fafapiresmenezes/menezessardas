// Detector de conflitos entre disciplinas (estrutura × hidráulica × elétrica × climatização), por caixas envolventes (AABB).
// Ferramenta P1 do Plano Master de Engenharia ("Detector de conflitos 3D"), versão 1.
// Conflito duro: as caixas se cruzam. Conflito de folga: não se cruzam, mas ficam mais perto do que a folga mínima pedida.
// Limite: a caixa envolvente é maior que a peça real (tubo inclinado, peça curva); o conflito apontado é candidato a conferir.

export interface Caixa { id: string; disciplina: string; nome: string; min: [number, number, number]; max: [number, number, number] }
export interface Conflito {
  a: string; b: string; disciplinas: string; tipo: 'duro' | 'folga'
  /** volume de interpenetração (m³), só para conflito duro */
  volume: number
  /** penetração mínima entre os eixos (m) se duro; distância livre (m) se folga */
  medida: number
  centro: [number, number, number]
  texto: string
}

export class ErroCaixas extends Error {}

/** lê caixas de texto: id;disciplina;nome;xmin;ymin;zmin;xmax;ymax;zmax (vírgula decimal aceita) */
export function lerCaixas(texto: string): Caixa[] {
  const caixas: Caixa[] = []
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  for (const [k, l] of linhas.entries()) {
    const c = l.split(';').map(x => x.trim())
    if (k === 0 && /xmin/i.test(l)) continue
    if (c.length < 9) throw new ErroCaixas(`Linha ${k + 1}: são 9 campos separados por ponto e vírgula (id;disciplina;nome;xmin;ymin;zmin;xmax;ymax;zmax).`)
    const n = c.slice(3, 9).map(x => Number(x.replace(',', '.')))
    if (n.some(v => !Number.isFinite(v))) throw new ErroCaixas(`Linha ${k + 1}: coordenada que não é número.`)
    const min: [number, number, number] = [Math.min(n[0], n[3]), Math.min(n[1], n[4]), Math.min(n[2], n[5])]
    const max: [number, number, number] = [Math.max(n[0], n[3]), Math.max(n[1], n[4]), Math.max(n[2], n[5])]
    caixas.push({ id: c[0], disciplina: c[1], nome: c[2], min, max })
  }
  const ids = new Set<string>()
  for (const c of caixas) { if (ids.has(c.id)) throw new ErroCaixas(`Identificador repetido: ${c.id}.`); ids.add(c.id) }
  return caixas
}

export function detectarConflitos(caixas: Caixa[], opcoes: { folga?: number; mesmaDisciplina?: boolean } = {}): Conflito[] {
  const folga = Math.max(0, opcoes.folga ?? 0)
  const out: Conflito[] = []
  // varredura no eixo x (ordena por xmin) para não comparar tudo com tudo
  const ord = [...caixas].sort((p, q) => p.min[0] - q.min[0])
  for (let i = 0; i < ord.length; i++) {
    const a = ord[i]
    for (let j = i + 1; j < ord.length; j++) {
      const b = ord[j]
      if (b.min[0] > a.max[0] + folga) break
      if (!opcoes.mesmaDisciplina && a.disciplina === b.disciplina) continue
      const sobre = [0, 1, 2].map(e => Math.min(a.max[e], b.max[e]) - Math.max(a.min[e], b.min[e]))
      const centro = [0, 1, 2].map(e => (Math.max(a.min[e], b.min[e]) + Math.min(a.max[e], b.max[e])) / 2) as [number, number, number]
      const par = `${a.disciplina} × ${b.disciplina}`
      if (sobre.every(s => s > 0)) {
        const volume = sobre[0] * sobre[1] * sobre[2]
        const medida = Math.min(...sobre)
        out.push({ a: a.id, b: b.id, disciplinas: par, tipo: 'duro', volume, medida, centro,
          texto: `${a.nome} cruza ${b.nome}: penetração de ${(medida * 100).toFixed(1)} cm perto de (${centro.map(v => v.toFixed(2)).join('; ')}) m.` })
        continue
      }
      if (folga > 0) {
        const gap = Math.hypot(...sobre.map(s => (s < 0 ? -s : 0)))
        if (gap < folga) out.push({ a: a.id, b: b.id, disciplinas: par, tipo: 'folga', volume: 0, medida: gap, centro,
          texto: `${a.nome} fica a ${(gap * 100).toFixed(1)} cm de ${b.nome}; a folga pedida é ${(folga * 100).toFixed(0)} cm.` })
      }
    }
  }
  return out.sort((p, q) => (p.tipo === q.tipo ? q.volume - p.volume || p.medida - q.medida : p.tipo === 'duro' ? -1 : 1))
}

export function resumoConflitos(cs: Conflito[]) {
  const porPar = new Map<string, { duros: number; folgas: number }>()
  for (const c of cs) {
    const v = porPar.get(c.disciplinas) ?? { duros: 0, folgas: 0 }
    if (c.tipo === 'duro') v.duros++; else v.folgas++
    porPar.set(c.disciplinas, v)
  }
  return [...porPar].map(([par, v]) => ({ par, ...v }))
}

/** exemplo: pavimento com viga, pilar, laje e redes que cruzam (dados de demonstração) */
export const CAIXAS_EXEMPLO = `id;disciplina;nome;xmin;ymin;zmin;xmax;ymax;zmax
V1;Estrutura;Viga V1 20x50;0;-0,10;2,50;6;0,10;3,00
P1;Estrutura;Pilar P1 30x30;-0,15;-0,15;0;0,15;0,15;3,00
L1;Estrutura;Laje L1;0;-3;3,00;6;3;3,12
T1;Hidráulica;Tubo PVC DN100;2,90;-2;2,70;3,00;2;2,80
T2;Hidráulica;Tubo água fria DN25;4,00;-2;2,30;4,03;2;2,33
E1;Elétrica;Eletrocalha 200x50;0,50;0,12;2,40;5,50;0,32;2,45
D1;Climatização;Duto 400x250;1;-1,50;2,45;5;-1,10;2,70`
