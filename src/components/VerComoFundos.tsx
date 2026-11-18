/** Selector "ver como" da casa de fundos (demonstração): muda o nível de quem olha, em todos os ecrãs. */
import { useSyncExternalStore } from 'react'
import { VISTAS, pessoaActual, escolherPessoa, aoMudarPessoa, fraseDoRecorte, ECRAS_POR_NIVEL } from '@/lib/visaoFundos'

export function usePessoaFundos() {
  return useSyncExternalStore(aoMudarPessoa, pessoaActual, pessoaActual)
}

export default function VerComoFundos() {
  const p = usePessoaFundos()
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm border border-navy/15 rounded-sm px-3 py-2 bg-areia/40" data-testid="ver-como">
      <label className="text-grafite-claro">Ver como:
        <select
          value={p.id}
          onChange={e => escolherPessoa(e.target.value)}
          className="ml-1 border border-navy/20 rounded-sm px-2 py-1 text-navy"
          title="Mudar o nível de quem está a ver a demonstração"
        >
          {VISTAS.map(v => <option key={v.id} value={v.id}>{v.nome} — {v.cargo}</option>)}
        </select>
      </label>
      <span className="text-xs text-grafite-claro">{fraseDoRecorte(p)}</span>
    </div>
  )
}

/** Moldura de acesso: o ecrã só aparece ao nível certo; fora disso, diz que não, com clareza. */
export function SoParaNiveis({ rota, children }: { rota: string; children: React.ReactNode }) {
  const p = usePessoaFundos()
  const niveis = ECRAS_POR_NIVEL[rota]
  if (niveis && (!p.nivel || !niveis.includes(p.nivel))) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <VerComoFundos />
        <p className="text-sm text-navy border border-amber-300 bg-amber-50 rounded-sm p-3" data-testid="sem-acesso">
          Este ecrã não está aberto ao seu nível. Cada nível vê o que é seu: peça à direcção o que precisar daqui.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
