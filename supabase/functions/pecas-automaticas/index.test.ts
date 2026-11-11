// Peças automáticas: 7 dias antes do prazo, escreve no estilo do escritório e manda por e-mail com o .doc formatado.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', ANTHROPIC_API_KEY: 'sk-ant-teste' })
await import('./index')
const chamar = (body: unknown = {}, headers: Record<string, string> = { 'x-cron-secret': 'cron-1' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/pecas-automaticas', { method: 'POST', headers, body: JSON.stringify(body) }))
const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const emDias = (n: number) => new Date(Date.parse(hoje) + n * 86400000).toISOString().slice(0, 10)
const PECA = 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 5ª VARA CÍVEL\n\nI – DOS FATOS\n\n' + 'O apelante recorreu da sentença. A decisão deve ser mantida. '.repeat(20) + '\n\nPONTOS A CONFERIR ANTES DE PROTOCOLAR\n\n- documentos'

let chamadas: { url: string; body: any }[] = []
beforeEach(() => {
  chamadas = []
  fingirFetch((u, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null
    chamadas.push({ url: u, body })
    if (u.includes('anthropic')) return jsonResp({ model: 'claude-sonnet-5-5', content: [{ type: 'text', text: PECA }], usage: { input_tokens: 10, output_tokens: 20 } })
    if (u.includes('brevo')) return jsonResp({ messageId: 'm1' }, 201)
    return new Response('', { status: 404 })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'pecas_destinatarios', valor: 'fatima@exemplo.com.br, outro@exemplo.com.br' }, { chave: 'brevo_api_key', valor: 'xkeysib-x' }, { chave: 'email_remetente', valor: 'pecas@theye.com.br' }],
    tarefas: [
      { id: 'caso-1', nivel: 'projeto', titulo: 'Processo X', cliente: 'ACME', area: 'Cível', descricao: 'Despejo' },
      { id: 't-perto', nivel: 'tarefa', situacao: 'a_fazer', titulo: 'Responder ao recurso da outra parte (contrarrazões) · 0036229-32.2016.8.19.0021', descricao: 'Publicação: Ao apelado para contrarrazões.', prazo: emDias(6), pai_id: 'caso-1', numero_processo: '0036229-32.2016.8.19.0021', cliente: 'ACME', area: 'Cível', responsavel_id: 'u-1', escritorio_id: 'esc-1', peca_automatica_em: null },
      { id: 't-longe', nivel: 'tarefa', situacao: 'a_fazer', titulo: 'Réplica · 1', prazo: emDias(20), numero_processo: '1', peca_automatica_em: null },
      { id: 't-audiencia', nivel: 'tarefa', situacao: 'a_fazer', titulo: 'Comparecer à audiência · 2', prazo: emDias(3), numero_processo: '2', peca_automatica_em: null },
      { id: 't-feita', nivel: 'tarefa', situacao: 'a_fazer', titulo: 'Réplica · 3', prazo: emDias(2), numero_processo: '3', peca_automatica_em: '2026-01-01' },
    ],
    estilos_escrita: [{ usuario_id: 'u-1', titulo: 'Contrarrazões modelo', texto: 'Texto de referência do escritório. '.repeat(30), criado_em: '2026-01-01' }],
    formatacao_escrita: [{ usuario_id: 'u-1', dados: { fonte: 'Garamond', corpo: 13 } }],
    pecas_automaticas: [],
  })
})

describe('pecas-automaticas', () => {
  it('recusa quem não é o cron nem usuário logado', async () => {
    expect((await chamar({}, {})).status).toBe(401)
  })

  it('escreve só as que vencem em até 7 dias, pula audiência e as já feitas', async () => {
    const b = await (await chamar()).json()
    expect(b.feitas.map((f: any) => f.tarefa)).toEqual(['t-perto'])
    expect(b.feitas[0].enviada).toBe(true)
  })

  it('usa o estilo do escritório e a rotação, e manda o .doc formatado por e-mail para todos', async () => {
    await chamar()
    const ia = chamadas.find(c => c.url.includes('anthropic'))!.body
    expect(ia.system).toMatch(/ESTILO DE ESCRITA DO ESCRITÓRIO/)
    expect(ia.system).toMatch(/PERFIL DE ESCRITA DESTA PEÇA/)
    // Cível + contrarrazões a recurso: quem escreve é o redator de processo civil e recursos.
    expect(ia.system).toMatch(/REDATOR DESTA PEÇA .*José Carlos Barbosa Moreira/)
    expect(ia.messages[0].content).toMatch(/Ao apelado para contrarrazões/)
    const email = chamadas.find(c => c.url.includes('brevo'))!.body
    expect(email.to).toEqual([{ email: 'fatima@exemplo.com.br' }, { email: 'outro@exemplo.com.br' }])
    expect(email.attachment[0].name).toMatch(/\.doc$/)
    const doc = new TextDecoder().decode(Uint8Array.from(atob(email.attachment[0].content), c => c.charCodeAt(0)))
    expect(doc).toContain("font-family: 'Garamond'")
    // Formatação em rodízio: a numeração da seção depende do modelo sorteado (I –, 1. ou nenhuma).
    expect(doc).toMatch(/<h2>(?:I – |1\. )?DOS FATOS<\/h2>/)
    expect(doc).toMatch(/<meta name="formatacao" content="[a-z-]+">/)
    const salva = estado.inseridos.find(i => i.tabela === 'pecas_automaticas')!.linha as Record<string, unknown>
    expect((salva.perfil as { formato?: string }).formato).toMatch(/^[a-z-]+$/)
    expect((salva.perfil as { redator?: string }).redator).toBe('barbosa-moreira')
    expect(salva).toMatchObject({ tarefa_id: 't-perto', enviada_para: ['fatima@exemplo.com.br', 'outro@exemplo.com.br'] })
    expect(estado.atualizados.find(a => a.tabela === 'tarefas')!.valores).toMatchObject({ peca_automatica_em: expect.any(String) })
  })

  it('segue os parâmetros de escrita salvos pelo escritório', async () => {
    estado.tabelas.configuracoes.push({ chave: 'escrita_arg_metodo', valor: 'IRAC' }, { chave: 'escrita_linguagem_voz', valor: 'ativa' })
    await chamar()
    const ia = chamadas.find(c => c.url.includes('anthropic'))!.body
    expect(ia.system).toMatch(/PARÂMETROS DE ESCRITA DO ESCRITÓRIO/)
    expect(ia.system).toContain('- Método de argumentação: IRAC')
    expect(ia.system).toContain('- Voz preferencial: ativa')
  })

  it('sem destinatário, escreve e guarda, e avisa', async () => {
    estado.tabelas.configuracoes = estado.tabelas.configuracoes.filter(c => c.chave !== 'pecas_destinatarios')
    const b = await (await chamar()).json()
    expect(b.feitas[0]).toMatchObject({ enviada: false, detalhe: 'Ninguém cadastrado para receber as peças.' })
    expect(chamadas.some(c => c.url.includes('brevo'))).toBe(false)
  })

  it('botão manual: uma tarefa específica, mesmo fora da janela', async () => {
    const jwt = `h.${btoa(JSON.stringify({ role: 'authenticated', sub: 'u-1' })).replace(/=+$/, '')}.s`
    const b = await (await chamar({ tarefa_id: 't-longe' }, { authorization: `Bearer ${jwt}` })).json()
    expect(b.feitas.map((f: any) => f.tarefa)).toEqual(['t-longe'])
  })
})
