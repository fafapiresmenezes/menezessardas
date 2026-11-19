// R10: a régua de verdade da dimensão 8. Aqui o titular põe o app à prova contra um ponto de
// coordenada conhecida e descobre quanto o aparelho erra DE FATO, e se a margem que a tela mostra
// é honesta. Nenhum número desta tela é estimado: tudo vem das leituras feitas na hora.
// As leituras ficam só nesta tela, na memória; nada é enviado e nada é gravado no cofre.
import { useEffect, useMemo, useRef, useState } from 'react'
import CasaGeo from '@/components/geo/CasaGeo'
import { COBERTURA_ESPERADA, PROTOCOLO, errosContra, notaDaPrecisao, porFaixa, resumir, type Erro, type Leitura, type Referencia } from '@/lib/geo/precisao'

const cartao = 'bg-white shadow-sm p-5 border-t-2 border-dourado'
const botaoCheio = 'min-h-[44px] px-4 text-sm bg-navy text-white disabled:opacity-40'
const botao = 'min-h-[44px] px-4 text-sm border border-navy text-navy bg-white disabled:opacity-40'
const campo = 'min-h-[44px] w-full border border-navy/20 px-3 text-sm bg-white'
const MINIMO = 30

const m = (x: number) => `${x.toFixed(1)} m`

