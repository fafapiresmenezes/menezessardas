// Bloco B09: auto-aprendizado semanal das previsões.
// Lê os desfechos reais, separa os mais antigos (70%, treino) dos mais novos (30%, teste), ajusta a recalibração
// isotônica no treino e só promove o modelo novo se melhorar o Brier E o erro de calibragem no teste.
// Cada versão é guardada com sha256 (para o selo em blockchain da medição). Nunca usa nome nem dado pessoal.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ajustarIsotonico, aplicarIsotonico, brier, ece, type Par } from '../../../src/lib/calibragem.ts'

const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const MIN_TESTE = 30

async function sha256(t: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}

type Linha = { previsto: Record<string, unknown>; desfecho: Record<string, unknown>; desfecho_em: string }
const ALVOS: { alvo: string; p: (l: Linha) => number | null; y: (l: Linha) => 0 | 1 | null }[] = [
  { alvo: 'inadimplencia', p: l => typeof l.previsto?.risco === 'number' ? (l.previsto.risco as number) / 100 : null, y: l => typeof l.desfecho?.inadimplente === 'boolean' ? (l.desfecho.inadimplente ? 1 : 0) : null },
  { alvo: 'renovacao', p: l => typeof l.previsto?.renovacao === 'number' ? (l.previsto.renovacao as number) / 100 : null, y: l => typeof l.desfecho?.renovou === 'boolean' ? (l.desfecho.renovou ? 1 : 0) : null },
]

export async function recalibrar() {
  const sb = db()
  const { data } = await sb.from('registro_previsoes').select('previsto,desfecho,desfecho_em').eq('tipo', 'risco_contrato').not('desfecho', 'is', null).order('desfecho_em', { ascending: true }).limit(20000)
  const linhas = (data ?? []) as Linha[]
  const resumo = []
  for (const a of ALVOS) {
    const pares: Par[] = linhas.map(l => ({ p: a.p(l), y: a.y(l) })).filter((x): x is Par => x.p !== null && x.y !== null)
    const corte = Math.floor(pares.length * 0.7)
    const treino = pares.slice(0, corte), teste = pares.slice(corte)
    if (teste.length < MIN_TESTE) { resumo.push({ alvo: a.alvo, n: pares.length, promovido: false, motivo: `amostra pequena: ${teste.length} desfechos no teste, mínimo ${MIN_TESTE}` }); continue }
    const blocos = ajustarIsotonico(treino)
    const calibrado = teste.map(x => ({ p: aplicarIsotonico(blocos, x.p), y: x.y }))
    const m = { brier_bruto: brier(teste)!, brier_novo: brier(calibrado)!, ece_bruto: ece(teste)!, ece_novo: ece(calibrado)! }
    const { data: ativo } = await sb.from('modelos_calibragem').select('id,brier_teste,ece_teste').eq('alvo', a.alvo).eq('ativo', true).maybeSingle()
    const base = ativo ? { brier: Math.min(ativo.brier_teste as number, m.brier_bruto), ece: Math.min(ativo.ece_teste as number, m.ece_bruto) } : { brier: m.brier_bruto, ece: m.ece_bruto }
    const melhora = m.brier_novo < base.brier && m.ece_novo < base.ece
    const modelo = { alvo: a.alvo, metodo: 'isotonica-pav', blocos, n_treino: treino.length, n_teste: teste.length, ...m }
    const hash = await sha256(JSON.stringify(modelo))
    if (melhora && ativo) await sb.from('modelos_calibragem').update({ ativo: false }).eq('id', ativo.id)
    await sb.from('modelos_calibragem').insert({ alvo: a.alvo, metodo: 'isotonica-pav', blocos, n_treino: treino.length, n_teste: teste.length, brier_teste: m.brier_novo, ece_teste: m.ece_novo, brier_bruto: m.brier_bruto, ece_bruto: m.ece_bruto, ativo: melhora, sha256: hash })
    resumo.push({ alvo: a.alvo, n: pares.length, promovido: melhora, sha256: hash, ...m, motivo: melhora ? 'melhorou Brier e erro de calibragem no teste' : 'não melhorou o suficiente; modelo atual mantido' })
  }
  return resumo
}

Deno.serve(async (req) => {
  const enviado = req.headers.get('x-cron-secret')
  const { data } = enviado ? await db().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle() : { data: null }
  if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'Somente o robô semanal pode recalibrar.' }, 401)
  return json({ resumo: await recalibrar(), executadoEm: new Date().toISOString() })
})
