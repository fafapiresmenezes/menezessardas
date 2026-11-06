// Plano I-02, passo U15: agentes do Instituto THEYE acionados por botão (Claude).
// Cada botão manda uma pergunta pronta (ou uma curta da pessoa) para um dos 50 agentes.
// Só gasta IA quando alguém aperta o botão; cota por pessoa e teto diário protegem o custo.
// Os agentes são IA com roteiro inspirado em currículos de doutorado; não são pessoas.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sortearPerfil, instrucoesDeRedacao, hash32 } from '../../../src/lib/estiloPecas.ts'
import { verificarPergunta, MSG_BLOQUEIO, REGRA_SISTEMA, embrulhar, respostaSegura } from './filtro.ts'
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
- Ontologia v0.7 (locação), publicada em OWL/Turtle em /ontologia-locacao-v07.ttl, com endereço permanente para cada termo em /o/ e 0 inconsistência no raciocinador OWL RL: classes Tribunal, OrgaoJulgador, ClasseProcessual, Assunto, Processo, TipoDeParte (locador, locatário…), Movimento, Decisao, Tese, Precedente, Norma, Contrato, Imovel, Prazo, Garantia, Documento, HipoteseJuridica, PrevisaoJuridica. Relações: tramita_em, pertence_a, tem_classe, trata_de, envolve, resulta_em, invoca, aplica, vincula, fundamenta, regula, indexado_a, objeto_de, afeta, testa, preve, assunto_remete_a, tese_funda_em, aditiva_de, sublocacao_de, garantido_por, prazo_de, fixado_por, documento_de.
- Transparência: cartão do modelo em /modelo.html, relatório de privacidade em /privacidade.html; quem vê resposta errada pode relatar pelo botão "Relatar resposta errada", e uma amostra semanal é revisada por pessoas. 77 nós de norma da Lei 8.245/91, 13 teses típicas, 6 precedentes (STJ Súmulas 214, 268, 335, 549; STF Temas 295 e 1127). 90,1% dos processos ligam a pelo menos um artigo.
- Laboratório: cadastro com e-mail e CPF (guardado só como código irreversível), 1 consulta grátis. Membro: R$ 79/mês com 20 consultas; consulta avulsa R$ 3,94.
- Serviços: relatório preditivo de caso, radar agregado de órgão julgador, due diligence processual, monitoramento de publicações, jurimetria setorial, parecer de direito comparado, curso e certificação, dados abertos para pesquisa, painel de carteira, assessoria em sandboxes regulatórios.
- Escritório parceiro: GMenezes Advogados Associados usa a previsão do Instituto na tela Previsões.
- Prova de registro: documentos e protocolos têm sha256 ancorado no Bitcoin por OpenTimestamps.`

// Passo D12: o roteiro é partido em três blocos. Os dois primeiros são iguais para os 50 agentes
// e entram no cache de prompt da API; só o terceiro (específico do agente) muda a cada chamada.
// O custo acumulado sai do bloco cacheado porque mudava a cada resposta e quebrava o cache.
async function contexto() {
  const s = db()
  const [placar, motor] = await Promise.all([s.rpc('instituto_placar_unico'), s.rpc('instituto_motor_resumo')])
  const m = JSON.stringify(motor.data ?? {}).slice(0, 3000)
  return `PLACAR DE PROTOCOLOS (Brier, BSS, veredito):\n${JSON.stringify(placar.data ?? []).slice(0, 3500)}\n\nMOTOR (séries públicas coletadas, resumo):\n${m}`
}

async function tratar(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const b = await req.json().catch(() => ({}))
  const s = db()
  if (b.acao === 'listar') {
    const [l, c] = await Promise.all([s.rpc('instituto_agentes_lista'), s.rpc('instituto_agentes_custo')])
    return json({ agentes: l.data ?? [], custo: c.data ?? {} })
  }
  if (b.acao === 'contrato') return analisarContrato(req, b, s)
  if (b.acao !== 'perguntar') return json({ erro: 'Ação desconhecida.' }, 400)

  // Passo C26: pergunta que tenta mudar as regras é barrada antes de gastar cota ou IA.
  const livre = String(b.pergunta ?? '').trim().slice(0, 500)
  const v = verificarPergunta(livre)
  if (!v.ok) { await s.rpc('instituto_injecao_registrar', { p_motivo: v.motivo }); return json({ erro: MSG_BLOQUEIO, bloqueado: v.motivo }, 422) }

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
  const pergunta = livre || ag.botao

  const [ctx, uso] = await Promise.all([contexto(), s.rpc('instituto_agentes_custo')])
  const fixo = `${SITE_INFO}