export default function PrecisaoGeo() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [fonte, setFonte] = useState('')
  const [medindo, setMedindo] = useState(false)
  const [leituras, setLeituras] = useState<Leitura[]>([])
  const [erro, setErro] = useState('')
  const vigia = useRef<number | null>(null)

  useEffect(() => () => { if (vigia.current != null) navigator.geolocation.clearWatch(vigia.current) }, [])

  const ref: Referencia | null = useMemo(() => {
    const la = Number(lat.replace(',', '.')), lo = Number(lon.replace(',', '.'))
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return null
    if (!fonte.trim()) return null
    return { lat: la, lon: lo, fonte: fonte.trim() }
  }, [lat, lon, fonte])

  const erros: Erro[] = useMemo(() => (ref ? errosContra(leituras, ref) : []), [leituras, ref])
  const resultado = useMemo(() => resumir(erros), [erros])
  const nota = useMemo(() => notaDaPrecisao(resultado), [resultado])
  const faixas = useMemo(() => porFaixa(erros), [erros])

  const comecar = () => {
    setErro(''); setLeituras([])
    if (!('geolocation' in navigator)) return setErro('Este aparelho não dá a posição.')
    vigia.current = navigator.geolocation.watchPosition(
      p => setLeituras(l => [...l, { t: p.timestamp, lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy }]),
      e => setErro(e.code === 1 ? 'Você não liberou a localização. Libere nas permissões e tente de novo.' : `O aparelho não deu a posição: ${e.message}`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 },
    )
    setMedindo(true)
  }

  const parar = () => {
    if (vigia.current != null) navigator.geolocation.clearWatch(vigia.current)
    vigia.current = null
    setMedindo(false)
  }

  const copiar = async () => {
    if (!resultado || !ref) return
    const linhas = [
      `Medição de precisão do THEYE Geo`,
      `Ponto de referência: ${ref.lat}, ${ref.lon} (fonte: ${ref.fonte})`,
      `Leituras: ${resultado.n}`,
      `Erro mediano: ${m(resultado.mediana)}`,
      `Percentil 90: ${m(resultado.p90)}`,
      `Pior leitura: ${m(resultado.pior)}`,
      `Margem declarada pelo aparelho (mediana): ${m(resultado.declaradaMediana)}`,
      `Cobertura da margem declarada: ${(resultado.cobertura * 100).toFixed(0)}% (esperado ~${(COBERTURA_ESPERADA * 100).toFixed(0)}%)`,
      nota != null ? `Nota da dimensão 8: ${nota}/10` : `Sem nota: menos de ${MINIMO} leituras`,
    ].join('\n')
    try { await navigator.clipboard.writeText(linhas) ; setErro('') } catch { setErro('Não deu para copiar. Tire uma foto da tela e me mande.') }
  }

  return (
    <CasaGeo>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Pôr a precisão à prova</h1>
          <p className="text-sm text-grafite mt-1">
            O app sempre mostrou uma margem de erro em metros — mas aquele número vem do próprio
            aparelho, e ninguém tinha conferido se ele é honesto. Aqui você descobre, parado em cima
            de um ponto de coordenada conhecida, <b>quanto o aparelho erra de verdade</b>.
          </p>
        </div>

        <div className={cartao + ' space-y-3'}>
          <h2 className="font-semibold text-navy">1. O ponto de referência</h2>
          <p className="text-xs text-grafite">
            Precisa de uma coordenada que você não tirou deste aparelho, senão a conta compara o
            aparelho com ele mesmo. O jeito mais firme é um marco geodésico do IBGE:{' '}
            <a className="text-navy underline" href="https://bdg.ibge.gov.br/" target="_blank" rel="noreferrer noopener" title="Abrir o Banco de Dados Geodésicos do IBGE, onde estão as coordenadas oficiais dos marcos, em outra aba">
              Banco de Dados Geodésicos do IBGE
            </a>. Também serve uma estação da RBMC ou um ponto que você mesmo mediu com equipamento bom.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <label className="text-sm text-grafite">Latitude
              <input className={campo} inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} placeholder="-22.780000" title="A latitude do ponto de referência, em graus decimais" />
            </label>
            <label className="text-sm text-grafite">Longitude
              <input className={campo} inputMode="decimal" value={lon} onChange={e => setLon(e.target.value)} placeholder="-43.310000" title="A longitude do ponto de referência, em graus decimais" />
            </label>
            <label className="text-sm text-grafite">De onde veio esta coordenada
              <input className={campo} value={fonte} onChange={e => setFonte(e.target.value)} placeholder="Marco IBGE 93847, BDG" title="A fonte da coordenada: sem fonte, a medição não vale nada" />
            </label>
          </div>
          {!ref && (lat || lon || fonte) && <p className="text-xs text-critico">Faltou algo: as duas coordenadas em graus decimais e a fonte de onde elas vieram.</p>}
        </div>

        <div className={cartao + ' space-y-3'}>
          <h2 className="font-semibold text-navy">2. Ficar parado e medir</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {!medindo
              ? <button className={botaoCheio} onClick={comecar} disabled={!ref} title={ref ? 'Começar a colher leituras para comparar com o ponto de referência' : 'Preencha primeiro o ponto de referência e a fonte dele'}>Começar a medir</button>
              : <button className="min-h-[44px] px-4 text-sm bg-critico text-white" onClick={parar} title="Parar de colher leituras">Parar</button>}
            <span className="text-sm text-grafite" aria-live="polite">
              {leituras.length} leitura{leituras.length === 1 ? '' : 's'}
              {leituras.length < MINIMO && <span className="text-grafite-claro"> · faltam {MINIMO - leituras.length} para fechar a conta</span>}
            </span>
          </div>
          {erro && <p className="text-sm text-critico">{erro}</p>}
          <p className="text-xs text-grafite-claro">
            Fique parado em cima do ponto, celular na mão, sob céu aberto, por uns cinco minutos.
            Andar, entrar em prédio ou guardar o celular no bolso durante a medição mede outra coisa.
            As leituras ficam só nesta tela: nada é enviado e nada entra no seu cofre.
          </p>
        </div>

        {resultado && ref && (
          <div className={cartao + ' space-y-3'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-navy">3. O que a medição diz</h2>
              <button className={botao} onClick={copiar} title="Copiar o resultado em texto, para guardar ou me mandar">Copiar o resultado</button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="border border-navy/10 p-3">
                <div className="text-2xl font-semibold text-navy">{m(resultado.mediana)}</div>
                <div className="text-xs text-grafite mt-1">erro mediano: metade das leituras erra menos que isso</div>
              </div>
              <div className="border border-navy/10 p-3">
                <div className="text-2xl font-semibold text-navy">{m(resultado.p90)}</div>
                <div className="text-xs text-grafite mt-1">percentil 90: só uma em dez erra mais que isso</div>
              </div>
              <div className="border border-navy/10 p-3">
                <div className="text-2xl font-semibold text-navy">{(resultado.cobertura * 100).toFixed(0)}%</div>
                <div className="text-xs text-grafite mt-1">
                  das leituras couberam na margem que o aparelho declarou. O esperado é perto de{' '}
                  {(COBERTURA_ESPERADA * 100).toFixed(0)}%, porque essa margem significa "acerto em dois terços das vezes"
                </div>
              </div>
            </div>

            <p className="text-sm text-navy">
              O aparelho declarou, na mediana, margem de {m(resultado.declaradaMediana)} e errou {m(resultado.mediana)}.{' '}
              {resultado.otimista
                ? <b>Ele é otimista: diz errar menos do que erra de fato.</b>
                : <>Ou seja, <b>a margem que a tela mostra se sustenta</b> nesta medição.</>}
              {' '}Pior leitura: {m(resultado.pior)}.
            </p>

            {faixas.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-navy">Por faixa de margem declarada</h3>
                <p className="text-xs text-grafite-claro mb-1">
                  Margem pequena costuma ser posição por satélite, e margem grande por Wi-Fi ou antena —
                  mas isto é indício, não a fonte do sinal: nem o navegador nem o app sabem qual foi.
                </p>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Erro por faixa de margem declarada">
                  <table className="w-full text-xs" tabIndex={0} aria-label="Erro por faixa de margem declarada">
                    <thead><tr className="text-left text-grafite"><th>Faixa</th><th>Leituras</th><th>Erro mediano</th><th>Percentil 90</th></tr></thead>
                    <tbody>{faixas.map(f => (
                      <tr key={f.faixa} className="border-t border-navy/5">
                        <td>{f.nome}</td><td>{f.resultado.n}</td><td>{m(f.resultado.mediana)}</td><td>{m(f.resultado.p90)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-sm">
              {nota != null
                ? <>Pelo critério escrito na régua, isto dá <b>nota {nota} de 10</b> na dimensão de precisão. Me mande o resultado e eu ponho na régua, com a data e a fonte do ponto.</>
                : <span className="text-grafite">Ainda <b>sem nota</b>: com menos de {MINIMO} leituras isso é palpite, não medição. A régua continua dizendo "a medir".</span>}
            </p>
          </div>
        )}

        <div className={cartao}>
          <h2 className="font-semibold text-navy">O método, para qualquer pessoa repetir</h2>
          <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm text-grafite">
            {PROTOCOLO.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </div>
      </div>
    </CasaGeo>
  )
}
