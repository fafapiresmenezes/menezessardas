import { useCallback, useEffect, useState } from 'react'
import EscolhaAvisos from '@/components/EscolhaAvisos'
import BotaoAuditar from '@/components/BotaoAuditar'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton'
import { repositorio, calcularAlertas, type Contrato, type Documento, type Imovel } from '@/lib/repositorio'
import { diasAte, formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosStatusContrato, rotulosTipoContrato, rotulosIndice, rotulosTipoDocumento, rotulosGarantia } from '@/lib/rotulos'
import { FileText, Trash2, Sparkles, ArrowLeft, Plus, AlertTriangle, CheckCircle2, Pencil, Lock, Download } from 'lucide-react'
import { enviarArquivo, urlAssinada, apagarArquivo } from '@/lib/arquivos'
import { Escolha, Campo, classeCampo } from '@/components/Assistente'
import { GARANTIAS, INDICES_REAJUSTE, PERIODICIDADES, type Garantia, type IndiceReajuste, type Periodicidade } from '@/lib/dominio'
import ZonaArrastar from '@/components/ZonaArrastar'
import Reajuste from '@/components/Reajuste'
import { analisarContrato, ultimaAnalise, type AnaliseContrato, type OrigemAnalise } from '@/lib/agente'

const LIMITE_MB = 50

const corGravidade: Record<string, string> = {
  alta: 'border-critico text-critico bg-criticoFundo',
  media: 'border-atencao text-atencao bg-atencaoFundo',
  baixa: 'border-regular text-regular bg-regularFundo',
}
const rotuloGravidade: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

