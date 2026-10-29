import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { calcularPrazo } from '@/lib/prazos'
import { CalendarClock, Inbox, ListChecks, FileWarning } from 'lucide-react'

// "Meu dia": o que cada nível do escritório precisa ver ao abrir a plataforma, num só lugar.
// O papel escolhido define a ordem e os atalhos; os dados são os mesmos para todos (respeitando o sigilo).
const PAPEIS: Record<string, { nome: string; foco: string; atalhos: { rotulo: string; href: string }[] }> = {
  socia: { nome: 'Sócia', foco: 'Visão da carteira, riscos e decisões que só você toma.', atalhos: [
    { rotulo: 'Indicadores e OKRs', href: '/indicadores' }, { rotulo: 'Previsões e riscos', href: '/previsoes' }, { rotulo: 'Consumo e custos', href: '/consumo' }, { rotulo: 'Mercado jurídico', href: '/mercado' }] },
  advogada: { nome: 'Advogada', foco: 'Prazos, intimações e peças do dia.', atalhos: [
    { rotulo: 'Assistente jurídico (redigir peça)', href: '/assistente' }, { rotulo: 'Intimações', href: '/intimacoes' }, { rotulo: 'Fontes do advogado', href: '/fontes' }, { rotulo: 'Checar contraparte', href: '/kyc' }] },
  estagiario: { nome: 'Estagiário ou paralegal', foco: 'Tarefas atribuídas a você e pesquisas.', atalhos: [
    { rotulo: 'Projetos e tarefas', href: '/projetos' }, { rotulo: 'Legislação', href: '/legislacao' }, { rotulo: 'Fontes do advogado', href: '/fontes' }, { rotulo: 'Imóveis e documentos', href: '/imoveis' }] },
  secretaria: { nome: 'Secretária', foco: 'Agenda, vencimentos e documentos a cobrar.', atalhos: [
    { rotulo: 'Agenda', href: '/agenda' }, { rotulo: 'Alertas', href: '/alertas' }, { rotulo: 'Fornecedores', href: '/fornecedores' }, { rotulo: 'Novo imóvel', href: '/imoveis/novo' }] },
  financeiro: { nome: 'Financeiro', foco: 'Reajustes, recebíveis e custos.', atalhos: [
    { rotulo: 'Relatórios', href: '/relatorios' }, { rotulo: 'Consumo e custos', href: '/consumo' }, { rotulo: 'Indicadores', href: '/indicadores' }, { rotulo: 'Alertas de reajuste', href: '/alertas' }] },
}
const hoje = () => new Date().toISOString().slice(0, 10)
const fmt = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR')

