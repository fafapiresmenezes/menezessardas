import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import Marca from '@/components/Marca'
import AssinarPortal from '@/components/AssinarPortal'
import { CheckCircle2, Circle, Clock, Scale } from 'lucide-react'

// Portal do cliente: página pública, sem login, aberta por um link com código secreto gerado pelo escritório.
// Mostra só o andamento do caso (etapas, prazos e honorários); nada de notas internas.
type Etapa = { titulo: string; situacao: string; prazo: string | null }
type Caso = { titulo: string; cliente: string | null; area: string | null; numero_processo: string | null; situacao: string; atualizado_em: string; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null; etapas: Etapa[] }
const ROTULO: Record<string, string> = { a_fazer: 'A fazer', fazendo: 'Em andamento', revisao: 'Em revisão', feito: 'Concluída' }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// Passo 07: resumo de todos os casos do mesmo cliente (só andamento, prazos e honorários).
type CasoResumo = { titulo: string; area: string | null; numero_processo: string | null; situacao: string; atualizado_em: string; token: string | null; etapas_total: number; etapas_feitas: number; proximo_prazo: string | null; honorario_previsto: number; honorario_recebido: number }
type Resumo = { cliente: string; casos: CasoResumo[] }

export default function PortalClientePage() {
  const { token = '' } = useParams()
  const [caso, setCaso] = useState<Caso | null | undefined>(undefined)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  useEffect(() => {
    supabase.rpc('portal_caso', { p_token: token }).then(r => setCaso((r.data as Caso) ?? null))
    supabase.rpc('portal_cliente', { p_token: token }).then(r => setResumo((r.data as Resumo) ?? null))
  }, [token])
  const feitas = caso?.etapas.filter(e => e.situacao === 'feito').length ?? 0
  const total = caso?.etapas.length ?? 0
  return (
    <main className="min-h-screen bg-pergaminho">
      <header className="bg-navy py-6"><Marca /></header>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {caso === undefined && <p className="text-grafite">Carregando…</p>}
        {caso === null && <p role="alert" className="text-grafite">Este link não é válido, expirou (links do Portal valem 90 dias) ou foi desativado pelo escritório. Peça um link novo ao escritório.</p>}
        {caso && (
          <article data-testid="portal-caso" className="bg-white border-t-2 border-dourado shadow-sm p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Acompanhamento do seu caso</p>
            <h1 className="font-serif text-2xl text-navy mt-1">{caso.titulo}</h1>
            <p className="text-sm text-grafite mt-1">{[caso.area, caso.numero_processo && `Processo ${caso.numero_processo}`].filter(Boolean).join(' · ')}</p>
            <div className="mt-5">
              <div className="flex justify-between text-sm text-grafite"><span>Andamento</span><span>{feitas} de {total} etapas</span></div>
              <div className="h-2 bg-pergaminho mt-1" role="progressbar" aria-valuenow={total ? Math.round((feitas / total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}><div className="h-2 bg-dourado" style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} /></div>
            </div>
            <ol className="mt-6 space-y-3">
              {caso.etapas.map((e, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  {e.situacao === 'feito' ? <CheckCircle2 size={18} className="text-dourado shrink-0" aria-hidden="true" /> : e.situacao === 'fazendo' ? <Clock size={18} className="text-navy shrink-0" aria-hidden="true" /> : <Circle size={18} className="text-grafite-claro shrink-0" aria-hidden="true" />}
                  <span className="flex-1"><span className={e.situacao === 'feito' ? 'line-through text-grafite-claro' : 'text-navy'}>{e.titulo}</span><span className="block text-xs text-grafite-claro">{ROTULO[e.situacao] ?? e.situacao}{e.prazo && ` · previsto para ${formatarData(e.prazo)}`}</span></span>
                </li>
              ))}
            </ol>
            {Number(caso.honorario_previsto) > 0 && (
              <section className="mt-6 border-t border-navy/10 pt-4 text-sm">
                <h2 className="font-medium text-navy flex items-center gap-2"><Scale size={16} className="text-dourado" aria-hidden="true" /> Honorários</h2>
                <p className="text-grafite mt-1">Combinado: {brl(caso.honorario_previsto)} · Pago: {brl(caso.honorario_recebido)} · Em aberto: {brl(Math.max(0, caso.honorario_previsto - caso.honorario_recebido))}{caso.vencimento_honorario && ` · vencimento ${formatarData(caso.vencimento_honorario)}`}</p>
              </section>
            )}
            <AssinarPortal token={token} />
            <p className="text-xs text-grafite-claro mt-6">Atualizado em {formatarData(caso.atualizado_em.slice(0, 10))}. Dúvidas: fale com o escritório. Esta página não substitui a consulta aos autos.</p>
          </article>
        )}
        {caso && resumo && (
          <section data-testid="portal-resumo" className="bg-white border-t-2 border-navy shadow-sm p-6 mt-6" aria-labelledby="titulo-resumo">
            <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Painel do cliente</p>
            <h2 id="titulo-resumo" className="font-serif text-xl text-navy mt-1">{resumo.cliente}: {resumo.casos.length} {resumo.casos.length === 1 ? 'caso' : 'casos'} no escritório</h2>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-pergaminho p-3"><p className="text-xs uppercase tracking-wider text-grafite-claro">Etapas concluídas</p><p className="font-serif text-2xl text-navy">{resumo.casos.reduce((s, c) => s + Number(c.etapas_feitas), 0)} / {resumo.casos.reduce((s, c) => s + Number(c.etapas_total), 0)}</p></div>
              <div className="bg-pergaminho p-3"><p className="text-xs uppercase tracking-wider text-grafite-claro">Próximo prazo</p><p className="font-serif text-2xl text-navy">{(() => { const d = resumo.casos.map(c => c.proximo_prazo).filter(Boolean).sort()[0]; return d ? formatarData(d) : '—' })()}</p></div>
              <div className="bg-pergaminho p-3"><p className="text-xs uppercase tracking-wider text-grafite-claro">Honorários em aberto</p><p className="font-serif text-2xl text-navy">{brl(resumo.casos.reduce((s, c) => s + Math.max(0, Number(c.honorario_previsto) - Number(c.honorario_recebido)), 0))}</p></div>
            </div>
            <ul className="mt-4 divide-y divide-navy/10 text-sm">
              {resumo.casos.map((c, i) => (
                <li key={i} className="py-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-navy flex-1 min-w-[12rem]">{c.titulo}</span>
                  <span className="text-grafite-claro">{c.etapas_feitas} de {c.etapas_total} etapas{c.proximo_prazo && ` · próximo prazo ${formatarData(c.proximo_prazo)}`}</span>
                  {c.token === token && <span className="text-xs bg-dourado/20 text-dourado-escuro px-2 py-0.5">este caso</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-center text-xs text-grafite-claro mt-8">GMenezes Advogados Associados · Desenvolvido pelo Instituto THEYE</p>
      </div>
    </main>
  )
}
