import { useState } from 'react'
import { ESTUDOS_AGUAS, LACUNAS_BIBLIOTECA, TESES_AGUAS } from '@/data/aguasBiblioteca'

/** Biblioteca de Águas: os 50 estudos e as 10 teses abertas que sustentam a casa, cada um com link. */
export default function BibliotecaAguas() {
  const [todos, setTodos] = useState(false)
  const estudos = todos ? ESTUDOS_AGUAS : ESTUDOS_AGUAS.slice(0, 10)
  return (
    <section className="bg-white shadow-sm p-6 space-y-4" data-testid="aguas-biblioteca">
      <h2 className="font-serif text-xl">Biblioteca</h2>
      <div>
        <h3 className="font-medium mb-2">Teses de doutorado abertas ({TESES_AGUAS.length})</h3>
        <ul className="divide-y divide-grafite-claro">
          {TESES_AGUAS.map(t => (
            <li key={t.n} className="py-2 text-sm">
              <a href={t.link} target="_blank" rel="noreferrer" title={`Abre a tese de ${t.autor}`} className="underline">{t.titulo}</a>
              <p className="text-grafite">{t.autor} · {t.universidade} · {t.ano}</p>
              {t.viraFerramenta && <p className="text-grafite">Serve para: {t.viraFerramenta}</p>}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium mb-2">Estudos e relatórios ({ESTUDOS_AGUAS.length})</h3>
        <ul className="divide-y divide-grafite-claro">
          {estudos.map(e => (
            <li key={e.n} className="py-2 text-sm">
              <a href={e.link} target="_blank" rel="noreferrer" title="Abre o estudo na fonte" className="underline">{e.titulo}</a>
              <p className="text-grafite">{[e.autores, e.ano].filter(Boolean).join(' · ')}{e.uso ? ` · ${e.uso}` : ''}</p>
            </li>
          ))}
        </ul>
        {!todos && <button type="button" onClick={() => setTodos(true)} title="Mostra os 50 estudos" className="mt-2 min-h-[44px] underline text-sm" data-testid="aguas-biblioteca-todos">Ver os {ESTUDOS_AGUAS.length} estudos</button>}
      </div>
      <div className="text-xs text-grafite">
        <p className="font-medium">O que ainda falta na biblioteca</p>
        <ul className="list-disc pl-5">{LACUNAS_BIBLIOTECA.map(l => <li key={l}>{l}</li>)}</ul>
      </div>
    </section>
  )
}
