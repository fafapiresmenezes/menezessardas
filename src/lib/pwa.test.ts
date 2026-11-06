// Passo D19: avisos críticos no celular — quais itens viram aviso, em que ordem e uma vez por dia.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { avisosCriticos, filtrarNaoMostrados, verificarAvisosCriticos, estadoAvisos } from './pwa'
import { emDias } from './datas'

const hoje = emDias(0)
const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, m } }

describe('avisos críticos (D19)', () => {
  it('intimação não lida com prazo em até 2 dias, vencida ou de hoje vira aviso; lida ou distante não', () => {
    const avisos = avisosCriticos([
      { id: 1, lida: false, prazo_final: emDias(5), tipo: 'Intimação' },
      { id: 2, lida: false, prazo_final: emDias(2), tipo: 'Citação', tribunal: 'TJRJ', numero_processo: '0001-22' },
      { id: 3, lida: true, prazo_final: emDias(0) },
      { id: 4, lida: false, prazo_final: emDias(0), tipo: 'Intimação' },
      { id: 5, lida: false, prazo_final: emDias(-3), tipo: 'Intimação' },
      { id: 6, lida: false, prazo_final: null },
    ], [{ id: 'c1', titulo: 'Audiência Silva', data_evento: hoje }, { id: 'c2', titulo: 'Amanhã', data_evento: emDias(1) }], hoje)
    expect(avisos.map(a => a.chave)).toEqual(['intimacao-5', 'intimacao-4', 'intimacao-2', `compromisso-c1-${hoje}`])
    expect(avisos[0].titulo).toBe('Prazo vencido há 3 dias')
    expect(avisos[1].titulo).toBe('Prazo vence hoje')
    expect(avisos[2].titulo).toBe('Prazo em 2 dias')
    expect(avisos[2].corpo).toContain('Citação · TJRJ · 0001-22')
    expect(avisos[3].titulo).toBe('Hoje: Audiência Silva')
    expect(avisos[3].rota).toBe('/agenda')
  })

  it('cada aviso aparece uma vez por dia; no dia seguinte volta; a memória descarta dias antigos', () => {
    const mem = memoria()
    const a = [{ chave: 'x', titulo: 'T', corpo: 'C', rota: '/intimacoes' }]
    expect(filtrarNaoMostrados(a, mem, '2026-11-06')).toHaveLength(1)
    expect(filtrarNaoMostrados(a, mem, '2026-11-06')).toHaveLength(0)
    expect(filtrarNaoMostrados(a, mem, '2026-11-07')).toHaveLength(1)
    expect(JSON.parse(mem.m.get('lsm-avisos-mostrados')!)).toEqual({ x: '2026-11-07' })
    mem.m.set('lsm-avisos-mostrados', '{quebrado')
    expect(filtrarNaoMostrados(a, mem, '2026-11-08')).toHaveLength(1)
  })

  describe('permissão do navegador', () => {
    beforeEach(() => { delete (globalThis as { Notification?: unknown }).Notification })
    it('sem Notification no navegador: sem suporte e nada é consultado', async () => {
      expect(estadoAvisos()).toBe('sem-suporte')
      const buscar = vi.fn()
      expect(await verificarAvisosCriticos(buscar, memoria())).toEqual([])
      expect(buscar).not.toHaveBeenCalled()
    })
    it('com permissão, consulta e mostra só o que ainda não foi avisado hoje', async () => {
      const mostrados: string[] = []
      ;(globalThis as { Notification?: unknown }).Notification = class { static permission = 'granted'; constructor(t: string) { mostrados.push(t) } onclick: unknown }
      const mem = memoria()
      const buscar = async () => ({ intimacoes: [{ id: 9, lida: false, prazo_final: emDias(1) }], compromissos: [] })
      const novos = await verificarAvisosCriticos(buscar, mem)
      expect(novos.map(n => n.chave)).toEqual(['intimacao-9'])
      expect(mostrados).toEqual(['Prazo em 1 dia'])
      expect(await verificarAvisosCriticos(buscar, mem)).toEqual([])
      ;(globalThis as { Notification?: { permission: string } }).Notification!.permission = 'denied'
      expect(estadoAvisos()).toBe('negado')
    })
  })
})
