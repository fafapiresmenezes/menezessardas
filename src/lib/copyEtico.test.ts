// Habilidade 5 do replanejamento de mercado (14/11/2026): revisor de copy ético.
import { describe, it, expect } from 'vitest'
import { revisarTexto, textoPassaNaRevisao } from './copyEtico'

describe('revisor de copy ético (habilidade 5 — persuasão sem manipulação)', () => {
  it('aprova um texto honesto, sem garantia, urgência ou superlativo vazio', () => {
    const texto = 'Entregamos a lista dos sistemas que guardam dados de cidadãos em até 20 dias úteis.'
    expect(revisarTexto(texto)).toEqual([])
    expect(textoPassaNaRevisao(texto)).toBe(true)
  })

  it('reprova promessa de garantia de resultado', () => {
    const problemas = revisarTexto('Garantimos a aprovação do seu programa de integridade.')
    expect(problemas.length).toBeGreaterThan(0)
    expect(problemas[0].motivo).toMatch(/garantia/)
  })

  it('reprova "zero risco" e aprovação garantida de terceiro', () => {
    expect(revisarTexto('Seu produto financeiro com zero risco regulatório.').length).toBeGreaterThan(0)
    expect(revisarTexto('Aprovação garantida no sandbox do Banco Central.').length).toBeGreaterThan(0)
  })

  it('reprova escassez e urgência artificial', () => {
    expect(revisarTexto('Restam as últimas vagas da turma!').length).toBeGreaterThan(0)
    expect(revisarTexto('Só hoje: contrate e ganhe desconto.').length).toBeGreaterThan(0)
  })

  it('reprova superlativo e estatística de sucesso sem fonte', () => {
    expect(revisarTexto('Somos o melhor escritório do Brasil.').length).toBeGreaterThan(0)
    expect(revisarTexto('98% de sucesso em nossos casos.').length).toBeGreaterThan(0)
  })

  it('o posicionamento das 6 famílias já existente passa na revisão (coerência entre habilidades)', async () => {
    const { POSICIONAMENTO_FAMILIAS } = await import('@/data/posicionamento-familias')
    for (const p of POSICIONAMENTO_FAMILIAS) {
      expect(revisarTexto(p.mensagemCentral), p.familia).toEqual([])
      expect(revisarTexto(p.diferencial), p.familia).toEqual([])
    }
  })
})
