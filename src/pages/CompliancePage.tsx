import { useState } from 'react'
import Layout from '@/components/Layout'
import { Printer, MessageSquare, UserCheck } from 'lucide-react'

// Diagnóstico de integridade vendável a clientes: perguntas baseadas nos parâmetros de avaliação do
// programa de integridade (Decreto 11.129/2022, art. 57) e na LGPD (Lei 13.709/2018). Gera nota por
// pilar, lacunas e plano de ação, prontos para imprimir ou salvar em PDF e entregar ao cliente.
type Pergunta = { texto: string; base: string; acao: string }
const PILARES: { nome: string; perguntas: Pergunta[] }[] = [
  { nome: 'Alta direção e governança', perguntas: [
    { texto: 'A alta direção apoia o programa de forma visível e documentada?', base: 'Dec. 11.129/22, art. 57, I', acao: 'Aprovar o programa em ata da diretoria e comunicar a todos.' },
    { texto: 'Há uma área ou pessoa responsável pelo compliance, com autonomia e recursos?', base: 'art. 57, IX', acao: 'Nomear um responsável com reporte direto à diretoria e orçamento próprio.' },
  ] },
  { nome: 'Regras e treinamento', perguntas: [
    { texto: 'Existe código de ética e conduta escrito e aplicado a todos?', base: 'art. 57, II e III', acao: 'Redigir o código de conduta e colher o ciente de cada colaborador.' },
    { texto: 'Há treinamentos periódicos sobre integridade?', base: 'art. 57, IV', acao: 'Fazer treinamento anual, com lista de presença.' },
    { texto: 'Terceiros (fornecedores, parceiros) conhecem e seguem as regras?', base: 'art. 57, III', acao: 'Incluir cláusula anticorrupção nos contratos com terceiros.' },
  ] },
  { nome: 'Riscos e controles', perguntas: [
    { texto: 'Os riscos de integridade são analisados periodicamente?', base: 'art. 57, V', acao: 'Fazer matriz de riscos anual (probabilidade × impacto).' },
    { texto: 'Registros contábeis completos e controles internos confiáveis?', base: 'art. 57, VI e VII', acao: 'Revisar controles de pagamentos e conciliação mensal.' },
    { texto: 'Há procedimentos para licitações, contratos e contatos com o poder público?', base: 'art. 57, VIII', acao: 'Criar protocolo para reuniões com agentes públicos e registro de brindes.' },
  ] },
  { nome: 'Terceiros e operações', perguntas: [
    { texto: 'Fornecedores e parceiros passam por checagem (due diligence) antes da contratação?', base: 'art. 57, XIII', acao: 'Usar a Checagem de contraparte para todo novo fornecedor.' },
    { texto: 'Fusões, aquisições e reestruturações são verificadas quanto a integridade?', base: 'art. 57, XIV', acao: 'Incluir due diligence de integridade em toda operação societária.' },
    { texto: 'Doações e patrocínios seguem regras transparentes?', base: 'art. 57, XVI', acao: 'Aprovar doações e patrocínios por escrito e publicar a lista.' },
  ] },
  { nome: 'Denúncia e resposta', perguntas: [
    { texto: 'Existe canal de denúncia aberto, com proteção ao denunciante?', base: 'art. 57, X', acao: 'Abrir canal de denúncia (anônimo permitido) e política de não retaliação.' },
    { texto: 'Há medidas disciplinares previstas e aplicadas?', base: 'art. 57, XI', acao: 'Prever sanções no código e registrar cada caso.' },
    { texto: 'Irregularidades detectadas são interrompidas e remediadas rapidamente?', base: 'art. 57, XII', acao: 'Escrever procedimento de investigação interna e remediação.' },
    { texto: 'O programa é monitorado e melhorado continuamente?', base: 'art. 57, XV', acao: 'Revisão anual do programa com indicadores.' },
  ] },
  { nome: 'Proteção de dados (LGPD)', perguntas: [
    { texto: 'Há encarregado de dados (DPO) nomeado e divulgado?', base: 'Lei 13.709/18, art. 41', acao: 'Nomear o encarregado e publicar o contato no site.' },
    { texto: 'Existe registro das operações de tratamento de dados pessoais?', base: 'LGPD, art. 37', acao: 'Mapear os dados tratados (inventário) e suas bases legais.' },
    { texto: 'Há plano de resposta a incidentes de segurança?', base: 'LGPD, arts. 46 e 48', acao: 'Criar plano de incidentes com comunicação à ANPD em até 3 dias úteis.' },
  ] },
]
const OPCOES = [{ v: 0, r: 'Não' }, { v: 1, r: 'Em parte' }, { v: 2, r: 'Sim' }]

