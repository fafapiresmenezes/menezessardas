// Formato de texto simples para descrever um modelo de pórtico/treliça na tela (uma linha por item).
//   NO    id  x  y
//   BARRA id  i  j  E  A  [I]  [w=valor]  [trelica]
//   APOIO no  ux uy rz        (escreva só os movimentos travados)
//   CARGA no  fx fy [mz]
import { ErroFEM, type ModeloFEM } from './fem2d'

const num = (s: string, linha: number) => {
  const v = Number(s.replace(',', '.'))
  if (!Number.isFinite(v)) throw new ErroFEM(`Linha ${linha}: "${s}" não é número.`)
  return v
}

export function lerModeloTexto(texto: string): ModeloFEM {
  const m: ModeloFEM = { nos: [], elementos: [], apoios: [], cargas: [] }
  texto.split(/\r?\n/).forEach((bruta, k) => {
    const l = bruta.replace(/\/\/.*$/, '').trim()
    if (!l) return
    const [cmd, ...p] = l.split(/\s+/)
    const n = k + 1
    switch (cmd.toUpperCase()) {
      case 'NO': case 'NÓ':
        if (p.length < 3) throw new ErroFEM(`Linha ${n}: NO id x y.`)
        m.nos.push({ id: p[0], x: num(p[1], n), y: num(p[2], n) }); break
      case 'BARRA': {
        if (p.length < 5) throw new ErroFEM(`Linha ${n}: BARRA id i j E A [I] [w=…] [trelica].`)
        const trelica = p.some(x => /^treli[cç]a$/i.test(x))
        const w = p.find(x => /^w=/i.test(x))
        const resto = p.slice(5).filter(x => !/^w=/i.test(x) && !/^treli[cç]a$/i.test(x))
        m.elementos.push({ id: p[0], i: p[1], j: p[2], E: num(p[3], n), A: num(p[4], n), I: resto[0] ? num(resto[0], n) : undefined,
          w: w ? num(w.slice(2), n) : undefined, tipo: trelica ? 'trelica' : 'portico' })
        break
      }
      case 'APOIO': {
        if (p.length < 2) throw new ErroFEM(`Linha ${n}: APOIO no ux uy rz.`)
        const f = new Set(p.slice(1).map(x => x.toLowerCase()))
        m.apoios.push({ no: p[0], ux: f.has('ux'), uy: f.has('uy'), rz: f.has('rz') }); break
      }
      case 'CARGA':
        if (p.length < 3) throw new ErroFEM(`Linha ${n}: CARGA no fx fy [mz].`)
        m.cargas.push({ no: p[0], fx: num(p[1], n), fy: num(p[2], n), mz: p[3] ? num(p[3], n) : 0 }); break
      default: throw new ErroFEM(`Linha ${n}: comando "${cmd}" desconhecido (use NO, BARRA, APOIO ou CARGA).`)
    }
  })
  return m
}

export const MODELOS_EXEMPLO: { id: string; nome: string; texto: string }[] = [
  { id: 'biapoiada', nome: 'Viga biapoiada 6 m, 10 kN/m', texto: `// unidades: kN e m; aço E = 200e6 kN/m²; perfil com A = 0,01 m² e I = 1e-4 m⁴
NO A 0 0
NO M 3 0
NO B 6 0
BARRA V1 A M 200e6 0.01 1e-4 w=-10
BARRA V2 M B 200e6 0.01 1e-4 w=-10
APOIO A ux uy
APOIO B uy` },
  { id: 'portico', nome: 'Pórtico engastado com vento', texto: `// pilares 3 m, viga 6 m; carga na viga e força de vento no topo
NO A 0 0
NO B 0 3
NO C 6 3
NO D 6 0
BARRA P1 A B 26e6 0.09 6.75e-4
BARRA V1 B C 26e6 0.10 2.08e-3 w=-20
BARRA P2 D C 26e6 0.09 6.75e-4
APOIO A ux uy rz
APOIO D ux uy rz
CARGA B 8 0` },
  { id: 'continua', nome: 'Viga contínua de dois vãos', texto: `NO A 0 0
NO B 5 0
NO C 10 0
BARRA V1 A B 26e6 0.12 2.5e-3 w=-15
BARRA V2 B C 26e6 0.12 2.5e-3 w=-15
APOIO A ux uy
APOIO B uy
APOIO C uy` },
]
