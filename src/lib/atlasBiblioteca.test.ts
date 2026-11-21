// Testa a leitura e os filtros da biblioteca do Atlas contra o ficheiro DE VERDADE
// que vai publicado em public/atlas-biblioteca-v1.jsonl.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { contarBiblioteca, filtrarBiblioteca, lerBiblioteca } from './atlasBiblioteca'

const texto = readFileSync('public/atlas-biblioteca-v1.jsonl', 'utf8')
const pecas = lerBiblioteca(texto)

describe('biblioteca do Atlas', () => {
  it('lê o ficheiro publicado inteiro, sem linha estragada', () => {
    const linhas = texto.split('\n').filter(l => l.trim()).length
    expect(pecas).toHaveLength(linhas)
    expect(pecas.length).toBeGreaterThan(1000)
  })

  it('toda peça tem título, especialidade, licença e endereço', () => {
    for (const p of pecas) {
      expect(p.titulo.length).toBeGreaterThan(0)
      expect(p.especialidade.length).toBeGreaterThan(0)
      expect(p.especialidadeNome.length).toBeGreaterThan(0)
      expect(p.licenca.length).toBeGreaterThan(0)
      expect(p.url).toMatch(/^https?:\/\//)
      expect(p.nota).toBeGreaterThanOrEqual(0)
      expect(p.nota).toBeLessThanOrEqual(5)
    }
  })

  it('nunca escreve o nome do cliente', () => {
    expect(texto).not.toMatch(/imbono/i)
    expect(texto).not.toMatch(/gemcorp/i)
  })

  it('cobre as 14 especialidades e marca o que podemos guardar', () => {
    const c = contarBiblioteca(pecas)
    expect(c.especialidades).toBe(14)
    expect(c.guardaveis).toBeGreaterThan(0)
    expect(c.guardaveis).toBeLessThanOrEqual(c.total)
    expect(c.contextoLocal).toBeGreaterThan(0)
  })

  it('salta linha estragada em vez de derrubar a tela', () => {
    const lidas = lerBiblioteca('{"id":"a","t":"Um título","e":"geotecnia","en":"Geotecnia","u":"https://x/y"}\n{isto não é json}\n\n')
    expect(lidas).toHaveLength(1)
    expect(lidas[0].titulo).toBe('Um título')
    expect(lidas[0].guardavel).toBe(false)
  })

  it('filtra por busca, especialidade, licença e contexto local', () => {
    const umaEsp = pecas[0].especialidade
    expect(filtrarBiblioteca(pecas, { especialidade: umaEsp }).every(p => p.especialidade === umaEsp)).toBe(true)
    expect(filtrarBiblioteca(pecas, { soGuardaveis: true }).every(p => p.guardavel)).toBe(true)
    expect(filtrarBiblioteca(pecas, { soContextoLocal: true }).every(p => p.contextoLocal)).toBe(true)
    const termo = pecas[0].titulo.split(' ')[0].toLowerCase()
    const achadas = filtrarBiblioteca(pecas, { busca: termo })
    expect(achadas.length).toBeGreaterThan(0)
    expect(achadas.every(p => `${p.titulo} ${p.especialidadeNome} ${p.fonte} ${p.tipo}`.toLowerCase().includes(termo))).toBe(true)
  })

  it('ordena pela nota e depois pelo ano', () => {
    const ord = filtrarBiblioteca(pecas, {})
    for (let i = 1; i < ord.length; i++) {
      const a = ord[i - 1], b = ord[i]
      expect(a.nota >= b.nota).toBe(true)
      if (a.nota === b.nota) expect((a.ano ?? 0) >= (b.ano ?? 0)).toBe(true)
    }
  })
})