export default function MeuDiaPage() {
  const [papel, setPapel] = useState(() => { try { return localStorage.getItem('lsm-papel') || 'advogada' } catch { return 'advogada' } })
  const [tarefas, setTarefas] = useState<{ id: string; titulo: string; prazo: string | null; prioridade: string }[]>([])
  const [intimacoes, setIntimacoes] = useState(0)
  const [vencendo, setVencendo] = useState<{ id: string; imovel_id: string; locatario_fornecedor: string; data_vencimento: string }[]>([])
  const [calc, setCalc] = useState({ inicio: hoje(), dias: 15, dobro: false })
  const prazo = calc.dias > 0 && calc.inicio ? calcularPrazo(calc.inicio, calc.dias, calc.dobro) : null

  useEffect(() => { try { localStorage.setItem('lsm-papel', papel) } catch { /* sem armazenamento */ } }, [papel])
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser()
      const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      const em60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
      const [t, i, c] = await Promise.all([
        supabase.from('tarefas').select('id,titulo,prazo,prioridade').eq('responsavel_id', u.user?.id ?? '').neq('situacao', 'feito').lte('prazo', em7).order('prazo').limit(20),
        supabase.from('intimacoes').select('id', { count: 'exact', head: true }).eq('lida', false),
        supabase.from('contratos').select('id,imovel_id,locatario_fornecedor,data_vencimento').is('encerrado_em', null).gte('data_vencimento', hoje()).lte('data_vencimento', em60).order('data_vencimento').limit(10),
      ])
      setTarefas(t.data ?? []); setIntimacoes(i.count ?? 0); setVencendo(c.data ?? [])
    })()
  }, [])
  const p = PAPEIS[papel]
  const cartao = 'bg-white shadow-sm p-5'
  return (
    <Layout title="Meu dia">
      <div className="space-y-5">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <p className="font-medium mb-2">Qual é a sua função?</p>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {Object.entries(PAPEIS).map(([k, v]) => (
              <button key={k} type="button" role="radio" aria-checked={papel === k} data-testid={`papel-${k}`} onClick={() => setPapel(k)}
                className={`min-h-[44px] px-4 text-sm border ${papel === k ? 'bg-navy text-white' : ''}`}>{v.nome}</button>
            ))}
          </div>
          <p className="text-sm text-grafite-claro mt-2">{p.foco}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {p.atalhos.map(a => <Link key={a.href + a.rotulo} to={a.href} className="min-h-[44px] inline-flex items-center px-4 text-sm border border-navy text-navy">{a.rotulo}</Link>)}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <section className={cartao}>
            <h2 className="font-serif text-lg flex items-center gap-2"><ListChecks className="w-5 h-5" aria-hidden />Minhas tarefas (7 dias)</h2>
            {tarefas.length ? <ul className="text-sm mt-2 space-y-1">{tarefas.map(t => <li key={t.id}>{t.prazo && <span className={t.prazo < hoje() ? 'text-critico font-medium' : ''}>{fmt(t.prazo)} · </span>}{t.titulo}</li>)}</ul>
              : <p className="text-sm text-grafite-claro mt-2">Nada vencendo para você.</p>}
          </section>
          <section className={cartao}>
            <h2 className="font-serif text-lg flex items-center gap-2"><Inbox className="w-5 h-5" aria-hidden />Intimações</h2>
            <p className="text-3xl font-serif mt-2" data-testid="intimacoes-nao-lidas">{intimacoes}</p>
            <p className="text-sm text-grafite-claro">não lidas · <Link to="/intimacoes" className="underline">abrir</Link></p>
          </section>
          <section className={cartao}>
            <h2 className="font-serif text-lg flex items-center gap-2"><FileWarning className="w-5 h-5" aria-hidden />Contratos vencendo (60 dias)</h2>
            {vencendo.length ? <ul className="text-sm mt-2 space-y-1">{vencendo.map(c => <li key={c.id}><Link to={`/contrato/${c.imovel_id}`} className="underline">{fmt(c.data_vencimento)} · {c.locatario_fornecedor}</Link></li>)}</ul>
              : <p className="text-sm text-grafite-claro mt-2">Nenhum nos próximos 60 dias.</p>}
          </section>
        </div>

        <section className={cartao}>
          <h2 className="font-serif text-lg flex items-center gap-2"><CalendarClock className="w-5 h-5" aria-hidden />Calculadora de prazo processual</h2>
          <div className="flex flex-wrap gap-3 items-end mt-3 text-sm">
            <label>Data da intimação ou publicação<input type="date" value={calc.inicio} onChange={e => setCalc({ ...calc, inicio: e.target.value })} className="block border px-3 py-2 mt-1" data-testid="prazo-inicio" /></label>
            <label>Dias úteis<input type="number" min={1} max={365} value={calc.dias} onChange={e => setCalc({ ...calc, dias: Number(e.target.value) })} className="block border px-3 py-2 mt-1 w-24" data-testid="prazo-dias" /></label>
            <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={calc.dobro} onChange={e => setCalc({ ...calc, dobro: e.target.checked })} />Em dobro (Fazenda, MP, Defensoria, litisconsortes)</label>
          </div>
          {prazo && (
            <div className="mt-3" aria-live="polite">
              <p className="text-lg">Último dia: <strong data-testid="prazo-final">{fmt(prazo.final)}</strong> ({prazo.diasContados} dias úteis)</p>
              {!!prazo.pulados.length && <p className="text-xs text-grafite-claro">Dias não contados: {prazo.pulados.map(x => `${fmt(x.data)} (${x.motivo})`).join('; ')}.</p>}
              <p className="text-xs text-atencao mt-1">Base: CPC arts. 219, 220 e 224; feriados nacionais e do Rio. Confira feriados locais e suspensões por portaria do tribunal antes de protocolar.</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
