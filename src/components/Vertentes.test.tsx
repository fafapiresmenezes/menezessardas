// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Vertentes from './Vertentes'
import { VERTENTES } from '@/data/vertentes'
import { DICIONARIOS, reiniciarIdioma, trocarIdioma, type Chave } from '@/lib/i18n'
import { IDIOMAS } from '@/lib/idioma'

/**
 * Pedido de M em 13/11/2026: na porta do Instituto tem de aparecer TUDO o que existe, em qualquer
 * língua, inclusive o que ainda está em desenvolvimento — e tudo exige senha.
 *
 * O que estes testes prendem: as doze vertentes na tela, nome e resumo traduzidos nas quatro
 * línguas (sem sobrar português no chinês), o estado de cada uma à vista, e todo item levando à
 * tela de entrada em vez de abrir alguma coisa.
 */
beforeEach(() => { cleanup(); localStorage.clear(); reiniciarIdioma() })
afterEach(() => { localStorage.clear(); reiniciarIdioma() })

const montar = () => render(<MemoryRouter><Vertentes /></MemoryRouter>)

describe('vitrine das vertentes', () => {
  it('mostra todas as vertentes, inclusive as que ainda estão em desenvolvimento', () => {
    montar()
    expect(VERTENTES.length).toBeGreaterThanOrEqual(12)
    for (const v of VERTENTES) expect(screen.getByTestId(`vertente-${v.id}`), v.id).toBeTruthy()
    expect(VERTENTES.some(v => v.estado === 'em-desenvolvimento')).toBe(true)
    expect(VERTENTES.some(v => v.estado === 'em-estudo')).toBe(true)
  })

  it('não é só a parte jurídica: engenharia, saúde, predição e geolocalização estão lá', () => {
    montar()
    for (const id of ['direito', 'engenharia', 'saude', 'predicao', 'geolocalizacao']) {
      expect(screen.getByTestId(`vertente-${id}`), id).toBeTruthy()
    }
  })

  it('todo item leva à tela de entrada: a vitrine não abre nada sem senha', () => {
    montar()
    for (const v of VERTENTES) {
      expect(screen.getByTestId(`vertente-${v.id}`).getAttribute('href'), v.id).toBe('/login')
    }
  })

  it('cada vertente tem nome e resumo nas quatro línguas, e nenhum deles repete o português', () => {
    for (const v of VERTENTES) {
      const nomes = IDIOMAS.map(i => DICIONARIOS[i.codigo][`vertente.${v.id}.nome` as Chave])
      const resumos = IDIOMAS.map(i => DICIONARIOS[i.codigo][`vertente.${v.id}.resumo` as Chave])
      for (const texto of [...nomes, ...resumos]) expect(texto, v.id).toBeTruthy()
      // chinês tem de ser diferente do português: igual significaria tradução esquecida
      expect(DICIONARIOS.zh[`vertente.${v.id}.resumo` as Chave], v.id)
        .not.toBe(DICIONARIOS.pt[`vertente.${v.id}.resumo` as Chave])
    }
  })

  it('em chinês a tela fala chinês', () => {
    trocarIdioma('zh')
    montar()
    const texto = screen.getByTestId('vertentes').textContent!
    expect(texto).toContain(DICIONARIOS.zh['vertentes.titulo'])
    expect(texto).toContain(DICIONARIOS.zh['vertente.engenharia.nome'])
    expect(texto).not.toContain('Plataforma jurídica')
  })

  it('em inglês e em espanhol também', () => {
    trocarIdioma('en')
    montar()
    expect(screen.getByTestId('vertentes').textContent).toContain(DICIONARIOS.en['vertente.saude.nome'])
    cleanup()
    trocarIdioma('es')
    montar()
    expect(screen.getByTestId('vertentes').textContent).toContain(DICIONARIOS.es['vertente.saude.nome'])
  })

  it('o aviso de que tudo exige senha aparece, em qualquer língua', () => {
    for (const i of IDIOMAS) {
      cleanup()
      trocarIdioma(i.codigo)
      montar()
      expect(screen.getByTestId('vertentes').textContent, i.codigo).toContain(DICIONARIOS[i.codigo]['vertentes.aviso'])
    }
  })

  it('o estado de cada vertente está na tela, traduzido', () => {
    trocarIdioma('es')
    montar()
    const texto = screen.getByTestId('vertentes').textContent!
    expect(texto).toContain(DICIONARIOS.es['vertenteEstado.em-desenvolvimento'])
    expect(texto).toContain(DICIONARIOS.es['vertenteEstado.no-ar'])
  })
})
