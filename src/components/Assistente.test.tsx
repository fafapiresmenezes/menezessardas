// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Passo, Escolha, Campo, Toast, classeCampo } from './Assistente'

describe('Moldura do assistente passo a passo', () => {
  beforeEach(cleanup)

  it('mostra "Passo n de total", barra de progresso, bloqueia Continuar e oferece Voltar só quando há', () => {
    const onAvancar = vi.fn(); const onVoltar = vi.fn()
    const { container, rerender } = render(<Passo numero={2} total={4} titulo="Qual o tipo?" ajuda="Escolha um." podeAvancar={false} onAvancar={onAvancar} onVoltar={onVoltar}>x</Passo>)
    expect(screen.getByText('Passo 2 de 4')).toBeTruthy()
    expect(container.querySelectorAll('.bg-dourado.h-1').length).toBe(2)
    expect(screen.getByText('Escolha um.')).toBeTruthy()
    const continuar = screen.getByText('Continuar').closest('button') as HTMLButtonElement
    expect(continuar.disabled).toBe(true)
    fireEvent.click(continuar); expect(onAvancar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Voltar')); expect(onVoltar).toHaveBeenCalled()
    rerender(<Passo numero={4} total={4} titulo="Fim" podeAvancar ultimo onAvancar={onAvancar}>x</Passo>)
    expect(screen.queryByText('Voltar')).toBeNull()
    fireEvent.click(screen.getByText('Concluir')); expect(onAvancar).toHaveBeenCalledTimes(1)
    rerender(<Passo numero={1} total={1} titulo="Só" podeAvancar onAvancar={onAvancar} rotuloAvancar="Salvar">x</Passo>)
    expect(screen.getByText('Salvar')).toBeTruthy()
  })

  it('múltipla escolha em cartões: um clique marca a opção e destaca o cartão', () => {
    const onChange = vi.fn()
    const opcoes = [{ valor: 'a', rotulo: 'Apartamento', descricao: 'Unidade' }, { valor: 'c', rotulo: 'Casa' }]
    const { rerender } = render(<Escolha nome="Tipo" opcoes={opcoes} valor={null} onChange={onChange} colunas={3} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Tipo' })
    expect(grupo.className).toContain('sm:grid-cols-3')
    expect(screen.getByText('Unidade')).toBeTruthy()
    fireEvent.click(screen.getByLabelText(/Casa/))
    expect(onChange).toHaveBeenCalledWith('c')
    rerender(<Escolha nome="Tipo" opcoes={opcoes} valor="c" onChange={onChange} />)
    expect((screen.getByLabelText(/Casa/) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByLabelText(/Casa/).closest('label')!.className).toContain('border-dourado')
    expect(screen.getByLabelText(/Apartamento/).closest('label')!.className).toContain('border-navy/10')
  })

  it('campo liga rótulo e ajuda ao controle; toast usa a cor do tipo e é anunciado', () => {
    render(<Campo id="nome" rotulo="Nome" ajuda="Como no contrato."><input id="nome" className={classeCampo} /></Campo>)
    expect(screen.getByLabelText('Nome').className).toContain('border-grafite-claro/30')
    expect(document.getElementById('nome-ajuda')!.textContent).toBe('Como no contrato.')
    render(<Toast tipo="erro" mensagem="Falhou" />)
    const toast = screen.getByRole('status')
    expect(toast.textContent).toBe('Falhou')
    expect(toast.className).toContain('border-critico')
  })
})
