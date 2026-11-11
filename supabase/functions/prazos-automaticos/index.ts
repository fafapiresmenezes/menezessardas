// Robô de prazos: a cada poucas horas, todos os dias, procura no CNJ (Diário de Justiça Eletrônico Nacional)
// tudo o que saiu para os processos do escritório, pelo número de cada processo, pelo nome dos advogados
// (inclusive de quem saiu) e pelas OABs. Cada publicação nova é lida com as MESMAS regras da tela
// (prazo pelo código de cada ramo: CPC, CLT, Juizados, CPP, ECA...) e vira tarefa com prazo dentro do processo.
// Roda pelo cron (cabeçalho x-cron-secret) ou pelo botão "Conferir agora" (usuário logado).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { comunica, type Filtro } from '../_compartilhado/cnj.ts'
import { lerIntimacao, somarDias } from '../_compartilhado/juridico.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SEDE = '00000000-0000-0000-0000-000000000001'
const hojeBrasilia = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const mascara = (d: string) => `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`

async function autorizado(req: Request, s: ReturnType<typeof sb>): Promise<boolean> {
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    if (JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).role === 'authenticated') return true
  } catch { /* segue para o segredo do cron */ }
  const enviado = req.headers.get('x-cron-secret')
  if (!enviado) return false
  const { data } = await s.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!data?.valor && data.valor === enviado
}

