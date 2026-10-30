// Passo 23: lembrete da revisão trimestral de OKR. Roda todo dia (cron) e, 15 dias antes do fim do trimestre,
// manda e-mail (Brevo) às administradoras e cria a tarefa "Revisar OKRs do trimestre" com prazo no último dia.
// Só envia uma vez por trimestre (marca em configuracoes.lembrete_okr_<trimestre>). {teste:true} envia só a quem pediu.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const corpo = await req.json().catch(() => ({}))
  const { data: cfg } = await db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente', 'cron_segredo'])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  let quem: { id: string; email: string } | null = null
  const cron = !!req.headers.get('x-cron-secret') && req.headers.get('x-cron-secret') === conf.cron_segredo
  if (!cron) {
    const { data: u } = await db.auth.getUser((req.headers.get('Authorization') ?? '').replace('Bearer ', ''))
    if (!u?.user) return json({ erro: 'Faça login.' }, 401)
    const { data: p } = await db.from('usuarios_perfis').select('email,funcao').eq('id', u.user.id).maybeSingle()
    if (!p || !['admin', 'operador'].includes(p.funcao)) return json({ erro: 'Sem permissão.' }, 403)
    quem = { id: u.user.id, email: p.email }
  }
  const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const tri = `${hoje.getFullYear()}-T${Math.floor(hoje.getMonth() / 3) + 1}`
  const fim = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3 + 3, 0)
  const dias = Math.round((fim.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86400000)
  const chave = `lembrete_okr_${tri}`
  const teste = !!corpo.teste
  if (!teste) {
    if (dias > 15 || dias < 0) return json({ enviado: false, motivo: `faltam ${dias} dias para o fim do trimestre; o lembrete sai com 15`, trimestre: tri })
    const { data: ja } = await db.from('configuracoes').select('valor').eq('chave', chave).maybeSingle()
    if (ja) return json({ enviado: false, motivo: 'lembrete deste trimestre já enviado', trimestre: tri })
  }
  const { data: admins } = await db.from('usuarios_perfis').select('id,email').eq('funcao', 'admin')
  const para = teste && quem ? [quem] : (admins ?? []).filter(a => a.email && !a.email.endsWith('@exemplo.com'))
  const prazo = fim.toISOString().slice(0, 10)
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto"><div style="background:#14213D;color:#fff;padding:18px"><h2 style="margin:0">Revisão trimestral de OKR: ${tri}</h2></div>
    <div style="padding:16px;line-height:1.5"><p>O trimestre termina em <strong>${fim.toLocaleDateString('pt-BR')}</strong> (${dias} dias). É hora de revisar os objetivos e resultados-chave e registrar a ata.</p>
    <ol><li>Abra <a href="${APP}/indicadores">Indicadores → Ciclo trimestral de OKR</a>.</li><li>Confira cada resultado-chave contra a meta.</li><li>Escreva a ata (o que foi atingido, o que ficou, metas do próximo trimestre) e toque em "Gravar ata com selo".</li></ol>
    <p>A ata recebe SHA-256 e selo OpenTimestamps (Bitcoin), e fica no histórico da tela.</p></div>
    <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · aviso automático${teste ? ' (teste)' : ''}</p></div>`
  let enviados = 0
  if (conf.brevo_api_key && conf.email_remetente) {
    for (const a of para) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: 'Avisos GMenezes', email: conf.email_remetente }, to: [{ email: a.email }], subject: `${teste ? '[teste] ' : ''}Revisar OKRs do trimestre ${tri} até ${fim.toLocaleDateString('pt-BR')}`, htmlContent: html }) })
      if (r.ok) enviados++
    }
  }
  let tarefaId: string | null = null
  if (!teste) {
    const { data: t } = await db.from('tarefas').insert({ titulo: `Revisar OKRs do trimestre ${tri}`, descricao: 'Revisão trimestral: conferir cada resultado-chave em Indicadores e gravar a ata com selo.', situacao: 'a_fazer', prioridade: 'alta', prazo, responsavel_id: para[0]?.id ?? null, criado_por: para[0]?.id ?? null, nivel: 'tarefa', tipo: 'projeto' }).select('id').single()
    tarefaId = t?.id ?? null
    await db.from('configuracoes').upsert({ chave, valor: JSON.stringify({ enviado_em: new Date().toISOString(), para: para.map(p => p.email), tarefa_id: tarefaId }) }, { onConflict: 'chave' })
  }
  if (enviados) await db.from('consumo_api').insert({ funcao: 'lembrete trimestral de OKR', modelo: 'brevo-email', quantidade: enviados })
  return json({ enviado: enviados > 0, enviados, para: para.map(p => p.email), trimestre: tri, dias_para_fim: dias, tarefa_id: tarefaId, teste })
})
