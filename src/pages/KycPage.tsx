import { useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { UserCheck } from 'lucide-react'

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
}

const COR = { baixo: 'bg-green-50 border-green-700 text-green-800', alto: 'bg-criticoFundo border-critico text-critico', 'a conferir': 'bg-amber-50 border-amber-600 text-amber-800' }

// Checagem de contraparte antes de fechar contrato: Receita, sanções (via TCU) e conflito de interesses.
export default function KycPage() {
  const [cnpj, setCnpj] = useState('')
  const [estado, setEstado] = useState<{ carregando?: boolean; erro?: string; r?: Resultado }>({})
  const consultar = async () => {
    setEstado({ carregando: true })
    const { data, error } = await supabase.functions.invoke('kyc', { body: { cnpj } })
    const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (error || corpo?.erro) return setEstado({ erro: corpo?.erro ?? 'A consulta falhou. Tente de novo.' })
    setEstado({ r: data })
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
                    <li key={c.emissor + c.cadastro} className="py-1"><strong>{c.emissor}</strong> · {c.descricao || c.cadastro}: {c.situacao === 'NADA_CONSTA' ? 'nada consta' : <span className="text-critico font-medium">{c.situacao}</span>}</li>
                  ))}</ul>}
            </div>
            <div>
              <h2 className="font-serif text-xl mb-1">Conflito de interesses</h2>
              {r.conflitos.length
                ? <ul className="text-sm list-disc pl-5">{r.conflitos.map((c, i) => <li key={i}>{c.onde}: {c.detalhe}</li>)}</ul>
                : <p className="text-sm">A empresa não aparece em contratos nem fornecedores do escritório.</p>}
            </div>
            <p className="text-xs text-grafite-claro">Fontes: {r.fontes.join('; ')}. Consultado em {new Date(r.consultadoEm).toLocaleString('pt-BR')}.</p>
          </section>
        )}
      </div>
    </Layout>
  )
}
