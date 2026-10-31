import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { calcularPrazo, feriadosDoRio } from '@/lib/prazos'
import { CalendarClock, Inbox, ListChecks, FileWarning, Briefcase, Mail } from 'lucide-react'
import { extrairAcoes } from '@/lib/acoesConsultor'
import { render } from '@/pages/AssistentePage'

// "Meu dia": o que cada nível do escritório precisa ver ao abrir a plataforma, num só lugar.
// O papel escolhido define a ordem e os atalhos; os dados são os mesmos para todos (respeitando o sigilo).
// Consultor da semana: cada papel lê o diagnóstico gerado toda segunda-feira pelo consultor do seu nível.
const NIVEL_DO_PAPEL: Record<string, string> = { socia: 'nivel_socio_gestor', advogada: 'nivel_pleno', estagiario: 'nivel_estagiario', secretaria: 'nivel_secretaria', financeiro: 'nivel_financeiro' }
const PAPEIS: Record<string, { nome: string; foco: string; atalhos: { rotulo: string; href: string }[] }> = {
  socia: { nome: 'Sócia', foco: 'Visão da carteira, riscos e decisões que só você toma.', atalhos: [
    { rotulo: 'Indicadores e OKRs', href: '/indicadores' }, { rotulo: 'Previsões e riscos', href: '/previsoes' }, { rotulo: 'Consumo e custos', href: '/consumo' }, { rotulo: 'Mercado jurídico', href: '/mercado' }] },
  advogada: { nome: 'Advogada', foco: 'Prazos, intimações e peças do dia.', atalhos: [
    { rotulo: 'Assistente jurídico (redigir peça)', href: '/assistente' }, { rotulo: 'Lançar horas', href: '/horas' }, { rotulo: 'Modelos de peças', href: '/modelos' }, { rotulo: 'Intimações', href: '/intimacoes' }, { rotulo: 'Fontes do advogado', href: '/fontes' }, { rotulo: 'Checar contraparte', href: '/kyc' }] },
  estagiario: { nome: 'Estagiário ou paralegal', foco: 'Tarefas atribuídas a você e pesquisas.', atalhos: [
    { rotulo: 'Projetos e tarefas', href: '/projetos' }, { rotulo: 'Legislação', href: '/legislacao' }, { rotulo: 'Fontes do advogado', href: '/fontes' }, { rotulo: 'Imóveis e documentos', href: '/imoveis' }] },
  secretaria: { nome: 'Secretária', foco: 'Agenda, vencimentos e documentos a cobrar.', atalhos: [
    { rotulo: 'Agenda', href: '/agenda' }, { rotulo: 'Alertas', href: '/alertas' }, { rotulo: 'Fornecedores', href: '/fornecedores' }, { rotulo: 'Novo imóvel', href: '/imoveis/novo' }] },
  financeiro: { nome: 'Financeiro', foco: 'Reajustes, recebíveis e custos.', atalhos: [
    { rotulo: 'Horas e honorários', href: '/horas' }, { rotulo: 'Relatórios', href: '/relatorios' }, { rotulo: 'Consumo e custos', href: '/consumo' }, { rotulo: 'Indicadores', href: '/indicadores' }, { rotulo: 'Alertas de reajuste', href: '/alertas' }] },
}
// Resumo semanal (Passo 14): gerado toda segunda 8h pelo Edge resumo-semanal e enviado por e-mail; aqui cada função vê a sua parte.
const SECAO_DO_PAPEL: Record<string, 'socia' | 'advogada' | 'secretaria'> = { socia: 'socia', advogada: 'advogada', estagiario: 'advogada', secretaria: 'secretaria', financeiro: 'socia' }
const ROTULOS_RESUMO: Record<string, string> = {
  contratos_vencidos: 'Contratos vencidos', contratos_60_dias: 'Contratos vencendo em 60 dias', valor_60_dias: 'Valor mensal em risco (60 dias)',
  honorarios_em_aberto: 'Honorários em aberto', honorarios_atrasados: 'Honorários atrasados', tarefas_alta: 'Tarefas de prioridade alta abertas',
  intimacoes_nao_lidas: 'Intimações não lidas', prazos_processuais_semana: 'Prazos processuais nesta semana', prazos_vencidos: 'Prazos processuais vencidos',
  tarefas_semana: 'Tarefas com prazo nesta semana', tarefas_vencidas: 'Tarefas vencidas', audiencias_compromissos: 'Audiências e compromissos na semana',
  compromissos_semana: 'Compromissos da semana', compromissos_lista: 'Agenda', contratos_30_dias: 'Contratos vencendo em 30 dias', reajustes_30_dias: 'Reajustes a aplicar em 30 dias',
}
const DINHEIRO = new Set(['valor_60_dias', 'honorarios_em_aberto'])
const brl = (v: number) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
type Resumo = { semana: string; socia: Record<string, string | number>; advogada: Record<string, string | number>; secretaria: Record<string, string | number> }
const hoje = () => new Date().toISOString().slice(0, 10)
const fmt = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR')