export default function CompliancePage() {
  const [empresa, setEmpresa] = useState('')
  const [resp, setResp] = useState<Record<string, number>>({})
  const total = PILARES.reduce((s, p) => s + p.perguntas.length, 0)
  const respondidas = Object.keys(resp).length
  const nota = (ps: Pergunta[], pi: number) => {
    const vs = ps.map((_, i) => resp[`${pi}-${i}`]).filter(v => v !== undefined)
    return vs.length ? Math.round((vs.reduce((a, b) => a + b, 0) / (ps.length * 2)) * 100) : null
  }
  const geral = respondidas ? Math.round((Object.values(resp).reduce((a, b) => a + b, 0) / (respondidas * 2)) * 100) : null
  const lacunas = PILARES.flatMap((p, pi) => p.perguntas.map((q, i) => ({ ...q, pilar: p.nome, v: resp[`${pi}-${i}`] })).filter(q => q.v !== undefined && q.v < 2))
  const nivel = geral === null ? '' : geral >= 80 ? 'maduro' : geral >= 50 ? 'em desenvolvimento' : 'inicial'
  return (
    <Layout title="Compliance: diagnóstico de integridade">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 print:shadow-none">
          <p className="text-sm text-grafite-claro mb-3">Serviço para clientes do escritório: responda com o cliente e entregue o relatório. Baseado no Decreto 11.129/2022 (art. 57) e na LGPD.</p>
          <label htmlFor="empresa" className="block font-medium mb-1">Empresa avaliada</label>
          <input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} className="w-full border px-3 py-2" placeholder="Nome do cliente" />
          <div className="flex flex-wrap gap-2 mt-3 print:hidden">
            <a href="#/kyc" className="min-h-[44px] inline-flex items-center gap-2 border px-4 text-sm"><UserCheck className="w-4 h-4" aria-hidden />Checar contraparte</a>
            <a href="?agente=compliance#/assistente" className="min-h-[44px] inline-flex items-center gap-2 border px-4 text-sm"><MessageSquare className="w-4 h-4" aria-hidden />Perguntar ao agente de compliance</a>
          </div>
        </section>
        {PILARES.map((p, pi) => (
          <section key={p.nome} className="bg-white shadow-sm p-6 print:shadow-none print:break-inside-avoid">
            <h2 className="font-serif text-xl mb-3">{p.nome}{nota(p.perguntas, pi) !== null && <span className="text-sm text-grafite-claro"> · {nota(p.perguntas, pi)}%</span>}</h2>
            <ul className="space-y-3">
              {p.perguntas.map((q, i) => (
                <li key={i}>
                  <p className="text-sm">{q.texto} <span className="text-xs text-grafite-claro">({q.base})</span></p>
                  <div role="radiogroup" aria-label={q.texto} className="flex gap-2 mt-1">
                    {OPCOES.map(o => (
                      <button key={o.v} type="button" role="radio" aria-checked={resp[`${pi}-${i}`] === o.v} data-testid={`resp-${pi}-${i}-${o.v}`}
                        onClick={() => setResp(r => ({ ...r, [`${pi}-${i}`]: o.v }))}
                        className={`min-h-[36px] px-3 text-sm border ${resp[`${pi}-${i}`] === o.v ? 'bg-navy text-white' : ''}`}>{o.r}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {geral !== null && (
          <section className="bg-white shadow-sm border-t-2 border-dourado p-6 print:shadow-none" aria-live="polite">
            <h2 className="font-serif text-2xl" data-testid="nota-geral">Nota geral: {geral}% ({nivel})</h2>
            <p className="text-sm text-grafite-claro">{respondidas} de {total} perguntas respondidas{empresa && ` · ${empresa}`} · {new Date().toLocaleDateString('pt-BR')}</p>
            <h3 className="font-medium mt-4 mb-2">Plano de ação ({lacunas.length} lacunas)</h3>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {lacunas.sort((a, b) => (a.v ?? 0) - (b.v ?? 0)).map((l, i) => <li key={i}><strong>{l.pilar}:</strong> {l.acao} <span className="text-xs text-grafite-claro">({l.v === 0 ? 'prioridade alta' : 'prioridade média'}; {l.base})</span></li>)}
            </ol>
            <button type="button" onClick={() => window.print()} className="mt-4 min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider inline-flex items-center gap-2 print:hidden"><Printer className="w-4 h-4" aria-hidden />Imprimir ou salvar em PDF</button>
          </section>
        )}
      </div>
    </Layout>
  )
}
