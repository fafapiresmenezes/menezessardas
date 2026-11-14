// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IDIOMAS, idiomaEscolhido } from './idioma'
import { DICIONARIOS, idiomaAtual, trocarIdioma, reiniciarIdioma, textoEm, chaveIdioma, type Chave } from './i18n'

const CODIGOS = ['pt', 'en', 'zh', 'es'] as const

describe('camada de tradução da entrada', () => {
  beforeEach(() => { localStorage.clear(); reiniciarIdioma() })
  afterEach(() => { localStorage.clear(); reiniciarIdioma() })

  it('tem os quatro idiomas pedidos por M, na ordem da tela de escolha', () => {
    expect(IDIOMAS.map(i => i.codigo)).toEqual([...CODIGOS])
    expect(IDIOMAS.map(i => i.nativo)).toEqual(['Português', 'English', '中文', 'Español'])
    expect(Object.keys(DICIONARIOS).sort()).toEqual([...CODIGOS].sort())
  })

  it('toda chave existe nos quatro idiomas, sem texto vazio e sem sobra', () => {
    const chaves = Object.keys(DICIONARIOS.pt) as Chave[]
    expect(chaves.length).toBeGreaterThan(40)
    for (const codigo of CODIGOS) {
      const dic = DICIONARIOS[codigo]
      expect(Object.keys(dic).sort()).toEqual([...chaves].sort())
      for (const chave of chaves) {
        expect(typeof dic[chave], `${codigo}/${chave}`).toBe('string')
        expect(dic[chave].trim(), `${codigo}/${chave}`).not.toBe('')
      }
    }
  })

  it('os textos são de fato traduzidos: nenhum idioma repete o português inteiro', () => {
    const chaves = Object.keys(DICIONARIOS.pt) as Chave[]
    for (const codigo of CODIGOS.filter(c => c !== 'pt')) {
      const iguais = chaves.filter(c => DICIONARIOS[codigo][c] === DICIONARIOS.pt[c])
      // Algumas palavras coincidem de verdade entre línguas próximas ('Entrar' em
      // espanhol, 'Instituto THEYE'); o que não pode é a língua ser cópia do português.
      expect(iguais.length / chaves.length, `${codigo}: ${iguais.join(', ')}`).toBeLessThan(0.15)
    }
  })

  it('sem escolha, fala português; trocar guarda a escolha e muda o texto', () => {
    expect(idiomaAtual()).toBe('pt')
    expect(textoEm(idiomaAtual(), 'login.entrar')).toBe('Entrar')
    trocarIdioma('zh')
    expect(idiomaAtual()).toBe('zh')
    expect(idiomaEscolhido()).toBe('zh')
    expect(textoEm(idiomaAtual(), 'login.entrar')).toBe('登录')
    trocarIdioma('en')
    expect(textoEm(idiomaAtual(), 'login.esqueciSenha')).toBe('I forgot my password')
    trocarIdioma('es')
    expect(textoEm(idiomaAtual(), 'login.esqueciSenha')).toBe('Olvidé mi contraseña')
  })

  it('a escolha da visita anterior volta do localStorage', () => {
    localStorage.setItem('theye-idioma', 'es')
    reiniciarIdioma()
    expect(idiomaAtual()).toBe('es')
  })

  it('cada idioma sabe dizer o nome dos outros', () => {
    for (const codigo of CODIGOS) {
      for (const outro of CODIGOS) {
        expect(textoEm(codigo, chaveIdioma(outro)).trim()).not.toBe('')
      }
    }
    expect(textoEm('pt', chaveIdioma('zh'))).toBe('Chinês')
    expect(textoEm('en', chaveIdioma('pt'))).toBe('Portuguese')
  })
})
