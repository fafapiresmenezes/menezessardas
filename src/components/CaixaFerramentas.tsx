// Theye Suporte Jurídico — lista pesquisável de ferramentas com o painel da ferramenta escolhida (?f=id no endereço).
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import PainelFerramenta from './PainelFerramenta'
import { FERRAMENTAS, buscarFerramentas, type Categoria } from '@/lib/ferramentas/catalogo'

export default function CaixaFerramentas({ categorias }: { categorias: Categoria[] }) {
  const [params, setParams] = useSearchParams()
  const [termo, setTermo] = useState('')
  const [categoria, setCategoria] = useState<Categoria | 'todas'>('todas')
  const base = useMemo(() => FERRAMENTAS.filter(f => categorias.includes(f.categoria)), [categorias])
  const lista = buscarFerramentas(termo, base).filter(f => categoria === 'todas' || f.categoria === categoria)
  const escolhida = base.find(f => f.id === params.get('f')) ?? null
  const abrir = (id: string) => { const p = new URLSearchParams(params); p.set('f', id); setParams(p, { replace: true }) }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-3">
        <label htmlFor="busca-ferramentas" className="sr-only">Buscar ferramenta</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grafite-claro" aria-hidden="true" />
          <input id="busca-ferramentas" type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar: prazo, despejo, CPF, extenso…" className="w-full border border-navy/20 pl-9 pr-3 min-h-[44px] bg-white" />
        </div>
        {categorias.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
            {(['todas', ...categorias] as const).map(c => (
              <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)} className={`min-h-[36px] px-3 text-xs border ${categoria === c ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy bg-white'}`}>{c === 'todas' ? `Todas (${base.length})` : c}</button>
            ))}
          </div>
        )}
        <ul className="bg-white shadow-sm divide-y divide-navy/10 max-h-[70vh] overflow-y-auto" data-testid="lista-ferramentas">
          {lista.map(f => (
            <li key={f.id}>
              <button type="button" onClick={() => abrir(f.id)} aria-current={escolhida?.id === f.id ? 'true' : undefined} className={`w-full text-left px-4 py-3 min-h-[44px] ${escolhida?.id === f.id ? 'bg-dourado/15' : 'hover:bg-gray-50'}`}>
                <span className="block text-sm font-medium text-navy">{f.nome}</span>
                <span className="block text-xs text-grafite-claro">{f.categoria}</span>
              </button>
            </li>
          ))}
          {!lista.length && <li className="px-4 py-3 text-sm text-grafite-claro">Nenhuma ferramenta com esse termo.</li>}
        </ul>
      </div>
      <div>
        {escolhida ? <PainelFerramenta key={escolhida.id} ferramenta={escolhida} /> : (
          <div className="bg-white p-6 shadow-sm text-sm text-grafite-claro" data-testid="ferramenta-vazia">Escolha uma ferramenta na lista. Tudo é calculado no seu navegador: nada é enviado ao servidor.</div>
        )}
      </div>
    </div>
  )
}
