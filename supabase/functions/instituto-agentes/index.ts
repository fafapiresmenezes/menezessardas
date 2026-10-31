// Plano I-02, passo U15: agentes do Instituto THEYE acionados por botão (Claude).
// Cada botão manda uma pergunta pronta (ou uma curta da pessoa) para um dos 50 agentes.
// Só gasta IA quando alguém aperta o botão; cota por pessoa e teto diário protegem o custo.
// Os agentes são IA com roteiro inspirado em currículos de doutorado; não são pessoas.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const SITE = 'https://instituto-theye.vercel.app'
const ORIGENS = ['https://theye.club', 'https://www.theye.club', SITE]
const MODELO = 'claude-sonnet-5-5'
const MODELO_RESERVA = 'claude-haiku-5-5'
const cors = { 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))

Deno.serve(async (req) => {
  const origem = req.headers.get('origin') ?? ''
  const permitida = ORIGENS.includes(origem) ? origem : SITE
  const r = await tratar(req)
  r.headers.set('Access-Control-Allow-Origin', permitida)
  return r
})

const SITE_INFO = `SOBRE O INSTITUTO (fatos do site):
- Dados: 5.350 ações de locação anonimizadas do DataJud/CNJ (TJRJ, TJSP, TJMG e outros), coleta diária; só agregados (LGPD).
- Ontologia v0.6 (locação): classes Tribunal, OrgaoJulgador, ClasseProcessual, Assunto, Processo, TipoDeParte (locador, locatário…), Movimento, Decisao, Tese, Precedente, Norma, Contrato, Imovel, HipoteseJuridica, PrevisaoJuridica. Relações: tramita_em, pertence_a, tem_classe, trata_de, envolve, resulta_em, invoca, aplica, vincula, fundamenta, regula, indexado_a, objeto_de, afeta, testa, preve, assunto_remete_a, tese_funda_em. 77 nós de norma da Lei 8.245/91, 13 teses típicas, 6 precedentes (STJ Súmulas 214, 268, 335, 549; STF Temas 295 e 1127). 90,1% dos processos ligam a pelo menos um artigo.
- Laboratório: cadastro com e-mail e CPF (guardado só como código irreversível), 1 consulta grátis. Membro: R$ 79/mês com 20 consultas; consulta avulsa R$ 3,94.
- Serviços: relatório preditivo de caso, radar agregado de órgão julgador, due diligence processual, monitoramento de publicações, jurimetria setorial, parecer de direito comparado, curso e certificação, dados abertos para pesquisa, painel de carteira, assessoria em sandboxes regulatórios.
- Escritório parceiro: GMenezes Advogados Associados usa a previsão do Instituto na tela Previsões.
- Prova de registro: documentos e protocolos têm sha256 ancorado no Bitcoin por OpenTimestamps.`

async function contexto() {
  const s = db()
  const [placar, motor, uso] = await Promise.all([s.rpc('instituto_placar_unico'), s.rpc('instituto_motor_resumo'), s.rpc('instituto_agentes_custo')])
  const m = JSON.stringify(motor.data ?? {}).slice(0, 3000)
  return `${SITE_INFO}\n\nPLACAR DE PROTOCOLOS (Brier, BSS, veredito):\n${JSON.stringify(placar.data ?? []).slice(0, 3500)}\n\nMOTOR (séries públicas coletadas, resumo):\n${m}\n\nCUSTO DOS AGENTES ATÉ AGORA: ${JSON.stringify(uso.data ?? {})}`
}

