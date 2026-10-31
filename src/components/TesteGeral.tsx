import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { repositorio } from '@/lib/repositorio'
import { radarPortais } from '@/lib/legislacao'
import { preverCarteira } from '@/lib/predicao'
import { CheckCircle2, XCircle, Loader2, PlayCircle } from 'lucide-react'

type Estado = 'esperando' | 'rodando' | 'ok' | 'falhou'
interface Teste { nome: string; rodar: () => Promise<string> }

async function funcao(nome: string, corpo: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo })
  if (error) throw new Error(error.message)
  if (data?.erro) throw new Error(data.erro)
  return data
}

// Cada teste usa a própria plataforma (banco e funções do servidor), com o menor custo possível de IA.
const TESTES: Teste[] = [
  { nome: 'Banco de dados: imóveis e contratos', rodar: async () => { const [i, c] = await Promise.all([repositorio.listarImoveis(), repositorio.listarContratos()]); return `${i.length} imóveis, ${c.length} contratos` } },
  { nome: 'Previsões da carteira', rodar: async () => { const p = preverCarteira(await repositorio.listarImoveis(), await repositorio.listarContratos()); return `${p.length} contratos avaliados` } },
  { nome: 'Assistente: leitura da lei ao vivo (Planalto)', rodar: async () => { const d = await funcao('assistente-juridico', { sonda: true, lei: 'inquilinato', termos: ['renovatória'], artigos: ['51'] }); if (!d.artigos) throw new Error('lei vazia'); return `Lei 8.245: ${d.artigos} artigos lidos` } },
  { nome: 'Chave da IA (análise de contrato)', rodar: async () => { await funcao('analisar-contrato', { teste: true }); return 'chave aceita' } },
  { nome: 'Índice de reajuste (Banco Central)', rodar: async () => { const d = await funcao('indice-reajuste', { indice: 'igpm' }); return `IGP-M 12 meses: ${d.acumulado12m}%` } },
  { nome: 'Chance de êxito (CNJ)', rodar: async () => { const d = await funcao('jurimetria', { acao: 'despejo', tribunal: 'tjrj' }); return `despejo TJRJ: ${d.chanceExito}% (amostra ${d.amostra})` } },
  { nome: 'Radar dos portais', rodar: async () => { const r = await radarPortais(); if (!r.length) throw new Error('radar vazio'); return `${r.length} itens` } },
  { nome: 'Consulta de CNPJ (Receita Federal)', rodar: async () => { const { data, error } = await supabase.functions.invoke('consultar-cnpj?cnpj=00000000000191', { method: 'GET' }); if (error) throw new Error(error.message); if (data?.erro) throw new Error(data.erro); return `${data.empresa.nome}: ${data.empresa.situacao}` } },
  { nome: 'Coleta para calibragem', rodar: async () => { const { count, error } = await supabase.from('registro_previsoes').select('id', { count: 'exact', head: true }); if (error) throw new Error(error.message); return `${count ?? 0} previsões guardadas` } },
]

