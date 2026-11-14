// Peças automáticas: 7 dias antes de cada prazo (ou já, se o prazo for mais curto), escreve a peça
// e manda por e-mail, pronta para revisão, para as pessoas cadastradas em "Quem recebe as peças".
// - Estilo: as peças de referência do responsável (estilos_escrita) e a rotação de perfil (estiloPecas),
//   para que nenhuma saia com cara de modelo repetido.
// - Formatação: a do responsável (formatacao_escrita) ou o padrão de grandes escritórios; anexo .doc que o Word abre.
// - Nunca protocola nada. Jurisprudência só com "[conferir no tribunal]".
// Roda pelo cron (x-cron-secret) ou pelo botão "Escrever as peças agora" (usuário logado; aceita { tarefa_id }).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { pecaEmHtml, FORMATOS, BANCA, sortearFormato, sortearPerfil, instrucoesDoPerfil, amostrasDoAutor, hash32, medirTexto, aderencia, somarDias, br, escolherRedator, instrucoesDoRedator, instrucoesDeNarrativa, tomDoJulgador, instrucoesDoJulgador } from '../_compartilhado/juridico.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const MODELO = 'claude-sonnet-5-5'
const ANTECEDENCIA = 7
const POR_RODADA = Number(Deno.env.get('PECAS_POR_RODADA') ?? '4')
const hojeBrasilia = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const b64 = (s: string) => { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin) }
const nomeArquivo = (t: string) => `${t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'peca'}.doc`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function usuarioDoToken(req: Request): { id: string } | null {
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const t = parte.replace(/-/g, '+').replace(/_/g, '/')
    const c = JSON.parse(atob(t + '='.repeat((4 - (t.length % 4)) % 4)))
    return c.role === 'authenticated' ? { id: c.sub } : null
  } catch { return null }
}

// Rótulos das regras da tela "Parâmetros de escrita" (configuracoes, chaves escrita_*), na ordem em que entram no pedido à IA.
const REGRAS_ESCRITA: [string, string][] = [
  ["estrutura_cabecalho", "Cabeçalho padrão"],
  ["estrutura_secoes", "Seções obrigatórias"],
  ["estrutura_comprimento_peticao", "Comprimento máximo (páginas)"],
  ["estrutura_comprimento_recurso", "Comprimento máximo – recursos (páginas)"],
  ["estrutura_minimo_palavras", "Tamanho mínimo da peça (palavras; manifestação simples, metade)"],
  ["linguagem_nivel", "Nível de formalidade"],
  ["linguagem_voz", "Voz preferencial"],
  ["linguagem_latim", "Uso de expressões em latim"],
  ["linguagem_comprimento_paragrafo", "Comprimento máximo de parágrafo (linhas)"],
  ["linguagem_repeticao", "Instrução contra redundância"],
  ["arg_metodo", "Método de argumentação"],
  ["arg_hierarquia_fontes", "Hierarquia de fontes"],
  ["arg_jurisprudencia_max", "Máximo de citações jurisprudenciais por tese"],
  ["arg_tese_min", "Mínimo de fundamentos por pedido"],
  ["pedidos_criterio", "Critério para redigir pedidos"],
  ["pedidos_subsidiarios", "Instrução para pedidos subsidiários"],
  ["pedidos_tutela", "Tutela de urgência: padrão de justificativa"],
  ["ref_formato_jurisprudencia", "Formato de citação de julgados"],
  ["ref_formato_doutrina", "Formato de citação de doutrina"],
  ["ref_verificar_antes", "Instrução de verificação prévia"],
  ["qualidade_checklist", "Checklist de revisão final"],
  ["qualidade_formatacao", "Formatação padrão (NBR 14724)"],
  ["tipos_peticao_inicial", "Petição inicial"],
  ["tipos_contestacao", "Contestação"],
  ["tipos_recurso", "Recursos (apelação, agravo)"],
  ["tipos_manifestacao", "Manifestações e petições incidentais"],
]
function regrasDeEscrita(conf: Record<string, string>): string {
  const linhas = REGRAS_ESCRITA.map(([c, rotulo]) => [rotulo, String(conf[`escrita_${c}`] ?? '').trim()]).filter(([, v]) => v).map(([r, v]) => `- ${r}: ${v.replace(/\n+/g, ' | ')}`)
  return linhas.length ? `\n\nPARÂMETROS DE ESCRITA DO ESCRITÓRIO (definidos pelo escritório; siga todos, salvo quando contrariarem as regras acima sobre fatos, jurisprudência e títulos sem número):\n${linhas.join('\n')}` : ''
}

