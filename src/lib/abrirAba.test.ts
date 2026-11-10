// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { abrirEmNovaAba, escaparHtml } from './abrirAba'
describe('abrir em nova aba depois de um await', () => {
  it('abre a aba no clique e põe o endereço quando chega', async () => {
    const aba = { location: { href: '' }, close: vi.fn(), opener: {} }
    const open = vi.spyOn(window, 'open').mockReturnValue(aba as unknown as Window)
    await abrirEmNovaAba(async () => 'https://exemplo/arquivo.pdf')
    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(aba.location.href).toBe('https://exemplo/arquivo.pdf')
    expect(aba.opener).toBeNull()
  })
  it('fecha a aba e repassa o erro', async () => {
    const aba = { location: { href: '' }, close: vi.fn(), opener: null }
    vi.spyOn(window, 'open').mockReturnValue(aba as unknown as Window)
    await expect(abrirEmNovaAba(async () => { throw new Error('falhou') })).rejects.toThrow('falhou')
    expect(aba.close).toHaveBeenCalled()
    await expect(abrirEmNovaAba(async () => null)).rejects.toThrow('não está disponível')
  })
  it('escapa HTML', () => {
    expect(escaparHtml('<b>"A" & \'B\'</b>')).toBe('&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;')
    expect(escaparHtml(null)).toBe('')
  })
})