export default function MeuDiaPage() {
  const [papel, setPapel] = useState(() => { try { return localStorage.getItem('lsm-papel') || 'advogada' } catch { return 'advogada' } })
  const [tarefas, setTarefas] = useState<{ id: string; titulo: string; prazo: string | null; prioridade: string }[]>([])
  const [intimacoes, setIntimacoes] = useState(0)
  const [vencendo, setVencendo] = useState<{ id: string; imovel_id: string; locatario_fornecedor: string; data_vencimento: string }[]>([])
  const [calc, setCalc] = useState({ inicio: hoje(), dias: 15, dobro: false })
  const [diagnostico, setDiagnostico] = useState<{ id: string; resposta: string; criado_em: string } | null>(null)
  // Passo 20: ações do Consultor da semana marcáveis como feitas (tabela acoes_consultor).
  const [acoes, setAcoes] = useState<{ id: string; indice: number; texto: string; feito_em: string | null }[]>([])
  const [resumo, setResumo] = useState<{ conteudo: Resumo; criado_em: string; enviado_em: string | null; destinatarios: number } | null>(null)
  const [msgResumo, setMsgResumo] = useState('')
  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.from('resumos_semanais').select('conteudo,criado_em,enviado_em,destinatarios').order('semana', { ascending: false }).limit(1).maybeSingle().then(r => setResumo(r.data ?? null))
  }, [])
  const testarResumo = async () => {
    setMsgResumo('Enviando o resumo de teste para o seu e-mail…')
    const { data, error } = await supabase.functions.invoke('resumo-semanal', { body: { teste: true } })
    if (error) return setMsgResumo(`Não foi possível enviar: ${error.message}`)
    if (data?.enviado) { setMsgResumo('Resumo de teste enviado para o seu e-mail. Toda segunda-feira às 8h ele vai para toda a equipe.'); if (data.resumo) setResumo(r => r ?? { conteudo: data.resumo, criado_em: new Date().toISOString(), enviado_em: null, destinatarios: 0 }) }
    else setMsgResumo(`Não enviado: ${data?.motivo ?? data?.detalhe ?? data?.erro ?? 'erro desconhecido'}.`)
  }
  useEffect(() => {
    if (!supabaseConfigurado) { setDiagnostico(null); return }
    supabase.from('diagnosticos_semanais').select('id,resposta,criado_em').eq('nivel', NIVEL_DO_PAPEL[papel] ?? 'nivel_pleno').order('criado_em', { ascending: false }).limit(1).maybeSingle().then(async r => {
      setDiagnostico(r.data ?? null); setAcoes([])
      if (!r.data) return
      // Garante as ações do diagnóstico na tabela (só na primeira vez) e carrega o estado de cada uma.
      const textos = extrairAcoes(r.data.resposta)
      if (textos.length) await supabase.from('acoes_consultor').upsert(textos.map((texto, i) => ({ diagnostico_id: r.data!.id, indice: i + 1, texto })), { onConflict: 'diagnostico_id,indice', ignoreDuplicates: true })
      const { data } = await supabase.from('acoes_consultor').select('id,indice,texto,feito_em').eq('diagnostico_id', r.data.id).order('indice')
      setAcoes(data ?? [])
    })
  }, [papel])
  const marcarAcao = async (a: { id: string; feito_em: string | null }) => {
    const feito_em = a.feito_em ? null : new Date().toISOString()
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('acoes_consultor').update({ feito_em, usuario_id: feito_em ? u.user?.id ?? null : null }).eq('id', a.id)
    if (!error) setAcoes(acoes.map(x => x.id === a.id ? { ...x, feito_em } : x))
  }
  const feitas = acoes.filter(a => a.feito_em).length
  // Passo 21: aviso quando as horas do mês estão abaixo de 80% do ritmo da meta da função.
  const [horas, setHoras] = useState<{ meta: number; horas: number; esperado_hoje: number; pct_ritmo: number | null; abaixo: boolean } | null>(null)
  useEffect(() => { if (!supabaseConfigurado) return; supabase.rpc('progresso_horas', { p_papel: papel }).then(r => setHoras(r.data ?? null)) }, [papel])
  const prazo = calc.dias > 0 && calc.inicio ? calcularPrazo(calc.inicio, calc.dias, calc.dobro) : null

  useEffect(() => { try { localStorage.setItem('lsm-papel', papel) } catch { /* sem armazenamento */ } if (supabaseConfigurado) supabase.rpc('definir_papel', { p_papel: papel }).then(() => undefined, () => undefined) }, [papel])
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

        {horas && horas.meta > 0 && (
          <section className={`${cartao} ${horas.abaixo ? 'border-l-4 border-critico' : ''}`} data-testid="alerta-horas" role={horas.abaixo ? 'alert' : undefined}>
            <p className="text-sm"><strong>Horas do mês:</strong> {horas.horas}h lançadas, esperado até hoje {horas.esperado_hoje}h (meta {horas.meta}h). {horas.abaixo ? <span className="text-critico font-medium" data-testid="horas-abaixo">Abaixo de 80% do ritmo. </span> : <span data-testid="horas-ok">No ritmo. </span>}<Link to="/horas" className="underline">Lançar horas</Link></p>
          </section>
        )}
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

        <section className={cartao} data-testid="resumo-semanal">
          <h2 className="font-serif text-lg flex items-center gap-2"><Mail className="w-5 h-5" aria-hidden />Resumo semanal de alertas</h2>
          <p className="text-xs text-grafite-claro mt-1">Toda segunda-feira às 8h a plataforma consolida os alertas por função e envia por e-mail a toda a equipe. Aqui está a parte da sua função.</p>
          {resumo ? (
            <>
              <p className="text-xs text-grafite-claro mt-2">Semana de {resumo.conteudo.semana}{resumo.enviado_em ? ` · enviado a ${resumo.destinatarios} pessoa(s) em ${new Date(resumo.enviado_em).toLocaleDateString('pt-BR')}` : ''}</p>
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm mt-2">
                {Object.entries(resumo.conteudo[SECAO_DO_PAPEL[papel] ?? 'advogada'] ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-navy/10 py-1" data-testid={`resumo-${k}`}><dt>{ROTULOS_RESUMO[k] ?? k}</dt><dd className="font-medium text-right">{DINHEIRO.has(k) ? brl(Number(v)) : (v === '' ? '—' : String(v))}</dd></div>
                ))}
              </dl>
            </>
          ) : <p className="text-sm text-grafite-claro mt-2">O primeiro resumo chega na segunda-feira às 8h.</p>}
          <button type="button" onClick={testarResumo} data-testid="testar-resumo" className="min-h-[44px] px-4 mt-3 text-sm border border-navy text-navy">Enviar-me o resumo agora (teste)</button>
          {msgResumo && <p className="text-sm mt-2" role="status" data-testid="msg-resumo">{msgResumo}</p>}
        </section>
        <section className={cartao} data-testid="consultor-semana">
          <h2 className="font-serif text-lg flex items-center gap-2"><Briefcase className="w-5 h-5" aria-hidden />Consultor da semana</h2>
          {diagnostico ? (
            <>
              <p className="text-xs text-grafite-claro mt-1">Gerado em {new Date(diagnostico.criado_em).toLocaleDateString('pt-BR')} pelo consultor do seu nível. <Link to="/consultores" className="underline">Pedir um diagnóstico agora</Link></p>
              <div className="prose prose-sm max-w-none mt-3">{render(diagnostico.resposta)}</div>
              {!!acoes.length && (
                <div className="mt-4 border-t border-navy/10 pt-3" data-testid="acoes-consultor">
                  <p className="text-sm font-semibold flex items-center justify-between">Ações da semana <span data-testid="aderencia-semana">{feitas} de {acoes.length} feitas ({Math.round(100 * feitas / acoes.length)}%)</span></p>
                  <ul className="mt-2 space-y-1">
                    {acoes.map(a => (
                      <li key={a.id}>
                        <label className="flex items-start gap-2 text-sm min-h-[44px] cursor-pointer">
                          <input type="checkbox" checked={!!a.feito_em} onChange={() => marcarAcao(a)} className="mt-1" data-testid={`acao-${a.indice}`} />
                          <span className={a.feito_em ? 'line-through text-grafite-claro' : ''}>{a.indice}. {a.texto}{a.feito_em && <span className="text-xs ml-2">feita em {new Date(a.feito_em).toLocaleDateString('pt-BR')}</span>}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-grafite-claro mt-1">A aderência por nível aparece em <Link to="/indicadores" className="underline">Indicadores</Link>.</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-grafite-claro mt-2">O primeiro diagnóstico chega na segunda-feira. Enquanto isso, <Link to="/consultores" className="underline">peça um agora em Consultores</Link>.</p>
          )}
        </section>
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
              <p className="text-xs text-atencao mt-1">Base: CPC arts. 219, 220 e 224; feriados nacionais, do Estado e do Município do Rio e datas de expediente suspenso (TJRJ e Justiça Federal). Confira suspensões por portaria do tribunal antes de protocolar.</p>
              <details className="text-xs text-grafite-claro mt-1" data-testid="feriados-rio"><summary className="cursor-pointer">Feriados do Rio considerados em {new Date(calc.inicio + 'T12:00').getFullYear()}</summary>
                <ul className="mt-1 columns-2">{feriadosDoRio(new Date(calc.inicio + 'T12:00').getFullYear()).map(f => <li key={f.data} data-testid="feriado-rio">{fmt(f.data)} · {f.nome}</li>)}</ul></details>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
