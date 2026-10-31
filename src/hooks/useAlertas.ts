import { useState, useEffect, useCallback } from 'react'
import { repositorio, calcularAlertas, type Alerta } from '@/lib/repositorio'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { diasAte } from '@/lib/datas'

export { type Alerta }

export interface NovoCompromisso {
  titulo: string
  imovel: string
  dataEvento: string
  diasAntes: number
  avisosDias?: number[]
  email?: string
}

const CHAVE_LOCAL = 'compromissos_offline'

interface CompromissoGuardado extends NovoCompromisso { id: string }

function lerLocal(): CompromissoGuardado[] {
  try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '[]') } catch { return [] }
}

async function listarCompromissos(): Promise<CompromissoGuardado[]> {
  if (!supabaseConfigurado) return lerLocal()
  const { data, error } = await supabase.from('compromissos').select('id,titulo,imovel,data_evento,dias_antes,avisos_dias')
  if (error) throw error
  return (data ?? []).map(c => ({ id: c.id, titulo: c.titulo, imovel: c.imovel, dataEvento: c.data_evento, diasAntes: c.dias_antes, avisosDias: c.avisos_dias ?? [c.dias_antes] }))
}

export async function salvarCompromisso(c: NovoCompromisso) {
  if (!supabaseConfigurado) {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify([...lerLocal(), { ...c, id: crypto.randomUUID() }]))
    return
  }
  const { error } = await supabase.from('compromissos').insert({
    titulo: c.titulo, imovel: c.imovel, data_evento: c.dataEvento, dias_antes: c.avisosDias?.length ? Math.max(...c.avisosDias) : c.diasAntes, avisos_dias: c.avisosDias ?? [c.diasAntes],
    email_aviso: c.email?.split(/[,;\s]+/).filter(Boolean).join(',').toLowerCase() || null,
  })
  if (error) throw error
}

// Passo 43: importa eventos de um .ics; pula os que já existem (mesmo UID no escritório) e devolve a contagem.
export async function importarCompromissosIcs(eventos: { uid: string; titulo: string; data: string; local: string }[]): Promise<{ criados: number; repetidos: number }> {
  if (!eventos.length) return { criados: 0, repetidos: 0 }
  const uids = eventos.map(e => e.uid)
  const { data: existentes, error: e1 } = await supabase.from('compromissos').select('uid_externo').in('uid_externo', uids)
  if (e1) throw e1
  const ja = new Set((existentes ?? []).map(x => x.uid_externo as string))
  const vistos = new Set<string>()
  const novos = eventos.filter(e => { if (ja.has(e.uid) || vistos.has(e.uid)) return false; vistos.add(e.uid); return true })
  if (novos.length) {
    const { error } = await supabase.from('compromissos').insert(novos.map(e => ({ titulo: e.titulo, imovel: e.local || 'Importado do calendário', data_evento: e.data, dias_antes: 1, avisos_dias: [1], uid_externo: e.uid })))
    if (error) throw error
  }
  return { criados: novos.length, repetidos: eventos.length - novos.length }
}

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      const [imoveis, contratos, compromissos] = await Promise.all([
        repositorio.listarImoveis(),
        repositorio.listarContratos(),
        listarCompromissos(),
      ])
      const proprios: Alerta[] = compromissos.map(c => ({
        id: `comp-${c.id}`,
        imovelId: '',
        imovel: c.imovel,
        tipo: 'compromisso',
        titulo: c.titulo,
        dataEvento: c.dataEvento,
        diasRestantes: diasAte(c.dataEvento) ?? 0,
      }))
      setAlertas([...calcularAlertas(imoveis, contratos), ...proprios])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar alertas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  // Vencidos já contam em outro indicador; aqui só o que ainda vence.
  const getCriticos = () => alertas.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 30).length

  return { alertas, loading, error, getCriticos, recarregar }
}
