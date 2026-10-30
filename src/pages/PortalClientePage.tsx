import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import Marca from '@/components/Marca'
import { CheckCircle2, Circle, Clock, Scale } from 'lucide-react'

// Portal do cliente: página pública, sem login, aberta por um link com código secreto gerado pelo escritório.
// Mostra só o andamento do caso (etapas, prazos e honorários); nada de notas internas.
type Etapa = { titulo: string; situacao: string; prazo: string | null }
type Caso = { titulo: string; cliente: string | null; area: string | null; numero_processo: string | null; situacao: string; atualizado_em: string; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null; etapas: Etapa[] }
const ROTULO: Record<string, string> = { a_fazer: 'A fazer', fazendo: 'Em andamento', revisao: 'Em revisão', feito: 'Concluída' }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PortalClientePage() {
  const { token = '' } = useParams()
  const [caso, setCaso] = useState<Caso | null | undefined>(undefined)
  useEffect(() => { supabase.rpc('portal_caso', { p_token: token }).then(r => setCaso((r.data as Caso) ?? null)) }, [token])
  const feitas = caso?.etapas.filter(e => e.situacao === 'feito').length ?? 0
  const total = caso?.etapas.length ?? 0
  return (
    <main className="min-h-screen bg-pergaminho">
      <header className="bg-navy py-6"><Marca /></header>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {caso === undefined && <p className="text-grafite">Carregando…</p>}
        {caso === null && <p role="alert" className="text-grafite">Este link não é válido ou foi desativado pelo escritório.</p>}
        {caso && (
          <article data-testid="portal-caso" className="bg-white border-t-2 border-dourado shadow-sm p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-dourado">Acompanhamento do seu caso</p>
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
            <p className="text-xs text-grafite-claro mt-6">Atualizado em {formatarData(caso.atualizado_em.slice(0, 10))}. Dúvidas: fale com o escritório. Esta página não substitui a consulta aos autos.</p>
          </article>
        )}
        <p className="text-center text-xs text-grafite-claro mt-8">GMenezes Advogados Associados · Desenvolvido pelo Instituto THEYE</p>
      </div>
    </main>
  )
}
