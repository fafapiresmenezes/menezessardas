import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import {
  listarTrilha,
  verificarTrilha,
  type EventoTrilha,
  type ResultadoVerificacao,
  type TipoEvento,
} from '@/lib/trilha'
import { Printer, ShieldCheck, ShieldAlert, Link2 } from 'lucide-react'

const rotuloTipo: Record<TipoEvento, string> = {
  imovel_criado: 'Imóvel cadastrado',
  contrato_criado: 'Contrato registrado',
  documento_anexado: 'Documento anexado',
  documento_removido: 'Documento removido',
  contrato_analisado: 'Contrato analisado',
  fornecedor_atualizado: 'Fornecedor atualizado',
}

const corTipo: Record<TipoEvento, string> = {
  imovel_criado: 'bg-navy/10 text-navy',
  contrato_criado: 'bg-dourado/15 text-dourado-escuro',
  documento_anexado: 'bg-regularFundo text-grafite',
  documento_removido: 'bg-criticoFundo text-critico',
  contrato_analisado: 'bg-atencaoFundo text-grafite',
  fornecedor_atualizado: 'bg-navy/10 text-navy',
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function TrilhaPage() {
  const [eventos, setEventos] = useState<EventoTrilha[]>([])
  const [verificacao, setVerificacao] = useState<ResultadoVerificacao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [lista, v] = await Promise.all([listarTrilha(), verificarTrilha()])
      setEventos([...lista].reverse()) // mais recentes no topo
      setVerificacao(v)
      setCarregando(false)
    })()
  }, [])

  return (
    <Layout title="Trilha de auditoria">
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-grafite-claro">
          Cada ação na plataforma vira um registro imutável, encadeado por hash ao registro anterior.
          Qualquer alteração ou remoção de um registro antigo quebra a cadeia e é apontada abaixo.
        </p>

        {verificacao && (
          <section
            className={`p-6 shadow-sm border-l-4 ${
              verificacao.integra ? 'bg-regularFundo border-regular' : 'bg-criticoFundo border-critico'
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {verificacao.integra ? (
                <ShieldCheck className="text-regular flex-shrink-0 mt-0.5" size={24} />
              ) : (
                <ShieldAlert className="text-critico flex-shrink-0 mt-0.5" size={24} />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {verificacao.integra
                    ? `Cadeia íntegra — ${verificacao.total} registro(s) verificado(s).`
                    : `Cadeia comprometida a partir do registro nº ${verificacao.quebraEm}.`}
                </p>
                <p className="text-xs text-grafite-claro mt-2 flex items-center gap-1 break-all">
                  <Link2 size={13} className="flex-shrink-0" />
                  <span className="font-mono">Selo atual: {verificacao.selo}</span>
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-navy text-white text-sm rounded hover:bg-navy/90"
          >
            <Printer size={16} /> Exportar em PDF
          </button>
        </div>

        <section className="bg-white shadow-sm" aria-label="Registros da trilha">
          {carregando ? (
            <p className="p-6 text-sm text-grafite-claro">Verificando a cadeia…</p>
          ) : eventos.length === 0 ? (
            <p className="p-6 text-sm text-grafite-claro">
              Nenhum registro ainda. Cadastre um imóvel ou contrato para iniciar a trilha.
            </p>
          ) : (
            <ol className="divide-y divide-navy/5">
              {eventos.map(e => (
                <li key={e.id} className="p-4 md:p-5 flex items-start gap-4">
                  <span className="font-mono text-xs text-grafite-claro mt-1 w-10 flex-shrink-0 text-right">
                    nº {e.seq}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${corTipo[e.tipo]}`}>
                        {rotuloTipo[e.tipo]}
                      </span>
                      <span className="text-xs text-grafite-claro">{dataHora(e.em)}</span>
                    </div>
                    <p className="text-sm mt-1">{e.resumo}</p>
                    <p className="font-mono text-[11px] text-grafite-claro mt-1 break-all">
                      hash: {e.hash.slice(0, 24)}…
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Layout>
  )
}
