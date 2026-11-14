import { describe, it, expect } from 'vitest'
import { chaveDaArea, nomeDaArea, agruparPorArea, contarPorArea, SEM_AREA } from './areaDoDireito'

describe('Tipo de direito (matéria) das listas', () => {
  it('a chave e o rótulo caem na mesma área, com ou sem acento', () => {
    expect(chaveDaArea('trabalhista')).toBe('trabalhista')
    expect(chaveDaArea('Trabalhista')).toBe('trabalhista')
    expect(chaveDaArea('TRABALHISTA')).toBe('trabalhista')
    expect(chaveDaArea('Família e sucessões')).toBe('familia')
    expect(chaveDaArea('familia')).toBe('familia')
    expect(chaveDaArea('Imobiliário')).toBe('imobiliario')
    expect(chaveDaArea('Cível')).toBe('civel')
    expect(chaveDaArea(null)).toBe(SEM_AREA)
    expect(chaveDaArea('  ')).toBe(SEM_AREA)
  })

  it('área desconhecida continua aparecendo com o nome que o escritório escreveu', () => {
    expect(chaveDaArea('Marítimo portuário do cliente X')).toBe('Marítimo portuário do cliente X')
    expect(nomeDaArea('Marítimo portuário do cliente X')).toBe('Marítimo portuário do cliente X')
    expect(nomeDaArea(null)).toBe('Geral (sem área marcada)')
    expect(nomeDaArea('trabalhista')).toBe('Trabalhista')
  })

  it('agrupa cada prazo sob a sua área, em ordem de prazo dentro do bloco e entre blocos', () => {
    const grupos = agruparPorArea([
      { id: 1, area: 'trabalhista', prazo: '2026-11-20' },
      { id: 2, area: 'Trabalhista', prazo: '2026-11-18' },
      { id: 3, area: 'civel', prazo: '2026-11-15' },
      { id: 4, area: null, prazo: '2026-12-01' },
    ])
    expect(grupos.map(g => [g.nome, g.itens.length])).toEqual([['Cível e contratos', 1], ['Trabalhista', 2], ['Geral (sem área marcada)', 1]])
    expect(grupos[1].itens.map(i => i.id)).toEqual([1, 2]) // mantém a ordem recebida (a consulta já vem por prazo)
  })

  it('item sem prazo não empurra o bloco para a frente da fila', () => {
    const grupos = agruparPorArea([{ area: 'penal', prazo: null }, { area: 'civel', prazo: '2026-11-15' }])
    expect(grupos[0].nome).toBe('Cível e contratos')
  })

  it('conta por área para a linha "Trabalhista: 3"', () => {
    const contas = contarPorArea([{ area: 'trabalhista' }, { area: 'Trabalhista' }, { area: 'trabalhista' }, { area: 'civel' }])
    expect(contas[0]).toEqual({ area: 'trabalhista', nome: 'Trabalhista', total: 3 })
    expect(contas[1].total).toBe(1)
  })
})
