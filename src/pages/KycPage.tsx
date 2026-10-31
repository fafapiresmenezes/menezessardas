import { useEffect, useState } from 'react'
import Vazio from '@/components/Vazio'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { UserCheck, History, RefreshCw } from 'lucide-react'

type Certidao = { emissor: string; cadastro: string; situacao: string; descricao: string }
type Resultado = {
  cnpj: string
  risco: 'baixo' | 'alto' | 'a conferir'
  alertas: string[]
  receita: { ok: boolean; encontrado?: boolean; nome?: string; fantasia?: string | null; situacao?: string; abertura?: string; atividade?: string; municipio?: string; uf?: string; socios?: { nome: string; qualificacao: string }[]; erro?: string }
  certidoes: { ok: boolean; certidoes?: Certidao[]; erro?: string }
  conflitos: { onde: string; detalhe: string }[]
  fontes: string[]
  consultadoEm: string
  mudou?: boolean
  riscoAnterior?: string | null
  proximaEm?: string
}
// Passo 26: histórico de checagens gravado no banco; reconsulta automática a cada 90 dias.
type Historico = { id: number; cnpj: string; nome: string | null; risco: string; alertas: string[]; consultado_em: string; automatica: boolean; risco_anterior: string | null; mudou: boolean }
const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
const proxima = (iso: string) => new Date(new Date(iso).getTime() + 90 * 86400000)

const COR = { baixo: 'bg-green-50 border-green-700 text-green-800', alto: 'bg-criticoFundo border-critico text-critico', 'a conferir': 'bg-amber-50 border-amber-600 text-amber-800' }

