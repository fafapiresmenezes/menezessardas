import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, GraduationCap, Search } from 'lucide-react'

// Catálogo dos 500 consultores do Instituto, com a ementa acadêmica de cada um
// (fontes abertas: USP, UFMG, UnB, UFBA, Harvard, MIT OCW; teses da BDTD).
// O arquivo de dados tem ~1,2 MB, então é carregado só quando esta aba abre.

type Fonte = { titulo: string; url: string }
type Tese = { titulo: string; autor?: string; ano?: number | string; instituicao?: string; url?: string }
type Agente = {
  id: string; nome: string; area: string; nicho: string; base_oficial?: string | boolean
  frequencia?: string; status?: string
  ementa?: { topicos: string[]; fontes: Fonte[] }
  teses?: Tese[]
}

export default function CatalogoConsultores() {
  const [agentes, setAgentes] = useState<Agente[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('')
  const [aberto, setAberto] = useState('')

  useEffect(() => {
    import('@/data/agentes-instituto.json')
      .then(m => { const d = m as unknown as { default?: { agentes: Agente[] }; agentes?: Agente[] }; setAgentes(d.default?.agentes ?? d.agentes ?? []) })
      .catch(() => setErro('Não deu para carregar o catálogo agora. Recarregue a página.'))
  }, [])

  const areas = useMemo(() => (agentes ? [...new Set(agentes.map(a => a.area))].sort((a, b) => a.localeCompare(b, 'pt-BR')) : []), [agentes])
  const visiveis = useMemo(() => {
    if (!agentes) return []
    const t = busca.trim().toLowerCase()
    return agentes.filter(a => (!area || a.area === area) && (!t || `${a.nome} ${a.area} ${a.nicho}`.toLowerCase().includes(t)))
  }, [agentes, busca, area])

  if (erro) return <p role="alert" className="text-sm text-critico">{erro}</p>
  if (!agentes) return <p className="text-sm text-grafite-claro">Carregando o catálogo dos 500 consultores…</p>

  const comEmenta = agentes.filter(a => a.ementa?.topicos?.length).length
  return (
    <section className="bg-white p-6 shadow-sm" data-testid="catalogo-consultores">
      <div className="flex items-center gap-3"><GraduationCap className="text-dourado" size={22} aria-hidden="true" /><h2 className="text-lg">Os 500 consultores do Instituto</h2></div>
      <p className="text-sm text-grafite-claro mt-1">
        {agentes.length} especialidades catalogadas, {comEmenta} com ementa acadêmica completa montada a partir de fontes abertas
        (USP, UFMG, UnB, UFBA, Harvard e MIT OpenCourseWare) e teses de doutorado da BDTD. Toque num consultor para ver a ementa e as fontes.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="busca-consultor">Buscar consultor</label>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-grafite-claro" />
          <input id="busca-consultor" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busque por nome, área ou nicho"
            title="Filtra os 500 consultores pelo texto digitado" className="w-full min-h-[44px] border border-navy/20 pl-9 pr-3 text-sm" />
        </div>
        <label className="sr-only" htmlFor="area-consultor">Filtrar por área</label>
        <select id="area-consultor" value={area} onChange={e => setArea(e.target.value)} title="Mostra só os consultores da área escolhida"
          className="min-h-[44px] border border-navy/20 px-3 text-sm bg-white">
          <option value="">Todas as áreas ({agentes.length})</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <p className="text-xs text-grafite-claro mt-2" data-testid="catalogo-contagem">{visiveis.length} consultor(es) no filtro atual.</p>
      <ul className="mt-3 divide-y divide-navy/10">
        {visiveis.slice(0, 120).map(a => (
          <li key={a.id}>
            <button type="button" onClick={() => setAberto(aberto === a.id ? '' : a.id)} aria-expanded={aberto === a.id}
              title={`Abre a ementa e as fontes do consultor de ${a.nicho}`} className="w-full text-left py-3 min-h-[44px]">
              <span className="block text-sm font-medium text-navy">{a.nome}</span>
              <span className="block text-xs text-grafite-claro">{a.area} · {a.nicho}</span>
            </button>
            {aberto === a.id && (
              <div className="pb-4 text-sm text-grafite" data-testid="catalogo-detalhe">
                {typeof a.base_oficial === 'string' && a.base_oficial && <p className="text-xs"><strong>Fonte oficial do nicho:</strong> {a.base_oficial}{a.frequencia ? ` · ${a.frequencia}` : ''}</p>}
                {a.ementa?.topicos?.length ? (
                  <>
                    <p className="text-xs font-semibold text-navy uppercase tracking-wide mt-2">Ementa (conteúdo programático)</p>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">{a.ementa.topicos.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    {a.ementa.fontes?.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-navy uppercase tracking-wide mt-2">Fontes abertas da ementa</p>
                        <ul className="mt-1 space-y-0.5 text-xs">{a.ementa.fontes.map((f, i) => (
                          <li key={i}><a href={f.url} target="_blank" rel="noreferrer" title="Abre em nova aba a ementa na fonte original" className="underline decoration-dourado inline-flex items-center gap-1">{f.titulo} <ExternalLink size={11} aria-hidden="true" /></a></li>
                        ))}</ul>
                      </>
                    )}
                    {a.teses && a.teses.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-navy uppercase tracking-wide mt-2">Teses de doutorado da área (BDTD)</p>
                        <ul className="mt-1 space-y-0.5 text-xs">{a.teses.map((t, i) => (
                          <li key={i}>{t.url ? <a href={t.url} target="_blank" rel="noreferrer" title="Abre em nova aba a tese no repositório da universidade" className="underline decoration-dourado">{t.titulo}</a> : t.titulo}{t.autor ? ` — ${t.autor}` : ''}{t.instituicao ? ` (${t.instituicao}${t.ano ? `, ${t.ano}` : ''})` : t.ano ? ` (${t.ano})` : ''}</li>
                        ))}</ul>
                      </>
                    )}
                  </>
                ) : <p className="text-xs mt-2">{a.status ?? 'Este consultor acompanha a fonte oficial do nicho; não há ementa acadêmica aplicável.'}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {visiveis.length > 120 && <p className="text-xs text-grafite-claro mt-2">Mostrando os 120 primeiros. Use a busca ou o filtro de área para encontrar os demais.</p>}
    </section>
  )
}
