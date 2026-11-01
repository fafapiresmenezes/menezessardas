import { describe, it, expect, vi, beforeEach } from 'vitest'

// Armazenamento simulado: nada sai do teste.
const upload = vi.fn()
const createSignedUrl = vi.fn()
const remove = vi.fn()
let configurado = true
vi.mock('./supabase', () => ({
  get supabaseConfigurado() { return configurado },
  supabase: { storage: { from: () => ({ upload, createSignedUrl, remove }) } },
}))

const { enviarArquivo, urlAssinada, apagarArquivo } = await import('./arquivos')
const arq = (nome: string, tipo = 'application/pdf') => new File(['x'], nome, { type: tipo })

describe('arquivos no bucket privado', () => {
  beforeEach(() => { upload.mockReset(); createSignedUrl.mockReset(); remove.mockReset(); configurado = true })

  it('limpa acentos e espaços do nome e guarda na pasta pedida', async () => {
    upload.mockResolvedValue({ error: null })
    const caminho = await enviarArquivo(arq('Contrato Locação ÁREA 2.pdf'), 'contratos/c1')
    expect(caminho).toMatch(/^contratos\/c1\/\d+-Contrato_Locacao_AREA_2\.pdf$/)
    expect(upload.mock.calls[0][2]).toEqual({ contentType: 'application/pdf', upsert: false })
  })

  it('sem tipo informado usa octet-stream; falha vira mensagem em português', async () => {
    upload.mockResolvedValueOnce({ error: null })
    await enviarArquivo(arq('a.bin', ''), 'p')
    expect(upload.mock.calls[0][2].contentType).toBe('application/octet-stream')
    upload.mockResolvedValueOnce({ error: { message: 'cheio' } })
    await expect(enviarArquivo(arq('a.bin'), 'p')).rejects.toThrow('Falha ao guardar o arquivo: cheio')
  })

  it('no modo fictício não envia nem apaga nada', async () => {
    configurado = false
    expect(await enviarArquivo(arq('a.pdf'), 'p')).toBe('')
    await apagarArquivo('p/a.pdf')
    expect(upload).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('link assinado dura 15 minutos; sem resposta é erro', async () => {
    createSignedUrl.mockResolvedValueOnce({ data: { signedUrl: 'https://x/s' }, error: null })
    expect(await urlAssinada('p/a.pdf')).toBe('https://x/s')
    expect(createSignedUrl).toHaveBeenCalledWith('p/a.pdf', 900)
    createSignedUrl.mockResolvedValueOnce({ data: null, error: null })
    await expect(urlAssinada('p/a.pdf')).rejects.toThrow('sem resposta')
  })

  it('apagar ignora caminho vazio e remove o informado', async () => {
    remove.mockResolvedValue({})
    await apagarArquivo('')
    await apagarArquivo(undefined)
    expect(remove).not.toHaveBeenCalled()
    await apagarArquivo('p/a.pdf')
    expect(remove).toHaveBeenCalledWith(['p/a.pdf'])
  })
})
