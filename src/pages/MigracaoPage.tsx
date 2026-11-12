import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FolderInput, Undo2, Upload, AlertTriangle } from 'lucide-react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { importavel, paraCaso, ROTULO_SITUACAO, type LinhaImportacao } from '@/lib/escritorio/importarProcessos'
import { TIPOS, montarTabela, tabelaDoTexto, textoEmLinhas, pareceTabela, prepararProcessos, prepararClientes, prepararPrazos, prepararFinanceiro, lerHistorico, gravarHistorico, type Tabela, type Tipo, type Pronto, type Lote } from '@/lib/escritorio/migracao'
import { lerArquivo } from '@/lib/escritorio/migracaoArquivos'

// Trazer do sistema antigo: uma aba só para a migração inteira. Solta todos os arquivos de uma vez,
// a plataforma separa o que é processo, cliente, prazo e financeiro, mostra organizado e só grava depois do "Trazer".
// Cada migração fica no histórico e pode ser desfeita.

type Previa = { tabela: Tabela; processos?: LinhaImportacao[]; outros?: Pronto<unknown>[] }
const ok = (p: Previa) => (p.processos ? p.processos.filter(importavel).length : (p.outros ?? []).filter(x => x.registro).length)
const fora = (p: Previa) => (p.processos ? p.processos.length : (p.outros ?? []).length) - ok(p)

