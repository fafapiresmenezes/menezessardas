import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import {
  EMENTAS_EM, NAO_PROMESSA, PROMESSA, areas, horas, plano, procurar, progresso, semEmenta, trilhasProntas,
} from '@/lib/educacao/trilhas'
import type { Trilha } from '@/lib/educacao/trilhas'

const CHAVE = 'theye-trilha-lidos'

const lerLidos = (id: string): number[] => {
  try { return JSON.parse(localStorage.getItem(`${CHAVE}:${id}`) ?? '[]') as number[] } catch { return [] }
}
const gravarLidos = (id: string, l: number[]) => {
  try { localStorage.setItem(`${CHAVE}:${id}`, JSON.stringify(l)) } catch { /* navegador sem espaço: o estudo segue sem marcação */ }
}

/** Passo D2: protótipo de uma trilha de estudo montada sobre a ementa dos consultores do Instituto. */
export default function TrilhasPage() {
  const todas = useMemo(() => trilhasProntas(), [])
  const listaAreas = useMemo(() => areas(), [])
  const [area, setArea] = useState('')
  const [termo, setTermo] = useState('')
  const [id, setId] = useState(todas[0]?.id ?? '')
  const [minutosPorSemana, setMinutosPorSemana] = useState(120)
  const [lidos, setLidos] = useState<number[]>([])

  const encontradas = useMemo(() => {
    const base = area ? todas.filter(t => t.area === area) : todas
    return procurar(termo, base)
  }, [area, termo, todas])

  const trilha: Trilha | undefined = useMemo(
    () => encontradas.find(t => t.id === id) ?? encontradas[0],
    [encontradas, id],
  )

  useEffect(() => { if (trilha) setLidos(lerLidos(trilha.id)) }, [trilha?.id])

  const marcar = (n: number) => {
    if (!trilha) return
    const novo = lidos.includes(n) ? lidos.filter(x => x !== n) : [...lidos, n]
    setLidos(novo)
    gravarLidos(trilha.id, novo)
  }

  const p = trilha ? progresso(trilha, lidos) : null
  const semanas = trilha ? plano(trilha, minutosPorSemana) : []

  return (
    <Layout title="Trilhas de estudo">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <h2 className="font-serif text-xl">Estudo montado sobre a ementa dos consultores</h2>
          <p className="text-sm text-grafite">
            {todas.length} trilhas, uma por nicho com ementa, nascidas do mesmo catálogo que a
            plataforma usa para consultar. Cada módulo traz a fonte de onde o assunto veio: curso
            aberto de universidade, tese ou repositório público. Ementas levantadas em {EMENTAS_EM}.
            {semEmenta() > 0 && ` ${semEmenta()} consultores ainda não têm ementa e por isso não viraram trilha.`}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">O que a trilha faz</h3>
              <ul className="text-sm text-grafite list-disc pl-5">{PROMESSA.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">O que ela não faz</h3>
              <ul className="text-sm text-grafite list-disc pl-5" data-testid="nao-promessa">{NAO_PROMESSA.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="bg-white shadow-sm p-6 grid gap-4 md:grid-cols-4">
          <label className="block text-sm">
            <span className="block mb-1 text-grafite">Área</span>
            <select value={area} onChange={e => setArea(e.target.value)} title="Filtra as trilhas por área do conhecimento" className="w-full border border-grafite-claro p-2">
              <option value="">Todas as áreas</option>
              {listaAreas.map(a => <option key={a.area} value={a.area}>{a.area} ({a.trilhas})</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block mb-1 text-grafite">Procurar</span>
            <input value={termo} onChange={e => setTermo(e.target.value)} title="Procura por nome, área ou nicho da trilha" placeholder="palavra do assunto" className="w-full border border-grafite-claro p-2" />
          </label>
          <label className="block text-sm md:col-span-1">
            <span className="block mb-1 text-grafite">Trilha</span>
            <select value={trilha?.id ?? ''} onChange={e => setId(e.target.value)} title="Escolhe qual trilha você quer estudar" className="w-full border border-grafite-claro p-2">
              {encontradas.slice(0, 300).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              {!encontradas.length && <option value="">Nenhuma trilha com esse termo</option>}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block mb-1 text-grafite">Tempo por semana</span>
            <select value={minutosPorSemana} onChange={e => setMinutosPorSemana(Number(e.target.value))} title="Quanto tempo você tem por semana; o plano se divide por isso" className="w-full border border-grafite-claro p-2">
              {[45, 90, 120, 180, 300].map(m => <option key={m} value={m}>{horas(m)}</option>)}
            </select>
          </label>
        </section>

        {trilha && p && (
          <section className="bg-white shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-serif text-xl">{trilha.nome}</h2>
              <p className="text-sm text-grafite">{trilha.area} · {trilha.nicho}</p>
            </div>

            <dl className="grid gap-4 sm:grid-cols-4 text-sm">
              <div><dt className="text-grafite">Módulos</dt><dd className="text-lg">{trilha.modulos.length}</dd></div>
              <div><dt className="text-grafite">Tempo estimado</dt><dd className="text-lg">{horas(trilha.minutos)}</dd></div>
              <div><dt className="text-grafite">Semanas neste ritmo</dt><dd className="text-lg">{semanas.length}</dd></div>
              <div><dt className="text-grafite" title="Quanto você marcou como lido; não é medida de aprendizado">Marcado como lido</dt><dd className="text-lg">{p.porcento}%</dd></div>
            </dl>

            {trilha.modulosSemFonte > 0 && (
              <p className="text-sm text-atencao" data-testid="sem-fonte">
                {trilha.modulosSemFonte} {trilha.modulosSemFonte === 1 ? 'módulo desta trilha não tem fonte na ementa' : 'módulos desta trilha não têm fonte na ementa'}.
                Eles ficam na lista marcados assim, em vez de sumir.
              </p>
            )}

            <div className="space-y-4">
              {semanas.map(s => (
                <div key={s.semana} className="border border-grafite-claro p-4">
                  <h3 className="font-semibold text-sm">Semana {s.semana} · {horas(s.minutos)}</h3>
                  <ul className="mt-2 space-y-2">
                    {s.modulos.map(m => (
                      <li key={m.n} className="text-sm flex gap-2 items-start">
                        <input
                          type="checkbox"
                          id={`modulo-${m.n}`}
                          checked={lidos.includes(m.n)}
                          onChange={() => marcar(m.n)}
                          className="mt-1"
                        />
                        <label htmlFor={`modulo-${m.n}`} className="flex-1">
                          <span className="block">{m.n}. {m.titulo} <span className="text-grafite">· {horas(m.minutos)}</span></span>
                          {m.fonte ? (
                            <a href={m.fonte.url} target="_blank" rel="noreferrer" title={`Abre a fonte deste módulo: ${m.fonte.titulo}`} className="underline text-grafite">
                              {m.fonte.titulo}
                            </a>
                          ) : (
                            <span className="text-atencao">Sem fonte na ementa</span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-xs text-grafite">
              O que você marca fica guardado só neste navegador, neste aparelho. Nada disso vai para
              servidor nenhum enquanto não houver assinatura com o seu aceite em termos.
            </p>
          </section>
        )}
      </div>
    </Layout>
  )
}