async function tratar(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const b = await req.json().catch(() => ({}))
  const s = db()
  if (b.acao === 'listar') {
    const [l, c] = await Promise.all([s.rpc('instituto_agentes_lista'), s.rpc('instituto_agentes_custo')])
    return json({ agentes: l.data ?? [], custo: c.data ?? {} })
  }
  if (b.acao !== 'perguntar') return json({ erro: 'Ação desconhecida.' }, 400)

  // Quem pergunta: pessoa cadastrada no laboratório (sessão) ou o teste automático (segredo do cron).
  const { data: conf } = await s.from('configuracoes').select('chave,valor').in('chave', ['anthropic_api_key', 'cron_segredo'])
  const c = Object.fromEntries((conf ?? []).map((x: { chave: string; valor: string }) => [x.chave, x.valor]))
  const robo = !!c.cron_segredo && req.headers.get('x-cron-secret') === c.cron_segredo
  if (!robo) {
    const { data: m } = await s.rpc('instituto_membro_por_sessao', { p_hash: await sha(String(b.sessao ?? '')) })
    if (!m?.id) return json({ erro: 'Entre no laboratório (cadastro gratuito) para usar os agentes.' }, 401)
    const { data: res } = await s.rpc('instituto_agente_reservar', { p_membro: m.id, p_membro_pleno: m.plano === 'membro' })
    if (res === 'teto') return json({ erro: 'Os agentes atingiram o limite de hoje. Volte amanhã.' }, 429)
    if (res === 'cota') return json({ erro: m.plano === 'membro' ? 'Você usou as 20 perguntas de hoje.' : 'Você usou as 3 perguntas grátis de hoje. Membros têm 20 por dia.' }, 429)
  }
  const { data: ag } = await s.rpc('instituto_agente_def', { p_id: String(b.agente ?? '') })
  if (!ag?.id) return json({ erro: 'Agente não encontrado.' }, 404)
  if (!c.anthropic_api_key) return json({ erro: 'IA indisponível agora.' }, 503)
  const pergunta = (String(b.pergunta ?? '').trim().slice(0, 500)) || ag.botao

  const sistema = `Você é "${ag.nome}", agente de IA do Instituto THEYE (pesquisa em predição jurídica e ontologia do direito, nicho locação no Brasil).
Área: ${ag.area}. Roteiro inspirado no currículo de doutorado de referência: ${ag.formacao}. Você não é uma pessoa nem tem vínculo com essas universidades; se perguntarem, diga isso.
Papel: ${ag.papel}
Regras: responda em português do Brasil, simples, para leigos, em no máximo 200 palavras, sempre terminando a resposta; cite artigo de lei ou súmula quando usar (Lei 8.245/91, STJ, STF); use só os números do contexto abaixo quando falar de dados do Instituto, e diga quando não houver dado; nunca dê garantia de resultado nem substitua um advogado; nunca peça nem comente dados pessoais; termine com uma linha "Para aprofundar:" indicando uma página do site (/placar.html, /ontologia.html, /locacao.html, /comparar.html, /laboratorio.html, /precos.html, /estudar.html).

${await contexto()}`

  let resp: Response | null = null, modelo = MODELO
  for (const mod of [MODELO, MODELO_RESERVA]) {
    modelo = mod
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': c.anthropic_api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Resposta curta e explicativa: sem raciocínio estendido (Sonnet 5.5 usa between_tools; Haiku 5.5 aceita disabled) e esforço baixo.
      body: JSON.stringify({ model: mod, max_tokens: 1500, system: sistema, messages: [{ role: 'user', content: pergunta }],
        thinking: { type: mod === MODELO ? 'between_tools' : 'disabled' }, output_config: { effort: 'low' } }),
    }).catch(() => null)
    if (resp?.ok) break
  }
  if (!resp?.ok) return json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' }, 502)
  const out = await resp.json()
  const texto = (out.content ?? []).filter((x: { type: string }) => x.type === 'text').map((x: { text: string }) => x.text).join('\n').trim()
  const tin = out.usage?.input_tokens ?? 0, tout = out.usage?.output_tokens ?? 0
  const { data: p } = await s.from('precos_api').select('usd_entrada_mtok,usd_saida_mtok').eq('modelo', modelo).maybeSingle()
  const usd = p ? (tin * Number(p.usd_entrada_mtok) + tout * Number(p.usd_saida_mtok)) / 1e6 : 0
  await s.rpc('instituto_agente_registrar', { p_agente: ag.id, p_in: tin, p_out: tout, p_usd: usd })
  await s.from('consumo_api').insert({ funcao: `Instituto: agente ${ag.id}`, modelo, tokens_entrada: tin, tokens_saida: tout })
  if (!texto) return json({ erro: 'O agente não conseguiu responder agora. Tente de novo.' }, 502)
  return json({ ok: true, agente: ag.nome, resposta: texto, modelo, tokens: { entrada: tin, saida: tout }, custo_usd: Number(usd.toFixed(6)) })
}
