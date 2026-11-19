// R7: a biblioteca científica dentro da própria casa /geo.
// Regra que não se negocia: nenhum PDF de terceiro é hospedado aqui. Cada obra leva ao link
// oficial, e é lá que vale a licença. O selo de acesso diz só o que achamos ao montar o acervo.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CasaGeo from '@/components/geo/CasaGeo'
import { ACERVO, ELOS, MATERIAS, TOTAL_PAPERS, TOTAL_TESES, type Materia, type Obra, type Regiao } from '@/data/geo/biblioteca'

const REGIOES: Regiao[] = ['EUA', 'Europa', 'Ásia', 'Brasil', 'Global']
const cartao = 'bg-white shadow-sm p-4'

/** Tira acento e caixa, para a busca achar "Barabasi" quando está escrito "Barabási". */
const simples = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function Filtro({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={ativo}
      className={`px-3 min-h-[44px] text-sm border ${ativo ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20'}`}>
      {rotulo}
    </button>
  )
}

function Item({ o }: { o: Obra }) {
  return (
    <li className={cartao}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <a href={o.url} target="_blank" rel="noreferrer noopener" className="font-semibold text-navy underline"
          title={`Abrir a página oficial de "${o.titulo}" em outra aba`}>{o.titulo}</a>
        <span className="text-xs text-grafite-claro">{o.tipo === 'tese' ? 'tese de doutorado' : 'artigo'}</span>
      </div>
      <p className="text-sm text-grafite">{o.autores}, {o.ano} · {o.veiculo}</p>
      <p className="text-sm text-grafite mt-1"><b>Por que importa aqui:</b> {o.porque}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-grafite-claro">
        <li>{o.regiao}</li>
        {o.materias.map(m => <li key={m} title={MATERIAS[m]}>{MATERIAS[m]}</li>)}
        {o.elos.map(e => <li key={e} className="text-navy" title="Parte do app que esta obra sustenta">{ELOS[e] ?? e}</li>)}
        <li className={o.acesso === 'texto aberto' ? 'text-regular' : ''}>{o.acesso}</li>
      </ul>
    </li>
  )
}

export default function BibliotecaGeo() {
  const [busca, setBusca] = useState('')
  const [materia, setMateria] = useState<Materia | null>(null)
  const [regiao, setRegiao] = useState<Regiao | null>(null)
  const [elo, setElo] = useState<string | null>(null)
  const [soUsadas, setSoUsadas] = useState(false)

  // Só aparecem como filtro os elos que alguma obra realmente sustenta.
  const elosUsados = useMemo(() => Object.keys(ELOS).filter(e => ACERVO.some(o => o.elos.includes(e))), [])

  const lista = useMemo(() => {
    const q = simples(busca.trim())
    return ACERVO.filter(o => {
      if (materia && !o.materias.includes(materia)) return false
      if (regiao && o.regiao !== regiao) return false
      if (elo && !o.elos.includes(elo)) return false
      if (soUsadas && o.elos.length === 0) return false
      if (!q) return true
      return simples(`${o.titulo} ${o.autores} ${o.veiculo} ${o.porque} ${o.ano}`).includes(q)
    }).sort((a, b) => b.ano - a.ano)
  }, [busca, materia, regiao, elo, soUsadas])

  const usadas = ACERVO.filter(o => o.elos.length > 0).length
  const limpar = () => { setBusca(''); setMateria(null); setRegiao(null); setElo(null); setSoUsadas(false) }
  const filtrando = !!(busca || materia || regiao || elo || soUsadas)

  return (
    <CasaGeo>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-navy">A biblioteca do app</h1>
          <p className="text-sm text-grafite mt-1">
            Tudo o que este aplicativo faz vem de algum lugar, e o lugar está aqui: {TOTAL_PAPERS} artigos e {TOTAL_TESES} teses de doutorado.
            Destes, <b>{usadas}</b> sustentam alguma parte que já está no ar — cada um diz qual.
          </p>
        </div>

        <div className={cartao + ' space-y-3'}>
          <label className="block">
            <span className="text-sm text-grafite">Procurar por título, autor, revista ou ano</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} type="search"
              placeholder="por exemplo: Barabási, privacidade, 2010"
              className="mt-1 w-full border border-navy/20 px-3 min-h-[44px] text-sm" />
          </label>

          <div>
            <p className="text-xs text-grafite-claro mb-1">Por matéria</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MATERIAS) as Materia[]).map(m => (
                <Filtro key={m} rotulo={MATERIAS[m]} ativo={materia === m} onClick={() => setMateria(materia === m ? null : m)} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-grafite-claro mb-1">Por parte do app que a obra sustenta</p>
            <div className="flex flex-wrap gap-2">
              {elosUsados.map(e => (
                <Filtro key={e} rotulo={ELOS[e]} ativo={elo === e} onClick={() => setElo(elo === e ? null : e)} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-grafite-claro mb-1">Por região</p>
            <div className="flex flex-wrap gap-2">
              {REGIOES.map(r => <Filtro key={r} rotulo={r} ativo={regiao === r} onClick={() => setRegiao(regiao === r ? null : r)} />)}
              <Filtro rotulo="só o que já está em uso" ativo={soUsadas} onClick={() => setSoUsadas(!soUsadas)} />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-grafite" role="status">{lista.length} de {ACERVO.length} obras</p>
            {filtrando && <button onClick={limpar} className="text-sm underline text-navy min-h-[44px]">Limpar os filtros</button>}
          </div>
        </div>

        {lista.length === 0
          ? <p className={cartao + ' text-sm text-grafite'}>Nada encontrado com esses filtros. <button onClick={limpar} className="underline text-navy">Limpar os filtros</button> para ver o acervo inteiro.</p>
          : <ul className="space-y-3">{lista.map(o => <Item key={o.id} o={o} />)}</ul>}

        <div className={cartao}>
          <h2 className="font-semibold text-navy">Sobre licença e acesso</h2>
          <p className="text-sm text-grafite mt-1">
            Nenhum PDF de terceiro é guardado ou redistribuído aqui: cada obra leva à <b>página oficial</b>, e a licença que vale é a de lá.
            O selo <b>texto aberto</b> quer dizer que, quando montamos este acervo, a própria página oficial oferecia o texto completo sem barreira;
            <b> página oficial</b> quer dizer que o texto fica com o editor. É o que observamos, não um parecer jurídico — se um link morrer ou mudar de regra, a página oficial manda.
            Citar é sempre permitido, e é o que esta tela faz.
          </p>
          <p className="text-sm text-grafite mt-2">
            A régua de nota do app está em <Link to="/geo/nota" className="underline text-navy">régua de nota</Link>.
          </p>
        </div>
      </div>
    </CasaGeo>
  )
}
