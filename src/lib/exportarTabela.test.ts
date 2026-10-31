import { describe, it, expect } from 'vitest'
import { paraCsv, nomeArquivo } from './exportarTabela'

describe('exportar tabela', () => {
  it('gera CSV com BOM, ponto e vírgula e aspas quando precisa', () => {
    const csv = paraCsv({ titulo: 't', cabecalho: ['Imóvel', 'Valor'], linhas: [['Rua A; 10', 'R$ 1.000,00'], ['Rua "B"', '']] })
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Imóvel;Valor')
    expect(csv).toContain('"Rua A; 10";R$ 1.000,00')
    expect(csv).toContain('"Rua ""B""";')
  })
  it('monta nome de arquivo sem acento', () => {
    expect(nomeArquivo('Honorários', 'Por caso', 'csv')).toMatch(/^honorarios-por-caso-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