// Tarefas que não pedem peça (audiência, só leitura, pagamento do cliente).
const SEM_PECA = /^(comparecer|ler a publica|ler e decidir|pagar a d|cumprir o que o juiz)/i

const BASE_SISTEMA = `Você é advogado sênior de um escritório brasileiro e redige peças processuais completas, prontas para revisão do advogado responsável.
Regras: padrão forense brasileiro; endereçamento ao juízo correto; qualificação com [campos entre colchetes] para o que não estiver nos dados; fatos SÓ os que estão na publicação e nos dados do caso (o que faltar vai entre colchetes); fundamentação com artigo e lei; pedidos numerados; local, data e assinatura com [advogado] e [OAB].
Nunca invente jurisprudência: se citar precedente, marque "[conferir no tribunal]". Doutrina só com certeza, senão "[doutrina a conferir]".
Ao final, depois da assinatura, acrescente a seção "PONTOS A CONFERIR ANTES DE PROTOCOLAR" com o que depende de documentos ou fatos.
Acabamento: a resposta começa direto no endereçamento, sem aviso, saudação ou comentário antes; não use linhas de traços nem títulos em markdown; o nome da peça vai sozinho numa linha, em caixa alta; pedidos em alíneas a), b), c), uma por linha; fecho com "Nestes termos, pede deferimento.", depois local e data, depois [advogado] e [OAB] em linhas separadas. Qualquer observação sua para o advogado (dúvida sobre a natureza do ato, prazo, dado que falta) vai SÓ na seção final de pontos a conferir.
Extensão: a peça é completa e desenvolvida, nunca resumida nem esquemática. Mínimo de cerca de 1.600 palavras (quatro páginas) em recurso, contestação, réplica, memoriais e embargos; mínimo de cerca de 800 palavras em manifestação e petição simples. Desenvolva fatos, fundamentos e pedidos por inteiro; mesmo com poucos dados, escreva a peça toda, com [campos] onde faltar informação e a explicação em PONTOS A CONFERIR.
Títulos de seção em caixa alta, numa linha só e SEM número (ex.: DOS FATOS): a numeração e a formatação final são aplicadas depois, pelo modelo do escritório. Não use markdown além de **negrito** pontual.`

