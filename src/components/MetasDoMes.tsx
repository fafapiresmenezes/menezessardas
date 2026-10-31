import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Passo 50: "Metas do mês" por função no Painel: horas (meta em Configurações/Horas), casos concluídos, tarefas e prazos,
// mais honorários do mês; barra de progresso e cor pelo desvio em relação ao esperado até hoje.
type Funcao = { papel: string; meta_horas: number; pessoas: number; horas: number; esperado_hoje: number; casos_concluidos: number; tarefas_feitas: number; prazos_vencidos: number }
type Metas = { mes: string; dias_uteis_mes: number; dias_uteis_ate_hoje: number; honorarios_previstos: number; honorarios_recebidos: number; casos_concluidos_total: number; casos_abertos_total: number; por_funcao: Funcao[] }
const NOME: Record<string, string> = { socia: 'Sócia', advogada: 'Advogada', estagiario: 'Estagiário', secretaria: 'Secretária', financeiro: 'Financeiro' }
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function corDesvio(pct: number | null): { classe: string; rotulo: string } {
  if (pct === null) return { classe: 'bg-grafite-claro', rotulo: 'sem meta' }
  if (pct >= 95) return { classe: 'bg-regular', rotulo: 'no ritmo' }
  if (pct >= 70) return { classe: 'bg-atencao', rotulo: 'atenção' }
  return { classe: 'bg-critico', rotulo: 'abaixo' }
}
export function pctRitmo(feito: number, esperado: number): number | null { return esperado > 0 ? Math.round(100 * feito / esperado) : null }

export default function MetasDoMes() {
  const [m, setM] = useState<Metas | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => { supabase.rpc('metas_do_mes').then(({ data, error }) => { if (error) setErro(error.message); else setM(data as Metas) }) }, [])
  if (erro) return <p role="alert" className="text-sm text-critico">{erro}</p>
  if (!m) return null
  const pctHon = pctRitmo(Number(m.honorarios_recebidos), Number(m.honorarios_previstos))
  const corHon = corDesvio(pctHon)
  return (
    <section aria-labelledby="titulo-metas" data-testid="metas-do-mes" className="bg-white border-t-2 border-dourado p-5 shadow-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-metas" className="text-lg">Metas do mês por função</h2>
        <p className="text-xs text-grafite-claro">{m.dias_uteis_ate_hoje} de {m.dias_uteis_mes} dias úteis · metas de horas em Horas e honorários · cada pessoa escolhe sua função em Meu dia</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {m.por_funcao.map(f => {
          const pct = pctRitmo(f.horas, f.esperado_hoje); const cor = corDesvio(f.meta_horas > 0 ? pct : null)
          const largura = f.meta_horas > 0 ? Math.min(100, Math.round(100 * f.horas / f.meta_horas)) : 0
          return (
            <div key={f.papel} className="border border-navy/10 p-3" data-testid="meta-funcao">
              <div className="flex items-center justify-between"><p className="font-medium text-navy">{NOME[f.papel] ?? f.papel}</p><span className={`text-[10px] uppercase tracking-wider text-white px-2 py-0.5 ${cor.classe}`} data-testid="meta-situacao">{cor.rotulo}</span></div>
              <p className="text-sm mt-1">{f.horas}h de {f.meta_horas}h <span className="text-grafite-claro">(esperado até hoje {f.esperado_hoje}h{pct !== null ? `, ${pct}% do ritmo` : ''})</span></p>
              <div className="h-2 bg-pergaminho mt-1" aria-hidden="true"><div className={`h-2 ${cor.classe}`} style={{ width: `${largura}%` }} /></div>
              <p className="text-xs text-grafite-claro mt-1">{f.casos_concluidos} caso(s) concluído(s) · {f.tarefas_feitas} tarefa(s) feita(s){f.prazos_vencidos ? ` · ${f.prazos_vencidos} prazo(s) vencido(s)` : ''}{f.pessoas ? ` · ${f.pessoas} pessoa(s)` : ' · ninguém escolheu esta função em Meu dia ainda'}</p>
            </div>
          )
        })}
        <div className="border border-navy/10 p-3" data-testid="meta-honorarios">
          <div className="flex items-center justify-between"><p className="font-medium text-navy">Honorários do mês</p><span className={`text-[10px] uppercase tracking-wider text-white px-2 py-0.5 ${corHon.classe}`}>{corHon.rotulo}</span></div>
          <p className="text-sm mt-1">{brl(m.honorarios_recebidos)} recebidos de {brl(m.honorarios_previstos)} previstos{pctHon !== null ? ` (${pctHon}%)` : ''}</p>
          <div className="h-2 bg-pergaminho mt-1" aria-hidden="true"><div className={`h-2 ${corHon.classe}`} style={{ width: `${Math.min(100, pctHon ?? 0)}%` }} /></div>
          <p className="text-xs text-grafite-claro mt-1">{m.casos_concluidos_total} caso(s) concluído(s) no mês · {m.casos_abertos_total} aberto(s)</p>
        </div>
      </div>
    </section>
  )
}
