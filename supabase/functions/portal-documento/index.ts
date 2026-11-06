// Passo D18 (Diamante): o cliente envia um documento pelo Portal (link com código secreto, sem login).
// Sem JWT: a autorização é o código do Portal, conferido no banco. Guarda no bucket privado "documentos",
// em portal/<caso>/, até 10 MB, só PDF, imagens e Office; registra em documentos_portal.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const LIMITE = 10 * 1024 * 1024
const TIPOS = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
const limpaNome = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'documento'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  let form: FormData
  try { form = await req.formData() } catch { return json({ erro: 'Envie o arquivo como formulário (multipart).' }, 400) }
  const token = String(form.get('token') ?? '')
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File)) return json({ erro: 'Escolha um arquivo.' }, 400)
  if (arquivo.size <= 0 || arquivo.size > LIMITE) return json({ erro: 'O arquivo precisa ter até 10 MB.' }, 400)
  if (!TIPOS.has(arquivo.type)) return json({ erro: 'Envie PDF, imagem (JPG/PNG) ou arquivo do Word/Excel.' }, 400)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: casoId, error: e1 } = await db.rpc('portal_caso_id', { p_token: token })
  if (e1 || !casoId) return json({ erro: 'Este link não é válido ou expirou.' }, 401)
  const { count } = await db.from('documentos_portal').select('id', { count: 'exact', head: true }).eq('tarefa_id', casoId).gte('enviado_em', new Date(Date.now() - 86400000).toISOString())
  if ((count ?? 0) >= 20) return json({ erro: 'Limite de 20 documentos por dia atingido.' }, 429)
  const caminho = `portal/${casoId}/${crypto.randomUUID()}-${limpaNome(arquivo.name)}`
  const { error: e2 } = await db.storage.from('documentos').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
  if (e2) return json({ erro: 'Não foi possível guardar o arquivo. Tente de novo.' }, 500)
  const { data: reg, error: e3 } = await db.from('documentos_portal').insert({ tarefa_id: casoId, nome: arquivo.name.slice(0, 160), caminho, tamanho: arquivo.size, tipo: arquivo.type }).select('id,nome,tamanho,enviado_em').single()
  if (e3) return json({ erro: 'Arquivo guardado, mas o registro falhou. Avise o escritório.' }, 500)
  return json({ ok: true, documento: reg })
})
