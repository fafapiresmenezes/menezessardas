// Passo 418: monitor de legislação — catálogo íntegro e alcance de cada norma sobre a carteira.
import { describe, it, expect } from 'vitest'
import { CATALOGO, NOVIDADE_EXEMPLO, imoveisAfetados, ROTULO_STATUS } from './legislacao'
import type { Imovel } from './repositorio'

const imovel = (id: string, tipo: Imovel['tipo'], uso: Imovel['uso']): Imovel => ({
  id, endereco: `Rua ${id}`, cidade: 'Rio de Janeiro', uf: 'RJ', tipo, uso, proprietario: 'P', matricula: '1', notas: '', documentos: [],
})
const carteira = [
  imovel('apLocado', 'apartamento', 'locado'),
  imovel('lojaVaga', 'loja', 'vago'),
  imovel('casaPropria', 'casa', 'uso_proprio'),
  imovel('terrenoObra', 'terreno', 'em_construcao'),
]
const norma = (id: string) => CATALOGO.find(n => n.id === id)!

describe('catálogo', () => {
  it('tem ids únicos, link https, ação e texto de alcance em toda norma', () => {
    expect(new Set(CATALOGO.map(n => n.id)).size).toBe(CATALOGO.length)
    for (const n of CATALOGO) {
      expect(n.catalogo).toBe(true)
      expect(n.link).toMatch(/^https:\/\//)
      expect(n.acao.length).toBeGreaterThan(10)
      expect(n.alcanceTexto.length).toBeGreaterThan(3)
    }
    expect(Object.keys(ROTULO_STATUS)).toEqual(['nova', 'em_analise', 'concluida', 'nao_se_aplica'])
  })
  it('a novidade de exemplo é marcada como exemplo e não é do catálogo', () => {
    expect(NOVIDADE_EXEMPLO.exemplo).toBe(true)
    expect(NOVIDADE_EXEMPLO.catalogo).toBe(false)
  })
})

describe('imoveisAfetados', () => {
  it('norma sem regra de alcance atinge toda a carteira', () => {
    expect(imoveisAfetados(norma('cc-10406-2002'), carteira).map(i => i.id)).toEqual(carteira.map(i => i.id))
  })
  it('Lei do Inquilinato alcança locados e vagos, não uso próprio nem obra', () => {
    expect(imoveisAfetados(norma('lei-8245-1991'), carteira).map(i => i.id)).toEqual(['apLocado', 'lojaVaga'])
  })
  it('Lei de condomínio e incorporação alcança unidades condominiais e obras', () => {
    expect(imoveisAfetados(norma('lei-4591-1964'), carteira).map(i => i.id)).toEqual(['apLocado', 'lojaVaga', 'terrenoObra'])
  })
  it('a novidade de exemplo (comercial) alcança só a loja', () => {
    expect(imoveisAfetados(NOVIDADE_EXEMPLO, carteira).map(i => i.id)).toEqual(['lojaVaga'])
  })
})
