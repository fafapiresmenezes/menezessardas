import { describe, it, expect } from 'vitest'
import { porCliente, porSocio, csvClientesSocios } from './relatorioClientes'

const horas = [
  { usuario_id: 'u1', cliente: 'Ana', minutos: 90, valor_hora: '200', faturavel: true },
  { usuario_id: 'u1', cliente: 'Ana', minutos: 30, valor_hora: 200, faturavel: false },
  { usuario_id: 'u2', cliente: '', minutos: 60, valor_hora: 100, faturavel: true },
]
const casos = [
  { cliente: 'Ana', responsavel_id: 'u1', honorario_previsto: '5000', honorario_recebido: 1500 },
  { cliente: 'Beto', responsavel_id: null, honorario_previsto: 800, honorario_recebido: null },
]
const pessoas = [{ id: 'u1', nome: 'Letícia', email: 'l@x' }]

describe('D10: relatório por cliente e por sócio', () => {
  it('por cliente soma horas, custo, combinado e recebido; rentabilidade = recebido - custo; ordena pela rentabilidade', () => {
    const r = porCliente(horas, casos)
    expect(r.map(l => l.cliente)).toEqual(['Ana', 'Beto', 'Sem cliente'])
    expect(r[0]).toEqual({ cliente: 'Ana', horas: 2, custoHoras: 400, combinado: 5000, recebido: 1500, rentabilidade: 1100 })
    expect(r[2]).toMatchObject({ horas: 1, custoHoras: 100, rentabilidade: -100 })
  })
  it('por sócio usa o nome da equipe, % faturável, a faturar e honorários dos casos sob sua responsabilidade', () => {
    const r = porSocio(horas, casos, pessoas)
    expect(r[0]).toEqual({ id: 'u1', nome: 'Letícia', horas: 2, pctFaturavel: 75, aFaturar: 300, combinado: 5000, recebido: 1500 })
    expect(r.find(l => l.id === 'u2')).toMatchObject({ nome: 'Pessoa fora da equipe', horas: 1, pctFaturavel: 100, aFaturar: 100 })
    expect(r.find(l => l.id === 'sem')).toMatchObject({ nome: 'Sem responsável', combinado: 800 })
  })
  it('CSV com vírgula decimal e as duas tabelas', () => {
    const csv = csvClientesSocios(porCliente(horas, casos), porSocio(horas, casos, pessoas))
    expect(csv.split('\n')[1]).toBe('Ana;2,00;400,00;5000,00;1500,00;1100,00')
    expect(csv).toContain('responsável;horas;% faturável;a faturar;combinado;recebido\nLetícia;2,00;75;300,00;5000,00;1500,00')
  })
})
