// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let lista: object[] = []
const insert = vi.fn(async () => ({ error: null }))
const del = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: lista, error: null }) }) }), insert, delete: () => ({ eq: del }) }) },
}))
const { default: AssinaturasCaso } = await import('./AssinaturasCaso')

// Apagar agora pede confirmação: nos testes, a pessoa sempre confirma.
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('Assinatura eletrônica do caso', () => {
  beforeEach(() => { cleanup(); lista = []; insert.mockClear(); del.mockClear() })

  it('pedir assinatura usa o modelo de contrato com o cliente e grava título e texto', async () => {
    render(<AssinaturasCaso tarefaId="t1" cliente="Maria Silva" />)
    expect((await screen.findByTestId('assinaturas-caso')).textContent).toContain('Nenhum documento para assinar ainda.')
    fireEvent.click(screen.getByTestId('pedir-assinatura'))
    const texto = screen.getByTestId('assin-texto') as HTMLTextAreaElement
    expect(texto.value).toContain('Contratante: Maria Silva.')
    expect(texto.value).toContain('CNPJ 10.945.994/0001-72')
    fireEvent.change(screen.getByTestId('assin-titulo'), { target: { value: '  Procuração ' } })
    fireEvent.click(screen.getByTestId('enviar-assinatura'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ tarefa_id: 't1', titulo: 'Procuração', texto: texto.value }))
    expect(screen.queryByTestId('assin-texto')).toBeNull()
  })

  it('lista pendentes (cancelável) e assinados com hash e ancoragem no Bitcoin; copia comprovantes', async () => {
    lista = [
      { id: 'a1', titulo: 'Contrato', hash_texto: 'h'.repeat(64), assinante_nome: null, assinante_documento: null, assinado_em: null, hash_assinatura: null, criado_em: '2026-10-30T10:00:00Z', selo_id: null },
      { id: 'a2', titulo: 'Procuração', hash_texto: 'x'.repeat(64), assinante_nome: 'Maria', assinante_documento: '123.456.789-00', assinado_em: '2026-10-31T10:00:00Z', hash_assinatura: 'y'.repeat(64), criado_em: '2026-10-30T10:00:00Z', selo_id: 5, selos_blockchain: { situacao: 'confirmado', altura_bitcoin: 920100, data_bloco: null, criado_em: '2026-11-01T03:00:00Z' } },
      { id: 'a3', titulo: 'Termo', hash_texto: 'z'.repeat(64), assinante_nome: 'João', assinante_documento: '1', assinado_em: '2026-11-01T10:00:00Z', hash_assinatura: 'w'.repeat(64), criado_em: '2026-11-01T09:00:00Z', selo_id: null },
    ]
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<AssinaturasCaso tarefaId="t1" cliente={null} />)
    const secao = await screen.findByTestId('assinaturas-caso')
    await waitFor(() => expect(secao.textContent).toContain('Aguardando assinatura · pedido em 30/10/2026'))
    expect(secao.textContent).toContain('Assinado por Maria (123.456.789-00) em 31/10/2026')
    expect(screen.getByTestId('ancorado').textContent).toBe('Ancorado no Bitcoin (bloco 920100)')
    expect(screen.getByTestId('aguardando-selo').textContent).toBe('Entra no selo blockchain do dia')
    fireEvent.click(screen.getByLabelText('Cancelar pedido Contrato'))
    await waitFor(() => expect(del).toHaveBeenCalledWith('id', 'a1'))
    fireEvent.click(screen.getByTestId('copiar-assinaturas'))
    await waitFor(() => expect(screen.getByTestId('copiar-assinaturas').textContent).toBe('comprovantes copiados'))
    expect(writeText.mock.calls[0][0]).toContain('Procuração · hash do texto ' + 'x'.repeat(64))
  })
})
