/**
 * Painel da administração do Instituto: quantas visitas a porta recebe, em que língua a pessoa entra
 * e em qual quadradinho clica (passo V10). Lê pela função `visitas_porta_listar` (só admin do
 * Instituto passa). Nada aqui diz quem visitou: são contadores somados por dia.
 */
import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'
import { formatarData } from '@/lib/datas'
import { listarVisitas, type LinhaVisita } from '@/lib/visitas'
import { IDIOMAS } from '@/lib/idioma'
import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'

export default function PainelVisitasPorta() {
  const t = useTexto()
  const [linhas, setLinhas] = useState<LinhaVisita[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try { const d = await listarVisitas(30); if (vivo) setLinhas(d) }
      catch (e) { if (vivo) setErro(mensagemAmigavel(e)) }
      finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [])

  const soma = (f: (l: LinhaVisita) => boolean) => linhas.filter(f).reduce((s, l) => s + Number(l.n), 0)
  const totalVisitas = soma(l => l.tipo === 'visita')

  // Visitas por dia (últimos dias com movimento), da mais recente para a mais antiga.
  const porDia = Object.entries(
    linhas.filter(l => l.tipo === 'visita').reduce<Record<string, number>>((m, l) => { m[l.dia] = (m[l.dia] ?? 0) + Number(l.n); return m }, {}),
  ).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14)

  const porChave = (tipo: 'idioma' | 'quadradinho', nome: (chave: string) => string) =>
    Object.entries(linhas.filter(l => l.tipo === tipo).reduce<Record<string, number>>((m, l) => { m[l.chave] = (m[l.chave] ?? 0) + Number(l.n); return m }, {}))
      .map(([chave, n]) => ({ rotulo: nome(chave), n }))
      .sort((a, b) => b.n - a.n)

  const nomeIdioma = (c: string) => IDIOMAS.find(i => i.codigo === c)?.nativo ?? c
  const nomeFrente = (id: string) => { const v = VERTENTES.find(x => x.id === id); return v ? t(`vertente.${v.id}.nome` as Chave) : id }
  const idiomas = porChave('idioma', nomeIdioma)
  const quadradinhos = porChave('quadradinho', nomeFrente)

  const Barra = ({ rotulo, n, max, dica }: { rotulo: string; n: number; max: number; dica: string }) => (
    <div className="flex items-center gap-3" title={dica}>
      <span className="w-40 shrink-0 text-sm text-grafite truncate">{rotulo}</span>
      <span className="h-3 flex-1 bg-pergaminho overflow-hidden" aria-hidden="true">
        <span className="block h-full bg-navy" style={{ width: `${max ? Math.max(4, Math.round((n / max) * 100)) : 0}%` }} />
      </span>
      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-navy">{n}</span>
    </div>
  )

  return (
    <section className="space-y-4" data-testid="painel-visitas-porta">
      <h2 className="text-lg flex items-center gap-2">
        <BarChart3 size={18} aria-hidden="true" /> Visitas da porta
        {totalVisitas > 0 && <span className="text-xs bg-navy text-white rounded-full px-2 py-0.5" title="Soma das visitas nos últimos 30 dias">{totalVisitas}</span>}
      </h2>
      <p className="text-sm text-grafite">Contamos visitas, não seguimos pessoas. São contadores somados por dia, sem nada que diga quem visitou. Últimos 30 dias.</p>

      {erro && <p role="alert" className="text-sm text-critico border border-critico/40 p-3">{erro}</p>}
      {carregando ? (
        <p className="text-sm text-grafite-claro">Carregando as visitas…</p>
      ) : linhas.length === 0 ? (
        <p className="text-sm text-grafite-claro">Nenhuma visita contada ainda.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm uppercase tracking-wider text-grafite-claro mb-3">Visitas por dia</h3>
            <div className="space-y-2">
              {porDia.length === 0 ? <p className="text-sm text-grafite-claro">Sem visitas no período.</p>
                : porDia.map(([dia, n]) => <Barra key={dia} rotulo={formatarData(dia)} n={n} max={Math.max(...porDia.map(d => d[1]))} dica={`${n} visita(s) em ${formatarData(dia)}`} />)}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-grafite-claro mb-3">Língua escolhida</h3>
              <div className="space-y-2">
                {idiomas.length === 0 ? <p className="text-sm text-grafite-claro">Ninguém escolheu língua ainda.</p>
                  : idiomas.map(i => <Barra key={i.rotulo} rotulo={i.rotulo} n={i.n} max={Math.max(...idiomas.map(x => x.n))} dica={`${i.n} escolha(s) de ${i.rotulo}`} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-wider text-grafite-claro mb-3">Quadradinho clicado</h3>
              <div className="space-y-2">
                {quadradinhos.length === 0 ? <p className="text-sm text-grafite-claro">Nenhum quadradinho clicado ainda.</p>
                  : quadradinhos.map(q => <Barra key={q.rotulo} rotulo={q.rotulo} n={q.n} max={Math.max(...quadradinhos.map(x => x.n))} dica={`${q.n} clique(s) em ${q.rotulo}`} />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
