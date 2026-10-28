// Assistente jurídico: responde perguntas citando a legislação brasileira buscada AO VIVO
// no Planalto (texto compilado oficial), com um agente por especialidade.
// Fluxo por pergunta (2 chamadas à IA, para economizar tokens):
//   1. modelo econômico escolhe quais leis do catálogo abrir e os termos de busca;
//   2. os artigos mais relevantes dessas leis vão ao modelo principal, que responde citando artigo e lei.
// O texto de cada lei fica em cache na tabela leis_texto por 7 dias.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODELO_TRIAGEM = 'claude-haiku-5-5'
const MODELO_RESPOSTA = 'claude-sonnet-5-5'
const CACHE_DIAS = 7
const MAX_ARTIGOS = 28
const MAX_CHARS_CONTEXTO = 36000

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Catálogo de leis e códigos federais com texto compilado no Planalto. */
const CATALOGO: Record<string, { titulo: string; url: string; temas: string }> = {
  cf88: { titulo: 'Constituição Federal de 1988', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm', temas: 'direitos fundamentais, propriedade, função social, tributos, competências' },
  cc: { titulo: 'Código Civil (Lei 10.406/2002)', url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm', temas: 'contratos, comodato, locação civil, posse, propriedade, condomínio, prescrição, responsabilidade civil, pessoas jurídicas' },
  cpc: { titulo: 'Código de Processo Civil (Lei 13.105/2015)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm', temas: 'ações, prazos processuais, execução, despejo, tutela, recursos' },
  cdc: { titulo: 'Código de Defesa do Consumidor (Lei 8.078/1990)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm', temas: 'relações de consumo, cláusulas abusivas, incorporadoras e consumidores' },
  inquilinato: { titulo: 'Lei do Inquilinato (Lei 8.245/1991)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm', temas: 'locação urbana residencial e comercial, reajuste, garantias, renovatória, despejo, revisional' },
  condominio: { titulo: 'Lei de Condomínios e Incorporações (Lei 4.591/1964)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4591.htm', temas: 'incorporação imobiliária, convenção, assembleia, construção, distrato' },
  registros: { titulo: 'Lei de Registros Públicos (Lei 6.015/1973)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm', temas: 'matrícula, registro, averbação, cartório' },
  alienacao: { titulo: 'Alienação Fiduciária de Imóvel (Lei 9.514/1997)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9514.htm', temas: 'financiamento imobiliário, alienação fiduciária, consolidação da propriedade, leilão' },
  parcelamento: { titulo: 'Parcelamento do Solo Urbano (Lei 6.766/1979)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6766.htm', temas: 'loteamento, desmembramento, lotes' },
  cidade: { titulo: 'Estatuto da Cidade (Lei 10.257/2001)', url: 'https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm', temas: 'política urbana, IPTU progressivo, usucapião coletiva, plano diretor' },
  reurb: { titulo: 'Regularização Fundiária (Lei 13.465/2017)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13465.htm', temas: 'REURB, direito real de laje, condomínio de lotes, regularização' },
  distrato: { titulo: 'Lei do Distrato (Lei 13.786/2018)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13786.htm', temas: 'desfazimento de compra de imóvel na planta, retenção, devolução' },
  lgpd: { titulo: 'LGPD (Lei 13.709/2018)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', temas: 'dados pessoais de locatários, fiadores, fornecedores, consentimento, incidentes' },
  ctn: { titulo: 'Código Tributário Nacional (Lei 5.172/1966)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm', temas: 'IPTU, ITBI, obrigação tributária, responsabilidade do adquirente' },
  licitacoes: { titulo: 'Lei de Licitações (Lei 14.133/2021)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm', temas: 'contratos com a administração pública, locação pelo poder público' },
  clt: { titulo: 'CLT (Decreto-Lei 5.452/1943)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm', temas: 'empregados de condomínio, porteiros, zeladores, terceirização' },
  startups: { titulo: 'Marco Legal das Startups (Lei Complementar 182/2021)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp182.htm', temas: 'startups, ambiente regulatório experimental (sandbox regulatório), investidor-anjo, inovação' },
  liberdade: { titulo: 'Lei da Liberdade Econômica (Lei 13.874/2019)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13874.htm', temas: 'livre iniciativa, intervenção mínima nos contratos, abuso regulatório, análise de impacto regulatório' },
  anticorrupcao: { titulo: 'Lei Anticorrupção (Lei 12.846/2013)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm', temas: 'compliance, programa de integridade, responsabilidade objetiva da pessoa jurídica, acordo de leniência' },
  ambiental: { titulo: 'Política Nacional do Meio Ambiente (Lei 6.938/1981)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6938.htm', temas: 'ESG, responsabilidade ambiental, licenciamento, poluidor-pagador, passivo ambiental de imóveis' },
  usucapiao: { titulo: 'Usucapião extrajudicial e outros (Lei 6.015/1973 art. 216-A)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm', temas: 'usucapião em cartório' },
}

const ESPECIALIDADES: Record<string, string> = {
  imobiliario: 'Você é especialista em direito imobiliário: locação, comodato, compra e venda, incorporação, garantias e despejo.',
  condominial: 'Você é especialista em direito condominial: convenção, assembleias, cotas, inadimplência, obras e administração.',
  registral: 'Você é especialista em direito registral e notarial: matrícula, averbações, ITBI, usucapião e regularização fundiária.',
  consumidor: 'Você é especialista em direito do consumidor aplicado a imóveis: incorporadoras, distrato, vícios construtivos e publicidade.',
  tributario: 'Você é especialista em tributação imobiliária: IPTU, ITBI, ganho de capital e responsabilidade do adquirente.',
  trabalhista: 'Você é especialista em direito do trabalho aplicado a condomínios e prestadores de serviço de imóveis.',
  lgpd: 'Você é especialista em proteção de dados (LGPD) aplicada a escritórios de advocacia e gestão de imóveis.',
  inovacao: 'Você é especialista em inovação e regulação: sandboxes regulatórios (CVM, Banco Central, ANPD, SUSEP, ANEEL), Marco Legal das Startups e Lei da Liberdade Econômica, aplicados a negócios imobiliários e proptechs.',
  compliance: 'Você é especialista em governança, ESG e compliance: programa de integridade (Lei 12.846/13), LGPD, passivo ambiental e due diligence de imóveis e contrapartes.',
  geral: 'Você é um advogado generalista brasileiro, cuidadoso e didático.',
}

function usuarioAutenticado(req: Request): string | null {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const parte = token.split('.')[1]
    if (!parte) return null
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return payload?.role === 'authenticated' ? String(payload.sub) : null
  } catch {
    return null
  }
}

function servico() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function obterChave(): Promise<string | null> {
  const doAmbiente = Deno.env.get('ANTHROPIC_API_KEY')
  if (doAmbiente) return doAmbiente
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', 'anthropic_api_key').maybeSingle()
  return data?.valor || null
}

/** HTML do Planalto (windows-1252) → texto limpo. */
function htmlParaTexto(bytes: ArrayBuffer): string {
  let html = new TextDecoder('windows-1252').decode(bytes)
  if (/charset=["']?utf-8/i.test(html)) html = new TextDecoder('utf-8').decode(bytes)
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#?\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

/** Texto da lei: cache de 7 dias ou busca ao vivo no Planalto. */
async function textoDaLei(id: string): Promise<string | null> {
  const lei = CATALOGO[id]
  if (!lei) return null
  const sb = servico()
  const { data } = await sb.from('leis_texto').select('texto,buscado_em').eq('id', id).maybeSingle()
  if (data && Date.now() - new Date(data.buscado_em).getTime() < CACHE_DIAS * 86400000) return data.texto
  try {
    const r = await fetch(lei.url, { headers: { 'User-Agent': 'Mozilla/5.0 (LSM plataforma)' }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return data?.texto ?? null
    const texto = htmlParaTexto(await r.arrayBuffer())
    if (texto.length < 2000) return data?.texto ?? null
    await sb.from('leis_texto').upsert({ id, titulo: lei.titulo, url: lei.url, texto, buscado_em: new Date().toISOString() })
    return texto
  } catch {
    return data?.texto ?? null
  }
}

/** Divide o texto em artigos ("Art. 51. …"), mantendo parágrafos e incisos com o artigo. */
function artigos(texto: string): { numero: string; corpo: string }[] {
  const partes = texto.split(/(?=\n\s*Art\.\s*\d+)/)
  return partes
    .map(p => {
      // Códigos grandes numeram com ponto de milhar ("Art. 1.336"); guardamos sem o ponto.
      const m = p.match(/Art\.\s*(\d{1,3}(?:\.\d{3})*(?:-[A-Z])?)/)
      return m ? { numero: m[1].replace(/\./g, ''), corpo: p.trim().slice(0, 2500) } : null
    })
    .filter((a): a is { numero: string; corpo: string } => !!a)
}

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Pontua cada artigo pelos termos da triagem; números de artigo citados valem mais. */
function selecionar(leiId: string, texto: string, termos: string[], artigosCitados: string[]) {
  const lista = artigos(texto)
  const termosN = termos.map(normalizar).filter(t => t.length > 2)
  return lista
    .map(a => {
      const corpoN = normalizar(a.corpo)
      let pontos = termosN.reduce((s, t) => s + (corpoN.includes(t) ? 1 + Math.min(3, (corpoN.split(t).length - 1) / 2) : 0), 0)
      if (artigosCitados.includes(a.numero)) pontos += 10
      return { leiId, ...a, pontos }
    })
    .filter(a => a.pontos > 0)
}

// Chama a Anthropic com nova tentativa em sobrecarga. Alguns modelos recusam tool_choice forçado:
// nesse caso repete com tool_choice automático e instrução explícita para usar a ferramenta.
async function anthropic(chave: string, corpo: Record<string, unknown>, usuario: string | null = null) {
  if (await tetoAtingido()) throw new Error('Teto mensal de gasto com IA atingido. Um administrador pode ajustá-lo em Configurações → Consumo.')
  let atual = corpo
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify(atual),
      signal: AbortSignal.timeout(90000),
    }).catch(() => null)
    if (r?.ok) { const j = await r.json(); await registrarConsumo('assistente-juridico', usuario, j); return j }
    const s = r?.status ?? 0
    const detalhe = r ? await r.text() : 'sem resposta'
    console.error('assistente anthropic', s, detalhe.slice(0, 300))
    if (s === 400 && detalhe.includes('tool_choice') && atual.tool_choice) {
      const nome = (atual.tool_choice as { name?: string }).name
      atual = { ...atual, tool_choice: { type: 'auto' }, system: `${atual.system ?? ''}\nResponda obrigatoriamente chamando a ferramenta ${nome}, sem texto fora dela.` }
      continue
    }
    if (s === 401 || s === 403) throw new Error('Chave recusada pela Anthropic (inválida, revogada ou sem saldo).')
    if (s && s < 500 && s !== 429) throw new Error(`Anthropic respondeu ${s}.`)
    await new Promise(ok => setTimeout(ok, 2000))
  }
  throw new Error('A IA está sobrecarregada agora; tente de novo em instantes.')
}

// Registra tokens gastos na Anthropic para a tela de transparência de custos (melhor esforço).
async function registrarConsumo(funcao: string, usuario: string | null, r: { model?: string; usage?: { input_tokens?: number; output_tokens?: number } }) {
  try {
    const { createClient: cc } = await import('jsr:@supabase/supabase-js@2')
    await cc(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!).from('consumo_api')
      .insert({ funcao, usuario_id: usuario, modelo: r.model, tokens_entrada: r.usage?.input_tokens ?? 0, tokens_saida: r.usage?.output_tokens ?? 0 })
  } catch (_) { /* não derruba a resposta */ }
}

// Teto mensal de gasto definido pelo escritório (Configurações → Consumo). Sem teto = sem limite.
async function tetoAtingido(): Promise<boolean> {
  try {
    const { createClient: cc } = await import('jsr:@supabase/supabase-js@2')
    const { data } = await cc(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!).rpc('teto_consumo_atingido')
    return data === true
  } catch (_) { return false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const corpo = await req.json().catch(() => ({}))
  // Modo sonda: só confere a busca ao vivo da lei e a seleção de artigos (sem IA, sem gravar).
  if (corpo.sonda === true) {
    const id = String(corpo.lei ?? 'inquilinato')
    const texto = await textoDaLei(id)
    if (!texto) return json({ erro: 'Lei não encontrada.' }, 502)
    const sel = selecionar(id, texto, corpo.termos ?? [], corpo.artigos ?? []).sort((a, b) => b.pontos - a.pontos).slice(0, 5)
    return json({ lei: id, tamanho: texto.length, artigos: artigos(texto).length, selecionados: sel.map(a => ({ numero: a.numero, pontos: a.pontos, inicio: a.corpo.slice(0, 160) })) })
  }
  const usuario = usuarioAutenticado(req)
  // Teste automático diário (sem usuário): pergunta fixa definida aqui, nada é gravado.
  const TESTES: Record<string, { pergunta: string; modo: string }> = {
    responder: { pergunta: 'Qual o prazo para propor ação renovatória de locação comercial?', modo: 'responder' },
    caminhos: { pergunta: 'Locatário comercial com 3 aluguéis atrasados e fiador: quais caminhos?', modo: 'caminhos' },
  }
  const teste = !usuario && typeof corpo.teste === 'string' ? TESTES[corpo.teste] : null
  if (teste) Object.assign(corpo, { pergunta: teste.pergunta, modo: teste.modo, especialidade: 'imobiliario', historico: [], contexto: '' })
  if (!usuario && !teste) return json({ erro: 'Entre na plataforma para usar o assistente.' }, 401)
  const chave = await obterChave()
  if (!chave) return json({ erro: 'Chave da IA não configurada. Um administrador pode informá-la em Configurações → Inteligência artificial.' }, 503)

  const { pergunta, especialidade = 'imobiliario', historico = [], modo = 'responder', contexto: contextoCaso = '' } = corpo
  if (!['responder', 'redigir', 'caminhos'].includes(modo)) return json({ erro: 'Modo inválido.' }, 400)
  if (!pergunta || typeof pergunta !== 'string' || pergunta.trim().length < 5) return json({ erro: 'Escreva a pergunta.' }, 400)
  const papel = ESPECIALIDADES[especialidade] ?? ESPECIALIDADES.geral

  try {
    // 1) Triagem: quais leis abrir e o que procurar nelas.
    const catalogoResumo = Object.entries(CATALOGO).map(([id, l]) => `${id}: ${l.titulo} — ${l.temas}`).join('\n')
    const triagem = await anthropic(chave, {
      model: MODELO_TRIAGEM,
      max_tokens: 2000,
      tools: [{
        name: 'planejar_pesquisa',
        description: 'Escolhe as leis do catálogo e os termos para localizar os artigos pertinentes.',
        input_schema: {
          type: 'object',
          properties: {
            leis: { type: 'array', items: { type: 'string' }, description: 'Até 3 ids do catálogo, em ordem de importância.' },
            termos: { type: 'array', items: { type: 'string' }, description: 'De 4 a 10 palavras ou expressões curtas, em português, que aparecem nos artigos relevantes.' },
            artigos: { type: 'array', items: { type: 'string' }, description: 'Números de artigos que você já sabe serem centrais (ex.: "51", "1.196").' },
          },
          required: ['leis', 'termos'],
        },
      }],
      tool_choice: { type: 'tool', name: 'planejar_pesquisa' },
      system: `${papel}\nCatálogo de leis disponíveis (id: título — temas):\n${catalogoResumo}`,
      messages: [{ role: 'user', content: `Pedido do advogado (${modo}): ${pergunta}${contextoCaso ? `\nContexto do caso: ${contextoCaso}` : ''}` }],
    }, usuario)
    const plano = triagem.content?.find((c: { type: string }) => c.type === 'tool_use')?.input ?? { leis: ['cc'], termos: [] }
    const leisEscolhidas: string[] = (plano.leis ?? []).filter((id: string) => CATALOGO[id]).slice(0, 3)
    if (!leisEscolhidas.length) leisEscolhidas.push('cc')
    const termos: string[] = [...(plano.termos ?? []), ...pergunta.split(/\W+/).filter((p: string) => p.length > 5)]
    const citados: string[] = (plano.artigos ?? []).map((a: string) => a.replace(/\./g, '').replace(/[^\dA-Z-]/gi, ''))

    // 2) Busca ao vivo dos textos e seleção dos artigos.
    const textos = await Promise.all(leisEscolhidas.map(async id => ({ id, texto: await textoDaLei(id) })))
    const fontes = textos.filter(t => t.texto).map(t => ({ id: t.id, titulo: CATALOGO[t.id].titulo, url: CATALOGO[t.id].url }))
    const candidatos = textos.flatMap(t => (t.texto ? selecionar(t.id, t.texto, termos, citados) : []))
      .sort((a, b) => b.pontos - a.pontos)
    const escolhidos: typeof candidatos = []
    let chars = 0
    for (const a of candidatos) {
      if (escolhidos.length >= MAX_ARTIGOS || chars + a.corpo.length > MAX_CHARS_CONTEXTO) continue
      escolhidos.push(a); chars += a.corpo.length
    }
    const contexto = escolhidos.length
      ? escolhidos.map(a => `[${CATALOGO[a.leiId].titulo}] ${a.corpo}`).join('\n\n')
      : '(nenhum artigo localizado automaticamente; responda com base na doutrina e indique a lei a consultar)'

    // 3) Resposta por modo: responder (parecer curto), redigir (peça/contrato), caminhos (matriz de opções).
    const trechos = `TRECHOS DA LEGISLAÇÃO (texto compilado oficial do Planalto, consultado agora):\n\n${contexto}\n\n---\n${contextoCaso ? `CONTEXTO DO CASO: ${contextoCaso}\n` : ''}PEDIDO: ${pergunta}`
    const regrasComuns = `${papel}
Escreva em português do Brasil, para advogados do escritório Leticia Sardas & Menezes (Rio de Janeiro), em nível de pós-graduação: preciso, fundamentado e prático.
Fundamente cada afirmação citando artigo e lei (ex.: "art. 51 da Lei 8.245/91"), usando os trechos fornecidos; o que não estiver nos trechos deve vir marcado como "a conferir". Não invente artigos, prazos nem jurisprudência; se citar jurisprudência, diga que precisa ser verificada no tribunal.`
    const mensagens = [
      ...historico.slice(-6).map((h: { papel: string; texto: string }) => ({ role: h.papel === 'assistente' ? 'assistant' : 'user', content: h.texto })),
      { role: 'user', content: trechos },
    ]
    let texto = ''
    let dados: unknown = null

    if (modo === 'caminhos') {
      const ferramenta = {
        name: 'registrar_caminhos',
        description: 'Registra a matriz de caminhos possíveis para o caso.',
        input_schema: {
          type: 'object',
          properties: {
            sintese: { type: 'string', description: 'Duas frases sobre a situação e o que está em jogo.' },
            caminhos: {
              type: 'array', minItems: 2, maxItems: 5,
              items: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  descricao: { type: 'string', description: 'O que fazer, em 2–3 frases.' },
                  fundamento: { type: 'string', description: 'Artigos e leis que sustentam este caminho.' },
                  exito: { type: 'integer', minimum: 1, maximum: 5, description: 'Chance de êxito (1 baixa, 5 alta).' },
                  rapidez: { type: 'integer', minimum: 1, maximum: 5, description: '5 = resolve mais rápido.' },
                  custo: { type: 'integer', minimum: 1, maximum: 5, description: '5 = mais barato.' },
                  risco: { type: 'integer', minimum: 1, maximum: 5, description: '5 = menor risco.' },
                  zonaCinzenta: { type: 'string', description: 'Onde a lei é ambígua ou há divergência, e como lidar.' },
                },
                required: ['nome', 'descricao', 'fundamento', 'exito', 'rapidez', 'custo', 'risco'],
              },
            },
            recomendado: { type: 'integer', description: 'Índice (0-based) do caminho recomendado.' },
            porque: { type: 'string', description: 'Por que esse é o recomendado, em até 3 frases.' },
            proximosPassos: { type: 'array', items: { type: 'string' } },
          },
          required: ['sintese', 'caminhos', 'recomendado', 'porque', 'proximosPassos'],
        },
      }
      const r = await anthropic(chave, {
        model: MODELO_RESPOSTA, max_tokens: 8000, tools: [ferramenta], tool_choice: { type: 'tool', name: 'registrar_caminhos' },
        system: `${regrasComuns}\nMonte de 2 a 5 caminhos (extrajudicial, judicial, negociação, aguardar etc.), pontue cada um em quatro critérios e aponte as zonas cinzentas com honestidade.`,
        messages: mensagens,
      }, usuario)
      const bruto = r.content?.find((c: { type: string }) => c.type === 'tool_use')?.input ?? null
      // Com tool_choice automático alguns modelos devolvem listas como texto JSON; normalizamos.
      const lista = (v: unknown) => (typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return [] } })() : v)
      const d = bruto ? { ...bruto, caminhos: lista(bruto.caminhos), proximosPassos: lista(bruto.proximosPassos) ?? [] } : null
      if (!d || !Array.isArray(d.caminhos) || !d.caminhos.length) {
        console.error('assistente caminhos sem matriz', JSON.stringify(r.content ?? []).slice(0, 500))
        throw new Error('A IA não devolveu a matriz. Tente novamente.')
      }
      d.recomendado = Math.min(Math.max(0, Number(d.recomendado) || 0), d.caminhos.length - 1)
      if (!Array.isArray(d.proximosPassos)) d.proximosPassos = []
      dados = d
      texto = `${d.sintese}\n\n**Recomendado:** ${d.caminhos[d.recomendado]?.nome ?? d.caminhos[0]?.nome}. ${d.porque}`
    } else {
      const sistema = modo === 'redigir'
        ? `${regrasComuns}
Redija a peça ou o contrato pedido, completo e pronto para revisão: título; qualificação das partes com [campos entre colchetes] para o que faltar; cláusulas ou tópicos numerados; fundamentação legal embutida no texto (artigo e lei); pedidos ou cláusulas finais; local, data e assinatura. Use o padrão forense brasileiro e linguagem clara. Ao final, acrescente uma seção "Pontos a conferir antes de usar" com o que depende de fatos ou documentos.`
        : `${regrasComuns}
Estrutura: resposta direta em 1–2 frases; fundamentação com os artigos; riscos ou exceções (inclusive zonas cinzentas e divergências); próximos passos práticos. Títulos curtos em negrito e listas. Termine com "Fontes consultadas: " e os nomes das leis usadas.`
      const resposta = await anthropic(chave, { model: MODELO_RESPOSTA, max_tokens: modo === 'redigir' ? 12000 : 6000, system: sistema, messages: mensagens }, usuario)
      texto = (resposta.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim()
    }

    if (usuario) await servico().from('consultas_juridicas').insert({
      usuario_id: usuario, especialidade, pergunta, resposta: texto, fontes, modelo: MODELO_RESPOSTA, modo, dados,
    })
    return json({
      resposta: texto,
      dados,
      modo,
      fontes,
      artigosConsultados: escolhidos.map(a => ({ lei: CATALOGO[a.leiId].titulo, artigo: a.numero })),
      consultadoEm: new Date().toISOString(),
    })
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : 'Falha ao consultar a legislação.' }, 502)
  }
})