Regras gerais dos agentes do Instituto THEYE: responda em português do Brasil, simples, para leigos, em no máximo 200 palavras, sempre terminando a resposta; cite artigo de lei ou súmula quando usar (Lei 8.245/91, STJ, STF); use só os números do contexto quando falar de dados do Instituto, e diga quando não houver dado; nunca dê garantia de resultado nem substitua um advogado; nunca peça nem comente dados pessoais; termine com uma linha "Para aprofundar:" indicando uma página do site (/placar.html, /ontologia.html, /locacao.html, /comparar.html, /laboratorio.html, /precos.html, /estudar.html).
${REGRA_SISTEMA}`
  const papel = `Você é "${ag.nome}", agente de IA do Instituto THEYE (pesquisa em predição jurídica e ontologia do direito, nicho locação no Brasil).
Área: ${ag.area}. Roteiro inspirado no currículo de doutorado de referência: ${ag.formacao}. Você não é uma pessoa nem tem vínculo com essas universidades; se perguntarem, diga isso.
Papel: ${ag.papel}
CUSTO DOS AGENTES ATÉ AGORA: ${JSON.stringify(uso.data ?? {})}

${instrucoesDeRedacao(sortearPerfil({ semente: hash32(`${ag.id}|${pergunta}|${Date.now()}`) }))}`
  // Blocos 1 e 2 são iguais para todos os agentes e levam cache_control; o bloco 3 muda e fica fora do cache.
  const sistema = [
    { type: 'text', text: fixo, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: ctx, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: papel },
  ]

  let resp: Response | null = null, modelo = MODELO
  for (const mod of [MODELO, MODELO_RESERVA]) {
    modelo = mod
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': c.anthropic_api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Resposta curta e explicativa: sem raciocínio estendido (Sonnet 5.5 usa between_tools; Haiku 5.5 aceita disabled) e esforço baixo.
      body: JSON.stringify({ model: mod, max_tokens: 1500, system: sistema, messages: [{ role: 'user', content: embrulhar(pergunta) }],
        thinking: { type: mod === MODELO ? 'between_tools' : 'disabled' }, output_config: { effort: 'low' } }),
    }).catch(() => null)
    if (resp?.ok) break
  }
  if (!resp?.ok) return json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' }, 502)
  const out = await resp.json()
  const texto = (out.content ?? []).filter((x: { type: string }) => x.type === 'text').map((x: { text: string }) => x.text).join('\n').trim()
  const tin = out.usage?.input_tokens ?? 0, tout = out.usage?.output_tokens ?? 0
  // Passo D12: escrita no cache custa 1,25x o token de entrada e a leitura custa 0,1x.
  const cEscrita = out.usage?.cache_creation_input_tokens ?? 0, cLeitura = out.usage?.cache_read_input_tokens ?? 0
  const { data: p } = await s.from('precos_api').select('usd_entrada_mtok,usd_saida_mtok').eq('modelo', modelo).maybeSingle()
  const usd = p ? ((tin + 1.25 * cEscrita + 0.1 * cLeitura) * Number(p.usd_entrada_mtok) + tout * Number(p.usd_saida_mtok)) / 1e6 : 0
  await s.rpc('instituto_agente_registrar', { p_agente: ag.id, p_in: tin, p_out: tout, p_usd: usd })
  await s.from('consumo_api').insert({ funcao: `Instituto: agente ${ag.id}`, modelo, tokens_entrada: tin + cEscrita + cLeitura, tokens_saida: tout })
  if (!texto) return json({ erro: 'O agente não conseguiu responder agora. Tente de novo.' }, 502)
  if (!respostaSegura(texto)) return json({ erro: MSG_BLOQUEIO, bloqueado: 'vazamento na resposta' }, 422)
  // Passo C09: sorteia até 20 respostas por semana para revisão humana (guarda só a resposta, nunca a pergunta).
  await s.rpc('instituto_agente_amostrar', { p_agente: ag.id, p_modelo: modelo, p_resposta: texto })
  return json({ ok: true, agente: ag.nome, resposta: texto, modelo, tokens: { entrada: tin, saida: tout, cache_escrita: cEscrita, cache_leitura: cLeitura }, custo_usd: Number(usd.toFixed(6)) })
}

// Passo L02 (I-04): análise de contrato de locação por IA. Usa a mesma cota dos agentes (conta como 1 pergunta),
// o texto vai embrulhado como dado (nunca instrução), com dados pessoais mascarados, e não é guardado em lugar nenhum.
const MODELO_CONTRATO = 'claude-haiku-5-5'
const MAX_CONTRATO = 40000
// Ficha conferida da Lei 8.245/91 e normas ligadas: a IA cita só o que está aqui (10 contratos de teste mostraram
// erros quando ela citava de memória: benfeitorias, renovatória e IPTU).
const FICHA_LEI = `FICHA DE LEI (use só isto para citar):
- Art. 4º: na devolução antecipada, a multa pactuada é reduzida proporcionalmente ao tempo que falta (cláusula de multa "integral" sem proporção contraria o art. 4º). O locatário fica dispensado da multa se a devolução decorrer de transferência pelo empregador (art. 4º, parágrafo único).
- Art. 6º: na locação por prazo INDETERMINADO o locatário pode sair avisando com 30 dias; no prazo determinado vale a multa proporcional do art. 4º.
- Art. 17: aluguel de livre convenção, proibido fixar em moeda estrangeira ou vincular a câmbio ou salário mínimo. O índice de reajuste é livre (IGP-M, IPCA, INPC, IVAR etc.).
- Lei 10.192/2001, art. 2º, §1º: reajuste com periodicidade inferior a 1 ano é nulo. Reajuste semestral em contrato de 30 meses é nulo nessa parte.
- Art. 22, VIII: IPTU e taxas são do LOCADOR, salvo disposição expressa no contrato passando ao locatário (o contrato pode passar). Art. 22, X e parágrafo único: despesas extraordinárias de condomínio são do locador. Art. 23, XII: despesas ordinárias de condomínio são do locatário.
- Art. 23, III: o locatário devolve o imóvel no estado em que recebeu, salvo deteriorações do uso normal; a vistoria inicial é a prova.
- Art. 35 e Súmula 335 do STJ: a cláusula de renúncia à indenização e à retenção por benfeitorias, inclusive necessárias, é VÁLIDA. Não diga que é nula; diga que é válida e desfavorável ao locatário.
- Art. 37: só UMA modalidade de garantia (I caução, II fiança, III seguro de fiança locatícia, IV cessão fiduciária de quotas de fundo de investimento; o título de capitalização é usado como caução em títulos, art. 38, §3º); parágrafo único: mais de uma no mesmo contrato é nulo e é contravenção penal (art. 43, II).
- Art. 38, §2º: caução em dinheiro não pode passar de 3 meses de aluguel e deve ser depositada em caderneta de poupança, com rendimentos para o locatário.
- Art. 39: salvo disposição em contrário, a garantia vai até a efetiva devolução do imóvel, mesmo se o contrato for prorrogado por prazo indeterminado. Súmula 214 do STJ: o fiador não responde por obrigações de aditamento ao qual não anuiu.
- Art. 45: são nulas as cláusulas que visem eliminar a prorrogação legal ou afastar o direito à renovação na locação não residencial. Renúncia à renovatória é nula.
- Art. 51: só tem direito à ação renovatória o locatário não residencial com contrato escrito por prazo determinado de pelo menos 5 anos (somando contratos) e 3 anos no mesmo ramo. Contrato de 36 meses sozinho não dá direito à renovatória.
- Art. 48 a 50: locação para temporada tem prazo de até 90 dias; o locador pode receber os aluguéis e encargos de uma vez e adiantado (art. 49) e exigir qualquer das garantias do art. 37.
- Art. 46 e 47: residencial com prazo de 30 meses ou mais termina no prazo sem aviso (art. 46); com prazo menor, a retomada fica restrita às hipóteses do art. 47 após o fim do prazo.
- Art. 58, II: o foro é o do lugar do imóvel, salvo foro de eleição no contrato.
- Código Civil, art. 413: o juiz reduz a multa manifestamente excessiva.`

const SISTEMA_CONTRATO = `Você é o analista de contratos de locação do Instituto THEYE (IA, não advogado).
Leia o contrato dentro de <pergunta> e responda em português do Brasil simples, para leigos, SEM inventar cláusulas: quando algo não constar, escreva "não consta".
Formato, nesta ordem e com estes títulos:
1. Resumo (3 linhas: tipo de locação, prazo, aluguel e índice de reajuste).
2. Pontos de atenção (até 6; cada um com gravidade alta, média ou baixa, o trecho em poucas palavras e o artigo da Lei 8.245/91, do Código Civil ou a súmula aplicável).
3. Prazos e datas (lista).
4. Garantia (caução, fiador, seguro-fiança ou título de capitalização; lembre que a lei proíbe mais de uma modalidade no mesmo contrato, art. 37, parágrafo único).
5. O que perguntar antes de assinar (até 4 perguntas).
Termine com: "Isto é uma leitura automática, não um parecer. Para decidir, fale com um advogado."
Nunca repita nomes, CPFs, endereços ou dados bancários que aparecerem no texto; troque por [dado pessoal].
Cite SÓ artigos e súmulas da ficha abaixo; se o ponto não estiver nela, escreva "conferir com advogado" em vez de citar número. Não diga que algo é ilegal se a ficha disser que é válido.
${FICHA_LEI}
${REGRA_SISTEMA}`

// LGPD: CPF, CNPJ, e-mail, telefone, CEP, conta bancária e endereço saem do texto ANTES de ir para a IA.
export function mascarar(t: string): string {
  return t
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail]')
    .replace(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[telefone]')
    .replace(/\b\d{5}-\d{3}\b/g, '[CEP]')
    .replace(/\b(ag[eê]ncia|ag\.|conta( corrente)?|c\/c)\s*(n[ºo°.]*\s*)?[\d-]{3,}/gi, '$1 [dado bancário]')
    .replace(/\b(Rua|R\.|Avenida|Av\.|Travessa|Tv\.|Estrada|Alameda|Al\.|Praça|Rodovia|Largo|Beco|Ladeira)\s[^,.;]{2,60}(,\s*(n[ºo°.]*\s*)?\d+[A-Za-z]?)?/g, '[endereço]')
}

async function analisarContrato(req: Request, b: Record<string, unknown>, s: ReturnType<typeof db>): Promise<Response> {
  const texto = mascarar(String(b.texto ?? '').replace(/\s+/g, ' ').trim())
  if (texto.length < 300) return json({ erro: 'Cole o texto do contrato inteiro (pelo menos algumas cláusulas).' }, 400)
  if (texto.length > MAX_CONTRATO) return json({ erro: 'O contrato passou de 40 mil caracteres. Cole só as cláusulas principais.' }, 413)
  const { data: conf } = await s.from('configuracoes').select('chave,valor').in('chave', ['anthropic_api_key', 'cron_segredo'])
  const c = Object.fromEntries((conf ?? []).map((x: { chave: string; valor: string }) => [x.chave, x.valor]))
  const robo = !!c.cron_segredo && req.headers.get('x-cron-secret') === c.cron_segredo
  if (!robo) {
    const { data: m } = await s.rpc('instituto_membro_por_sessao', { p_hash: await sha(String(b.sessao ?? '')) })
    if (!m?.id) return json({ erro: 'Entre no laboratório (cadastro gratuito) para analisar um contrato.' }, 401)
    const { data: res } = await s.rpc('instituto_agente_reservar', { p_membro: m.id, p_membro_pleno: m.plano === 'membro' })
    if (res === 'teto') return json({ erro: 'A análise atingiu o limite de hoje. Volte amanhã.' }, 429)
    if (res === 'cota') return json({ erro: m.plano === 'membro' ? 'Você usou as 20 análises e perguntas de hoje.' : 'Você usou as 3 análises e perguntas grátis de hoje. Membros têm 20 por dia.' }, 429)
  }
  if (!c.anthropic_api_key) return json({ erro: 'IA indisponível agora.' }, 503)
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': c.anthropic_api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELO_CONTRATO, max_tokens: 1800, system: SISTEMA_CONTRATO, messages: [{ role: 'user', content: embrulhar(texto) }],
      thinking: { type: 'disabled' }, output_config: { effort: 'low' } }),
  }).catch(() => null)
  if (!resp?.ok) return json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' }, 502)
  const out = await resp.json()
  const analise = (out.content ?? []).filter((x: { type: string }) => x.type === 'text').map((x: { text: string }) => x.text).join('\n').trim()
  const tin = out.usage?.input_tokens ?? 0, tout = out.usage?.output_tokens ?? 0
  const { data: p } = await s.from('precos_api').select('usd_entrada_mtok,usd_saida_mtok').eq('modelo', MODELO_CONTRATO).maybeSingle()
  const usd = p ? (tin * Number(p.usd_entrada_mtok) + tout * Number(p.usd_saida_mtok)) / 1e6 : 0
  await s.rpc('instituto_agente_registrar', { p_agente: 'contrato', p_in: tin, p_out: tout, p_usd: usd })
  await s.from('consumo_api').insert({ funcao: 'Instituto: análise de contrato', modelo: MODELO_CONTRATO, tokens_entrada: tin, tokens_saida: tout })
  if (!analise) return json({ erro: 'Não consegui analisar agora. Tente de novo.' }, 502)
  if (!respostaSegura(analise)) return json({ erro: MSG_BLOQUEIO, bloqueado: 'vazamento na resposta' }, 422)
  return json({ ok: true, analise, modelo: MODELO_CONTRATO, tokens: { entrada: tin, saida: tout }, custo_usd: Number(usd.toFixed(6)) })
}