/** Painel do administrador: roda todas as funções da plataforma e mostra o resultado de cada uma. */
export default function TesteGeral() {
  const [estados, setEstados] = useState<Record<string, { e: Estado; msg?: string; ms?: number }>>({})
  const [rodando, setRodando] = useState(false)
  const [diario, setDiario] = useState<{ verificacao: string; ok: boolean; verificado_em: string; detalhe: string | null }[]>([])
  // Passo 18: histórico de 30 dias (um quadradinho por dia e verificação; o site, conferido a cada hora, conta o pior resultado do dia).
  const [historico, setHistorico] = useState<{ verificacao: string; ok: boolean; verificado_em: string }[]>([])
  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.from('saude_sistema').select('verificacao,ok,verificado_em,detalhe').order('id', { ascending: false }).limit(30)
      // Fica com o resultado mais recente de cada verificação (o site é conferido a cada hora; o resto, às 8h45).
      .then(({ data }) => setDiario((data ?? []).filter((d, i, todos) => todos.findIndex(x => x.verificacao === d.verificacao) === i)))
    const desde = new Date(Date.now() - 30 * 86400000).toISOString()
    supabase.from('saude_sistema').select('verificacao,ok,verificado_em').gte('verificado_em', desde).order('id', { ascending: true }).limit(2000)
      .then(({ data }) => setHistorico(data ?? []))
  }, [])
  const dias = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10))
  const verificacoes = [...new Set(historico.map(h => h.verificacao))]
  const celula = (v: string, dia: string) => {
    const do_dia = historico.filter(h => h.verificacao === v && h.verificado_em.slice(0, 10) === dia)
    if (!do_dia.length) return null
    return do_dia.every(h => h.ok)
  }
  const resumoDia = (dia: string) => {
    const do_dia = historico.filter(h => h.verificado_em.slice(0, 10) === dia)
    if (!do_dia.length) return null
    const porVerif = [...new Set(do_dia.map(h => h.verificacao))]
    return { total: porVerif.length, ok: porVerif.filter(v => do_dia.filter(h => h.verificacao === v).every(h => h.ok)).length }
  }
  const rodar = async () => {
    setRodando(true)
    setEstados(Object.fromEntries(TESTES.map(t => [t.nome, { e: 'rodando' as Estado }])))
    await Promise.all(TESTES.map(async t => {
      const ini = performance.now()
      try { const msg = await t.rodar(); setEstados(s => ({ ...s, [t.nome]: { e: 'ok', msg, ms: performance.now() - ini } })) }
      catch (err) { setEstados(s => ({ ...s, [t.nome]: { e: 'falhou', msg: err instanceof Error ? err.message : 'erro', ms: performance.now() - ini } })) }
    }))
    setRodando(false)
  }
  const oks = Object.values(estados).filter(s => s.e === 'ok').length
  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="t-testes">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 id="t-testes" className="text-lg">Testar todas as funções</h2>
          <p className="text-sm text-grafite-claro">Roda cada função dentro da plataforma. Além disso, um teste automático confere as funções todo dia às 8h45, e o site a cada hora.</p>
          {diario.length > 0 && (
            <p className="text-sm mt-1" aria-live="polite">
              Último teste automático ({new Date(diario[0].verificado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}): {diario.filter(d => d.ok).length} de {diario.length} funcionando
              {diario.some(d => !d.ok) && <span className="block text-xs text-critico">Com falha: {diario.filter(d => !d.ok).map(d => d.verificacao).join(', ')}</span>}
            </p>
          )}
        </div>
        <button onClick={rodar} disabled={rodando || !supabaseConfigurado} className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm disabled:opacity-50">
          <PlayCircle size={16} aria-hidden="true" /> {rodando ? 'Testando…' : 'Testar tudo'}
        </button>
      </div>
      {!supabaseConfigurado && <p className="text-sm text-grafite-claro">Disponível na versão de produção.</p>}
      {historico.length > 0 && (
        <section className="mb-4" aria-labelledby="t-historico" data-testid="historico-30-dias">
          <h3 id="t-historico" className="text-sm font-medium">Histórico do teste automático (30 dias)</h3>
          <p className="text-xs text-grafite-claro mb-2">Cada quadrado é um dia: verde funcionou, vermelho falhou, cinza sem teste. Quando algo falha, as administradoras recebem e-mail na hora.</p>
          <div className="overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0.5" role="grid" aria-label="Resultado diário por verificação">
              <thead><tr><th scope="col" className="text-left pr-2 font-normal text-grafite-claro">Verificação</th>{dias.map(d => <th key={d} scope="col" className="font-normal text-grafite-claro w-4" title={d.split('-').reverse().join('/')}>{d.slice(8) === '01' || d === dias[0] ? d.slice(8) : <span className="sr-only">{d.split('-').reverse().join('/')}</span>}</th>)}</tr></thead>
              <tbody>
                {verificacoes.map(v => (
                  <tr key={v} data-testid="linha-historico">
                    <th scope="row" className="text-left pr-2 font-normal whitespace-nowrap">{v}</th>
                    {dias.map(d => { const c = celula(v, d); return <td key={d} className={`w-4 h-4 ${c === null ? 'bg-navy/10' : c ? 'bg-regular' : 'bg-critico'}`} title={`${v} · ${d.split('-').reverse().join('/')}: ${c === null ? 'sem teste' : c ? 'funcionou' : 'falhou'}`} aria-label={`${d.split('-').reverse().join('/')}: ${c === null ? 'sem teste' : c ? 'funcionou' : 'falhou'}`} /> })}
                  </tr>
                ))}
                <tr data-testid="linha-resumo">
                  <th scope="row" className="text-left pr-2 font-medium whitespace-nowrap">Funcionando por dia</th>
                  {dias.map(d => { const r = resumoDia(d); return <td key={d} className="text-center text-[10px] text-grafite">{r ? `${r.ok}/${r.total}` : ''}</td> })}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
      {Object.keys(estados).length > 0 && (
        <>
          <p className="text-sm mb-2" aria-live="polite">{oks} de {TESTES.length} funcionando</p>
          <ul className="divide-y divide-navy/10">
            {TESTES.map(t => {
              const s = estados[t.nome]
              return (
                <li key={t.nome} className="py-2 flex items-start gap-2 text-sm">
                  {s?.e === 'ok' ? <CheckCircle2 size={18} className="text-regular shrink-0" aria-label="Funcionando" /> : s?.e === 'falhou' ? <XCircle size={18} className="text-critico shrink-0" aria-label="Falhou" /> : <Loader2 size={18} className="animate-spin shrink-0" aria-label="Testando" />}
                  <span className="flex-1">{t.nome}{s?.msg && <span className={`block text-xs ${s.e === 'falhou' ? 'text-critico' : 'text-grafite-claro'}`}>{s.msg}{s.ms ? ` · ${(s.ms / 1000).toFixed(1)} s` : ''}</span>}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
