import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MATERIAS_ENGENHARIA, ESPECIALIDADES_SAUDE } from './prova'

// A faixa de prova da porta só vale se o número for o do arquivo. Se o catálogo crescer e ninguém
// atualizar a porta, este teste avisa.
const ler = (arq: string) => JSON.parse(readFileSync(join(process.cwd(), arq), 'utf-8'))

describe('os números da porta são os dos arquivos', () => {
  it('matérias de engenharia', () => {
    const cat = ler('engenharia/catalogo-materias.json')
    expect(cat.materias.length).toBe(MATERIAS_ENGENHARIA)
    expect(cat.total).toBe(MATERIAS_ENGENHARIA)
  })
  it('especialidades médicas', () => {
    expect(ler('saude/catalogo-saude.json').especialidades.length).toBe(ESPECIALIDADES_SAUDE)
  })
})