type Caso = { id: string; numero_processo: string; cliente: string | null; area: string | null; escritorio_id: string | null; responsavel_id: string | null }
const lista = (v: unknown) => String(v ?? '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const s = sb()
  if (!(await autorizado(req, s))) return json({ erro: 'Entre na plataforma.' }, 401)
  const corpo = await req.json().catch(() => ({}))
  const hoje = hojeBrasilia()
  // Janela: os últimos dias (com folga, porque o DJEN às vezes publica com atraso). Botão manual aceita até 93 dias.
  const dias = Math.max(1, Math.min(93, Number(corpo.dias) || 5))
  const inicio = somarDias(hoje, -dias + 1), fim = hoje

  const [{ data: cfg }, { data: casosBrutos }] = await Promise.all([
    s.from('configuracoes').select('chave,valor').in('chave', ['advogados_monitorados', 'oabs_monitoradas']),
    s.from('tarefas').select('id,numero_processo,cliente,area,escritorio_id,responsavel_id,situacao').eq('nivel', 'projeto').not('numero_processo', 'is', null),
  ])
  const conf = Object.fromEntries(((cfg ?? []) as { chave: string; valor: string }[]).map(c => [c.chave, c.valor]))
  const advogados = lista(conf.advogados_monitorados).filter(n => n.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4)
  const oabs = lista(conf.oabs_monitoradas).map(o => o.replace(/\s/g, '').toUpperCase()).filter(o => /^\d{1,7}\/[A-Z]{2}$/.test(o))
  const casos = new Map<string, Caso>()
  for (const c of (casosBrutos ?? []) as (Caso & { situacao: string })[]) {
    const d = String(c.numero_processo).replace(/\D/g, '')
    if (d.length === 20 && c.situacao !== 'feito' && !casos.has(d)) casos.set(d, c)
  }

  // Consultas: nomes e OABs (pegam processo novo que nem está cadastrado) e cada processo pelo número.
  const consultas: { rotulo: string; filtro: Filtro; paginas: number; porNumero: boolean }[] = [
    ...advogados.map(n => ({ rotulo: `advogado ${n}`, filtro: { nomeAdvogado: n }, paginas: 10, porNumero: false })),
    ...oabs.map(o => ({ rotulo: `OAB ${o}`, filtro: { numeroOab: String(Number(o.split('/')[0])), ufOab: o.split('/')[1] }, paginas: 10, porNumero: false })),
    ...[...casos.keys()].map(d => ({ rotulo: `processo ${mascara(d)}`, filtro: { numeroProcesso: d }, paginas: 2, porNumero: true })),
  ]
  const pubs = new Map<string, any>()
  const erros: string[] = []
  const fila = [...consultas]
  const trabalhar = async () => {
    while (fila.length) {
      const q = fila.shift()!
      const r = await comunica(q.filtro, inicio, fim, q.paginas)
      if (!r.ok) erros.push(`${q.rotulo}: ${r.erro}`)
      for (const p of r.itens) if (!pubs.has(p.id)) pubs.set(p.id, p)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, consultas.length) }, trabalhar))

  // Só o que ainda não foi lido.
  const todas = [...pubs.values()] as any[]
  const lidas = new Set<string>()
  for (let i = 0; i < todas.length; i += 200) {
    const { data } = await s.from('prazos_lidos').select('publicacao_id').in('publicacao_id', todas.slice(i, i + 200).map(p => p.id))
    for (const l of (data ?? []) as { publicacao_id: string }[]) lidas.add(l.publicacao_id)
  }
  const novas = todas.filter(p => !lidas.has(p.id)).sort((a, b) => String(a.data).localeCompare(String(b.data)))

  let tarefas = 0, casosNovos = 0
  for (const p of novas) {
    const l = lerIntimacao(p, hoje)
    const d = String(p.numero).replace(/\D/g, '')
    let caso = casos.get(d)
    if (!caso && d.length === 20) {
      // Processo que apareceu pelo nome ou pela OAB e ainda não está na carteira: abre o caso para não perder o prazo.
      const titulo = `Processo ${p.numero}${p.partes?.length ? ` · ${p.partes.map((x: any) => x.nome).slice(0, 2).join(' x ')}` : ''}`.slice(0, 200)
      const { data: novo, error } = await s.from('tarefas').insert({
        titulo, nivel: 'projeto', tipo: 'caso', numero_processo: p.numero, situacao: 'fazendo', prioridade: 'alta', escritorio_id: SEDE,
        descricao: `Aberto pelo robô do CNJ em ${hoje}: publicação no Diário de Justiça Eletrônico Nacional (${p.tribunal ?? ''}, ${p.orgao ?? ''}). Confira se o processo é do escritório.`,
      }).select('id,numero_processo,cliente,area,escritorio_id,responsavel_id').single()
      if (error || !novo) { erros.push(`abrir caso ${p.numero}: ${error?.message ?? 'sem resposta'}`); continue }
      caso = novo as Caso; casos.set(d, caso); casosNovos++
    }
    let tarefaId: string | null = null
    if (caso) {
      const prazo = l.vence ?? l.publicadaEm
      const { data: t, error } = await s.from('tarefas').insert({
        titulo: `${l.oQueFazer.split('.')[0]} · ${p.numero}`.slice(0, 200), nivel: 'tarefa', pai_id: caso.id, prazo, numero_processo: p.numero,
        cliente: caso.cliente, area: caso.area, escritorio_id: caso.escritorio_id ?? SEDE, responsavel_id: caso.responsavel_id, situacao: 'a_fazer',
        prioridade: l.urgencia === 'vencido' || l.urgencia === 'urgente' ? 'alta' : 'media',
        descricao: [
          `${l.vence ? `Vence em ${l.vence.split('-').reverse().join('/')} (${l.diaSemana}).` : 'Sem prazo identificado: ler e decidir.'} ${l.oQueFazer}.`,
          l.ato ? `Prazo: ${l.ato.quantidade} ${l.ato.unidade.replace('_', ' ')} (${l.ato.base}), contado da publicação em ${l.publicadaEm.split('-').reverse().join('/')}.` : '',
          l.outra ?? '', ...l.avisos,
          `Publicação de ${String(p.data).split('-').reverse().join('/')} (${p.tribunal ?? ''}, ${p.orgao ?? ''}):`, String(p.texto ?? '').slice(0, 6000),
          'Leitura automática do robô do CNJ: confira o prazo na publicação antes de protocolar.',
        ].filter(Boolean).join('\n'),
      }).select('id').single()
      if (error) erros.push(`tarefa ${p.numero}: ${error.message}`); else { tarefaId = (t as { id: string }).id; tarefas++ }
    }
    await s.from('prazos_lidos').insert({
      publicacao_id: p.id, numero: p.numero, disponibilizada: p.data, tribunal: p.tribunal, orgao: p.orgao, documento: p.documento,
      texto: String(p.texto ?? '').slice(0, 20000), o_que_fazer: l.oQueFazer, ato: l.ato?.ato ?? null, base: l.ato?.base ?? null,
      publicada_em: l.publicadaEm, vence: l.vence, urgencia: l.urgencia, confianca: l.confianca, trecho: l.trecho,
      avisos: l.avisos.join(' | ') || null, tarefa_id: tarefaId, escritorio_id: caso?.escritorio_id ?? SEDE,
    })
  }

  const resumo = { em: new Date().toISOString(), janela: { inicio, fim }, consultas: consultas.length, advogados: advogados.length, oabs: oabs.length, processos: casos.size, publicacoes: todas.length, novas: novas.length, tarefas, casosNovos, erros: erros.slice(0, 20), totalErros: erros.length }
  await s.from('configuracoes').upsert({ chave: 'prazos_ultima_execucao', valor: JSON.stringify(resumo), atualizado_em: resumo.em }, { onConflict: 'chave' })
  return json(resumo)
})
