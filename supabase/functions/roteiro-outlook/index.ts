// Passo 19 do plano: roteiro em 5 passos (com imagens) para conectar a Agenda ao Outlook, enviado por e-mail (Brevo)
// com o link webcal secreto. Cria uma tarefa para a pessoa testar e guarda o estado do teste em configuracoes
// (chave teste_outlook), que a tela Agenda mostra e permite marcar "Funcionou" / "Não funcionou".
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// As imagens e o PDF ficam em public/roteiro (publicados no gh-pages pelo build).
const CDN = 'https://cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@gh-pages/roteiro'
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
async function baixar(nome: string): Promise<string | null> {
  try { const r = await fetch(`${CDN}/${nome}`, { signal: AbortSignal.timeout(20_000) }); return r.ok ? b64(await r.arrayBuffer()) : null } catch { return null }
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
const PASSOS = [
  ['Abra o menu Agenda na plataforma e toque em "Conectar ao Outlook"', `Entre em <a href="${APP}/agenda">gmenezes-advogados.vercel.app</a>, menu Agenda, botão "Conectar ao Outlook" (canto direito). Se o Windows perguntar com qual programa abrir, escolha Outlook.`],
  ['Responda "Sim" à pergunta do Outlook', 'O Outlook mostra "Adicionar este calendário da Internet ao Outlook e assinar atualizações?". Toque em Sim. O link é secreto e só funciona para o escritório.'],
  ['Veja o calendário "GMenezes Advogados" em Outros Calendários', 'Os prazos, audiências, vencimentos e reajustes entram com cor própria. Os seus compromissos pessoais continuam iguais.'],
  ['Marque a caixa e, se quiser, "Sobrepor"', 'Com a caixa marcada os dois calendários aparecem juntos. No Outlook da web: Adicionar calendário → Assinar da Web → colar o link abaixo → Importar.'],
  ['Confira e responda a este e-mail', 'Confira se um prazo aparece no mês atual e se o Outlook atualiza sozinho (até 1 hora). Responda "Funcionou" ou "Não funcionou", se puder com uma foto da tela. Na plataforma, em Agenda, também dá para marcar o resultado.'],
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const corpo = await req.json().catch(() => ({}))
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await db.auth.getUser(token)
    if (!u?.user) return json({ erro: 'Faça login.' }, 401)
    const { data: perfil } = await db.from('usuarios_perfis').select('funcao,email').eq('id', u.user.id).maybeSingle()
    if (!perfil || !['admin', 'operador'].includes(perfil.funcao)) return json({ erro: 'Só administradores e operadores enviam o roteiro.' }, 403)

    const { data: cfg } = await db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente', 'agenda_token'])
    const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
    if (!conf.brevo_api_key || !conf.email_remetente || !conf.agenda_token) return json({ erro: 'Falta configurar Brevo ou o link da agenda.' }, 400)
    const webcal = `${Deno.env.get('SUPABASE_URL')}/functions/v1/agenda-feed?t=${conf.agenda_token}`.replace(/^https?:/, 'webcal:')
    const https = webcal.replace(/^webcal:/, 'https:')

    // Destinatários: {teste:true} manda só para quem pediu; senão para a pessoa indicada ({para:'fatima'}) ou para quem pediu.
    let para: { email: string; nome: string }[] = [{ email: perfil.email, nome: perfil.email.split('@')[0] }]
    let responsavelId: string | null = u.user.id
    if (!corpo.teste && corpo.para) {
      const { data: alvo } = await db.from('usuarios_perfis').select('id,email,nome_completo').ilike('email', `${corpo.para}%`)
      if (alvo?.length) { para = alvo.map(a => ({ email: a.email, nome: a.nome_completo || a.email.split('@')[0] })); responsavelId = alvo[0].id }
    }
    const nomes = [...new Set(para.map(p => p.nome.split(' ')[0]))].join(' e ')
    const imgs = await Promise.all([1, 2, 3, 4, 5].map(i => baixar(`p${i}.png`)))
    const PDF = await baixar('roteiro-outlook.pdf')
    const blocos = PASSOS.map(([t, x], i) => `<h3 style="color:#14213D;margin:22px 0 4px">Passo ${i + 1}. ${t}</h3><p style="margin:0 0 8px;line-height:1.5">${x}</p><img src="${imgs[i] ? `cid:passo${i + 1}` : `${CDN}/p${i + 1}.png`}" alt="Passo ${i + 1}" width="560" style="max-width:100%;border:1px solid #ddd">`).join('')
    const html = `<div style="font-family:Georgia,serif;max-width:640px;margin:auto;color:#222">
      <div style="background:#14213D;color:#fff;padding:18px"><h2 style="margin:0">Roteiro: conectar a Agenda ao Outlook</h2><p style="margin:6px 0 0;color:#B08D57">5 passos · leva uns 3 minutos · nenhuma senha é pedida</p></div>
      <div style="padding:16px"><p>Olá, ${nomes}. Este roteiro mostra como ver os prazos e audiências da plataforma dentro do seu Outlook. O PDF em anexo tem os mesmos passos para imprimir.</p>${blocos}
      <h3 style="color:#14213D;margin-top:24px">Link do calendário (se o botão não abrir o Outlook)</h3>
      <p style="word-break:break-all;font-family:monospace;font-size:12px;background:#f4f4f4;padding:10px">${webcal}</p>
      <p style="font-size:12px;color:#666">No Outlook da web ou no Google Agenda, use esta versão: <span style="word-break:break-all">${https}</span>. O link é secreto: não encaminhe fora do escritório.</p></div>
      <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · Desenvolvido pelo Instituto THEYE</p></div>`
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Plataforma GMenezes', email: conf.email_remetente }, to: para,
        replyTo: { email: perfil.email },
        subject: 'Roteiro em 5 passos: conectar a Agenda ao Outlook',
        htmlContent: html, inlineImageActivation: true,
        attachment: [...imgs.map((c, i) => c ? { content: c, name: `passo${i + 1}.png` } : null).filter(Boolean), ...(PDF ? [{ content: PDF, name: 'roteiro-outlook.pdf' }] : [])],
      }),
    })
    const resp = await r.json().catch(() => ({}))
    if (!r.ok) return json({ erro: `Brevo: ${JSON.stringify(resp).slice(0, 200)}` }, 502)
    await db.from('consumo_api').insert({ funcao: 'roteiro do Outlook por e-mail', modelo: 'brevo-email', quantidade: para.length })
    const agora = new Date().toISOString()
    if (!corpo.teste) {
      const prazo = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      await db.from('tarefas').insert({ titulo: 'Testar "Conectar ao Outlook" e responder ao e-mail do roteiro', descricao: `Roteiro enviado em ${agora.slice(0, 10)} para ${para.map(p => p.email).join(', ')}. Siga os 5 passos e marque o resultado em Agenda.`, situacao: 'a_fazer', prioridade: 'media', responsavel_id: responsavelId, criado_por: u.user.id, prazo, nivel: 'tarefa', tipo: 'projeto' })
      await db.from('configuracoes').upsert({ chave: 'teste_outlook', valor: JSON.stringify({ enviado_em: agora, para: para.map(p => p.email), resultado: 'pendente' }) }, { onConflict: 'chave' })
    }
    return json({ ok: true, enviados: para.length, para: para.map(p => p.email), teste: !!corpo.teste, mensagem: resp.messageId ?? null })
  } catch (e) {
    return json({ erro: String(e).slice(0, 300) }, 500)
  }
})
