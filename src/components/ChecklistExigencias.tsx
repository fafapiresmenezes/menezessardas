import { useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { FUNCOES, NOTA_EXIGENCIAS, VERSAO_EXIGENCIAS, checklistDaFuncao, prazosFaltantes, type FuncaoImovel } from '@/lib/exigencias'
import { baixarICS } from '@/lib/ics'

/** Checklist de documentos por função do imóvel (ontologia do Instituto THEYE). */
export default function ChecklistExigencias({ funcaoInicial, anexos, imovel }: { funcaoInicial: FuncaoImovel; anexos: string[]; imovel?: { id: string; nome: string } }) {
  const [funcao, setFuncao] = useState<FuncaoImovel>(funcaoInicial)
  const { funcao: f, itens } = checklistDaFuncao(funcao, anexos)
  const faltam = itens.filter(i => !i.ok).length
  return (
    <section aria-labelledby="t-exig">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 id="t-exig" className="text-xl">
          Documentos exigidos para a locação {faltam ? `(${faltam} faltando)` : '(completo)'}
        </h2>
        <label className="text-sm text-grafite-claro flex items-center gap-2">
          Função
          <select value={funcao} onChange={e => setFuncao(e.target.value as FuncaoImovel)} className="border border-navy/20 bg-white px-2 py-1 text-navy">
            {FUNCOES.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-grafite-claro mb-3">{f.resumo}</p>
      <ul className="bg-white shadow-sm divide-y divide-navy/10">
        {itens.map(i => (
          <li key={i.doc} className="flex gap-3 px-5 py-3">
            {i.ok
              ? <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-label="Anexado" />
              : <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" aria-label="Faltando" />}
            <div className="min-w-0">
              <p className="text-sm text-navy">{i.doc}</p>
              <p className="text-xs text-grafite-claro">
                {i.quem} · {i.quando} · <a href={i.url} target="_blank" rel="noreferrer" className="underline">{i.norma}</a> · {i.porque}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {faltam > 0 && imovel && (
        <button title="Baixa um arquivo de agenda com prazo de 30 dias para cada documento que falta" type="button" data-testid="exig-agenda" onClick={() => baixarICS(prazosFaltantes(funcao, anexos, imovel), 'documentos-faltantes.ics')}
          className="mt-3 min-h-[44px] px-4 border border-navy text-navy text-sm">
          Pôr os {faltam} documentos faltantes na agenda (prazo de 30 dias)
        </button>
      )}
      <p className="text-xs text-grafite-claro mt-2">Fonte: ontologia de locação v{VERSAO_EXIGENCIAS} do THEYE Institute. {NOTA_EXIGENCIAS}</p>
    </section>
  )
}
