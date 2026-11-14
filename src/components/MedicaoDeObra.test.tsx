// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MedicaoDeObra from './MedicaoDeObra'
import { SUGESTOES } from '@/lib/engenharia/medicao'

/**
 * Pedido de M em 13/11/2026 às 21h23: "lembre-se de medições e indicadores de medição de obra
 * mutáveis, sob medida por cliente".
 *
 * O que estes testes prendem: a lista de serviços é editável de verdade (acrescenta, apaga, troca de
 * modelo), a conta aparece na tela, e a tela diz onde a lista fica guardada em vez de deixar a pessoa
 * supor que está no servidor.
 */
beforeEach(() => { cleanup(); localStorage.clear() })
afterEach(() => { cleanup(); localStorage.clear() })

const linhas = () => screen.getByTestId('medicao-linhas').querySelectorAll('tr')

describe('a lista de serviços é do cliente', () => {
  it('abre com o modelo do primeiro tipo de obra, e não vazia', () => {
    render(<MedicaoDeObra />)
    const tipo = Object.keys(SUGESTOES)[0]
    expect(linhas().length).toBe(SUGESTOES[tipo].length)
  })

  it('acrescenta um serviço que modelo nenhum previu', () => {
    render(<MedicaoDeObra />)
    const antes = linhas().length
    fireEvent.click(screen.getByTestId('medicao-novo-servico'))
    expect(linhas().length).toBe(antes + 1)
  })

  it('apaga um serviço, e some junto o que foi lançado nele', () => {
    render(<MedicaoDeObra />)
    const antes = linhas().length
    const botoes = screen.getAllByTitle('Tira este serviço da lista desta obra')
    fireEvent.click(botoes[0])
    expect(linhas().length).toBe(antes - 1)
  })

  it('trocar o tipo de obra carrega outro modelo', () => {
    render(<MedicaoDeObra />)
    const tipos = Object.keys(SUGESTOES)
    fireEvent.change(screen.getByTestId('medicao-tipo'), { target: { value: tipos[1] } })
    expect(linhas().length).toBe(SUGESTOES[tipos[1]].length)
  })

  it('o que a pessoa monta volta depois de fechar e abrir a tela', () => {
    const { unmount } = render(<MedicaoDeObra />)
    fireEvent.change(screen.getByTestId('medicao-cliente'), { target: { value: 'Prefeitura de Teste' } })
    unmount()
    cleanup()
    render(<MedicaoDeObra />)
    expect((screen.getByTestId('medicao-cliente') as HTMLInputElement).value).toBe('Prefeitura de Teste')
  })
})

describe('a conta aparece na tela', () => {
  it('medir metade de um serviço de peso igual move a porcentagem da obra', () => {
    render(<MedicaoDeObra />)
    const resumoAntes = screen.getByTestId('medicao-resumo').textContent ?? ''
    expect(resumoAntes).toContain('0,00%')
    // a primeira linha do modelo de edificação é uma verba com quantidade prevista 1
    const campos = screen.getByTestId('medicao-linhas').querySelectorAll('input[type="number"]')
    // ordem dos campos numéricos na linha: previsto, preço, peso, acumulado
    fireEvent.change(campos[3], { target: { value: '1' } })
    expect(screen.getByTestId('medicao-resumo').textContent).not.toBe(resumoAntes)
  })

  it('mostra os passos da conta, para o engenheiro conferir', () => {
    render(<MedicaoDeObra />)
    expect(screen.getByTestId('medicao-passos').textContent).toContain('Avanço físico acumulado')
  })

  it('compara com o cronograma só quando a pessoa informa o previsto', () => {
    render(<MedicaoDeObra />)
    expect(screen.queryByTestId('medicao-desvio')).toBeNull()
    fireEvent.change(screen.getByTestId('medicao-cronograma'), { target: { value: '40' } })
    expect(screen.getByTestId('medicao-desvio').textContent).toContain('atrasada')
  })
})

describe('a tela não deixa a pessoa supor coisa errada', () => {
  it('diz que em demonstração a lista fica neste navegador, não no servidor', () => {
    render(<MedicaoDeObra />)
    const txt = document.body.textContent ?? ''
    expect(txt).toContain('neste navegador')
    expect(txt).toContain('na versão do escritório fica no servidor')
  })

  it('traz o aviso de que a conta é apoio e o engenheiro assina', () => {
    render(<MedicaoDeObra />)
    expect(document.body.textContent).toContain('assina com ART')
  })

  it('sem preço no contrato, mostra travessão em vez de inventar R$ 0,00', () => {
    render(<MedicaoDeObra />)
    // o modelo não traz preço nenhum, de propósito
    expect(screen.getByTestId('medicao-resumo').textContent).toContain('—')
  })
})
