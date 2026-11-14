// Passo 547: Edge Function alerta-teste-agentes — teste automático: site com CSS, seis funções, histórico e aviso às administradoras.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_ANON_KEY: 'anon' })
await import('./index')
const chamar = (qs = '') => caixa.handler!(new Request(`https://x.functions.supabase.co/alerta-teste-agentes${qs}`))
const PAGINA = '<html><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/x@gh-pages/assets/index-abc.css"><script src="https://cdn.jsdelivr.net/gh/x@gh-pages/assets/index-abc.js"></script></html>'

let site: () => Response
let cdn: (u: string) => Response
let funcao: (nome: string) => Response
const envios: { to: string; subject: string; html: string }[] = []
beforeEach(() => {
  envios.length = 0
  site = () => new Response(PAGINA)
  cdn = () => new Response('ok')
  funcao = nome => ({
    'indice-reajuste': jsonResp({ acumulado12m: 4.2 }), 'assistente-juridico': jsonResp({ artigos: 3 }), 'agente-guardiao': jsonResp({ data: {} }),
    jurimetria: jsonResp({ chanceExito: 61 }), 'buscar-legislacao': jsonResp({ leis: [] }), 'consultar-cnpj': jsonResp({ empresa: { status: 'ativa' } }),
  })[nome] ?? new Response('', { status: 500 })
  fingirFetch((u, init) => {
    if (u.startsWith('https://theye.club/')) return site()
    if (u.includes('cdn.jsdelivr')) return cdn(u)
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent }); return new Response('{}', { status: 201 }) }
    const m = u.match(/functions\/v1\/([a-z-]+)/)
    return funcao(m![1]!)
  })
  zerar({
    configuracoes: [{ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com' }, { id: 'u2', funcao: 'admin', email: 'teste-automatico@exemplo.com' }],
    saude_sistema: [],
  })
})

describe('alerta-teste-agentes', () => {
  it('tudo no ar: site com CSS e JS respondendo, seis funções verdes, 7 linhas no histórico e nenhum e-mail', async () => {
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ total: 7, falhas: 0, avisadas: 0 })
    expect(b.resultados[0]).toMatchObject({ verificacao: 'Site no ar (visual completo)', ok: true, status_http: 200, detalhe: null })
    expect(b.resultados.map((r: { verificacao: string }) => r.verificacao)).toContain('Jurimetria (CNJ)')
    expect(estado.inseridos[0]!.tabela).toBe('saude_sistema')
    expect(estado.tabelas.saude_sistema).toHaveLength(7)
    expect(envios).toHaveLength(0)
  })

  it('site sem CSS ou com arquivo faltando é falha; resposta fora do esperado de uma função também; avisa só administradoras reais', async () => {
    site = () => new Response('<html><script src="https://cdn.jsdelivr.net/gh/x@gh-pages/assets/index-abc.js"></script></html>')
    cdn = u => new Response('', { status: u.endsWith('.js') ? 404 : 200 })
    funcao = nome => (nome === 'consultar-cnpj' ? jsonResp({ empresa: { status: 'inativa' } }) : jsonResp({ acumulado12m: 1, artigos: 1, data: {}, chanceExito: 1 }))
    const b = await (await chamar()).json()
    expect(b.falhas).toBe(2)
    expect(b.resultados[0].ok).toBe(false)
    expect(b.resultados[0].detalhe).toContain('sem arquivo de aparência (CSS)')
    expect(b.resultados[0].detalhe).toContain('404 index-abc.js')
    const cnpj = b.resultados.find((r: { verificacao: string }) => r.verificacao === 'Consulta de CNPJ')
    expect(cnpj.ok).toBe(false)
    expect(cnpj.detalhe).toContain('inativa')
    expect(b.avisadas).toBe(1)
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    expect(envios[0]!.subject).toContain('Site no ar (visual completo), Consulta de CNPJ')
    expect(envios[0]!.html).toContain('2 falha(s)')
    expect(estado.inseridos.find(i => i.tabela === 'consumo_api')!.linha).toMatchObject({ funcao: 'aviso de falha do teste automático', quantidade: 1 })
  })

  it('conferência horária (?so=site) só testa o site e avisa apenas quando ele acabou de cair', async () => {
    site = () => { throw new Error('ECONNREFUSED') }
    estado.tabelas.saude_sistema = [{ id: 1, verificacao: 'Site no ar (visual completo)', ok: true }]
    let b = await (await chamar('?so=site')).json()
    expect(b.total).toBe(1)
    expect(b.resultados[0].detalhe).toContain('ECONNREFUSED')
    expect(b.avisadas).toBe(1)
    // já estava fora do ar na conferência anterior: não repete o aviso
    envios.length = 0
    estado.tabelas.saude_sistema = [{ id: 1, verificacao: 'Site no ar (visual completo)', ok: false }]
    b = await (await chamar('?so=site')).json()
    expect(b.avisadas).toBe(0)
    expect(envios).toHaveLength(0)
  })
})