const Passo = ({ n, titulo, children, feito }: { n: number; titulo: string; children: React.ReactNode; feito?: boolean }) => (
  <section className="bg-white shadow-sm p-5 md:p-6 flex gap-4" aria-label={`Passo ${n}: ${titulo}`}>
    <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${feito ? 'bg-dourado text-white' : 'bg-navy text-white'}`} aria-hidden>{feito ? '✓' : n}</span>
    <div className="flex-1 min-w-0"><h2 className="font-serif text-xl mb-2">{titulo}</h2>{children}</div>
  </section>
)

async function emLotes<T>(itens: T[], tam: number, f: (lote: T[]) => Promise<void>) {
  for (let i = 0; i < itens.length; i += tam) await f(itens.slice(i, i + tam))
}

export default function MigracaoPage() {
  const [tabelas, setTabelas] = useState<Tabela[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [lendo, setLendo] = useState(false)
  const [colado, setColado] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [processosExistentes, setProcessosExistentes] = useState<string[]>([])
  const [clientesExistentes, setClientesExistentes] = useState<string[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [responsavel, setResponsavel] = useState('')
  const [monitorar, setMonitorar] = useState(true)
  const [trazendo, setTrazendo] = useState('')
  const [resultado, setResultado] = useState<{ lote: Lote; falhas: string[] } | null>(null)
  const [historico, setHistorico] = useState<Lote[]>(lerHistorico)
  const [aberta, setAberta] = useState<string | null>(null)

  const carregarExistentes = async () => {
    const [p, c] = await Promise.all([
      supabase.from('tarefas').select('numero_processo').eq('nivel', 'projeto').not('numero_processo', 'is', null),
      supabase.from('leads').select('nome'),
    ])
    setProcessosExistentes(((p.data ?? []) as { numero_processo: string | null }[]).map(d => String(d.numero_processo ?? '').replace(/\D/g, '')).filter(n => n.length === 20))
    setClientesExistentes(((c.data ?? []) as { nome: string }[]).map(d => d.nome))
  }
  useEffect(() => { carregarExistentes().catch(() => {}); listarPessoas().then(setPessoas).catch(() => {}) }, [])

  const receber = async (lista: FileList | File[] | null) => {
    const arquivos = [...(lista ?? [])]
    if (!arquivos.length) return
    setLendo(true); setResultado(null)
    const novas: Tabela[] = [], av: string[] = []
    for (const f of arquivos) { const r = await lerArquivo(f); novas.push(...r.tabelas); av.push(...r.avisos) }
    setTabelas(t => [...t, ...novas]); setAvisos(a => [...a, ...av]); setLendo(false)
  }
  const usarColado = () => {
    if (!colado.trim()) return
    const linhas = textoEmLinhas(colado)
    const n = tabelas.filter(t => t.arquivo === 'Texto colado').length + 1
    setTabelas(t => [...t, pareceTabela(linhas) ? montarTabela('Texto colado', `Colagem ${n}`, linhas) : tabelaDoTexto('Texto colado', `Colagem ${n}`, colado)])
    setColado(''); setResultado(null)
  }
  const mudarTipo = (id: string, tipo: Tipo) => setTabelas(ts => ts.map(t => (t.id === id ? { ...t, tipo, porque: 'escolhido por você' } : t)))
  const tirar = (id: string) => setTabelas(ts => ts.filter(t => t.id !== id))
  const recomecar = () => { setTabelas([]); setAvisos([]); setResultado(null) }

  // Prévia de tudo, na ordem dos arquivos: um processo que aparece em duas abas entra uma vez só.
  const previas: Previa[] = useMemo(() => {
    const ja = new Set<string>()
    return tabelas.map(t => {
      if (t.tipo === 'processos') return { tabela: t, processos: prepararProcessos(t, processosExistentes, ja) }
      if (t.tipo === 'clientes') return { tabela: t, outros: prepararClientes(t, clientesExistentes) }
      if (t.tipo === 'prazos') return { tabela: t, outros: prepararPrazos(t) }
      if (t.tipo === 'financeiro') return { tabela: t, outros: prepararFinanceiro(t) }
      return { tabela: t }
    })
  }, [tabelas, processosExistentes, clientesExistentes])
  const totais = useMemo(() => {
    const m: Record<Tipo, number> = { processos: 0, clientes: 0, prazos: 0, financeiro: 0, ignorar: 0 }
    for (const p of previas) if (p.tabela.tipo === 'ignorar') m.ignorar += p.tabela.linhas.length; else m[p.tabela.tipo] += ok(p)
    return m
  }, [previas])
  const totalTrazer = totais.processos + totais.clientes + totais.prazos + totais.financeiro

  const trazer = async () => {
    if (!totalTrazer) return
    const lote: Lote = {
      id: crypto.randomUUID(), quando: new Date().toISOString(), arquivos: [...new Set(tabelas.map(t => t.arquivo))],
      contagem: { processos: 0, clientes: 0, prazos: 0, financeiro: 0 }, ids: { tarefas: [], compromissos: [], lancamentos_financeiros: [], leads: [], monitoramentos: [] },
    }
    const falhas: string[] = []
    const ids = (d: unknown) => ((d ?? []) as { id: string }[]).map(x => x.id)

    // 1) Processos → casos (+ acompanhamento diário no CNJ)
    const casos = previas.flatMap(p => (p.processos ?? []).filter(importavel).map(l => paraCaso(l, `migração do sistema antigo: ${p.tabela.arquivo} › ${p.tabela.aba}`, responsavel || null)))
    setTrazendo(`Processos: 0 de ${casos.length}…`)
    await emLotes(casos, 50, async lote_ => {
      const { data, error } = await supabase.from('tarefas').insert(lote_).select('id')
      if (error) falhas.push(`Processos: ${mensagemAmigavel(error)}`); else { lote.ids.tarefas.push(...ids(data)); lote.contagem.processos += lote_.length }
      setTrazendo(`Processos: ${lote.contagem.processos} de ${casos.length}…`)
    })
    if (monitorar && lote.contagem.processos) {
      const mons = [...new Map(casos.filter(c => c.numero_processo && c.situacao !== 'feito').map(c => [c.numero_processo!.replace(/\D/g, ''), { tipo: 'processo', valor: c.numero_processo!.replace(/\D/g, ''), rotulo: c.titulo.slice(0, 120) }])).values()]
      await emLotes(mons, 100, async m => {
        const { data, error } = await supabase.from('monitoramentos').upsert(m, { onConflict: 'tipo,valor', ignoreDuplicates: true }).select('valor')
        if (error) falhas.push(`Acompanhamento no CNJ: ${mensagemAmigavel(error)}`); else lote.ids.monitoramentos.push(...((data ?? []) as { valor: string }[]).map(x => x.valor))
      })
    }

    // 2) Clientes → Funil (contrato fechado)
    const clientes = previas.filter(p => p.tabela.tipo === 'clientes').flatMap(p => (p.outros ?? []).map(x => x.registro).filter(Boolean)) as object[]
    setTrazendo(`Clientes: 0 de ${clientes.length}…`)
    await emLotes(clientes, 100, async l => {
      const { data, error } = await supabase.from('leads').insert(l.map(c => ({ ...c, responsavel_id: responsavel || null }))).select('id')
      if (error) falhas.push(`Clientes: ${mensagemAmigavel(error)}`); else { lote.ids.leads.push(...ids(data)); lote.contagem.clientes += l.length }
    })

    // 3) Prazos → Agenda (sem repetir o que já foi trazido antes)
    let prazos = previas.filter(p => p.tabela.tipo === 'prazos').flatMap(p => (p.outros ?? []).map(x => x.registro).filter(Boolean)) as { uid_externo: string }[]
    if (prazos.length) {
      const ja = new Set<string>()
      await emLotes(prazos.map(p => p.uid_externo), 200, async u => { const { data } = await supabase.from('compromissos').select('uid_externo').in('uid_externo', u); for (const x of (data ?? []) as { uid_externo: string }[]) ja.add(x.uid_externo) })
      prazos = prazos.filter(p => !ja.has(p.uid_externo))
    }
    setTrazendo(`Prazos: 0 de ${prazos.length}…`)
    await emLotes(prazos, 100, async l => {
      const { data, error } = await supabase.from('compromissos').insert(l).select('id')
      if (error) falhas.push(`Prazos: ${mensagemAmigavel(error)}`); else { lote.ids.compromissos.push(...ids(data)); lote.contagem.prazos += l.length }
    })

    // 4) Financeiro → lançamentos
    const lancs = previas.filter(p => p.tabela.tipo === 'financeiro').flatMap(p => (p.outros ?? []).map(x => x.registro).filter(Boolean)) as object[]
    setTrazendo(`Financeiro: 0 de ${lancs.length}…`)
    await emLotes(lancs, 100, async l => {
      const { data, error } = await supabase.from('lancamentos_financeiros').insert(l).select('id')
      if (error) falhas.push(`Financeiro: ${mensagemAmigavel(error)}`); else { lote.ids.lancamentos_financeiros.push(...ids(data)); lote.contagem.financeiro += l.length }
    })

    const h = [lote, ...historico]; setHistorico(h); gravarHistorico(h)
    setTrazendo(''); setResultado({ lote, falhas: [...new Set(falhas)] })
    setTabelas([]); setAvisos([])
    await carregarExistentes().catch(() => {})
  }

  const desfazer = async (l: Lote) => {
    if (!window.confirm(`Desfazer a migração de ${new Date(l.quando).toLocaleString('pt-BR')}? Apaga o que ela trouxe (${l.contagem.processos} processo(s), ${l.contagem.clientes} cliente(s), ${l.contagem.prazos} prazo(s), ${l.contagem.financeiro} lançamento(s)). O que foi mudado depois à mão também some.`)) return
    setTrazendo('Desfazendo…')
    const falhas: string[] = []
    for (const tabela of ['lancamentos_financeiros', 'compromissos', 'leads', 'tarefas'] as const) {
      await emLotes(l.ids[tabela], 100, async ids => { const { error } = await supabase.from(tabela).delete().in('id', ids); if (error) falhas.push(mensagemAmigavel(error)) })
    }
    await emLotes(l.ids.monitoramentos, 100, async v => { const { error } = await supabase.from('monitoramentos').delete().eq('tipo', 'processo').in('valor', v); if (error) falhas.push(mensagemAmigavel(error)) })
    const h = historico.map(x => (x.id === l.id ? { ...x, desfeito: !falhas.length } : x)); setHistorico(h); gravarHistorico(h)
    setTrazendo(''); if (falhas.length) window.alert(`Parte não foi desfeita: ${falhas[0]} (só administradores ou quem trouxe podem apagar).`)
    await carregarExistentes().catch(() => {})
  }

  const destino = (t: Tipo) => TIPOS.find(x => x.valor === t)!
  return (
    <Layout title="Trazer do sistema antigo">
      <div className="space-y-5 max-w-4xl">
        <p className="text-base">Aqui você traz <strong>tudo</strong> o que o escritório tinha no sistema antigo: processos, clientes, prazos e financeiro. Solte os arquivos, confira o que a plataforma encontrou e clique em <strong>Trazer</strong>. Nada é gravado antes disso, nada é cadastrado duas vezes, e dá para desfazer.</p>

        <Passo n={1} titulo="Solte aqui os arquivos do sistema antigo" feito={tabelas.length > 0 || !!resultado}>
          <label
            onDragOver={e => { e.preventDefault(); setArrastando(true) }} onDragLeave={() => setArrastando(false)}
            onDrop={e => { e.preventDefault(); setArrastando(false); receber(e.dataTransfer.files) }}
            title="Escolhe no computador os arquivos do sistema antigo (Excel, CSV, Word, PDF e outros); também dá para arrastar e soltar aqui" className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center cursor-pointer ${arrastando ? 'border-dourado bg-dourado/10' : 'border-navy/30 hover:bg-navy/5'}`} data-testid="soltar-arquivos">
            <Upload className="w-8 h-8 text-navy" aria-hidden />
            <span className="text-lg">{lendo ? 'Lendo os arquivos…' : 'Arraste os arquivos para cá ou clique para escolher'}</span>
            <span className="text-sm text-grafite-claro">Pode ser vários de uma vez. Excel (todas as abas), CSV, LibreOffice, Word, PDF, texto, JSON e calendário (.ics).</span>
            <input type="file" multiple className="sr-only" data-testid="arquivos-migracao" onChange={e => { receber(e.target.files); e.target.value = '' }}
              accept=".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,.tab,.json,.ics,.docx,.pdf,.html,.htm,.xml,.eml" />
          </label>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-navy underline">Ou cole o conteúdo (células do Excel, lista, e-mail)</summary>
            <textarea value={colado} onChange={e => setColado(e.target.value)} rows={5} aria-label="Conteúdo colado" className="w-full border px-3 py-2 mt-2 font-mono text-xs" data-testid="migracao-colar" />
            <button type="button" onClick={usarColado} title="Analisa o conteúdo colado e o adiciona à lista do que será trazido" className="mt-2 min-h-[44px] px-4 border border-navy text-navy text-sm">Usar o que colei</button>
          </details>
          {avisos.length > 0 && <ul className="mt-3 space-y-1" role="alert">{avisos.map(a => <li key={a} className="text-sm text-critico flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{a}</li>)}</ul>}
        </Passo>

        <Passo n={2} titulo="Confira o que a plataforma encontrou" feito={tabelas.length > 0}>
          {!tabelas.length ? <p className="text-sm text-grafite-claro">Assim que você soltar os arquivos, aparece aqui, separado por tipo.</p> : <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" data-testid="migracao-totais">
              {TIPOS.filter(t => t.valor !== 'ignorar').map(t => (
                <div key={t.valor} className="border border-navy/15 p-3">
                  <p className="text-3xl font-semibold text-navy" data-testid={`total-${t.valor}`}>{totais[t.valor]}</p>
                  <p className="text-sm font-medium">{t.rotulo}</p>
                  <p className="text-xs text-grafite-claro">{t.destino}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-navy/10 border-y border-navy/10">
              {previas.map(p => {
                const t = p.tabela
                const linhas = p.processos ?? p.outros
                return (
                  <li key={t.id} className="py-3" data-testid="tabela-migracao">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{t.arquivo}</span><span className="text-sm text-grafite-claro">› {t.aba} · {t.linhas.length} linha(s)</span>
                      <label className="ml-auto text-sm inline-flex items-center gap-2">É
                        <select value={t.tipo} onChange={e => mudarTipo(t.id, e.target.value as Tipo)} title="Corrige o que esta tabela contém (processos, clientes, prazos, financeiro ou ignorar), se a plataforma reconheceu errado" className="border px-2 py-1 min-h-[40px]" aria-label={`O que é ${t.arquivo} › ${t.aba}`}>
                          {TIPOS.map(x => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
                        </select></label>
                      <button type="button" onClick={() => tirar(t.id)} title="Remove esta tabela da migração; nada dela será trazido" className="text-sm underline text-grafite-claro min-h-[40px]">Tirar</button>
                    </div>
                    <p className="text-sm mt-1">
                      {t.tipo === 'ignorar' ? <span className="text-grafite-claro">Fica de fora ({t.porque}).</span>
                        : <><strong className="text-regular">{ok(p)} entram</strong>{fora(p) ? <>, <span className="text-grafite-claro">{fora(p)} ficam de fora</span></> : null} · {destino(t.tipo).destino} <span className="text-grafite-claro">(reconheci porque {t.porque})</span></>}
                    </p>
                    {linhas && linhas.length > 0 && (
                      <button type="button" onClick={() => setAberta(aberta === t.id ? null : t.id)} title={aberta === t.id ? 'Esconde a conferência linha por linha desta tabela' : 'Mostra linha por linha o que entra e o que fica de fora, com o motivo'} className="text-sm underline text-navy mt-1">{aberta === t.id ? 'Esconder as linhas' : 'Ver linha por linha'}</button>
                    )}
                    {aberta === t.id && (
                      <div className="mt-2 max-h-80 overflow-auto border border-navy/10">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-navy/5">
                            {p.processos ? p.processos.map(l => (
                              <tr key={l.linha} className={importavel(l) ? '' : 'text-grafite-claro'}><td className="px-2 py-1 w-10">{l.linha}</td><td className="px-2 font-mono">{l.formatado || '—'}</td><td className="px-2">{l.dados.cliente ?? l.dados.titulo ?? ''}{l.dados.parte_contraria ? ` x ${l.dados.parte_contraria}` : ''}</td><td className="px-2">{ROTULO_SITUACAO[l.situacao]}{l.motivo && !importavel(l) ? ` · ${l.motivo}` : ''}</td></tr>
                            )) : (p.outros ?? []).map(x => (
                              <tr key={x.linha} className={x.registro ? '' : 'text-grafite-claro'}><td className="px-2 py-1 w-10">{x.linha}</td><td className="px-2">{x.resumo}</td><td className="px-2">{x.registro ? 'Entra' : x.motivo}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>}
        </Passo>

        <Passo n={3} titulo="Trazer para a plataforma" feito={!!resultado}>
          <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
            <label className="inline-flex items-center gap-2">Responsável pelos processos
              <select value={responsavel} onChange={e => setResponsavel(e.target.value)} title="Escolhe quem fica responsável pelos processos trazidos do sistema antigo" className="border px-2 py-1 min-h-[40px]"><option value="">Ninguém por enquanto</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={monitorar} onChange={e => setMonitorar(e.target.checked)} /> Acompanhar os processos no CNJ todo dia (prazos e peças automáticas)</label>
          </div>
          <button type="button" onClick={trazer} disabled={!totalTrazer || !!trazendo} title="Grava na plataforma tudo o que foi conferido (processos, clientes, prazos e financeiro); dá para desfazer depois" data-testid="trazer-tudo" className="min-h-[52px] px-6 bg-dourado text-white text-base inline-flex items-center gap-2 disabled:opacity-50">
            <FolderInput className="w-5 h-5" aria-hidden />{trazendo || (totalTrazer ? `Trazer ${totalTrazer} registro(s)` : 'Nada para trazer ainda')}
          </button>
          {tabelas.length > 0 && !trazendo && <button type="button" onClick={recomecar} title="Descarta os arquivos lidos e limpa a conferência, sem apagar nada já gravado" className="ml-3 text-sm underline">Começar de novo</button>}
          {resultado && (
            <div role="status" className="mt-4 p-4 border-l-4 border-regular bg-navy/5" data-testid="migracao-resultado">
              <p className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-regular" aria-hidden /><span>Pronto. Entraram <strong>{resultado.lote.contagem.processos}</strong> processo(s), <strong>{resultado.lote.contagem.clientes}</strong> cliente(s), <strong>{resultado.lote.contagem.prazos}</strong> prazo(s) e <strong>{resultado.lote.contagem.financeiro}</strong> lançamento(s).</span></p>
              {resultado.falhas.length > 0 && <ul className="text-sm text-critico mt-2 list-disc pl-5">{resultado.falhas.map(f => <li key={f}>{f}</li>)}</ul>}
              <p className="text-sm mt-2 flex flex-wrap gap-x-4">
                <Link to="/processos-antigos" title="Abre a tela com os próximos passos sugeridos para cada processo trazido" className="underline text-navy">Ver o que fazer em cada processo</Link>
                <Link to="/processos" title="Abre a carteira de processos com os que acabaram de entrar" className="underline text-navy">Carteira de processos</Link>
                <Link to="/funil" title="Abre o funil de clientes com os clientes trazidos" className="underline text-navy">Clientes</Link>
                <Link to="/agenda" title="Abre a Agenda com os prazos trazidos" className="underline text-navy">Agenda</Link>
                <Link to="/financeiro" title="Abre o Financeiro com os lançamentos trazidos" className="underline text-navy">Financeiro</Link>
              </p>
            </div>
          )}
        </Passo>

        {historico.length > 0 && (
          <section className="bg-white shadow-sm p-5" aria-label="Migrações feitas">
            <h2 className="font-serif text-lg mb-2">Migrações feitas</h2>
            <ul className="divide-y divide-navy/10 text-sm">
              {historico.map(l => (
                <li key={l.id} className="py-2 flex flex-wrap items-center gap-x-3">
                  <span>{new Date(l.quando).toLocaleString('pt-BR')}</span>
                  <span className="text-grafite-claro">{l.arquivos.join(', ')}</span>
                  <span>{l.contagem.processos} proc. · {l.contagem.clientes} clientes · {l.contagem.prazos} prazos · {l.contagem.financeiro} lanç.</span>
                  {l.desfeito ? <span className="ml-auto text-grafite-claro">Desfeita</span>
                    : <button type="button" onClick={() => desfazer(l)} title="Apaga da plataforma tudo o que esta migração trouxe (pede confirmação)" disabled={!!trazendo} className="ml-auto min-h-[40px] px-3 border border-navy text-navy inline-flex items-center gap-1"><Undo2 className="w-4 h-4" aria-hidden />Desfazer</button>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}
