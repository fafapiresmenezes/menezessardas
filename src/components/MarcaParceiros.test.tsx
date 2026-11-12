// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const rpc = vi.fn(async (_n: string, _a: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ in: async () => ({ data: [{ id: 'e2', nome_exibicao: 'Alfa Advocacia', cor: '#AA0000', logo_url: 'https://x/logo.png', dominio: 'alfa.adv.br' }] }) }) }),
    rpc: (n: string, a: object) => rpc(n, a),
  },
}))
const { default: MarcaParceiros } = await import('./MarcaParceiros')

describe('Marca dos escritórios parceiros (Portal e e-mails)', () => {
  beforeEach(() => { cleanup(); rpc.mockClear() })

  it('sem escritórios não renderiza nada', () => {
    const { container } = render(<MarcaParceiros escritorios={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('carrega a marca salva de cada escritório e usa o padrão para os sem marca', async () => {
    render(<MarcaParceiros escritorios={[{ id: 'e2', nome: 'Alfa' }, { id: 'e3', nome: 'Beta' }]} />)
    const nomes = await screen.findAllByTestId('marca-nome') as HTMLInputElement[]
    await waitFor(() => expect(nomes[0].value).toBe('Alfa Advocacia'))
    expect(nomes[1].value).toBe('')
    const cores = screen.getAllByTestId('marca-cor') as HTMLInputElement[]
    expect(cores[0].value).toBe('#aa0000')
    expect(cores[1].value).toBe('#0b0b0c')
    expect((screen.getAllByTestId('marca-logo')[0] as HTMLInputElement).value).toBe('https://x/logo.png')
  })

  it('editar e salvar chama definir_marca com os três campos; erro do banco vira aviso', async () => {
    render(<MarcaParceiros escritorios={[{ id: 'e3', nome: 'Beta' }]} />)
    await screen.findByTestId('marca-item')
    fireEvent.change(screen.getByLabelText('Nome de exibição de Beta'), { target: { value: 'Beta Jurídico' } })
    fireEvent.change(screen.getByLabelText('Logo de Beta'), { target: { value: 'https://b/logo.svg' } })
    fireEvent.click(screen.getByTestId('marca-salvar'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_marca', { p_escritorio: 'e3', p_nome: 'Beta Jurídico', p_cor: '#0B0B0C', p_logo_url: 'https://b/logo.svg' }))
    expect((await screen.findByTestId('marca-msg')).textContent).toContain('Marca salva')
    expect(rpc).toHaveBeenCalledWith('definir_dominio', { p_escritorio: 'e3', p_dominio: '' })
    fireEvent.change(screen.getByLabelText('Domínio próprio de Beta'), { target: { value: 'app.beta.adv.br' } })
    fireEvent.click(screen.getByTestId('marca-salvar'))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_dominio', { p_escritorio: 'e3', p_dominio: 'app.beta.adv.br' }))
    expect(screen.getByTestId('marca-msg').textContent).toContain('cname.vercel-dns.com')
    rpc.mockResolvedValueOnce({ error: { message: 'sem permissão' } })
    fireEvent.click(screen.getByTestId('marca-salvar'))
    await waitFor(() => expect(screen.getByTestId('marca-msg').textContent).toBe('sem permissão'))
  })
})
