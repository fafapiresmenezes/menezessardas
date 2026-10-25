import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import {
  listarTrilha,
  verificarTrilha,
  type EventoTrilha,
  type ResultadoVerificacao,
  type TipoEvento,
} from '@/lib/trilha'
import {
  ancorarAgora,
  baixarArquivo,
  listarAncoragens,
  montarOts,
  textoDoSelo,
  verificarLastro,
  type Ancoragem,
  type Lastro,
} from '@/lib/ancoragem'
import { Printer, ShieldCheck, ShieldAlert, Link2, Anchor, Download } from 'lucide-react'

const rotuloTipo: Record<TipoEvento, string> = {
  imovel_criado: 'Imóvel cadastrado',
  contrato_criado: 'Contrato registrado',
  documento_anexado: 'Documento anexado',
  documento_removido: 'Documento removido',
  contrato_analisado: 'Contrato analisado',
  fornecedor_atualizado: 'Fornecedor atualizado',
  trilha_ancorada: 'Selo ancorado',
  legislacao_acompanhada: 'Legislação acompanhada',
  contrato_editado: 'Contrato editado',
  contrato_encerrado: 'Contrato encerrado',
  configuracao_alterada: 'Configuração alterada',
  acesso_alterado: 'Acesso alterado',
}

const corTipo: Record<TipoEvento, string> = {
  imovel_criado: 'bg-navy/10 text-navy',
  contrato_criado: 'bg-dourado/15 text-dourado-escuro',
  documento_anexado: 'bg-regularFundo text-grafite',
  documento_removido: 'bg-criticoFundo text-critico',
  contrato_analisado: 'bg-atencaoFundo text-grafite',
  fornecedor_atualizado: 'bg-navy/10 text-navy',
  trilha_ancorada: 'bg-dourado/15 text-dourado-escuro',
  legislacao_acompanhada: 'bg-navy/10 text-navy',
  contrato_editado: 'bg-atencaoFundo text-grafite',
  contrato_encerrado: 'bg-criticoFundo text-critico',
  configuracao_alterada: 'bg-navy/10 text-navy',
  acesso_alterado: 'bg-dourado/15 text-dourado-escuro',
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function TrilhaPage() {
  const [eventos, setEventos] = useState<EventoTrilha[]>([])
  const [verificacao, setVerificacao] = useState<ResultadoVerificacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ancoragens, setAncoragens] = useState<Ancoragem[]>([])
  const [lastros, setLastros] = useState<Lastro[] | null>(null)
  const [ancorando, setAncorando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = async () => {
    const [lista, v, ancs] = await Promise.all([listarTrilha(), verificarTrilha(), listarAncoragens()])
    setEventos([...lista].reverse()) // mais recentes no topo
    setVerificacao(v)
    setAncoragens([...ancs].reverse())
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const ancorar = async () => {
    setAncorando(true)
    setMsg(null)
    try {
      const a = await ancorarAgora()
      setMsg({ tipo: 'ok', texto: `Selo do registro nº ${a.seq} enviado. A confirmação no Bitcoin leva algumas horas.` })
      setLastros(null)
      await carregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falha ao ancorar.' })
    } finally {
      setAncorando(false)
    }
  }

  const verificar = async () => {
    setLastros(await verificarLastro())
  }

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

        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 print:hidden" aria-labelledby="ancoragem">
          <h2 id="ancoragem" className="text-lg flex items-center gap-2">
            <Anchor size={18} aria-hidden="true" /> Ancoragem pública (Bitcoin)
          </h2>
          <p className="text-sm text-grafite-claro mt-1 max-w-2xl">
            Envia só o selo (um código, nunca dados de clientes) a um registro público de datas. Depois disso,
            ninguém consegue provar que a trilha foi reescrita depois daquele momento.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={ancorar}
              disabled={ancorando || !verificacao?.integra || verificacao.total === 0}
              className="min-h-[44px] inline-flex items-center gap-2 bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider"
            >
              <Anchor size={16} aria-hidden="true" /> {ancorando ? 'Enviando…' : 'Ancorar selo agora'}
            </button>
            <button
              onClick={verificar}
              disabled={ancoragens.length === 0}
              className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho disabled:opacity-50 text-sm"
            >
              Verificar lastro
            </button>
          </div>
          {msg && (
            <p
              role={msg.tipo === 'erro' ? 'alert' : 'status'}
              className={`mt-3 px-4 py-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
            >
              {msg.texto}
            </p>
          )}
          {ancoragens.length > 0 && (
            <ul className="divide-y divide-navy/5 mt-4">
              {ancoragens.map(a => {
                const l = lastros?.find(x => x.ancoragemId === a.id)
                return (
                  <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">Registro nº {a.seq} — {dataHora(a.em)}</p>
                      <p className="font-mono text-[11px] text-grafite-claro break-all">selo: {a.selo.slice(0, 24)}…</p>
                      {l && (
                        <p className={`text-xs mt-1 ${l.coerente ? 'text-regular' : 'text-critico'}`}>
                          {l.coerente ? 'Lastro coerente: o registro não foi alterado desde a ancoragem.' : `Lastro quebrado: ${l.motivo}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => baixarArquivo(`selo-${a.seq}.txt`, textoDoSelo(a.seq, a.selo), 'text/plain')}
                        className="min-h-[44px] inline-flex items-center gap-1 px-3 border border-navy/30 text-sm hover:bg-pergaminho"
                      >
                        <Download size={14} aria-hidden="true" /> Selo (.txt)
                      </button>
                      <button
                        onClick={() => baixarArquivo(`selo-${a.seq}.txt.ots`, montarOts(a) as BlobPart)}
                        className="min-h-[44px] inline-flex items-center gap-1 px-3 border border-navy/30 text-sm hover:bg-pergaminho"
                      >
                        <Download size={14} aria-hidden="true" /> Prova (.ots)
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {ancoragens.length > 0 && (
            <p className="text-xs text-grafite-claro mt-3">
              Para conferir no Bitcoin: baixe os dois arquivos e solte-os em opentimestamps.org. A confirmação aparece
              algumas horas depois do envio.
            </p>
          )}
        </section>

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
