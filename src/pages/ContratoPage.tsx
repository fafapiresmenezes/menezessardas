import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { repositorio, calcularAlertas, type Contrato, type Documento, type Imovel } from '@/lib/repositorio'
import { diasAte, formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosStatusContrato, rotulosTipoContrato, rotulosIndice, rotulosTipoDocumento, rotulosGarantia } from '@/lib/rotulos'
import { FileText, Trash2, Sparkles, ArrowLeft, Plus } from 'lucide-react'
import ZonaArrastar from '@/components/ZonaArrastar'

const LIMITE_MB = 50

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

  const carregar = useCallback(async () => {
    if (!id) return
    const i = await repositorio.obterImovel(id)
    setImovel(i)
    const c = await repositorio.obterContratoPorImovel(id)
    setContrato(c)
    // O PDF do próprio instrumento (campo arquivo) entra na lista como documento do contrato.
    const doArquivo: Documento[] = c?.arquivo
      ? [{ id: `arquivo-${c.id}`, tipo: 'contrato', nome: c.arquivo.nome, enviadoEm: c.criadoEm }]
      : []
    setDocumentos(c ? [...doArquivo, ...c.documentos] : i?.documentos ?? [])
    setVinculados(c ? await repositorio.listarVinculados(c.id) : [])
    const todos = await repositorio.listarContratos()
    const imoveis = await repositorio.listarImoveis()
    setCompromissos(calcularAlertas(imoveis, todos).filter(a => a.imovelId === id))
  }, [id])

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
    await repositorio.anexarDocumento(alvo, { tipo, nome: arquivo.name, caminhoStorage: '' })
    setAviso(`“${arquivo.name}” adicionado.`)
    setTimeout(() => setAviso(''), 4000)
    carregar()
  }

  const remover = async (doc: Documento) => {
    if (!window.confirm(`Excluir “${doc.nome}”? Esta ação não pode ser desfeita.`)) return
    await repositorio.removerDocumento(doc.id)
    carregar()
  }

  if (imovel === undefined) {
    return (
      <Layout title="Contrato">
        <p className="text-grafite-claro">Carregando…</p>
      </Layout>
    )
  }

  if (!imovel) {
    return (
      <Layout title="Imóvel não encontrado">
        <div className="bg-white p-10 text-center shadow-sm">
          <button onClick={() => navigate('/imoveis')} className="inline-flex items-center gap-2 text-navy underline underline-offset-4">
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
  const statusContrato = dias !== null && dias < 0 ? 'vencido' : dias !== null && dias <= 60 ? 'a_renovar' : 'ativo'
  const moeda = (v: number) =>
    v === 0 ? 'Sem contraprestação' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Layout title={imovel.endereco}>
      <div className="space-y-6">
        <section className="bg-white border-t-2 border-dourado p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro">{rotulosTipoContrato[contrato.tipo]}</p>
              <h2 className="text-2xl mt-1">{contrato.parte}</h2>
            </div>
            <SeloSituacao situacao={situacaoContrato} texto={rotulosStatusContrato[statusContrato]} />
          </div>

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
                  <li key={v.id} className="py-3 flex items-center justify-between gap-4">
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
                    {!d.id.startsWith('arquivo-') && (
                      <button
                        onClick={() => remover(d)}
                        className="p-1.5 rounded-sm text-critico hover:bg-criticoFundo"
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
                Revisa cláusulas, prazos e riscos do contrato. Executada apenas quando solicitada, para controlar custos.
              </p>
            </div>
            <button
              onClick={() => window.alert('A análise por inteligência artificial será ativada na próxima etapa.')}
              className="flex-shrink-0 bg-dourado hover:bg-dourado-claro text-navy font-medium px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm"
            >
              Analisar contrato
            </button>
          </div>
        </section>
      </div>
    </Layout>
  )
}
