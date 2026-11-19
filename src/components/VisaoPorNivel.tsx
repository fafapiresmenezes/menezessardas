import { useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { gruposVisiveis, TELAS_FIXAS, type Visao } from '@/components/menuTelas'
import { ehSede } from '@/lib/equipe'
import { mensagemAmigavel } from '@/lib/erros'
import { gravarOcultas, lerOcultas, meuAlcance, nivelDe, OCULTAS_VAZIAS, rotuloNivelHierarquia, type MapaOcultas, type NivelAbaixo, type NivelHierarquia } from '@/lib/hierarquia'

/**
 * Três níveis em cascata (pedido de M, 19/11/2026).
 * O chefe marca o que o gestor vê; o gestor marca o que o advogado vê. Ninguém repassa o que não tem:
 * tela escondida do gestor fica escondida também do advogado, e o gestor nem consegue mexer nela.
 * Financeiro e Honorários não entram aqui: quem vê o dinheiro é decidido pessoa a pessoa, na lista acima.
 */
export default function VisaoPorNivel() {
  const [nivel, setNivel] = useState<NivelHierarquia | null>(null)
  const [sede, setSede] = useState(true)
  const [mapa, setMapa] = useState<MapaOcultas>(OCULTAS_VAZIAS)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    meuAlcance().then(a => setNivel(a.id ? nivelDe(a) : null)).catch(() => setNivel(null))
    lerOcultas().then(setMapa).catch(() => undefined)
    ehSede().then(setSede).catch(() => undefined)
  }, [])

  // As telas que cada nível PODERIA ver pelas regras de cargo; é dentro delas que o de cima escolhe.
  const telasDe = useMemo(() => (alvo: NivelAbaixo) => {
    const visao: Visao = { veTudo: alvo === 'gestor', admin: false, instituto: false, sede, financeiro: false }
    return gruposVisiveis(visao).flatMap(g => g.itens.filter(i => !TELAS_FIXAS.includes(i.href)).map(i => ({ href: i.href, label: i.label, bloco: g.bloco })))
  }, [sede])

  if (nivel !== 'chefe' && nivel !== 'gestor') return null
  const alvos: NivelAbaixo[] = nivel === 'chefe' ? ['gestor', 'advogado'] : ['advogado']

  const alternar = async (alvo: NivelAbaixo, href: string, mostrar: boolean) => {
    setOcupado(true); setMsg(null)
    const nova = mostrar ? mapa[alvo].filter(t => t !== href) : Array.from(new Set([...mapa[alvo], href]))
    try {
      await gravarOcultas(alvo, nova)
      setMapa({ ...mapa, [alvo]: nova })
      setMsg({ tipo: 'ok', texto: 'Salvo. Vale a partir da próxima vez que a pessoa abrir a plataforma.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally { setOcupado(false) }
  }

  return (
    <section className="bg-white p-6 shadow-sm border-t-2 border-navy" aria-labelledby="visao-por-nivel" data-testid="visao-por-nivel">
      <h2 id="visao-por-nivel" className="text-lg font-serif flex items-center gap-2">
        <Layers size={18} className="text-navy" aria-hidden="true" />
        O que cada nível vê
      </h2>
      <p className="text-sm text-grafite mt-2 max-w-3xl">
        São três níveis: {rotuloNivelHierarquia.chefe}, {rotuloNivelHierarquia.gestor} e {rotuloNivelHierarquia.advogado}. Quem está em cima escolhe as telas de quem está logo abaixo.
        O que o gestor não vê, o advogado também não vê. O dinheiro do escritório fica fora daqui: é liberado pessoa a pessoa.
      </p>
      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`mt-3 text-sm ${msg.tipo === 'erro' ? 'text-critico' : 'text-regular'}`} data-testid="visao-nivel-msg">{msg.texto}</p>}
      <div className={`mt-4 grid gap-6 ${alvos.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {alvos.map(alvo => (
          <fieldset key={alvo} className="border border-navy/10 p-4" data-testid={`visao-${alvo}`}>
            <legend className="px-2 text-sm font-medium text-navy">{rotuloNivelHierarquia[alvo]} vê</legend>
            <ul className="space-y-1">
              {telasDe(alvo).map(t => {
                const travada = alvo === 'advogado' && mapa.gestor.includes(t.href)
                return (
                  <li key={t.href}>
                    <label className="flex items-center gap-2 text-sm min-h-[36px]" title={travada ? 'Esta tela está escondida do gestor, então o advogado também não a vê.' : `Marque para ${rotuloNivelHierarquia[alvo].toLowerCase()} ver a tela ${t.label}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        data-testid={`visao-${alvo}-${t.href}`}
                        title={travada ? 'Escondida do gestor: não pode ser repassada ao advogado' : `Mostrar ou esconder a tela ${t.label}`}
                        checked={!travada && !mapa[alvo].includes(t.href)}
                        disabled={ocupado || travada}
                        onChange={e => alternar(alvo, t.href, e.target.checked)}
                      />
                      <span>{t.label} <span className="text-xs text-grafite-claro">({t.bloco}{travada ? ', escondida do gestor' : ''})</span></span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </section>
  )
}
