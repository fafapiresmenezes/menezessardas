// Provas da porta do aplicativo (elo R8). O que mais importa: no NAVEGADOR nada muda.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { dentroDoApp, portaDoApp } from './nativo'

const comCapacitor = (nativo: boolean) => { window.Capacitor = { isNativePlatform: () => nativo } }

beforeEach(() => { window.location.hash = '' })
afterEach(() => { delete window.Capacitor })

describe('Porta do aplicativo', () => {
  it('no navegador comum, não é app e nada é mexido', () => {
    expect(dentroDoApp()).toBe(false)
    window.location.hash = '#/inicio'
    portaDoApp()
    expect(window.location.hash).toBe('#/inicio')
  })

  it('num navegador que só tem o objeto, mas não é plataforma nativa, também não mexe', () => {
    comCapacitor(false)
    expect(dentroDoApp()).toBe(false)
    portaDoApp()
    expect(window.location.hash).toBe('')
  })

  it('no app, sem rota nenhuma, abre na casa do geomapeamento', () => {
    comCapacitor(true)
    expect(dentroDoApp()).toBe(true)
    portaDoApp()
    expect(window.location.hash).toBe('#/geo')
  })

  it('no app, vindo da tela inicial do site, também abre na casa do geomapeamento', () => {
    comCapacitor(true)
    window.location.hash = '#/inicio'
    portaDoApp()
    expect(window.location.hash).toBe('#/geo')
  })

  it('no app, se o titular já está em outra tela, a escolha dele manda', () => {
    comCapacitor(true)
    window.location.hash = '#/geo/biblioteca'
    portaDoApp()
    expect(window.location.hash).toBe('#/geo/biblioteca')
  })

  it('se o Capacitor estiver quebrado, não derruba o app', () => {
    window.Capacitor = { isNativePlatform: () => { throw new Error('boom') } }
    expect(dentroDoApp()).toBe(false)
    expect(() => portaDoApp()).not.toThrow()
  })
})
