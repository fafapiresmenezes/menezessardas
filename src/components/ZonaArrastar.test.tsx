// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ZonaArrastar from './ZonaArrastar'
import { SkeletonCard, SkeletonTable, SkeletonIndicator, SkeletonForm } from './Skeleton'

const arquivo = new File(['%PDF-1.4'], 'contrato.pdf', { type: 'application/pdf' })

describe('Zona de arrastar arquivo', () => {
  beforeEach(cleanup)

  it('com tipo fixo, soltar o arquivo envia direto com esse tipo', () => {
    const onArquivo = vi.fn()
    render(<ZonaArrastar rotulo="Arraste o PDF ou" tipoFixo="contrato" onArquivo={onArquivo} />)
    const zona = screen.getByText(/Arraste o PDF/).parentElement!
    fireEvent.dragOver(zona)
    expect(zona.className).toContain('border-dourado')
    fireEvent.drop(zona, { dataTransfer: { files: [arquivo] } })
    expect(onArquivo).toHaveBeenCalledWith(arquivo, 'contrato')
    expect(zona.className).not.toContain('bg-pergaminho')
  })

  it('sem tipo fixo pergunta o tipo, permite cancelar e só envia ao confirmar', () => {
    const onArquivo = vi.fn()
    render(<ZonaArrastar rotulo="Arraste ou" onArquivo={onArquivo} />)
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para anexar'), { target: { files: [arquivo] } })
    expect(screen.getByText('contrato.pdf')).toBeTruthy()
    expect(onArquivo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Cancelar'))
    expect(screen.queryByText('contrato.pdf')).toBeNull()
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para anexar'), { target: { files: [arquivo] } })
    fireEvent.change(screen.getByLabelText('Que documento é este?'), { target: { value: 'iptu' } })
    fireEvent.click(screen.getByText('Adicionar'))
    expect(onArquivo).toHaveBeenCalledWith(arquivo, 'iptu')
    expect(screen.queryByText('contrato.pdf')).toBeNull()
  })

  it('lista vazia não faz nada', () => {
    const onArquivo = vi.fn()
    render(<ZonaArrastar rotulo="Arraste ou" onArquivo={onArquivo} />)
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para anexar'), { target: { files: [] } })
    expect(onArquivo).not.toHaveBeenCalled()
  })
})

describe('Esqueletos de carregamento', () => {
  beforeEach(cleanup)
  it('cartões e indicadores repetem pela contagem; tabela tem 5 linhas; formulário pulsa', () => {
    const { container } = render(<div><SkeletonCard count={3} className="extra" /><SkeletonIndicator count={2} /><SkeletonTable /><SkeletonForm /></div>)
    expect(container.querySelectorAll('.extra').length).toBe(3)
    expect(container.querySelectorAll('.border-dourado.animate-pulse').length).toBe(2)
    expect(container.querySelectorAll('.border-b.border-navy\\/10').length).toBe(5)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3 + 2 + 1 + 1)
  })
})
