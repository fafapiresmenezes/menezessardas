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
    // O rascunho não sai por e-mail: só depois das 4 revisões.
    expect(b.feitas[0].enviada).toBe(false)
    expect(b.feitas[0].detalhe).toMatch(/4 revisões/)
    expect(chamadas.some(c => c.url.includes('brevo'))).toBe(false)
  })

  const revisar = async (vezes: number) => { for (let i = 0; i < vezes; i++) await (await chamar({ revisar: true })).json() }

  it('usa o estilo do escritório e a rotação, e depois de 4 revisões manda o .doc formatado por e-mail para todos', async () => {
    await chamar()
    expect(chamadas.some(c => c.url.includes('brevo'))).toBe(false)
    await revisar(3)
    expect(chamadas.some(c => c.url.includes('brevo'))).toBe(false)
    await revisar(1)
    const ia = chamadas.find(c => c.url.includes('anthropic'))!.body
    const iaRev = chamadas.filter(c => c.url.includes('anthropic')).map(c => c.body)
    expect(iaRev).toHaveLength(5)
    expect(iaRev.slice(1).map(b => (b.system.match(/REVISÃO (\d) DE 4/) ?? [])[1])).toEqual(['1', '2', '3', '4'])
    expect(iaRev[1].messages[0].content).toMatch(/TEXTO ATUAL DA PEÇA/)
    expect(iaRev[3].system).toMatch(/REDATOR DESTA PEÇA/)
    expect(iaRev[3].system).toMatch(/NARRATIVA DOS FATOS/)
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
    expect(salva.perfil).toMatchObject({ rev: 4, pend: false })
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
    await chamar()
    await revisar(4)
    const salva = estado.inseridos.find(i => i.tabela === 'pecas_automaticas')!.linha as Record<string, unknown>
    expect(salva).toMatchObject({ enviada_para: [], erro: 'Ninguém cadastrado para receber as peças.' })
    expect(salva.perfil).toMatchObject({ rev: 4, pend: false })
    expect(chamadas.some(c => c.url.includes('brevo'))).toBe(false)
  })

  it('botão manual: uma tarefa específica, mesmo fora da janela', async () => {
    const jwt = `h.${btoa(JSON.stringify({ role: 'authenticated', sub: 'u-1' })).replace(/=+$/, '')}.s`
    const b = await (await chamar({ tarefa_id: 't-longe' }, { authorization: `Bearer ${jwt}` })).json()
    expect(b.feitas.map((f: any) => f.tarefa)).toEqual(['t-longe'])
  })

  it('resposta curta da IA: pede de novo uma vez, sem aceitar recusa', async () => {
    let n = 0
    fingirFetch((u, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      chamadas.push({ url: u, body })
      if (u.includes('anthropic')) return jsonResp({ model: 'claude-sonnet-5-5', content: [{ type: 'text', text: ++n === 1 ? 'Não tenho dados suficientes.' : PECA }], usage: { input_tokens: 1, output_tokens: 1 } })
      return jsonResp({ messageId: 'm1' }, 201)
    })
    const b = await (await chamar()).json()
    const ias = chamadas.filter(c => c.url.includes('anthropic'))
    expect(ias).toHaveLength(2)
    expect(ias[1]!.body.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(ias[1]!.body.messages[2].content).toMatch(/Não responda com explicações nem recusas/)
    expect(b.feitas[0].detalhe).toMatch(/4 revisões/)
  })

  it('revisão que devolve texto truncado não vale: tenta de novo e, na 2ª falha, segue com o texto anterior', async () => {
    await chamar()
    fingirFetch((u, init) => {
      chamadas.push({ url: u, body: init?.body ? JSON.parse(String(init.body)) : null })
      if (u.includes('anthropic')) return jsonResp({ model: 'm', content: [{ type: 'text', text: 'Curto.' }], usage: { input_tokens: 1, output_tokens: 1 } })
      return jsonResp({ messageId: 'm1' }, 201)
    })
    await revisar(1)
    const linha = () => estado.tabelas.pecas_automaticas[0] as Record<string, any>
    expect(linha().perfil.rev).toBe(0)
    expect(linha().erro).toMatch(/^revisão 1:/)
    await revisar(1)
    expect(linha().perfil.rev).toBe(1)
    expect(linha().erro).toMatch(/revisão 1 não aplicada/)
    expect(String(linha().texto)).toContain('EXCELENTÍSSIMO')
  })
})
