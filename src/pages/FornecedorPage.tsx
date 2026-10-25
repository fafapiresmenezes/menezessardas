import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { Escolha, Campo, classeCampo } from '@/components/Assistente'
import { formatarData, diasAte, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import {
  CATEGORIAS,
  CERTIDOES_PADRAO,
  consultarCnpj,
  cumpreMeta,
  formatarCnpj,
  mesAtual,
  novoIdLocal,
  obterFornecedor,
  resumoKyc,
  salvarFornecedor,
  statusSla,
  type Fornecedor,
  type ResultadoLista,
  type SLA,
} from '@/lib/fornecedores'
import { ArrowLeft, ExternalLink, Search, Plus, Check, X } from 'lucide-react'

const rotuloCategoria = Object.fromEntries(CATEGORIAS.map(c => [c.valor, c.rotulo]))

const rotuloMes = (aaaamm: string) => {
  const [a, m] = aaaamm.split('-')
  return `${m}/${a}`
}

export default function FornecedorPage() {
  const { id } = useParams()
  const [f, setF] = useState<Fornecedor | null | undefined>(undefined)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [consultando, setConsultando] = useState(false)

  // Formulários
  const [certNome, setCertNome] = useState(CERTIDOES_PADRAO[0])
  const [certValidade, setCertValidade] = useState('')
  const [slaDesc, setSlaDesc] = useState('')
  const [slaMeta, setSlaMeta] = useState('')
  const [slaUnidade, setSlaUnidade] = useState('%')
  const [slaSentido, setSlaSentido] = useState<'minimo' | 'maximo' | null>(null)
  const [medicoes, setMedicoes] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    if (id) setF(await obterFornecedor(id))
  }, [id])
  useEffect(() => {
    carregar()
  }, [carregar])

  if (f === undefined) return <Layout title="Fornecedor"><p className="text-grafite-claro">Carregando…</p></Layout>
  if (f === null) {
    return (
      <Layout title="Fornecedor não encontrado">
        <Link to="/fornecedores" className="inline-flex items-center gap-2 text-navy underline underline-offset-4">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar aos fornecedores
        </Link>
      </Layout>
    )
  }

  const salvar = async (novo: Fornecedor, resumo: string, mensagem?: string) => {
    setErro('')
    try {
      await salvarFornecedor(novo, resumo)
      setF(novo)
      if (mensagem) {
        setAviso(mensagem)
        setTimeout(() => setAviso(''), 4000)
      }
    } catch (e) {
      setErro('Não foi possível salvar: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    }
  }

  const consultar = async () => {
    setConsultando(true)
    setErro('')
    try {
      const r = await consultarCnpj(f.cnpj)
      await salvar(
        { ...f, kyc: { ...f.kyc, consultadoEm: new Date().toISOString().slice(0, 10), razaoSocial: r.razaoSocial, situacao: r.situacao } },
        `CNPJ consultado na Receita: ${f.nome} (${r.situacao})`,
        `Receita Federal: ${r.razaoSocial}, situação ${r.situacao}.`
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na consulta.')
    } finally {
      setConsultando(false)
    }
  }

  const marcarLista = (lista: 'ceis' | 'cnep', valor: ResultadoLista) =>
    salvar(
      { ...f, kyc: { ...f.kyc, [lista]: valor, listasVerificadasEm: new Date().toISOString().slice(0, 10) } },
      `${lista.toUpperCase()} verificado manualmente: ${f.nome} (${valor})`
    )

  const addCertidao = () => {
    if (!certValidade) return setErro('Informe a data de validade da certidão.')
    salvar(
      { ...f, certidoes: [...f.certidoes, { id: novoIdLocal(), nome: certNome, validade: certValidade }] },
      `Certidão registrada: ${certNome} (${f.nome})`,
      'Certidão registrada.'
    )
    setCertValidade('')
  }

  const removerCertidao = (cid: string) =>
    salvar({ ...f, certidoes: f.certidoes.filter(c => c.id !== cid) }, `Certidão removida (${f.nome})`)

  const addSla = () => {
    const meta = Number(slaMeta.replace(',', '.'))
    if (!slaDesc.trim() || !slaMeta || Number.isNaN(meta)) return setErro('Descreva o SLA e informe a meta (número).')
    if (!slaSentido) return setErro('Escolha se a meta é um mínimo ou um máximo.')
    const sla: SLA = { id: novoIdLocal(), descricao: slaDesc.trim(), unidade: slaUnidade, meta, sentido: slaSentido, medicoes: [] }
    salvar({ ...f, slas: [...f.slas, sla] }, `SLA criado: ${sla.descricao} (${f.nome})`, 'SLA criado.')
    setSlaDesc('')
    setSlaMeta('')
    setSlaSentido(null)
  }

  const registrarMedicao = (s: SLA) => {
    const valor = Number((medicoes[s.id] ?? '').replace(',', '.'))
    if (!medicoes[s.id] || Number.isNaN(valor)) return setErro('Informe o resultado do mês como número.')
    const mes = mesAtual()
    const novas = [...s.medicoes.filter(m => m.mes !== mes), { mes, valor }]
    salvar(
      { ...f, slas: f.slas.map(x => (x.id === s.id ? { ...x, medicoes: novas } : x)) },
      `Medição de SLA: ${s.descricao} = ${valor}${s.unidade} em ${mes} (${f.nome})`,
      cumpreMeta(s, valor) ? 'Medição registrada: meta cumprida.' : 'Medição registrada: meta DESCUMPRIDA.'
    )
    setMedicoes(m => ({ ...m, [s.id]: '' }))
  }

  const kyc = resumoKyc(f)
  const secao = 'bg-white shadow-sm border-t-2 border-dourado p-6'

  return (
    <Layout title={f.nome}>
      <div className="space-y-6">
        <Link to="/fornecedores" className="inline-flex items-center gap-2 text-navy underline underline-offset-4">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar aos fornecedores
        </Link>

        {aviso && <p role="status" className="bg-regularFundo border-l-2 border-regular text-regular px-4 py-3 text-sm">{aviso}</p>}
        {erro && <p role="alert" className="bg-criticoFundo border-l-2 border-critico text-critico px-4 py-3 text-sm">{erro}</p>}

        <section className={secao}>
          <p className="text-xs uppercase tracking-wider text-dourado-escuro">{rotuloCategoria[f.categoria]}</p>
          <h2 className="text-2xl mt-1">{f.nome}</h2>
          <p className="font-mono text-sm text-grafite-claro mt-1">CNPJ {formatarCnpj(f.cnpj)}</p>
        </section>

        {/* KYC */}
        <section className={secao} aria-labelledby="kyc">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="kyc" className="text-xl">Verificação cadastral (KYC)</h3>
            <SeloSituacao
              situacao={kyc.nivel === 'critico' ? 'critico' : kyc.nivel === 'atencao' ? 'atencao' : 'regular'}
              texto={kyc.nivel === 'critico' ? 'Irregular' : kyc.nivel === 'atencao' ? 'Com pendências' : 'Em dia'}
            />
          </div>
          {kyc.pendencias.length > 0 && (
            <ul className="list-disc pl-5 mt-3 text-sm text-grafite space-y-1">
              {kyc.pendencias.map(p => <li key={p}>{p}</li>)}
            </ul>
          )}

          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite mb-2">Receita Federal</p>
              <p className="text-sm">
                {f.kyc.consultadoEm
                  ? <>{f.kyc.razaoSocial}<br />Situação: <strong>{f.kyc.situacao}</strong><br /><span className="text-grafite-claro">consultado em {formatarData(f.kyc.consultadoEm)}</span></>
                  : <span className="text-grafite-claro">Ainda não consultado.</span>}
              </p>
              <button
                onClick={consultar}
                disabled={consultando}
                className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 border border-navy text-navy hover:bg-pergaminho text-sm disabled:opacity-50"
              >
                <Search size={16} aria-hidden="true" /> {consultando ? 'Consultando…' : 'Consultar CNPJ agora'}
              </button>
            </div>

            {(['ceis', 'cnep'] as const).map(lista => (
              <div key={lista}>
                <p className="text-xs uppercase tracking-wider text-grafite mb-2">
                  {lista === 'ceis' ? 'CEIS — empresas inidôneas' : 'CNEP — empresas punidas'}
                </p>
                <Escolha
                  nome={`Resultado ${lista.toUpperCase()}`}
                  colunas={1}
                  valor={f.kyc[lista] === 'nao_verificado' ? null : f.kyc[lista]}
                  onChange={v => marcarLista(lista, v)}
                  opcoes={[
                    { valor: 'limpo', rotulo: 'Nada consta' },
                    { valor: 'sancionado', rotulo: 'Consta sanção' },
                  ]}
                />
                <a
                  href={`https://portaldatransparencia.gov.br/sancoes/consulta?cadastro=${lista === 'ceis' ? 1 : 2}&cpfCnpj=${f.cnpj}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-navy underline underline-offset-4 min-h-[24px]"
                >
                  Consultar no Portal da Transparência <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
          <p className="text-xs text-grafite-claro mt-4">
            O CNPJ é consultado automaticamente na Receita. Para CEIS e CNEP, o Portal da Transparência exige
            consulta no site; o resultado é registrado aqui por quem verificou, com data.
          </p>
        </section>

        {/* Certidões */}
        <section className={secao} aria-labelledby="certidoes">
          <h3 id="certidoes" className="text-xl">Certidões</h3>
          {f.certidoes.length === 0 ? (
            <p className="text-sm text-grafite-claro mt-2">Nenhuma certidão cadastrada.</p>
          ) : (
            <ul className="divide-y divide-navy/5 mt-3">
              {f.certidoes.map(c => {
                const dias = diasAte(c.validade)
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-grafite-claro">Validade {formatarData(c.validade)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <SeloSituacao situacao={situacaoPorPrazo(dias)} texto={textoPrazo(dias)} />
                      <button
                        onClick={() => removerCertidao(c.id)}
                        aria-label={`Remover ${c.nome}`}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-pergaminho"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-5 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <Campo id="cert-nome" rotulo="Certidão">
              <select id="cert-nome" className={classeCampo} value={certNome} onChange={e => setCertNome(e.target.value)}>
                {CERTIDOES_PADRAO.map(n => <option key={n}>{n}</option>)}
              </select>
            </Campo>
            <Campo id="cert-val" rotulo="Validade">
              <input id="cert-val" type="date" className={classeCampo} value={certValidade} onChange={e => setCertValidade(e.target.value)} />
            </Campo>
            <button onClick={addCertidao} className="min-h-[44px] inline-flex items-center gap-2 bg-navy hover:bg-navy-700 text-white px-5 rounded-sm text-sm uppercase tracking-wider">
              <Plus size={16} aria-hidden="true" /> Registrar
            </button>
          </div>
        </section>

        {/* SLA */}
        <section className={secao} aria-labelledby="sla">
          <h3 id="sla" className="text-xl">Metas de serviço (SLA)</h3>
          {f.slas.length === 0 && <p className="text-sm text-grafite-claro mt-2">Nenhuma meta definida ainda.</p>}
          <div className="space-y-5 mt-4">
            {f.slas.map(s => {
              const { status } = statusSla(s)
              const ultimas = [...s.medicoes].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6)
              const maior = Math.max(s.meta, ...ultimas.map(m => m.valor), 1)
              return (
                <div key={s.id} className="border border-navy/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.descricao}</p>
                      <p className="text-sm text-grafite-claro">
                        Meta: {s.sentido === 'minimo' ? 'no mínimo' : 'no máximo'} {s.meta}{s.unidade} por mês
                      </p>
                    </div>
                    <SeloSituacao
                      situacao={status === 'cumprido' ? 'regular' : status === 'descumprido' ? 'critico' : 'sem_prazo'}
                      texto={status === 'cumprido' ? 'Meta cumprida' : status === 'descumprido' ? 'Descumprido' : 'Sem medição'}
                    />
                  </div>
                  {ultimas.length > 0 && (
                    <ul className="flex items-end gap-3 mt-4 h-24" aria-label="Últimas medições">
                      {ultimas.map(m => {
                        const ok = cumpreMeta(s, m.valor)
                        return (
                          <li key={m.mes} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                            <span className="text-xs">{m.valor}{s.unidade}</span>
                            <span
                              className={`w-full ${ok ? 'bg-regular' : 'bg-critico'}`}
                              style={{ height: `${Math.max(8, (m.valor / maior) * 70)}%` }}
                              aria-hidden="true"
                            />
                            <span className="text-[11px] text-grafite-claro flex items-center gap-0.5">
                              {ok ? <Check size={11} aria-label="cumprido" /> : <X size={11} aria-label="descumprido" />}
                              {rotuloMes(m.mes)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <Campo id={`med-${s.id}`} rotulo={`Resultado de ${rotuloMes(mesAtual())}`}>
                      <input
                        id={`med-${s.id}`}
                        inputMode="decimal"
                        className={classeCampo}
                        value={medicoes[s.id] ?? ''}
                        onChange={e => setMedicoes(m => ({ ...m, [s.id]: e.target.value }))}
                      />
                    </Campo>
                    <button onClick={() => registrarMedicao(s)} className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho text-sm">
                      Registrar medição do mês
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-navy/10 space-y-4">
            <p className="text-xs uppercase tracking-wider text-grafite">Nova meta</p>
            <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-3">
              <Campo id="sla-desc" rotulo="O que será medido">
                <input id="sla-desc" className={classeCampo} value={slaDesc} onChange={e => setSlaDesc(e.target.value)} />
              </Campo>
              <Campo id="sla-meta" rotulo="Meta (número)">
                <input id="sla-meta" inputMode="decimal" className={classeCampo} value={slaMeta} onChange={e => setSlaMeta(e.target.value)} />
              </Campo>
              <Campo id="sla-un" rotulo="Unidade">
                <input id="sla-un" className={classeCampo} value={slaUnidade} onChange={e => setSlaUnidade(e.target.value)} />
              </Campo>
            </div>
            <Escolha
              nome="Tipo de meta"
              valor={slaSentido}
              onChange={setSlaSentido}
              opcoes={[
                { valor: 'minimo', rotulo: 'Mínimo', descricao: 'O resultado deve ser igual ou maior que a meta (ex.: 95% de cumprimento).' },
                { valor: 'maximo', rotulo: 'Máximo', descricao: 'O resultado deve ser igual ou menor que a meta (ex.: 10 minutos de resposta).' },
              ]}
            />
            <button onClick={addSla} className="min-h-[44px] inline-flex items-center gap-2 bg-navy hover:bg-navy-700 text-white px-5 rounded-sm text-sm uppercase tracking-wider">
              <Plus size={16} aria-hidden="true" /> Criar meta
            </button>
          </div>
        </section>
      </div>
    </Layout>
  )
}
