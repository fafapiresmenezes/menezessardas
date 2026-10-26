import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import GraficoTendencia from '@/components/GraficoTendencia'
import { repositorio, calcularAlertas, type Alerta, type Contrato, type Imovel } from '@/lib/repositorio'
import { diasAte, formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { contratoAtivo, tendencia12Meses, valorMensal } from '@/lib/indicadores'
import { rotulosGarantia, rotulosIndice, rotulosTipoContrato, rotulosTipoDocumento, rotulosTipoImovel, rotulosUso } from '@/lib/rotulos'
import { ArrowLeft, Building2, FileText, CalendarClock, TrendingUp, Plus, Pencil } from 'lucide-react'

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v)

/** Ficha do imóvel: cadastro, contrato vigente, histórico, documentos, compromissos e tendência. */
export default function ImovelDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [imovel, setImovel] = useState<Imovel | null | undefined>(undefined)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])

  useEffect(() => {
    let vivo = true
    Promise.all([repositorio.obterImovel(id), repositorio.listarContratos(), repositorio.listarImoveis()]).then(
      ([i, todos, imoveis]) => {
        if (!vivo) return
        setImovel(i)
        const doImovel = todos.filter(c => c.imovelId === id)
        setContratos(doImovel)
        setAlertas(calcularAlertas(imoveis, todos).filter(a => a.imovelId === id))
      }
    )
    return () => {
      vivo = false
    }
  }, [id])

  const vigentes = useMemo(() => contratos.filter(c => contratoAtivo(c) && !c.contratoPaiId), [contratos])
  const vinculados = useMemo(() => contratos.filter(c => contratoAtivo(c) && !!c.contratoPaiId), [contratos])
  const historico = useMemo(
    () => contratos.filter(c => !contratoAtivo(c)).sort((a, b) => (b.encerradoEm ?? b.dataVencimento ?? '').localeCompare(a.encerradoEm ?? a.dataVencimento ?? '')),
    [contratos]
  )
  const tendencia = useMemo(() => (imovel ? tendencia12Meses([imovel], contratos) : []), [imovel, contratos])

  if (imovel === undefined) {
    return (
      <Layout title="Imóvel">
        <p className="text-grafite-claro">Carregando ficha do imóvel…</p>
      </Layout>
    )
  }

  if (!imovel) {
    return (
      <Layout title="Imóvel não encontrado">
        <div className="bg-white p-8 shadow-sm space-y-4">
          <p className="text-grafite">Não encontramos este imóvel. Ele pode ter sido removido.</p>
          <button
            onClick={() => navigate('/imoveis')}
            className="inline-flex items-center gap-2 min-h-[44px] text-navy underline underline-offset-4"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Voltar para imóveis
          </button>
        </div>
      </Layout>
    )
  }

  const principal = vigentes[0]
  const diasPrincipal = principal ? diasAte(principal.dataVencimento) : null
  const proximo = alertas[0]
  const situacaoGeral = situacaoPorPrazo(proximo ? proximo.diasRestantes : null)
  const documentos = [
    ...imovel.documentos.map(d => ({ ...d, origem: 'Imóvel' })),
    ...contratos.flatMap(c => c.documentos.map(d => ({ ...d, origem: c.parte }))),
  ]

  const ficha = [
    { rotulo: 'Tipo', valor: rotulosTipoImovel[imovel.tipo] ?? imovel.tipo },
    { rotulo: 'Uso', valor: rotulosUso[imovel.uso] ?? imovel.uso },
    { rotulo: 'Proprietário', valor: imovel.proprietario },
    { rotulo: 'Matrícula', valor: imovel.matricula || '—' },
    { rotulo: 'Cidade', valor: `${imovel.cidade} / ${imovel.uf}` },
    { rotulo: 'Área', valor: imovel.areaM2 ? `${imovel.areaM2.toLocaleString('pt-BR')} m²` : '—' },
  ]

  return (
    <Layout title={imovel.endereco}>
      <div className="space-y-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => navigate('/imoveis')}
            className="inline-flex items-center gap-2 min-h-[44px] text-navy underline underline-offset-4 self-start"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Imóveis
          </button>
          <div className="flex items-center gap-3">
            <SeloSituacao situacao={situacaoGeral} texto={proximo ? textoPrazo(proximo.diasRestantes) : 'Sem compromissos'} />
            <Link
              to={`/contrato/${imovel.id}`}
              className="inline-flex items-center gap-2 min-h-[44px] bg-navy text-white px-5 rounded-sm uppercase tracking-wider text-sm"
            >
              {principal ? <Pencil size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              {principal ? 'Gerir contrato' : 'Cadastrar contrato'}
            </Link>
          </div>
        </div>

        <section className="bg-white p-6 shadow-sm border-t-2 border-dourado" aria-labelledby="t-ficha">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-dourado-escuro">Ficha do imóvel</p>
              <h2 id="t-ficha" className="text-2xl mt-1">{imovel.endereco}</h2>
            </div>
            <Building2 size={28} className="text-navy/30 flex-shrink-0" aria-hidden="true" />
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {ficha.map(f => (
              <div key={f.rotulo}>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">{f.rotulo}</dt>
                <dd className="text-sm text-navy mt-1">{f.valor}</dd>
              </div>
            ))}
          </dl>
          {imovel.notas && (
            <div className="mt-5 pt-4 border-t border-navy/10">
              <p className="text-xs uppercase tracking-wider text-grafite-claro">Notas</p>
              <p className="text-sm text-grafite mt-1 whitespace-pre-line">{imovel.notas}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="t-contrato">
          <h2 id="t-contrato" className="text-xl mb-4">Contrato vigente</h2>
          {principal ? (
            <div className="bg-white p-5 shadow-sm border-l-[3px] border-navy">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">{principal.parte}</p>
                  <p className="text-sm text-grafite-claro">{rotulosTipoContrato[principal.tipo] ?? principal.tipo}</p>
                </div>
                <SeloSituacao situacao={situacaoPorPrazo(diasPrincipal)} texto={textoPrazo(diasPrincipal)} />
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor</dt>
                  <dd className="text-navy mt-1">{moeda(principal.valor)}<span className="text-grafite-claro"> · {moeda(valorMensal(principal))}/mês</span></dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Vigência</dt>
                  <dd className="text-navy mt-1">{formatarData(principal.dataInicio)} → {formatarData(principal.dataVencimento)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Reajuste</dt>
                  <dd className="text-navy mt-1">{rotulosIndice[principal.indice] ?? principal.indice}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Garantia</dt>
                  <dd className="text-navy mt-1">{rotulosGarantia[principal.garantia] ?? principal.garantia}</dd>
                </div>
              </dl>
              {vinculados.length > 0 && (
                <p className="text-xs text-grafite-claro mt-4">
                  {vinculados.length} {vinculados.length === 1 ? 'instrumento vinculado' : 'instrumentos vinculados'} (aditivos e subcontratos) — veja em “Gerir contrato”.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 shadow-sm border-l-[3px] border-grafite-claro/40">
              <p className="text-grafite">Este imóvel não tem contrato vigente.</p>
              <Link to={`/contrato/novo?imovelId=${imovel.id}`} className="inline-flex items-center gap-2 min-h-[44px] mt-2 text-navy underline underline-offset-4">
                <Plus size={14} aria-hidden="true" /> Cadastrar o primeiro contrato
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="t-tend" className="bg-white p-6 shadow-sm">
          <h2 id="t-tend" className="text-xl mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-dourado-escuro" aria-hidden="true" /> Próximos 12 meses
          </h2>
          <p className="text-sm text-grafite-claro mb-4">O que este imóvel tem pela frente, mês a mês, a partir das datas cadastradas.</p>
          <GraficoTendencia pontos={tendencia} compacto />
        </section>

        <section aria-labelledby="t-comp">
          <h2 id="t-comp" className="text-xl mb-4 flex items-center gap-2">
            <CalendarClock size={18} className="text-dourado-escuro" aria-hidden="true" /> Compromissos
          </h2>
          {alertas.length ? (
            <ul className="bg-white shadow-sm divide-y divide-navy/10">
              {alertas.map(a => (
                <li key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5">
                  <div>
                    <p className="text-sm text-navy">{a.titulo}</p>
                    <p className="text-xs text-grafite-claro">{formatarData(a.dataEvento)}</p>
                  </div>
                  <SeloSituacao situacao={situacaoPorPrazo(a.diasRestantes)} texto={textoPrazo(a.diasRestantes)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="bg-white p-5 shadow-sm text-sm text-grafite-claro">Nenhum compromisso nos próximos 400 dias.</p>
          )}
        </section>

        <section aria-labelledby="t-docs">
          <h2 id="t-docs" className="text-xl mb-4 flex items-center gap-2">
            <FileText size={18} className="text-dourado-escuro" aria-hidden="true" /> Documentos ({documentos.length})
          </h2>
          {documentos.length ? (
            <ul className="bg-white shadow-sm divide-y divide-navy/10">
              {documentos.map(d => {
                const dias = diasAte(d.dataVencimento)
                return (
                  <li key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm text-navy truncate">{d.nome}</p>
                      <p className="text-xs text-grafite-claro">
                        {rotulosTipoDocumento[d.tipo] ?? d.tipo} · {d.origem} · enviado em {formatarData(d.enviadoEm)}
                      </p>
                    </div>
                    {d.dataVencimento ? (
                      <SeloSituacao situacao={situacaoPorPrazo(dias)} texto={textoPrazo(dias)} />
                    ) : (
                      <SeloSituacao situacao="sem_prazo" texto="Sem vencimento" />
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="bg-white p-5 shadow-sm text-sm text-grafite-claro">
              Nenhum documento. Anexe pela tela do contrato (“Gerir contrato”).
            </p>
          )}
        </section>

        {historico.length > 0 && (
          <section aria-labelledby="t-hist">
            <h2 id="t-hist" className="text-xl mb-4">Histórico de contratos</h2>
            <ul className="bg-white shadow-sm divide-y divide-navy/10">
              {historico.map(c => (
                <li key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5">
                  <div>
                    <p className="text-sm text-navy">{c.parte}</p>
                    <p className="text-xs text-grafite-claro">
                      {rotulosTipoContrato[c.tipo] ?? c.tipo} · {formatarData(c.dataInicio)} → {formatarData(c.dataVencimento)} · {moeda(c.valor)}
                    </p>
                  </div>
                  <SeloSituacao
                    situacao={c.encerradoEm ? 'sem_prazo' : 'vencido'}
                    texto={c.encerradoEm ? `Encerrado em ${formatarData(c.encerradoEm)}` : 'Vencido'}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}