// Cada peça passa por 4 revisões, uma por rodada, antes de ir para o e-mail.
const REVISOES: { nome: string; foco: string }[] = [
  { nome: 'fatos, partes e endereçamento', foco: 'Confronte cada fato, data, valor, nome de parte e número com a publicação e os dados do caso. Fato sem apoio vai para [colchetes]. Confira se a peça é a certa para o ato (o que a publicação manda fazer) e se está endereçada a quem vai decidir: o juízo da vara quando o processo está em primeiro grau; o relator ou o presidente do órgão quando está no tribunal. Corrija prazo e cabimento citados.' },
  { nome: 'fundamentação, pedidos e citações', foco: 'Confira cada artigo e lei citados (existência, número, aplicação ao caso). Todo precedente leva "[conferir no tribunal]"; doutrina só com certeza, senão "[doutrina a conferir]"; retire o que não puder sustentar. Os pedidos devem decorrer da fundamentação, sem pedido a mais, a menos ou contraditório, e cobrir o que a publicação exige.' },
  { nome: 'escrita: redator, narrativa e tom do julgador', foco: 'Reescreva só o necessário para aplicar à peça o método e as forças do redator de referência, as dez técnicas de narrativa, o tom ajustado ao julgador e os parâmetros do escritório. Corte repetição, adjetivo, parágrafo longo e rodeio; frases diretas e precisas. Nada de humor, ironia ou imagem que o tom do julgador não autorize.' },
  { nome: 'acabamento e pontos a conferir', foco: 'Confira a estrutura final: endereçamento, classe e número, qualificação, nome da peça sozinho em caixa alta, títulos de seção em caixa alta e sem número, pedidos em alíneas, "Nestes termos, pede deferimento.", local e data, [advogado] e [OAB]. Sem markdown além de negrito pontual e sem linhas de traços. Releia a peça inteira como o julgador: nada cortado, repetido ou contraditório. Se a peça estiver curta para o ato (menos de 1.600 palavras em recurso, contestação, réplica, memoriais ou embargos; menos de 800 em manifestação), desenvolva fatos e fundamentos até a extensão devida. Atualize a seção PONTOS A CONFERIR ANTES DE PROTOCOLAR com tudo o que ficou entre colchetes e todo dado a confirmar; ela é obrigatória.' },
]
// Tamanho mínimo da peça (caracteres): abaixo disso a IA é chamada de novo; a revisão não pode encolher a peça além de 20%.
const MINIMO_PECA = 4500
const REVISOES_POR_RODADA = Number(Deno.env.get('REVISOES_POR_RODADA') ?? '10')

const pedidoDaPeca = (t: Record<string, any>, caso: Record<string, any> | null) => `Redija a peça para cumprir esta tarefa: "${t.titulo}".
Processo: ${t.numero_processo}. Prazo final: ${br(t.prazo)}.
Cliente: ${t.cliente ?? caso?.cliente ?? '[cliente]'}. Área: ${t.area ?? caso?.area ?? '[área]'}.
Caso: ${caso?.titulo ?? ''}
${String(caso?.descricao ?? '').slice(0, 2500)}

Publicação e orientação do prazo:
${String(t.descricao ?? '').slice(0, 9000)}`

