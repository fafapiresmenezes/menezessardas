// Peças automáticas: 7 dias antes de cada prazo (ou já, se o prazo for mais curto), escreve a peça
// e manda por e-mail, pronta para revisão, para as pessoas cadastradas em "Quem recebe as peças".
// - Estilo: as peças de referência do responsável (estilos_escrita) e a rotação de perfil (estiloPecas),
//   para que nenhuma saia com cara de modelo repetido.
// - Formatação: a do responsável (formatacao_escrita) ou o padrão de grandes escritórios; anexo .doc que o Word abre.
// - Nunca protocola nada. Jurisprudência só com "[conferir no tribunal]".
// Roda pelo cron (x-cron-secret) ou pelo botão "Escrever as peças agora" (usuário logado; aceita { tarefa_id }).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { pecaEmHtml, sortearFormato, sortearPerfil, instrucoesDoPerfil, amostrasDoAutor, hash32, medirTexto, aderencia, somarDias, br } from '../_compartilhado/juridico.js'

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

  let q = s.from('tarefas').select('id,titulo,descricao,prazo,pai_id,numero_processo,cliente,area,responsavel_id,escritorio_id').eq('nivel', 'tarefa').neq('situacao', 'feito')
  if (corpo.tarefa_id) q = q.eq('id', String(corpo.tarefa_id))
  else q = q.is('peca_automatica_em', null).not('numero_processo', 'is', null).gte('prazo', hoje).lte('prazo', limite).order('prazo').limit(POR_RODADA * 3)
  const { data: tarefasBrutas, error } = await q
  if (error) return json({ erro: error.message }, 500)
  const tarefas = ((tarefasBrutas ?? []) as Record<string, any>[]).filter(t => corpo.tarefa_id || !SEM_PECA.test(String(t.titulo))).slice(0, POR_RODADA)

  const feitas: { tarefa: string; titulo: string; enviada: boolean; detalhe?: string }[] = []
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
      const perfil = sortearPerfil({ semente, especialidade: t.area ?? undefined, anteriores: ((anteriores ?? []) as { perfil: any }[]).map(a => a.perfil).filter((p: any) => p?.parametros) })
      const amostras = (estilos ?? []).length ? amostrasDoAutor(estilos as { titulo: string; texto: string }[], 60000) : []
      const estilo = amostras.length ? `\n\nESTILO DE ESCRITA DO ESCRITÓRIO (${amostras.length} peças de referência). Imite vocabulário, extensão das frases, forma de abrir e fechar, tom, numeração e modo de citar a lei. Nunca copie fatos das amostras.\n${amostras.join('\n\n')}\nQuando houver estilo do escritório, ele prevalece; use o perfil abaixo só para variar ritmo, conectivos, abertura e fecho.` : ''
      const sistema = `Você é advogado sênior de um escritório brasileiro e redige peças processuais completas, prontas para revisão do advogado responsável.
Regras: padrão forense brasileiro; endereçamento ao juízo correto; qualificação com [campos entre colchetes] para o que não estiver nos dados; fatos SÓ os que estão na publicação e nos dados do caso (o que faltar vai entre colchetes); fundamentação com artigo e lei; pedidos numerados; local, data e assinatura com [advogado] e [OAB].
Nunca invente jurisprudência: se citar precedente, marque "[conferir no tribunal]". Doutrina só com certeza, senão "[doutrina a conferir]".
Ao final, depois da assinatura, acrescente a seção "PONTOS A CONFERIR ANTES DE PROTOCOLAR" com o que depende de documentos ou fatos.
Títulos de seção em caixa alta, numa linha só e SEM número (ex.: DOS FATOS): a numeração e a formatação final são aplicadas depois, pelo modelo do escritório. Não use markdown além de **negrito** pontual.${regras}${estilo}\n\n${instrucoesDoPerfil(perfil)}`
      const pedido = `Redija a peça para cumprir esta tarefa: "${t.titulo}".
Processo: ${t.numero_processo}. Prazo final: ${br(t.prazo)}.
Cliente: ${t.cliente ?? caso?.cliente ?? '[cliente]'}. Área: ${t.area ?? caso?.area ?? '[área]'}.
Caso: ${caso?.titulo ?? ''}
${String(caso?.descricao ?? '').slice(0, 2500)}

Publicação e orientação do prazo:
${String(t.descricao ?? '').slice(0, 9000)}`
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODELO, max_tokens: 12000, system: sistema, messages: [{ role: 'user', content: pedido }] }),
        signal: AbortSignal.timeout(120000),
      })
      if (!r.ok) throw new Error(`IA respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const resp = await r.json()
      const texto = ((resp.content ?? []) as { type: string; text?: string }[]).filter(c => c.type === 'text').map(c => c.text).join('\n').trim()
      if (texto.length < 400) throw new Error('A IA devolveu um texto curto demais.')
      await s.from('consumo_api').insert({ funcao: 'peças automáticas', modelo: resp.model ?? MODELO, tokens_entrada: resp.usage?.input_tokens ?? 0, tokens_saida: resp.usage?.output_tokens ?? 0, usuario_id: t.responsavel_id ?? null })
      const titulo = `${String(t.titulo).split(' · ')[0]} · ${t.numero_processo}`
      const html = pecaEmHtml(texto, titulo, (form as { dados?: unknown } | null)?.dados ?? null, formato)
      const nota = aderencia(medirTexto(texto), perfil)

      let enviada = false, detalhe: string | undefined
      if (!destinatarios.length) detalhe = 'Ninguém cadastrado para receber as peças.'
      else if (!conf.brevo_api_key || !conf.email_remetente) detalhe = 'Provedor de e-mail não configurado (Configurações → E-mail).'
      else {
        const corpoEmail = `<div style="font-family:Georgia,serif;max-width:640px;margin:auto">
<div style="background:#14213d;color:#fff;padding:16px"><h2 style="margin:0;font-size:18px">Peça pronta para revisão</h2></div>
<div style="padding:16px;line-height:1.5"><p><strong>${esc(String(t.titulo))}</strong></p>
<p>Processo <strong>${esc(String(t.numero_processo))}</strong> · prazo final <strong>${br(t.prazo)}</strong>.</p>
<p>A peça está em anexo (abre no Word, já formatada). Revise os campos entre colchetes e os "pontos a conferir" no fim antes de protocolar.</p>
<p style="font-size:12px;color:#666">Escrita automaticamente pela plataforma THEYE Institute a partir da publicação no Diário de Justiça Eletrônico Nacional. O prazo foi calculado pelo código do ramo; confira na publicação.</p></div></div>`
        const env = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sender: { name: 'THEYE Institute · Peças', email: conf.email_remetente }, to: destinatarios.map(email => ({ email })), subject: `Peça pronta: ${titulo} · vence ${br(t.prazo)}`.slice(0, 200), htmlContent: corpoEmail, attachment: [{ name: nomeArquivo(titulo), content: b64('﻿' + html) }] }),
        })
        enviada = env.ok
        if (!env.ok) detalhe = `E-mail recusado (${env.status}): ${(await env.text()).slice(0, 200)}`
      }
      await s.from('pecas_automaticas').insert({ tarefa_id: t.id, escritorio_id: t.escritorio_id, numero: t.numero_processo, titulo, texto, perfil: { ...perfil, formato: formato.id }, aderencia: nota, enviada_para: enviada ? destinatarios : [], enviada_em: enviada ? new Date().toISOString() : null, erro: detalhe ?? null })
      await s.from('tarefas').update({ peca_automatica_em: new Date().toISOString() }).eq('id', t.id)
      feitas.push({ tarefa: t.id, titulo, enviada, detalhe })
    } catch (e) {
      feitas.push({ tarefa: t.id, titulo: String(t.titulo), enviada: false, detalhe: e instanceof Error ? e.message : String(e) })
    }
  }
  return json({ hoje, ate: limite, candidatas: tarefas.length, feitas, destinatarios: destinatarios.length })
})