// Checagem de contraparte antes de fechar contrato: Receita, sanções (via TCU) e conflito de interesses.
export default function KycPage() {
  const [cnpj, setCnpj] = useState('')
  const [estado, setEstado] = useState<{ carregando?: boolean; erro?: string; r?: Resultado }>({})
  const [historico, setHistorico] = useState<Historico[]>([])
  const [msgRecon, setMsgRecon] = useState('')
  const carregarHistorico = () => supabase.from('checagens_kyc').select('id,cnpj,nome,risco,alertas,consultado_em,automatica,risco_anterior,mudou').order('consultado_em', { ascending: false }).limit(50)
    .then(({ data }) => setHistorico((data ?? []) as Historico[]))
  useEffect(() => { carregarHistorico() }, [])
  const reconsultar = async () => {
    setMsgRecon('Reconsultando as contrapartes já checadas…')
    const { data, error } = await supabase.functions.invoke('kyc', { body: { reconsultar: true } })
    if (error || data?.erro) return setMsgRecon(`Não foi possível reconsultar: ${data?.erro ?? error?.message}`)
    setMsgRecon(`${data.reconsultados} contraparte(s) reconsultada(s), ${data.mudancas} mudança(s) de status.`)
    carregarHistorico()
  }
  const consultar = async () => {
    setEstado({ carregando: true })
    const { data, error } = await supabase.functions.invoke('kyc', { body: { cnpj } })
    const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (error || corpo?.erro) return setEstado({ erro: corpo?.erro ?? 'A consulta falhou. Tente de novo.' })
    setEstado({ r: data })
    carregarHistorico()
  }
  const r = estado.r
  return (
    <Layout title="Checagem de contraparte">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <label htmlFor="cnpj" className="block font-medium mb-2">CNPJ da empresa</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id="cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="flex-1 min-w-[200px] border px-3 py-2" />
            <button type="button" onClick={consultar} disabled={cnpj.replace(/\D/g, '').length !== 14 || !!estado.carregando} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2">
              <UserCheck className="w-4 h-4" aria-hidden />{estado.carregando ? 'Consultando…' : 'Checar'}
            </button>
          </div>
          <p className="text-sm text-grafite-claro mt-2">Consulta gratuita em fontes públicas: Receita Federal, sanções (CEIS, CNEP, TCU e CNJ) e a base do próprio escritório, para apontar conflito de interesses.</p>
          {estado.erro && <p role="alert" className="mt-3 p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{estado.erro}</p>}
        </section>
        {r && (
          <section className="bg-white shadow-sm p-6 space-y-4" aria-live="polite">
            <p data-testid="kyc-risco" className={`p-3 border-l-4 font-medium ${COR[r.risco]}`}>
              Risco {r.risco}{r.alertas.length ? `: ${r.alertas.join(' ')}` : '. Nenhum alerta encontrado.'}
            </p>
            <div>
              <h2 className="font-serif text-xl mb-1">Receita Federal</h2>
              {!r.receita.ok ? <p className="text-sm">Fonte fora do ar ({r.receita.erro}); repita mais tarde.</p>
                : !r.receita.encontrado ? <p className="text-sm">CNPJ não encontrado.</p>
                : <div className="text-sm space-y-1">
                    <p><strong>{r.receita.nome}</strong>{r.receita.fantasia && ` (${r.receita.fantasia})`} · {r.receita.situacao}</p>
                    <p>{r.receita.atividade} · {r.receita.municipio}/{r.receita.uf} · aberta em {r.receita.abertura && new Date(r.receita.abertura + 'T12:00').toLocaleDateString('pt-BR')}</p>
                    {!!r.receita.socios?.length && <p>Sócios: {r.receita.socios.map(s => `${s.nome} (${s.qualificacao})`).join('; ')}</p>}
                  </div>}
            </div>
            <div>
              <h2 className="font-serif text-xl mb-1">Sanções e impedimentos</h2>
              {!r.certidoes.ok ? <p className="text-sm">O serviço do TCU não respondeu ({r.certidoes.erro}); repita mais tarde.</p>
                : <ul className="text-sm divide-y">{(r.certidoes.certidoes ?? []).map(c => (
                    <li key={c.emissor + c.cadastro} className="py-1"><strong>{c.emissor}</strong> · {c.descricao || c.cadastro}: {c.situacao === 'NADA_CONSTA' ? 'nada consta' : c.situacao === 'CONSTA' ? <span className="text-critico font-medium">CONSTA</span> : <span className="text-atencao">sistema do órgão fora do ar, repita mais tarde</span>}</li>
                  ))}</ul>}
            </div>
            <div>
              <h2 className="font-serif text-xl mb-1">Conflito de interesses</h2>
              {r.conflitos.length
                ? <ul className="text-sm list-disc pl-5">{r.conflitos.map((c, i) => <li key={i}>{c.onde}: {c.detalhe}</li>)}</ul>
                : <p className="text-sm">A empresa não aparece em contratos nem fornecedores do escritório.</p>}
            </div>
            {r.mudou && <p role="alert" className="p-3 border-l-4 bg-atencaoFundo border-atencao text-sm" data-testid="kyc-mudou">O status mudou desde a última checagem: era <strong>{r.riscoAnterior}</strong>, agora é <strong>{r.risco}</strong>.</p>}
            <p className="text-xs text-grafite-claro">Fontes: {r.fontes.join('; ')}. Consultado em {new Date(r.consultadoEm).toLocaleString('pt-BR')}.{r.proximaEm && ` Reconsulta automática em ${new Date(r.proximaEm).toLocaleDateString('pt-BR')}.`}</p>
          </section>
        )}
        <section className="bg-white shadow-sm p-6" data-testid="kyc-historico">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl flex items-center gap-2"><History className="w-5 h-5 text-dourado" aria-hidden />Histórico de checagens</h2>
            <button type="button" onClick={reconsultar} className="min-h-[44px] px-4 border text-sm inline-flex items-center gap-2" data-testid="kyc-reconsultar"><RefreshCw className="w-4 h-4" aria-hidden />Reconsultar agora</button>
          </div>
          <p className="text-sm text-grafite-claro mt-1">Cada checagem fica guardada com data e resultado. O robô reconsulta cada contraparte 90 dias depois da última checagem e avisa em Alertas quando o status muda.</p>
          {msgRecon && <p role="status" className="text-sm mt-2" data-testid="kyc-msg-recon">{msgRecon}</p>}
          {historico.length === 0 ? <Vazio testid="kyc-historico-vazio" titulo="Nenhuma checagem guardada ainda" texto="Digite um CPF ou CNPJ acima e clique em Checar: o resultado fica guardado aqui com data." /> : (
            <table className="w-full text-sm mt-3">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1">Data</th><th>Contraparte</th><th>Risco</th><th>Próxima reconsulta</th></tr></thead>
              <tbody className="divide-y divide-navy/10">
                {historico.map(h => (
                  <tr key={h.id} data-testid="kyc-item" className={h.mudou ? 'bg-atencaoFundo' : ''}>
                    <td className="py-2">{new Date(h.consultado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{h.automatica && <span className="ml-1 text-xs text-grafite-claro">(robô)</span>}</td>
                    <td><button type="button" onClick={() => setCnpj(fmtCnpj(h.cnpj))} className="underline text-navy text-left">{h.nome ?? fmtCnpj(h.cnpj)}</button></td>
                    <td data-testid="kyc-item-risco">{h.risco}{h.mudou && <span className="ml-1 text-xs text-atencao">mudou (era {h.risco_anterior})</span>}</td>
                    <td>{proxima(h.consultado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  )
}
