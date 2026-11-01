// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const pastas: Record<string, object[]> = {}
const list = vi.fn(async (p: string, _o?: object): Promise<{ data: object[] | null; error: { message: string } | null }> => ({ data: pastas[p] ?? [], error: null }))
const move = vi.fn(async (_a: string, _b: string): Promise<{ error: { message: string } | null }> => ({ error: null }))
const copy = vi.fn(async (_a: string, _b: string): Promise<{ error: { message: string } | null }> => ({ error: null }))
const remove = vi.fn(async (ps: string[]) => ({ data: ps.map(p => ({ name: p })), error: null }))
const upload = vi.fn(async (_p: string, _f: unknown, _o?: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const createSignedUrl = vi.fn(async (p: string) => ({ data: { signedUrl: `https://assinado/${p}` }, error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, storage: { from: () => ({ list, move, copy, remove, upload, createSignedUrl }) } },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: NuvemPage } = await import('./NuvemPage')

const arq = (name: string, size = 2048) => ({ name, id: 'f-' + name, metadata: { size }, updated_at: '2026-10-30T10:00:00Z' })
describe('Nuvem do escritório', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); for (const k of Object.keys(pastas)) delete pastas[k]
    list.mockClear(); move.mockClear(); copy.mockClear(); remove.mockClear(); upload.mockClear(); createSignedUrl.mockClear()
    pastas['escritorio'] = [{ name: 'Contratos', id: null, metadata: null }, arq('laudo.pdf'), arq('procuracao.pdf', 3 * 1048576)]
    pastas['escritorio/Contratos'] = [arq('locacao.pdf')]
    pastas['pessoal/u1'] = [arq('notas.txt', 512)]
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/', href: '' }, writable: true })
  })

  it('lista pastas e arquivos com total; entra na pasta pelo caminho; filtro e área são lembrados; aba Pessoal lista a pasta da pessoa', async () => {
    render(<NuvemPage />)
    await waitFor(() => expect(screen.getByTestId('nuvem-total').textContent).toBe('2 arquivo(s) nesta pasta · 3.0 MB'))
    expect(screen.getByText('Contratos')).toBeTruthy()
    fireEvent.change(screen.getByTestId('nuvem-filtro'), { target: { value: 'laudo' } })
    expect(screen.getByTestId('nuvem-lista').querySelectorAll('li').length).toBe(1)
    expect(localStorage.getItem('lsm-nuvem-filtro')).toBe('laudo')
    fireEvent.change(screen.getByTestId('nuvem-filtro'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Contratos'))
    await waitFor(() => expect(screen.getByText('locacao.pdf', { exact: false })).toBeTruthy())
    expect(list).toHaveBeenLastCalledWith('escritorio/Contratos', expect.anything())
    fireEvent.click(screen.getByRole('tab', { name: 'Pessoal' }))
    await waitFor(() => expect(screen.getByText('notas.txt', { exact: false })).toBeTruthy())
    expect(list).toHaveBeenLastCalledWith('pessoal/u1', expect.anything())
    expect(localStorage.getItem('lsm-nuvem-area')).toBe('pessoal')
  })

  it('enviar arquivo com o mesmo nome guarda a versão anterior; versões listadas e restauradas; baixar gera link assinado; apagar pede confirmação', async () => {
    window.confirm = vi.fn(() => true)
    pastas['escritorio/.versoes/laudo.pdf'] = [{ name: '2026-10-29T09-00-00-000Z', id: 'v1', metadata: { size: 1024 } }]
    render(<NuvemPage />)
    await waitFor(() => expect(screen.getByText('laudo.pdf', { exact: false })).toBeTruthy())
    const f = new File(['x'], 'laudo.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('nuvem-enviar'), { target: { files: [f] } })
    await waitFor(() => expect(upload).toHaveBeenCalledWith('escritorio/laudo.pdf', f, { upsert: false }))
    expect(move.mock.calls[0][0]).toBe('escritorio/laudo.pdf')
    expect(move.mock.calls[0][1]).toMatch(/^escritorio\/\.versoes\/laudo\.pdf\/\d{4}-/)
    fireEvent.click(screen.getByTestId('versoes-laudo.pdf'))
    await waitFor(() => expect(screen.getAllByTestId('versao').length).toBe(1))
    fireEvent.click(screen.getByText('Restaurar'))
    await waitFor(() => expect(copy).toHaveBeenCalledWith('escritorio/.versoes/laudo.pdf/2026-10-29T09-00-00-000Z', 'escritorio/laudo.pdf'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Restaurar a versão de'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('restaurada.'))
    fireEvent.click(screen.getByLabelText('Baixar procuracao.pdf'))
    await waitFor(() => expect(window.location.href).toBe('https://assinado/escritorio/procuracao.pdf'))
    fireEvent.click(screen.getByLabelText('Apagar procuracao.pdf'))
    await waitFor(() => expect(remove).toHaveBeenCalledWith(['escritorio/procuracao.pdf']))
  })

  it('nova pasta cria o marcador; copiar lista e baixar lista; erro ao listar vira alerta', async () => {
    window.prompt = vi.fn(() => 'Pareceres 2026')
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<NuvemPage />)
    await waitFor(() => expect(screen.getByText('laudo.pdf', { exact: false })).toBeTruthy())
    fireEvent.click(screen.getByText('Nova pasta'))
    await waitFor(() => expect(upload).toHaveBeenCalledWith('escritorio/Pareceres 2026/.pasta', expect.any(Blob)))
    fireEvent.click(screen.getByText('Copiar lista'))
    await waitFor(() => expect(write).toHaveBeenCalled())
    expect(write.mock.calls[0][0]).toContain('Nuvem · Escritório ·')
    expect(write.mock.calls[0][0]).toContain('laudo.pdf · 2 KB · 30/10/2026')
    fireEvent.click(screen.getByTestId('baixar-nuvem'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-nuvem').textContent).toBe('baixado')
    list.mockResolvedValueOnce({ data: null, error: { message: 'row-level security' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Pessoal' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    click.mockRestore()
  })
})
