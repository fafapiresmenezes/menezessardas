// Passo D22: white-label — marca própria do parceiro, domínio próprio e validações.
import { describe, it, expect, vi, beforeEach } from 'vitest'
let resposta: unknown = null
const rpc = vi.fn(async (_n: string, _a?: object) => ({ data: resposta }))
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (n: string, a?: object) => rpc(n, a) } }))
const mem = new Map<string, string>()
;(globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } }
const { minhaMarca, marcaPorDominio, ehDominioProprio, corValida, logoValida, esquecerMarca } = await import('./marca')

describe('white-label (D22)', () => {
  beforeEach(() => { rpc.mockClear(); mem.clear(); resposta = null })
  it('validações: cor #RRGGBB, logo https, domínio próprio fora da plataforma', () => {
    expect(corValida('#AA0000')).toBe('#AA0000'); expect(corValida('#14213D')).toBe('#0B0B0C'); expect(corValida('red')).toBe('#0B0B0C'); expect(corValida(null)).toBe('#0B0B0C')
    expect(logoValida('https://x/l.png')).toBe('https://x/l.png'); expect(logoValida('http://x/l.png')).toBeNull()
    expect(ehDominioProprio('gmenezes-advogados.vercel.app')).toBe(false)
    expect(ehDominioProprio('fafapiresmenezes.github.io')).toBe(false)
    expect(ehDominioProprio('localhost')).toBe(false)
    expect(ehDominioProprio('app.alfaadvocacia.com.br')).toBe(true)
  })
  it('sede: sem marca própria; parceiro: nome, cor e logo válidos, guardados na sessão', async () => {
    resposta = { nome: 'GMenezes', cor: '#0B0B0C', logo_url: null, sede: true }
    expect(await minhaMarca()).toBeNull()
    expect(mem.get('gm-marca-v1')).toBe('')
    expect(await minhaMarca()).toBeNull(); expect(rpc).toHaveBeenCalledTimes(1)
    esquecerMarca()
    resposta = { nome: 'Alfa Advocacia', cor: 'zzz', logo_url: 'ftp://x', sede: false }
    expect(await minhaMarca()).toEqual({ nome: 'Alfa Advocacia', cor: '#0B0B0C', logo_url: null, sede: false })
    expect(JSON.parse(mem.get('gm-marca-v1')!).nome).toBe('Alfa Advocacia')
  })
  it('marca por domínio: só em domínio próprio, sem www, nula quando não há parceiro', async () => {
    expect(await marcaPorDominio('gmenezes-advogados.vercel.app')).toBeNull(); expect(rpc).not.toHaveBeenCalled()
    resposta = { nome: 'Alfa Advocacia', cor: '#AA0000', logo_url: 'https://a/l.png', sede: false }
    expect(await marcaPorDominio('www.alfaadvocacia.com.br')).toMatchObject({ nome: 'Alfa Advocacia', cor: '#AA0000' })
    expect(rpc).toHaveBeenCalledWith('marca_por_dominio', { p_dominio: 'alfaadvocacia.com.br' })
    resposta = null
    expect(await marcaPorDominio('outro.com')).toBeNull()
  })
})
