import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { repositorio, type Contrato } from '@/lib/repositorio'
import { diasAte, formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosTipoContrato, rotulosIndice, rotulosGarantia } from '@/lib/rotulos'
import { ArrowLeft } from 'lucide-react'

/** Detalhe de um aditivo ou subcontrato, com retorno ao contrato-mãe. */
export default function VinculoPage() {
  const { id } = useParams()
  const [contrato, setContrato] = useState<Contrato | null | undefined>(undefined)
  const [pai, setPai] = useState<Contrato | null>(null)

  useEffect(() => {
    if (!id) return
    repositorio.obterContrato(id).then(async c => {
      setContrato(c ?? null)
      if (c?.contratoPaiId) setPai(await repositorio.obterContrato(c.contratoPaiId))
    })
  }, [id])

  if (contrato === undefined) {
    return <Layout title="Vínculo"><p className="text-grafite-claro">Carregando…</p></Layout>
  }
  if (!contrato) {
    return (
      <Layout title="Vínculo não encontrado">
        <div className="bg-white p-10 text-center shadow-sm">
          <Link to="/imoveis" className="inline-flex items-center gap-2 text-navy underline underline-offset-4">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar para imóveis
          </Link>
        </div>
      </Layout>
    )
  }

  const titulo = contrato.natureza === 'subcontrato' ? 'Subcontrato' : 'Aditivo'
  const dias = diasAte(contrato.dataVencimento)
  const moeda = (v: number) =>
    v === 0 ? 'Sem contraprestação' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Layout title={`${titulo} — ${contrato.parte}`}>
      <div className="space-y-6">
        <Link
          to={`/contrato/${contrato.imovelId}`}
          className="inline-flex items-center gap-2 text-navy underline underline-offset-4"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao contrato principal
        </Link>

        <section className="bg-white border-t-2 border-dourado p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-dourado-escuro">{titulo}</p>
              <h2 className="text-2xl mt-1">{contrato.parte}</h2>
              <p className="text-sm text-grafite-claro mt-1">{rotulosTipoContrato[contrato.tipo]}</p>
            </div>
            <SeloSituacao
              situacao={situacaoPorPrazo(dias)}
              texto={contrato.dataVencimento ? textoPrazo(dias) : 'Sem prazo'}
            />
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
              <dt className="text-xs uppercase tracking-wider text-grafite-claro">Início</dt>
              <dd className="font-serif text-2xl text-navy mt-1">{formatarData(contrato.dataInicio)}</dd>
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

          {pai && (
            <div className="mt-6 pt-5 border-t border-navy/10">
              <p className="text-xs uppercase tracking-wider text-grafite-claro">Contrato-mãe</p>
              <Link to={`/contrato/${pai.imovelId}`} className="text-navy underline underline-offset-4">
                {rotulosTipoContrato[pai.tipo]} — {pai.parte}
              </Link>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