// Chama a IA; se vier curto demais (recusa ou explicação), pede de novo uma vez, sem aceitar recusa.
async function chamarIA(chave: string, system: string, user: string, minimo: number) {
  const mensagens: { role: string; content: string }[] = [{ role: 'user', content: user }]
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODELO, max_tokens: 12000, system, messages: mensagens }),
      signal: AbortSignal.timeout(120000),
    })
    if (!r.ok) throw new Error(`IA respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
    const resp = await r.json()
    const texto = ((resp.content ?? []) as { type: string; text?: string }[]).filter(c => c.type === 'text').map(c => c.text).join('\n').trim()
    if (texto.length >= minimo) return { texto, resp }
    if (tentativa >= 1) throw new Error(`A IA devolveu um texto curto demais: "${texto.slice(0, 120).replace(/\s+/g, ' ')}"`)
    mensagens.push({ role: 'assistant', content: texto || '(sem texto)' }, { role: 'user', content: 'Isso não é a peça, ou ficou curta demais. Redija agora a peça completa e desenvolvida, do endereçamento até a seção PONTOS A CONFERIR, com a extensão mínima pedida, mesmo que faltem dados: o que faltar fica entre [colchetes] e vai para PONTOS A CONFERIR. Não responda com explicações nem recusas.' })
  }
}

async function enviarEmail(conf: Record<string, string>, destinatarios: string[], t: Record<string, any>, titulo: string, html: string): Promise<{ enviada: boolean; detalhe?: string }> {
  if (!destinatarios.length) return { enviada: false, detalhe: 'Ninguém cadastrado para receber as peças.' }
  if (!conf.brevo_api_key || !conf.email_remetente) return { enviada: false, detalhe: 'Provedor de e-mail não configurado (Configurações → E-mail).' }
  const corpoEmail = `<div style="font-family:Georgia,serif;max-width:640px;margin:auto">
<div style="background:#14213d;color:#fff;padding:16px"><h2 style="margin:0;font-size:18px">Peça pronta para revisão</h2></div>
<div style="padding:16px;line-height:1.5"><p><strong>${esc(String(t.titulo))}</strong></p>
<p>Processo <strong>${esc(String(t.numero_processo))}</strong> · prazo final <strong>${br(t.prazo)}</strong>.</p>
<p>A peça passou por 4 revisões (fatos e endereçamento, fundamentação e pedidos, escrita e tom do julgador, acabamento) e está em anexo (abre no Word, já formatada). Revise os campos entre colchetes e os "pontos a conferir" no fim antes de protocolar.</p>
<p style="font-size:12px;color:#666">Escrita automaticamente pela plataforma THEYE Institute a partir da publicação no Diário de Justiça Eletrônico Nacional. O prazo foi calculado pelo código do ramo; confira na publicação.</p></div></div>`
  const env = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'THEYE Institute · Peças', email: conf.email_remetente }, to: destinatarios.map(email => ({ email })), subject: `Peça pronta: ${titulo} · vence ${br(t.prazo)}`.slice(0, 200), htmlContent: corpoEmail, attachment: [{ name: nomeArquivo(titulo), content: b64('\uFEFF' + html) }] }),
  })
  return env.ok ? { enviada: true } : { enviada: false, detalhe: `E-mail recusado (${env.status}): ${(await env.text()).slice(0, 200)}` }
}

// Uma passada de revisão numa peça; na 4ª, formata e envia por e-mail.
async function revisarUma(s: any, r: Record<string, any>, ctx: { conf: Record<string, string>; regras: string; chave: string; destinatarios: string[] }) {
  const etapa = Number((r.perfil as Record<string, any> | null)?.rev ?? 0)
  const rev = REVISOES[etapa]!
  try {
    const { data: t } = await s.from('tarefas').select('id,titulo,descricao,prazo,pai_id,numero_processo,cliente,area,responsavel_id,escritorio_id').eq('id', r.tarefa_id).maybeSingle()
    if (!t) { await s.from('pecas_automaticas').update({ perfil: { ...(r.perfil ?? {}), pend: false, rev_em: null }, erro: 'Tarefa não encontrada para revisar.' }).eq('id', r.id); return { id: r.id, titulo: r.titulo, revisoes: etapa, detalhe: 'tarefa não encontrada' } }
    const [{ data: caso }, { data: form }] = await Promise.all([
      t.pai_id ? s.from('tarefas').select('titulo,cliente,area,descricao').eq('id', t.pai_id).maybeSingle() : Promise.resolve({ data: null }),
      t.responsavel_id ? s.from('formatacao_escrita').select('dados').eq('usuario_id', t.responsavel_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    const perfil = (r.perfil ?? {}) as Record<string, any>
    const redator = (BANCA as any[]).find(b => b.id === perfil.redator) ?? BANCA[0]
    const { orgao, ...tom } = (perfil.julgador ?? { orgao: null, ...tomDoJulgador([]) }) as Record<string, any>
    const sistema = `Você é revisor sênior de peças processuais de um escritório brasileiro. Esta é a REVISÃO ${etapa + 1} DE 4: ${rev.nome}.
Devolva SOMENTE o texto integral da peça revisada, do endereçamento até a seção PONTOS A CONFERIR, sem comentário antes ou depois. Mantenha o que já está correto e mude só o que o foco desta revisão exige. Nunca invente fato, número, valor, data ou precedente.
FOCO DESTA REVISÃO: ${rev.foco}

${BASE_SISTEMA}${ctx.regras}\n\n${instrucoesDoRedator(redator)}\n\n${instrucoesDeNarrativa()}\n\n${instrucoesDoJulgador(tom as any, orgao as string | null)}`
    const user = `${pedidoDaPeca(t, caso)}\n\nTEXTO ATUAL DA PEÇA:\n${r.texto}`
    const { texto, resp } = await chamarIA(ctx.chave, sistema, user, Math.max(MINIMO_PECA, Math.floor(String(r.texto).length * 0.8)))
    await s.from('consumo_api').insert({ funcao: 'peças automáticas (revisão)', modelo: resp.model ?? MODELO, tokens_entrada: resp.usage?.input_tokens ?? 0, tokens_saida: resp.usage?.output_tokens ?? 0, usuario_id: t.responsavel_id ?? null })
    return await concluirPasso(s, r, texto, etapa, t, form, perfil, ctx)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Se a mesma revisão falha pela 2ª vez, segue com o texto que já havia, anotando o motivo.
    // Erro da própria IA (crédito, limite de ritmo, instabilidade) NÃO conta como revisão pulada: a peça espera e tenta de novo, sem seguir para o e-mail.
    const falhaDeServico = /^IA respondeu \d+/.test(msg)
    if (!falhaDeServico && String(r.erro ?? '').startsWith(`revisão ${etapa + 1}:`)) {
      const { data: t } = await s.from('tarefas').select('id,titulo,prazo,numero_processo,responsavel_id,escritorio_id').eq('id', r.tarefa_id).maybeSingle()
      const { data: form } = t?.responsavel_id ? await s.from('formatacao_escrita').select('dados').eq('usuario_id', t.responsavel_id).maybeSingle() : { data: null }
      return await concluirPasso(s, r, String(r.texto), etapa, t ?? { id: r.tarefa_id, titulo: r.titulo, numero_processo: r.numero, prazo: null }, form, (r.perfil ?? {}) as Record<string, any>, ctx, `revisão ${etapa + 1} não aplicada: ${msg}`)
    }
    await s.from('pecas_automaticas').update({ perfil: { ...(r.perfil ?? {}), rev_em: null }, erro: `revisão ${etapa + 1}: ${msg}`.slice(0, 400) }).eq('id', r.id)
    return { id: r.id, titulo: r.titulo, revisoes: etapa, detalhe: msg }
  }
}

async function concluirPasso(s: any, r: Record<string, any>, texto: string, etapa: number, t: Record<string, any>, form: any, perfil: Record<string, any>, ctx: { conf: Record<string, string>; destinatarios: string[] }, aviso?: string) {
  if (etapa + 1 < REVISOES.length) {
    await s.from('pecas_automaticas').update({ texto, perfil: { ...perfil, rev: etapa + 1, rev_em: null }, erro: aviso ?? null }).eq('id', r.id)
    return { id: r.id, titulo: r.titulo, revisoes: etapa + 1 }
  }
  const formato = (FORMATOS as any[]).find(f => f.id === perfil.formato) ?? FORMATOS[0]
  const html = pecaEmHtml(texto, r.titulo, form?.dados ?? null, formato)
  const nota = aderencia(medirTexto(texto), perfil as any)
  const { enviada, detalhe } = await enviarEmail(ctx.conf, ctx.destinatarios, t, r.titulo, html)
  await s.from('pecas_automaticas').update({ texto, perfil: { ...perfil, rev: etapa + 1, pend: false, rev_em: null }, aderencia: nota, enviada_para: enviada ? ctx.destinatarios : [], enviada_em: enviada ? new Date().toISOString() : null, erro: [aviso, detalhe].filter(Boolean).join(' | ') || null }).eq('id', r.id)
  return { id: r.id, titulo: r.titulo, revisoes: etapa + 1, enviada, detalhe }
}

// Rodada de revisões: pega as peças pendentes (as mais adiantadas primeiro, para saírem logo) e dá mais uma passada em cada.
async function revisarPendentes(s: any, ctx: { conf: Record<string, string>; regras: string; chave: string; destinatarios: string[] }) {
  const corte = new Date(Date.now() - 4 * 60000).toISOString()
  const { data } = await s.from('pecas_automaticas').select('id,tarefa_id,numero,titulo,texto,perfil,erro,criado_em').is('enviada_em', null).order('criado_em').limit(300)
  const pendentes = ((data ?? []) as Record<string, any>[]).filter(r => r.perfil?.pend === true)
  const prontas = pendentes.filter(r => !r.perfil.rev_em || String(r.perfil.rev_em) < corte).sort((a, b) => Number(b.perfil.rev ?? 0) - Number(a.perfil.rev ?? 0)).slice(0, REVISOES_POR_RODADA)
  const marca = new Date().toISOString()
  await Promise.all(prontas.map(r => { r.perfil = { ...r.perfil, rev_em: marca }; return s.from('pecas_automaticas').update({ perfil: r.perfil }).eq('id', r.id) }))
  const feitas = await Promise.all(prontas.map(r => revisarUma(s, r, ctx)))
  return { pendentes: pendentes.length, nesta_rodada: prontas.length, feitas }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const s = sb()
  const usuario = usuarioDoToken(req)
  if (!usuario) {
    const enviado = req.headers.get('x-cron-secret')
    const { data } = enviado ? await s.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle() : { data: null }
    if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'Entre na plataforma.' }, 401)
  }
  const corpo = await req.json().catch(() => ({}))
  const hoje = hojeBrasilia()
  const limite = somarDias(hoje, ANTECEDENCIA)

  const { data: cfg } = await s.from('configuracoes').select('chave,valor').in('chave', ['pecas_destinatarios', 'brevo_api_key', 'email_remetente', 'anthropic_api_key', ...REGRAS_ESCRITA.map(([c]) => `escrita_${c}`)])
  const conf = Object.fromEntries(((cfg ?? []) as { chave: string; valor: string }[]).map(c => [c.chave, c.valor]))
  const regras = regrasDeEscrita(conf)
  const chave = Deno.env.get('ANTHROPIC_API_KEY') || conf.anthropic_api_key
  if (!chave) return json({ erro: 'Falta a chave da IA (Configurações → Chave da IA).' }, 400)
  const destinatarios = String(conf.pecas_destinatarios ?? '').split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  if (corpo.revisar) return json(await revisarPendentes(s, { conf, regras, chave, destinatarios }))

  let q = s.from('tarefas').select('id,titulo,descricao,prazo,pai_id,numero_processo,cliente,area,responsavel_id,escritorio_id').eq('nivel', 'tarefa').neq('situacao', 'feito')
  if (corpo.tarefa_id) q = q.eq('id', String(corpo.tarefa_id))
  else q = q.is('peca_automatica_em', null).not('numero_processo', 'is', null).gte('prazo', hoje).lte('prazo', limite).order('prazo').limit(POR_RODADA * 3)
  const { data: tarefasBrutas, error } = await q
  if (error) return json({ erro: error.message }, 500)
  const tarefas = ((tarefasBrutas ?? []) as Record<string, any>[]).filter(t => corpo.tarefa_id || !SEM_PECA.test(String(t.titulo))).slice(0, POR_RODADA)

  const feitas: { tarefa: string; titulo: string; enviada: boolean; detalhe?: string; redator?: string }[] = []
  for (const t of tarefas) {
    try {
      const [{ data: caso }, { data: estilos }, { data: form }] = await Promise.all([
        t.pai_id ? s.from('tarefas').select('titulo,cliente,area,descricao').eq('id', t.pai_id).maybeSingle() : Promise.resolve({ data: null }),
        t.responsavel_id ? s.from('estilos_escrita').select('titulo,texto').eq('usuario_id', t.responsavel_id).order('criado_em').limit(10) : s.from('estilos_escrita').select('titulo,texto').order('criado_em').limit(6),
        t.responsavel_id ? s.from('formatacao_escrita').select('dados').eq('usuario_id', t.responsavel_id).maybeSingle() : Promise.resolve({ data: null }),
      ])
      const { data: anteriores } = await s.from('pecas_automaticas').select('perfil').order('criado_em', { ascending: false }).limit(6)
      const semente = hash32(`${t.id}|${Date.now()}`)
      // Formatação em rodízio entre 10 modelos, sem repetir os últimos usados.
      const formato = sortearFormato(semente, ((anteriores ?? []) as { perfil: any }[]).map(a => a.perfil?.formato).filter(Boolean))
      // Banca dos dez redatores: escolhe pela área e pelo tipo da peça, sem repetir o das últimas peças.
      const area = t.area ?? caso?.area ?? undefined
      const redator = escolherRedator({ area, titulo: `${t.titulo} ${caso?.titulo ?? ''}`, anteriores: ((anteriores ?? []) as { perfil: any }[]).map(a => a.perfil?.redator).filter(Boolean), semente })
      const perfil = sortearPerfil({ semente, especialidade: area, escolas: [redator.escola], anteriores: ((anteriores ?? []) as { perfil: any }[]).map(a => a.perfil).filter((p: any) => p?.parametros) })
      // Tom ajustado a quem julga: lê as decisões e despachos do próprio juízo já publicados neste processo.
      const { data: irmas } = t.pai_id ? await s.from('tarefas').select('descricao').eq('pai_id', t.pai_id).limit(15) : { data: null }
      const publicado = (d: unknown) => String(d ?? '').split(/Publicação de [^\n]*:\n/)[1]?.split('\nLeitura automática')[0] ?? ''
      const doJuizo = [t, ...((irmas ?? []) as { descricao?: string }[])].map(x => publicado(x.descricao)).filter(Boolean)
      const tom = tomDoJulgador([...new Set(doJuizo)])
      const orgao = String(t.descricao ?? '').match(/Publicação de [^(\n]*\(([^)\n]+)\):/)?.[1] ?? null
      const amostras = (estilos ?? []).length ? amostrasDoAutor(estilos as { titulo: string; texto: string }[], 60000) : []
      const estilo = amostras.length ? `\n\nESTILO DE ESCRITA DO ESCRITÓRIO (${amostras.length} peças de referência). Imite vocabulário, extensão das frases, forma de abrir e fechar, tom, numeração e modo de citar a lei. Nunca copie fatos das amostras.\n${amostras.join('\n\n')}\nQuando houver estilo do escritório, ele prevalece; use o perfil abaixo só para variar ritmo, conectivos, abertura e fecho.` : ''
      const sistema = `${BASE_SISTEMA}${regras}${estilo}\n\n${instrucoesDoRedator(redator)}\n\n${instrucoesDeNarrativa()}\n\n${instrucoesDoJulgador(tom, orgao)}\n\n${instrucoesDoPerfil(perfil)}`
      const pedido = pedidoDaPeca(t, caso)
      const { texto, resp } = await chamarIA(chave, sistema, pedido, MINIMO_PECA)
      await s.from('consumo_api').insert({ funcao: 'peças automáticas', modelo: resp.model ?? MODELO, tokens_entrada: resp.usage?.input_tokens ?? 0, tokens_saida: resp.usage?.output_tokens ?? 0, usuario_id: t.responsavel_id ?? null })
      const titulo = `${String(t.titulo).split(' · ')[0]} · ${t.numero_processo}`
      const nota = aderencia(medirTexto(texto), perfil)
      // O rascunho não sai por e-mail: passa por 4 revisões (rodada "revisar") e só então é enviado.
      await s.from('pecas_automaticas').insert({ tarefa_id: t.id, escritorio_id: t.escritorio_id, numero: t.numero_processo, titulo, texto, perfil: { ...perfil, formato: formato.id, redator: redator.id, julgador: { orgao, ...tom }, redatorReferencia: redator.referencia, pend: true, rev: 0, rev_em: null }, aderencia: nota, enviada_para: [], enviada_em: null, erro: null })
      await s.from('tarefas').update({ peca_automatica_em: new Date().toISOString() }).eq('id', t.id)
      feitas.push({ tarefa: t.id, titulo, enviada: false, detalhe: 'Rascunho pronto; passa por 4 revisões antes de ir para o e-mail.', redator: redator.referencia })
    } catch (e) {
      feitas.push({ tarefa: t.id, titulo: String(t.titulo), enviada: false, detalhe: e instanceof Error ? e.message : String(e) })
    }
  }
  return json({ hoje, ate: limite, candidatas: tarefas.length, feitas, destinatarios: destinatarios.length })
})
