import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { contratoPorImovel, statusDoContrato, type DocumentoMock } from '@/data/contratosMock'
import { diasAte, formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosStatusContrato, rotulosStatusDocumento } from '@/lib/rotulos'
import { Upload, FileText, Trash2, Sparkles, ArrowLeft } from 'lucide-react'

const LIMITE_MB = 50

export default function ContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contrato = contratoPorImovel(id)
  const [documentos, setDocumentos] = useState<DocumentoMock[]>(contrato?.documentos ?? [])
  const [erroUpload, setErroUpload] = useState('')
  const [avisoUpload, setAvisoUpload] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const inputArquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDocumentos(contratoPorImovel(id)?.documentos ?? [])
  }, [id])

  const receberArquivos = (arquivos: FileList | null) => {
    setErroUpload('')
    setAvisoUpload('')
    if (!arquivos || arquivos.length === 0) return
    const arquivo = arquivos[0]

    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErroUpload(`O arquivo excede ${LIMITE_MB} MB. Reduza o tamanho e tente novamente.`)
      return
    }

    setDocumentos(prev => [
      ...prev,
      {
        id: `up-${Date.now()}`,
        tipo: arquivo.type.includes('pdf') ? 'Documento' : 'Anexo',
        nome: arquivo.name,
        status: 'valido',
      },
    ])
    setAvisoUpload(`“${arquivo.name}” adicionado ao contrato.`)
    setTimeout(() => setAvisoUpload(''), 4000)
  }

  const removerDocumento = (docId: string) => {
    const docAlvo = documentos.find(d => d.id === docId)
    if (!docAlvo) return
    if (!window.confirm(`Excluir “${docAlvo.nome}”? Esta ação não pode ser desfeita.`)) return
    setDocumentos(prev => prev.filter(d => d.id !== docId))
  }

  const analisarContrato = () => {
    window.alert(
      'A análise por inteligência artificial será ativada na etapa seguinte, quando a plataforma estiver conectada à API da Anthropic.'
    )
  }

  if (!contrato) {
    return (
      <Layout title="Contrato">
        <div className="bg-white p-10 text-center shadow-sm">
          <p className="font-serif text-xl text-navy">Este imóvel ainda não possui contrato cadastrado.</p>
          <p className="text-sm text-grafite-claro mt-2">
            Cadastre um contrato para acompanhar prazos e documentos.
          </p>
          <button
            onClick={() => navigate('/imoveis')}
            className="mt-6 inline-flex items-center gap-2 text-navy underline underline-offset-4"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Voltar para imóveis
          </button>
        </div>
      </Layout>
    )
  }

  const status = statusDoContrato(contrato)
  const diasVencimento = diasAte(contrato.dataVencimento)
  const situacaoContrato = situacaoPorPrazo(diasVencimento)

  const moeda = (v: number) =>
    v === 0 ? 'Sem contraprestação' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const situacaoDoc = (d: DocumentoMock) => {
    if (d.status === 'vencido') return 'vencido' as const
    if (d.status === 'a_renovar') return 'atencao' as const
    return 'regular' as const
  }

  return (
    <Layout title={contrato.imovel}>
      <div className="space-y-6">
        <section className="bg-white border-t-2 border-dourado p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro">{contrato.tipo}</p>
              <h2 className="text-2xl mt-1">{contrato.locatario}</h2>
            </div>
            <SeloSituacao situacao={situacaoContrato} texto={rotulosStatusContrato[status]} />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor mensal</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{moeda(contrato.valorMensal)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Índice de reajuste</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{contrato.indiceReajuste}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Vencimento</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{formatarData(contrato.dataVencimento)}</dd>
              <dd className="text-xs text-grafite-claro">{textoPrazo(diasVencimento)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Início</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{formatarData(contrato.dataInicio)}</dd>
              {contrato.dataUltimoReajuste && (
                <dd className="text-xs text-grafite-claro">
                  Último reajuste em {formatarData(contrato.dataUltimoReajuste)}
                </dd>
              )}
            </div>
          </dl>

          <div className="mt-6 pt-5 border-t border-navy/10">
            <p className="text-xs uppercase tracking-wider text-grafite-claro">Observações</p>
            <p className="text-sm text-grafite mt-1">{contrato.notas}</p>
          </div>
        </section>

        {contrato.alertas.length > 0 && (
          <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-compromissos">
            <h3 id="titulo-compromissos" className="text-lg mb-4">
              Compromissos deste contrato
            </h3>
            <ul className="divide-y divide-navy/10">
              {contrato.alertas.map(a => (
                <li key={a.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-navy">{a.tipo}</p>
                    <p className="text-sm text-grafite-claro">{formatarData(a.dataEvento)}</p>
                  </div>
                  <SeloSituacao situacao={situacaoPorPrazo(a.diasRestantes)} texto={textoPrazo(a.diasRestantes)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-documentos">
          <h3 id="titulo-documentos" className="text-lg mb-4">
            Documentos ({documentos.length})
          </h3>

          {avisoUpload && (
            <p role="status" className="mb-4 p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
              {avisoUpload}
            </p>
          )}
          {erroUpload && (
            <p role="alert" className="mb-4 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
              {erroUpload}
            </p>
          )}

          <ul className="divide-y divide-navy/10 mb-6">
            {documentos.map(d => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={20} className="text-navy flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium text-navy truncate">{d.tipo}</p>
                    <p className="text-sm text-grafite-claro truncate">{d.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {d.dataVencimento && (
                    <span className="hidden sm:inline text-xs text-grafite-claro">
                      Vence em {formatarData(d.dataVencimento)}
                    </span>
                  )}
                  <SeloSituacao situacao={situacaoDoc(d)} texto={rotulosStatusDocumento[d.status]} />
                  <button
                    onClick={() => removerDocumento(d.id)}
                    className="p-1.5 rounded-sm text-critico hover:bg-criticoFundo"
                    aria-label={`Excluir ${d.nome}`}
                    title={`Excluir ${d.nome}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div
            onDragOver={e => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={e => {
              e.preventDefault()
              setArrastando(false)
              receberArquivos(e.dataTransfer.files)
            }}
            className={`border-2 border-dashed p-8 text-center transition ${
              arrastando ? 'border-dourado bg-pergaminho' : 'border-grafite-claro/40'
            }`}
          >
            <Upload size={28} className="mx-auto text-dourado mb-3" aria-hidden="true" />
            <p className="text-sm text-grafite">
              Arraste um documento para cá ou{' '}
              <button
                type="button"
                onClick={() => inputArquivo.current?.click()}
                className="text-navy underline underline-offset-4 hover:text-dourado-escuro"
              >
                selecione do computador
              </button>
            </p>
            <p className="text-xs text-grafite-claro mt-2">PDF, imagens ou documentos de texto. Máximo {LIMITE_MB} MB.</p>
            <label htmlFor="arquivo-documento" className="sr-only">
              Selecionar documento para anexar ao contrato
            </label>
            <input
              id="arquivo-documento"
              ref={inputArquivo}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => {
                receberArquivos(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        </section>

        <section className="bg-navy text-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg text-white flex items-center gap-2">
                <Sparkles size={18} className="text-dourado" aria-hidden="true" />
                Análise jurídica assistida
              </h3>
              <p className="text-sm text-white/70 mt-1">
                Revisa cláusulas, prazos e riscos do contrato. Executada apenas quando solicitada, para
                controlar custos.
              </p>
            </div>
            <button
              onClick={analisarContrato}
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