export default function ContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [imovel, setImovel] = useState<Imovel | null | undefined>(undefined)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [compromissos, setCompromissos] = useState<ReturnType<typeof calcularAlertas>>([])
  const [vinculados, setVinculados] = useState<Contrato[]>([])
  const [analise, setAnalise] = useState<AnaliseContrato | null>(null)
  const [analiseEm, setAnaliseEm] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const [analisando, setAnalisando] = useState(false)
  const [erroAnalise, setErroAnalise] = useState('')
  const [modo, setModo] = useState<'ver' | 'editar' | 'encerrar'>('ver')
  const [ed, setEd] = useState({ parte: '', valor: '', vencimento: '', indice: 'ipca' as IndiceReajuste, garantia: 'sem_garantia' as Garantia, periodicidade: 'mensal' as Periodicidade, notas: '', diasAviso: 7, avisosDias: [7] as number[] })
  const [motivo, setMotivo] = useState<string | null>(null)
  const [avisoTopo, setAvisoTopo] = useState('')

  const carregar = useCallback(async () => {
    if (!id) return
    const i = await repositorio.obterImovel(id)
    if (!i) {
      // O link pode trazer o id do contrato (Previsões, buscas): abre a tela do imóvel dele.
      const porContrato = await repositorio.obterContrato(id)
      if (porContrato?.imovelId) { navigate(`/contrato/${porContrato.imovelId}`, { replace: true }); return }
    }
    setImovel(i)
    const c = await repositorio.obterContratoPorImovel(id)
    setContrato(c)
    if (c) {
      const guardada = await ultimaAnalise(c.id).catch(() => null)
      if (guardada) { setAnalise(guardada); setAnaliseEm(guardada.em) }
    }
    // O PDF do próprio instrumento (campo arquivo) entra na lista como documento do contrato.
    const doArquivo: Documento[] = c?.arquivo
      ? [{ id: `arquivo-${c.id}`, tipo: 'contrato', nome: c.arquivo.nome, enviadoEm: c.criadoEm }]
      : []
    setDocumentos(c ? [...doArquivo, ...c.documentos] : i?.documentos ?? [])
    setVinculados(c ? await repositorio.listarVinculados(c.id) : [])
    const todos = await repositorio.listarContratos()
    const imoveis = await repositorio.listarImoveis()
    setCompromissos(calcularAlertas(imoveis, todos).filter(a => a.imovelId === id))
  }, [id, navigate])

  useEffect(() => {
    setErro('')
    setAviso('')
    carregar()
  }, [carregar])

  const receberArquivo = async (arquivo: File, tipo: Documento['tipo']) => {
    setErro('')
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo excede ${LIMITE_MB} MB. Reduza o tamanho e tente novamente.`)
      return
    }
    if (!id) return
    const alvo = contrato ? { contratoId: contrato.id } : { imovelId: id }
    let caminhoStorage = ''
    try {
      caminhoStorage = await enviarArquivo(arquivo, contrato ? `contratos/${contrato.id}` : `imoveis/${id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao guardar o arquivo.')
      return
    }
    await repositorio.anexarDocumento(alvo, { tipo, nome: arquivo.name, caminhoStorage })
    // Se for o PDF do contrato, extrai o texto para o agente analisar o conteúdo real.
    if (contrato && tipo === 'contrato' && arquivo.type === 'application/pdf') {
      try {
        const { extrairTextoPdf } = await import('@/lib/pdf')
        const texto = await extrairTextoPdf(arquivo)
        if (texto) {
          await repositorio.atualizarTextoContrato(contrato.id, texto)
          // Uma leitura por PDF anexado; reanálise só pelo botão, para controlar custo.
          if (imovel) analisar({ ...contrato, textoExtraido: texto }, 'anexo')
        }
      } catch {
        // extração é um reforço; o anexo já foi salvo
      }
    }
    setAviso(`“${arquivo.name}” adicionado.`)
    setTimeout(() => setAviso(''), 4000)
    carregar()
  }

  const abrirEdicao = () => {
    if (!contrato) return
    setEd({
      parte: contrato.parte,
      valor: String(contrato.valor).replace('.', ','),
      vencimento: contrato.dataVencimento ?? '',
      indice: contrato.indice,
      garantia: contrato.garantia,
      periodicidade: contrato.periodicidade,
      notas: contrato.notas,
      diasAviso: contrato.diasAviso ?? 7,
      avisosDias: contrato.avisosDias ?? [contrato.diasAviso ?? 7],
    })
    setErro('')
    setModo('editar')
  }

  const salvarEdicao = async () => {
    if (!contrato) return
    const valor = Number(ed.valor.replace(/\./g, '').replace(',', '.'))
    if (!ed.parte.trim()) return setErro('⚠ Informe o nome ou empresa da outra parte (ex: João Silva, Empresa X).')
    if (Number.isNaN(valor) || valor < 0) return setErro('⚠ Valor inválido. Use números com . para milhares e , para centavos (ex: 2.500,00).')
    try {
      await repositorio.atualizarContrato(contrato.id, {
        parte: ed.parte.trim(),
        valor,
        dataVencimento: ed.vencimento || null,
        indice: ed.indice,
        garantia: ed.garantia,
        periodicidade: ed.periodicidade,
        notas: ed.notas,
        avisosDias: ed.avisosDias,
      })
      setModo('ver')
      setErro('')
      setAvisoTopo('Contrato atualizado.')
      setTimeout(() => setAvisoTopo(''), 5000)
      carregar()
    } catch (e) {
      setErro('Não foi possível salvar: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    }
  }

  const confirmarEncerramento = async () => {
    if (!contrato || !motivo) return
    try {
      await repositorio.encerrarContrato(contrato.id, motivo)
      setModo('ver')
      setMotivo(null)
      setAvisoTopo('Contrato encerrado. Ele deixa de gerar alertas e sai dos indicadores.')
      setTimeout(() => setAvisoTopo(''), 6000)
      carregar()
    } catch (e) {
      setErro('Não foi possível encerrar: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    }
  }

  const analisar = async (alvo: Contrato | null = contrato, origem: OrigemAnalise = 'botao') => {
    if (!alvo || !imovel) return
    setAnalisando(true)
    setErroAnalise('')
    try {
      setAnalise(await analisarContrato(alvo, imovel, origem))
      setAnaliseEm(new Date().toISOString())
    } catch (e) {
      setErroAnalise('Não foi possível analisar agora: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    } finally {
      setAnalisando(false)
    }
  }

  // Contrato recém-criado com PDF: a primeira leitura da IA roda sozinha, uma vez.
  useEffect(() => {
    if (params.get('analisar') !== '1' || !contrato || !imovel || analisando) return
    setParams({}, { replace: true })
    if (contrato.textoExtraido && !analise) analisar(contrato, 'anexo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, contrato, imovel])

  const remover = async (doc: Documento) => {
    if (!window.confirm(`Excluir “${doc.nome}”? Esta ação não pode ser desfeita.`)) return
    await repositorio.removerDocumento(doc.id)
    await apagarArquivo(doc.caminhoStorage)
    carregar()
  }

  const abrir = async (doc: Documento) => {
    if (!doc.caminhoStorage) return
    setErro('')
    try {
      window.open(await urlAssinada(doc.caminhoStorage), '_blank', 'noopener')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.')
    }
  }

  if (imovel === undefined) {
    return (
      <Layout title="Contrato">
        <div className="space-y-6">
          <div className="h-4 bg-navy/10 rounded w-32 mb-4 animate-pulse"></div>
          <SkeletonCard count={1} className="mb-6" />
          <SkeletonTable />
          <SkeletonCard count={1} />
        </div>
      </Layout>
    )
  }

  if (!imovel) {
    return (
      <Layout title="Imóvel não encontrado">
        <div className="bg-white p-10 text-center shadow-sm">
          <button onClick={() => navigate('/imoveis')} className="inline-flex items-center gap-2 min-h-[44px] text-navy underline underline-offset-4">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar para imóveis
          </button>
        </div>
      </Layout>
    )
  }

  if (!contrato) {
    return (
      <Layout title={imovel.endereco}>
        <div className="bg-white p-10 text-center shadow-sm space-y-4">
          <p className="font-serif text-xl text-navy">Este imóvel ainda não possui contrato cadastrado.</p>
          <Link to={`/contrato/novo?imovelId=${imovel.id}`} className="inline-flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm">
            <Plus size={16} aria-hidden="true" /> Cadastrar contrato
          </Link>
        </div>
      </Layout>
    )
  }

  const dias = diasAte(contrato.dataVencimento)
  const situacaoContrato = situacaoPorPrazo(dias)
  const encerrado = !!contrato.encerradoEm
  const statusContrato = dias !== null && dias < 0 ? 'vencido' : dias !== null && dias <= 60 ? 'a_renovar' : 'ativo'
  const moeda = (v: number) =>
    v === 0 ? 'Sem contraprestação' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Layout title={imovel.endereco}>
      <div className="space-y-6">
        {avisoTopo && (
          <p role="status" className="p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">{avisoTopo}</p>
        )}
        <Link to={`/imoveis/${imovel.id}`} className="inline-flex items-center gap-2 min-h-[44px] text-navy underline underline-offset-4 -mb-2">
          <ArrowLeft size={16} aria-hidden="true" /> Ficha do imóvel
        </Link>
        <section className="bg-white border-t-2 border-dourado p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro">{rotulosTipoContrato[contrato.tipo]}</p>
              <h2 className="text-2xl mt-1">{contrato.parte}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {encerrado ? (
                <SeloSituacao situacao="sem_prazo" texto={`Encerrado em ${formatarData(contrato.encerradoEm)}`} />
              ) : (
                <SeloSituacao situacao={situacaoContrato} texto={rotulosStatusContrato[statusContrato]} />
              )}
              {!encerrado && modo === 'ver' && (
                <>
                  <button onClick={abrirEdicao} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 border border-navy text-navy hover:bg-pergaminho text-sm">
                    <Pencil size={14} aria-hidden="true" /> Editar
                  </button>
                  <button onClick={() => { setModo('encerrar'); setMotivo(null) }} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 border border-critico text-critico hover:bg-criticoFundo text-sm">
                    <Lock size={14} aria-hidden="true" /> Encerrar
                  </button>
                </>
              )}
            </div>
          </div>

          {encerrado && (
            <p className="mt-4 text-sm bg-pergaminho border-l-2 border-grafite-claro px-4 py-3">
              Motivo: {contrato.motivoEncerramento}. Este contrato não gera mais alertas nem entra nos indicadores.
            </p>
          )}

          {modo === 'editar' && (
            <div className="mt-6 pt-5 border-t border-navy/10 space-y-4" role="group" aria-label="Editar contrato">
              <div className="grid md:grid-cols-3 gap-4">
                <Campo id="ed-parte" rotulo="Outra parte" ajuda="Locador, inquilino, fornecedor ou outra entidade">
                  <input id="ed-parte" className={classeCampo} value={ed.parte} onChange={e => setEd({ ...ed, parte: e.target.value })} placeholder="Ex: João Silva" aria-describedby="ed-parte-ajuda" />
                </Campo>
                <Campo id="ed-valor" rotulo="Valor mensal (R$)" ajuda="Use . para separar milhares (ex: 2.500,00)">
                  <input id="ed-valor" inputMode="decimal" className={classeCampo} value={ed.valor} onChange={e => setEd({ ...ed, valor: e.target.value })} placeholder="0,00" aria-describedby="ed-valor-ajuda" />
                </Campo>
                <Campo id="ed-venc" rotulo="Vencimento" ajuda="Deixe em branco se o prazo for indeterminado.">
                  <input id="ed-venc" type="date" className={classeCampo} value={ed.vencimento} onChange={e => setEd({ ...ed, vencimento: e.target.value })} aria-describedby="ed-venc-ajuda" />
                </Campo>
                <Campo id="ed-aviso" rotulo="Avisar do vencimento com" ajuda="Marque quantos avisos quiser. Valem para o Outlook e o Google Agenda.">
                  <EscolhaAvisos id="ed-aviso" valor={ed.avisosDias} onChange={v => setEd({ ...ed, avisosDias: v })} />
                </Campo>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-grafite mb-2">Índice de reajuste</p>
                <Escolha nome="Índice de reajuste" opcoes={INDICES_REAJUSTE} valor={ed.indice} onChange={v => setEd({ ...ed, indice: v })} colunas={3} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-grafite mb-2">Garantia</p>
                <Escolha nome="Garantia" opcoes={GARANTIAS} valor={ed.garantia} onChange={v => setEd({ ...ed, garantia: v })} colunas={3} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-grafite mb-2">Periodicidade do pagamento</p>
                <Escolha nome="Periodicidade" opcoes={PERIODICIDADES} valor={ed.periodicidade} onChange={v => setEd({ ...ed, periodicidade: v })} colunas={3} />
              </div>
              <Campo id="ed-notas" rotulo="Observações">
                <textarea id="ed-notas" rows={3} className={classeCampo} value={ed.notas} onChange={e => setEd({ ...ed, notas: e.target.value })} />
              </Campo>
              {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
              <div className="flex gap-3">
                <button onClick={salvarEdicao} className="min-h-[44px] bg-navy hover:bg-navy-700 text-white px-6 rounded-sm uppercase tracking-wider text-sm">Salvar alterações</button>
                <button onClick={() => { setModo('ver'); setErro('') }} className="min-h-[44px] px-5 text-navy underline underline-offset-4">Cancelar</button>
              </div>
            </div>
          )}

          {modo === 'encerrar' && (
            <div className="mt-6 pt-5 border-t border-navy/10 space-y-4" role="group" aria-label="Encerrar contrato">
              <p className="text-xs uppercase tracking-wider text-grafite">Por que o contrato está sendo encerrado?</p>
              <Escolha
                nome="Motivo do encerramento"
                valor={motivo}
                onChange={setMotivo}
                colunas={2}
                opcoes={[
                  { valor: 'Fim do prazo', rotulo: 'Fim do prazo' },
                  { valor: 'Rescisão amigável', rotulo: 'Rescisão amigável' },
                  { valor: 'Rescisão por inadimplência', rotulo: 'Rescisão por inadimplência' },
                  { valor: 'Outro motivo', rotulo: 'Outro motivo' },
                ]}
              />
              <p className="text-sm text-grafite-claro">O registro continua guardado no histórico, mas deixa de gerar alertas e de contar nos indicadores.</p>
              {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
              <div className="flex gap-3">
                <button onClick={confirmarEncerramento} disabled={!motivo} className="min-h-[44px] bg-critico text-white px-6 rounded-sm uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed">Confirmar encerramento</button>
                <button onClick={() => { setModo('ver'); setMotivo(null) }} className="min-h-[44px] px-5 text-navy underline underline-offset-4">Cancelar</button>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{moeda(contrato.valor)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Reajuste</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{rotulosIndice[contrato.indice]}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Vencimento</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{formatarData(contrato.dataVencimento)}</dd>
              <dd className="text-xs text-grafite-claro">{contrato.dataVencimento ? textoPrazo(dias) : 'Prazo indeterminado'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Garantia</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{rotulosGarantia[contrato.garantia]}</dd>
            </div>
          </dl>

          {contrato.notas && (
            <div className="mt-6 pt-5 border-t border-navy/10">
              <p className="text-xs uppercase tracking-wider text-grafite-claro">Observações</p>
              <p className="text-sm text-grafite mt-1">{contrato.notas}</p>
            </div>
          )}
        </section>

        {!encerrado && <Reajuste contrato={contrato} imovel={`${imovel.endereco}, ${imovel.cidade}`} />}

        {compromissos.length > 0 && (
          <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-compromissos">
            <h3 id="titulo-compromissos" className="text-lg mb-4">Compromissos deste imóvel</h3>
            <ul className="divide-y divide-navy/10">
              {compromissos.map(a => (
                <li key={a.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-navy">{a.titulo}</p>
                    <p className="text-sm text-grafite-claro">{formatarData(a.dataEvento)}</p>
                  </div>
                  <SeloSituacao situacao={situacaoPorPrazo(a.diasRestantes)} texto={textoPrazo(a.diasRestantes)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-vinculados">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 id="titulo-vinculados" className="text-lg">Aditivos e subcontratos ({vinculados.length})</h3>
            <div className="flex gap-2">
              <Link
                to={`/contrato/novo?imovelId=${imovel.id}&paiId=${contrato.id}&natureza=aditivo`}
                className="inline-flex items-center gap-1.5 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-pergaminho"
              >
                <Plus size={15} aria-hidden="true" /> Aditivo
              </Link>
              <Link
                to={`/contrato/novo?imovelId=${imovel.id}&paiId=${contrato.id}&natureza=subcontrato`}
                className="inline-flex items-center gap-1.5 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-pergaminho"
              >
                <Plus size={15} aria-hidden="true" /> Subcontrato
              </Link>
            </div>
          </div>
          {vinculados.length === 0 ? (
            <p className="text-sm text-grafite-claro">Nenhum aditivo ou subcontrato vinculado a este contrato.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {vinculados.map(v => {
                const d = diasAte(v.dataVencimento)
                return (
                  <li key={v.id}>
                    <button
                      onClick={() => navigate(`/contrato/vinculo/${v.id}`)}
                      className="w-full text-left py-3 flex items-center justify-between gap-4 hover:bg-pergaminho"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-navy">
                          <span className="text-xs uppercase tracking-wider text-dourado-escuro mr-2">
                            {v.natureza === 'subcontrato' ? 'Subcontrato' : 'Aditivo'}
                          </span>
                          {v.parte}
                        </p>
                        <p className="text-sm text-grafite-claro">{rotulosTipoContrato[v.tipo]}</p>
                      </div>
                      <SeloSituacao situacao={situacaoPorPrazo(d)} texto={v.dataVencimento ? textoPrazo(d) : 'Sem prazo'} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-documentos">
          <h3 id="titulo-documentos" className="text-lg mb-4">Documentos ({documentos.length})</h3>

          {aviso && (
            <p role="status" className="mb-4 p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">{aviso}</p>
          )}
          {erro && (
            <p role="alert" className="mb-4 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">{erro}</p>
          )}

          <ul className="divide-y divide-navy/10 mb-6">
            {documentos.map(d => {
              const dias = diasAte(d.dataVencimento ?? null)
              return (
                <li key={d.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} className="text-navy flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium text-navy truncate">{rotulosTipoDocumento[d.tipo] ?? d.tipo}</p>
                      <p className="text-sm text-grafite-claro truncate">{d.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {d.dataVencimento && <SeloSituacao situacao={situacaoPorPrazo(dias)} texto={textoPrazo(dias)} />}
                    {d.caminhoStorage && (
                      <button
                        onClick={() => abrir(d)}
                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-navy hover:bg-pergaminho"
                        aria-label={`Abrir ${d.nome}`}
                        title={`Abrir ${d.nome}`}
                      >
                        <Download size={17} aria-hidden="true" />
                      </button>
                    )}
                    {d.caminhoStorage && !d.id.startsWith('arquivo-') && <BotaoAuditar tabela="documentos" id={d.id} />}
                    {!d.id.startsWith('arquivo-') && (
                      <button
                        onClick={() => remover(d)}
                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-critico hover:bg-criticoFundo"
                        aria-label={`Excluir ${d.nome}`}
                        title={`Excluir ${d.nome}`}
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <ZonaArrastar onArquivo={receberArquivo} rotulo="Arraste um documento para cá ou" />
        </section>

        <section className="bg-navy text-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg text-white flex items-center gap-2">
                <Sparkles size={18} className="text-dourado" aria-hidden="true" />
                Análise jurídica assistida
              </h3>
              <p className="text-sm text-white/70 mt-1">
                Revisa cláusulas, prazos e riscos do contrato. Roda sozinha uma vez quando o PDF do contrato é anexado; depois, só pelo botão, para controlar custos.
              </p>
              {analiseEm && (
                <p className="text-xs text-white/60 mt-1">
                  Última análise: {new Date(analiseEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>
            <button
              onClick={() => analisar()}
              disabled={analisando}
              className="flex-shrink-0 bg-dourado hover:bg-dourado-claro disabled:opacity-60 text-navy font-medium px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm"
            >
              {analisando ? 'Analisando…' : analise ? 'Analisar novamente' : 'Analisar contrato'}
            </button>
          </div>

          {erroAnalise && (
            <p role="alert" className="mt-4 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
              {erroAnalise}
            </p>
          )}

          {analise && (
            <div className="mt-6 bg-white text-grafite p-5 space-y-5 rounded-sm">
              {analise.exemplo && (
                <p className="text-xs uppercase tracking-wider text-dourado-escuro">
                  Análise de exemplo — conecte a chave da Anthropic para a análise real
                </p>
              )}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Resumo</h4>
                <p className="text-sm">{analise.resumo}</p>
              </div>

              {analise.clausulasRisco.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-grafite-claro mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} aria-hidden="true" /> Cláusulas de risco
                  </h4>
                  <ul className="space-y-2">
                    {analise.clausulasRisco.map((c, i) => (
                      <li key={i} className={`border-l-2 p-3 text-sm ${corGravidade[c.gravidade]}`}>
                        <p className="font-medium">
                          {c.titulo}{' '}
                          <span className="text-xs uppercase tracking-wider">({rotuloGravidade[c.gravidade]})</span>
                        </p>
                        <p className="text-grafite mt-0.5">{c.observacao}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analise.prazos.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-grafite-claro mb-2">Prazos</h4>
                  <ul className="text-sm space-y-1">
                    {analise.prazos.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-dourado">•</span>
                        <span>{p.descricao}{p.data ? ` — ${p.data}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analise.sugestoes.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-grafite-claro mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} aria-hidden="true" /> Sugestões
                  </h4>
                  <ul className="text-sm space-y-1">
                    {analise.sugestoes.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-dourado">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-grafite-claro pt-2 border-t border-navy/10">
                Este resultado é um apoio e não substitui a revisão de um advogado inscrito na OAB.
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
