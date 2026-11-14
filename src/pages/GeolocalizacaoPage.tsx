// Fase G do plano mestre THEYE v4 (G1 a G7): MVP de geolocalização e geomapeamento feito no próprio titular (M).
// Tudo fica cifrado neste aparelho. A câmera é sensor de lugar, nunca de rosto, emoção ou perfil.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { Cofre, TERMO, VERSAO_TERMO, cofreExiste, conferirCorrente, type Cena as CenaCamera, type DadosGeo } from '@/lib/geo/cofre'
import { agruparLugares, detectarParadas, distancia, fmtMin, linhaDoTempo, preverProximo, resumoPeriodo, type Lugar, type Ponto } from '@/lib/geo/calculo'
import { CAMADAS_PENDENTES, SATELITES, buscarCenas, camadasSatelite, municipioDe, noticiasGdelt, tileNdvi, tilesDaCena, type Cena, type Municipio, type Noticia } from '@/lib/geo/fontes'
import { baixar, csvPontos, geojson, montarGrafo } from '@/lib/geo/grafo'
import { lerQuadro } from '@/lib/geo/camera'
import { Camera, Download, Lock, MapPin, Pause, Play, Satellite, ShieldCheck, Trash2, Network } from 'lucide-react'

const MapaGeo = lazy(() => import('@/components/geo/MapaGeo'))

const cartao = 'bg-white shadow-sm p-5 border-t-2 border-dourado'
const botao = 'min-h-[44px] px-4 text-sm border border-navy text-navy bg-white disabled:opacity-40'
const botaoCheio = 'min-h-[44px] px-4 text-sm bg-navy text-white disabled:opacity-40'
const campo = 'min-h-[44px] w-full border border-navy/20 px-3 text-sm bg-white'
type Aba = 'onde' | 'mapa' | 'camera' | 'satelite' | 'grafo' | 'dados'
const ABAS: { id: Aba; nome: string; dica: string }[] = [
  { id: 'onde', nome: 'Onde estou', dica: 'Ligar e pausar a gravação da posição, e ver tudo o que foi gravado' },
  { id: 'mapa', nome: 'Meu mapa', dica: 'Trajetos, paradas, lugares, linha do tempo do dia e resumo da semana' },
  { id: 'camera', nome: 'Câmera', dica: 'A câmera ajuda a dizer onde você está. Não lê rosto, emoção nem perfil' },
  { id: 'satelite', nome: 'Satélites e município', dica: 'Imagens de satélite abertas, ficha do município (IBGE) e notícias (GDELT)' },
  { id: 'grafo', nome: 'Grafo e previsão', dica: 'Como lugares, município, notícias e cenas se ligam, e para onde você deve ir em seguida' },
  { id: 'dados', nome: 'Exportar e apagar', dica: 'Baixar tudo em arquivo aberto, apagar por dia, por lugar ou tudo, e ver quem acessou' },
]
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function GeolocalizacaoPage() {
  const [cofre, setCofre] = useState<Cofre | null>(null)
  const [dados, setDados] = useState<DadosGeo | null>(null)
  const [senha, setSenha] = useState('')
  const [titular, setTitular] = useState('')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [aba, setAba] = useState<Aba>('onde')
  const [gravando, setGravando] = useState(false)
  const [bateria, setBateria] = useState<number | null>(null)
  const [ligadas, setLigadas] = useState<string[]>([])
  const [cenas, setCenas] = useState<Cena[]>([])
  const [cenaTiles, setCenaTiles] = useState<string[] | null>(null)
  const [municipio, setMunicipio] = useState<Municipio | null>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [dia, setDia] = useState(hojeISO())
  const [ocupado, setOcupado] = useState('')
  const [camLigada, setCamLigada] = useState(false)
  const [ultimaCena, setUltimaCena] = useState<CenaCamera | null>(null)
  const [corrente, setCorrente] = useState<string>('')
  const vigia = useRef<number | null>(null)
  const ultimoGravado = useRef(0)
  const travaTela = useRef<{ release: () => Promise<void> } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const timerCam = useRef<number | null>(null)
  const camadas = useMemo(() => camadasSatelite(), [])

  const atualizar = (c: Cofre) => setDados({ ...c.dados, pontos: [...c.dados.pontos], cenas: [...c.dados.cenas], acessos: [...c.dados.acessos], lugares: [...c.dados.lugares] })
  const falhar = (e: unknown) => setErro(e instanceof Error ? e.message : String(e))

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> }
    nav.getBattery?.().then(b => setBateria(b.level)).catch(() => {})
    return () => { pararGravacao(); desligarCamera() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrir = async () => {
    setErro(''); setOcupado('Abrindo o cofre…')
    try {
      const c = await Cofre.abrir(senha)
      await c.anotarAcesso('abertura', 'Titular abriu o cofre neste aparelho')
      setCofre(c); atualizar(c); setSenha('')
    } catch (e) { falhar(e) } finally { setOcupado('') }
  }

  const consentir = async () => {
    if (!cofre || !titular.trim()) return
    await cofre.consentir(titular.trim()); atualizar(cofre)
  }

  // ---------- G2: gravação ----------
  const gravar = async (pos: GeolocationPosition) => {
    if (!cofre) return
    const intervalo = (cofre.dados.intervaloSeg || 60) * 1000
    if (pos.timestamp - ultimoGravado.current < intervalo) return
    ultimoGravado.current = pos.timestamp
    const p: Ponto = { t: pos.timestamp, lat: pos.coords.latitude, lon: pos.coords.longitude, precisao: pos.coords.accuracy, velocidade: pos.coords.speed, bateria }
    try { await cofre.gravarPonto(p); atualizar(cofre) } catch (e) { falhar(e); pararGravacao() }
  }

  const iniciarGravacao = async () => {
    setErro('')
    if (!('geolocation' in navigator)) return setErro('Este navegador não dá a posição do aparelho.')
    ultimoGravado.current = 0
    vigia.current = navigator.geolocation.watchPosition(gravar, e => setErro(e.code === 1 ? 'Você não liberou a localização no aparelho. Libere nas permissões do navegador e tente de novo.' : `O aparelho não deu a posição: ${e.message}`), { enableHighAccuracy: true, maximumAge: 10000, timeout: 60000 })
    try { travaTela.current = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* sem trava de tela */ }
    setGravando(true)
    await cofre?.anotarAcesso('gravacao', 'Gravação ligada'); if (cofre) atualizar(cofre)
  }

  function pararGravacao() {
    if (vigia.current != null) navigator.geolocation.clearWatch(vigia.current)
    vigia.current = null
    travaTela.current?.release().catch(() => {}); travaTela.current = null
    setGravando(false)
  }

  // ---------- G3: cálculo ----------
  const calc = useMemo(() => {
    if (!dados) return null
    const paradasBrutas = detectarParadas(dados.pontos)
    const { lugares, paradas } = agruparLugares(paradasBrutas, dados.lugares)
    const d = new Date(dia + 'T12:00:00')
    const ini = new Date(dia + 'T00:00:00').getTime()
    const semana = resumoPeriodo(dados.pontos, lugares, paradas, Date.now() - 7 * 86400000, Date.now() + 1)
    const doDia = resumoPeriodo(dados.pontos, lugares, paradas, ini, ini + 86400000)
    const atual = paradas.length ? paradas[paradas.length - 1].lugarId! : ''
    const previsao = atual ? preverProximo(paradas, atual).slice(0, 3) : []
    return { lugares, paradas, linha: linhaDoTempo(paradas, lugares, d), semana, doDia, atual, previsao }
  }, [dados, dia])

  const ultimo = dados?.pontos.length ? dados.pontos[dados.pontos.length - 1] : null

  const nomear = async (l: Lugar, nome: string) => {
    if (!cofre) return
    await cofre.nomearLugar({ ...l, nome }); atualizar(cofre)
  }

  // ---------- G4: câmera ----------
  const ligarCamera = async () => {
    setErro('')
    try {
      fluxo.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      if (video.current) { video.current.srcObject = fluxo.current; await video.current.play() }
      setCamLigada(true)
      await cofre?.anotarAcesso('camera', 'Câmera ligada (sensor de lugar)')
      setOcupado('Baixando o modelo da câmera (uma vez, cerca de 5 MB)…')
      await lerCena()
      timerCam.current = window.setInterval(lerCena, 30000)
    } catch (e) { falhar(e); desligarCamera() } finally { setOcupado('') }
  }
  function desligarCamera() {
    if (timerCam.current) window.clearInterval(timerCam.current)
    timerCam.current = null
    fluxo.current?.getTracks().forEach(t => t.stop()); fluxo.current = null
    setCamLigada(false)
  }
  const lerCena = async () => {
    if (!video.current || !cofre) return
    try {
      const l = await lerQuadro(video.current)
      const c: CenaCamera = { t: Date.now(), lat: ultimo?.lat, lon: ultimo?.lon, ...l }
      await cofre.gravarCena(c); atualizar(cofre); setUltimaCena(c)
    } catch (e) { falhar(e) }
  }

  // ---------- G5, G6, C15 ----------
  const pos = ultimo ? { lat: ultimo.lat, lon: ultimo.lon } : null
  const procurarCenas = async (colecao: 'sentinel-2-l2a' | 'landsat-c2-l2') => {
    if (!pos) return setErro('Grave ao menos uma posição antes, para o satélite saber onde olhar.')
    setErro(''); setOcupado('Procurando cenas de satélite sobre você…')
    try { setCenas(await buscarCenas(pos.lat, pos.lon, colecao)) } catch (e) { falhar(e) } finally { setOcupado('') }
  }
  const verCena = async (c: Cena, ndvi: boolean) => {
    setErro('')
    try { setCenaTiles(ndvi ? [tileNdvi(c)] : await tilesDaCena(c)); setAba('mapa') } catch (e) { falhar(e) }
  }
  const verMunicipio = async () => {
    if (!pos) return setErro('Grave ao menos uma posição antes.')
    setErro(''); setOcupado('Consultando IBGE e GDELT…')
    try {
      const m = await municipioDe(pos.lat, pos.lon)
      setMunicipio(m)
      await cofre?.anotarAcesso('consulta-externa', `Município ${m.nome}/${m.uf} (posição arredondada a ~1 km enviada ao OpenStreetMap)`)
      try { setNoticias(await noticiasGdelt(m.nome, m.uf)) } catch (e) { setNoticias([]); falhar(e) }
    } catch (e) { falhar(e) } finally { setOcupado('') }
  }

  // ---------- Grafo e dados ----------
  const grafo = useMemo(() => {
    if (!dados || !calc) return null
    const municipios = municipio && calc.lugares.length ? calc.lugares.filter(l => distancia(l, pos ?? l) < 30000).map(l => ({ lugarId: l.id, m: municipio })) : []
    return montarGrafo({
      titular: dados.consentimento?.titular ?? 'Titular', lugares: calc.lugares, paradas: calc.paradas, municipios,
      noticias: municipio ? [{ codigo: municipio.codigo, n: noticias }] : [], cenas: dados.cenas,
      previsoes: calc.previsao.map(p => ({ de: calc.atual, para: p.lugarId, chance: p.chance })),
    })
  }, [dados, calc, municipio, noticias, pos])

  const exportar = async (tipo: 'geojson' | 'csv' | 'grafo') => {
    if (!dados || !calc || !cofre) return
    const carimbo = hojeISO()
    if (tipo === 'geojson') baixar(`theye-geo-${carimbo}.geojson`, JSON.stringify(geojson(dados.pontos, calc.lugares, calc.paradas), null, 1), 'application/geo+json')
    if (tipo === 'csv') baixar(`theye-geo-pontos-${carimbo}.csv`, '﻿' + csvPontos(dados.pontos), 'text/csv')
    if (tipo === 'grafo') baixar(`theye-geo-grafo-${carimbo}.json`, JSON.stringify({ consentimento: dados.consentimento, ...grafo }, null, 1), 'application/json')
    await cofre.anotarAcesso('exportacao', tipo); atualizar(cofre)
  }
  const apagar = async (f: { dia?: string; lugar?: Lugar } | 'tudo') => {
    if (!cofre) return
    if (f === 'tudo') {
      if (!window.confirm('Apagar TUDO deste aparelho, sem volta?')) return
      pararGravacao(); desligarCamera(); await cofre.apagar('tudo'); setCofre(null); setDados(null); setMsg('Tudo apagado. Nada ficou neste aparelho.')
      return
    }
    await cofre.apagar(f.dia ? { dia: f.dia } : { perto: { lat: f.lugar!.lat, lon: f.lugar!.lon, raio: 150 } }, distancia); atualizar(cofre)
    setMsg('Apagado. A corrente de hash foi refeita sobre o que restou.')
  }
  const conferir = async () => {
    if (!dados) return
    const [p, c, a] = await Promise.all([conferirCorrente(dados.pontos), conferirCorrente(dados.cenas), conferirCorrente(dados.acessos)])
    setCorrente([['pontos', p], ['cenas', c], ['acessos', a]].map(([n, r]) => { const x = r as { ok: boolean; quebraEm: number | null }; return `${n}: ${x.ok ? 'íntegra' : `quebrada no item ${x.quebraEm! + 1}`}` }).join(' · '))
  }

  // ---------- Telas ----------
  if (!cofre || !dados) {
    return (
      <Layout title="Geolocalização">
        <div className="max-w-xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold text-navy">Geolocalização: MVP em você mesmo</h1>
          {msg && <p className="text-sm text-regular">{msg}</p>}
          <div className={cartao}>
            <p className="text-sm text-grafite mb-3">Seus dados ficam cifrados <b>só neste aparelho</b>. A senha abaixo gera a chave; sem ela ninguém lê, nem a plataforma. {cofreExiste() ? 'Digite a senha que você criou.' : 'É a primeira vez: a senha que você digitar agora vira a chave. Guarde-a.'}</p>
            <label className="text-sm text-grafite" htmlFor="senha-geo">Senha do cofre</label>
            <input id="senha-geo" type="password" autoComplete="current-password" className={campo} value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && senha.length >= 8 && abrir()} />
            <p className="text-xs text-grafite-claro mt-1">Mínimo de 8 caracteres.</p>
            <button className={botaoCheio + ' mt-3'} disabled={senha.length < 8 || !!ocupado} onClick={abrir} title="Abrir ou criar o cofre cifrado neste aparelho"><Lock className="inline w-4 h-4 mr-1" />{ocupado || (cofreExiste() ? 'Abrir' : 'Criar cofre')}</button>
            {erro && <p className="text-sm text-critico mt-2">{erro}</p>}
          </div>
        </div>
      </Layout>
    )
  }

  if (!dados.consentimento) {
    return (
      <Layout title="Geolocalização">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold text-navy">Antes de gravar: o termo</h1>
          <div className={cartao}>
            <pre className="whitespace-pre-wrap text-sm text-grafite font-sans">{TERMO}</pre>
            <p className="text-xs text-grafite-claro mt-2">Versão {VERSAO_TERMO}. Ao aceitar, a data e o hash do termo entram no registro.</p>
            <label className="text-sm text-grafite mt-3 block" htmlFor="titular-geo">Seu nome (titular)</label>
            <input id="titular-geo" className={campo} value={titular} onChange={e => setTitular(e.target.value)} />
            <button className={botaoCheio + ' mt-3'} disabled={!titular.trim()} onClick={consentir} title="Registra o seu consentimento com data e com um código que prova que o registro não foi alterado (hash)"><ShieldCheck className="inline w-4 h-4 mr-1" />Li e aceito</button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Geolocalização">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-navy">Geolocalização e geomapeamento</h1>
          <div className="flex items-center gap-2 text-xs">
            {gravando && <span className="px-2 py-1 bg-regularFundo text-regular" title="A posição está sendo gravada">● gravando posição</span>}
            {camLigada && <span className="px-2 py-1 bg-criticoFundo text-critico" title="A câmera está ligada">● câmera ligada</span>}
          </div>
        </div>
        {erro && <p className="text-sm text-critico" role="alert">{erro}</p>}
        {msg && <p className="text-sm text-regular">{msg}</p>}
        {ocupado && <p className="text-sm text-grafite">{ocupado}</p>}

        <Suspense fallback={<div className="h-[55vh] bg-pergaminho" />}>
          <MapaGeo pontos={dados.pontos} lugares={calc?.lugares ?? []} camadas={camadas} ligadas={ligadas} cenaTiles={cenaTiles} malha={municipio?.malha ?? null} centro={pos} />
        </Suspense>
        <div className="flex flex-wrap gap-2 text-xs">
          {camadas.map(c => (
            <label key={c.id} className="flex items-center gap-1 px-2 py-1 border border-navy/20 bg-white cursor-pointer" title={c.dica}>
              <input type="checkbox" checked={ligadas.includes(c.id)} onChange={e => setLigadas(l => e.target.checked ? [...l, c.id] : l.filter(x => x !== c.id))} />{c.nome}
            </label>
          ))}
          {cenaTiles && <button className="px-2 py-1 border border-navy/20" onClick={() => setCenaTiles(null)} title="Tirar do mapa a cena de satélite escolhida">Tirar cena do mapa</button>}
        </div>

        <nav className="flex flex-wrap gap-1 border-b border-navy/10" role="tablist">
          {ABAS.map(a => <button key={a.id} role="tab" aria-selected={aba === a.id} title={a.dica} onClick={() => setAba(a.id)} className={`px-3 min-h-[40px] text-sm ${aba === a.id ? 'bg-navy text-white' : 'text-navy'}`}>{a.nome}</button>)}
        </nav>

        {aba === 'onde' && (
          <div className={cartao + ' space-y-3'}>
            <div className="flex flex-wrap gap-2 items-end">
              {!gravando
                ? <button className={botaoCheio + ' text-base px-6'} onClick={iniciarGravacao} title="Começar a gravar a posição deste aparelho"><Play className="inline w-4 h-4 mr-1" />Gravar minha posição</button>
                : <button className="min-h-[56px] px-8 text-base bg-critico text-white" onClick={pararGravacao} title="Pausar a gravação na hora"><Pause className="inline w-5 h-5 mr-1" />Pausar</button>}
              <label className="text-sm text-grafite" title="De quanto em quanto tempo um ponto é gravado. Intervalo menor gasta mais bateria.">De quanto em quanto tempo
                <select className={campo} value={dados.intervaloSeg} onChange={async e => { cofre.dados.intervaloSeg = Number(e.target.value); await cofre.salvar(); atualizar(cofre) }}>
                  {[15, 30, 60, 120, 300, 600].map(s => <option key={s} value={s}>{s < 60 ? `${s} segundos` : `${s / 60} min`}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-grafite-claro">Limite honesto: o navegador do celular para de gravar quando a tela apaga ou o app vai para o fundo. Enquanto grava, a plataforma pede para a tela ficar acesa. Para gravar o dia inteiro com tela apagada, o próximo passo é um app nativo (G8). {bateria != null && `Bateria agora: ${Math.round(bateria * 100)}%.`}</p>
            {ultimo && <p className="text-sm text-navy"><MapPin className="inline w-4 h-4" /> Última posição: {ultimo.lat.toFixed(5)}, {ultimo.lon.toFixed(5)} · margem de erro ±{Math.round(ultimo.precisao)} m · {new Date(ultimo.t).toLocaleString('pt-BR')}</p>}
            <h2 className="font-semibold text-navy pt-2">Tudo o que foi gravado ({dados.pontos.length} pontos)</h2>
            <div className="max-h-72 overflow-auto text-xs">
              <table className="w-full"><thead><tr className="text-left text-grafite"><th>Horário</th><th>Posição</th><th title="Quanto a posição pode estar errada, em metros">Erro</th><th>Velocidade</th></tr></thead>
                <tbody>{[...dados.pontos].reverse().slice(0, 300).map(p => <tr key={p.hash} className="border-t border-navy/5"><td>{new Date(p.t).toLocaleString('pt-BR')}</td><td>{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</td><td>±{Math.round(p.precisao)} m</td><td>{p.velocidade != null ? `${(p.velocidade * 3.6).toFixed(0)} km/h` : '—'}</td></tr>)}</tbody>
              </table>
              {dados.pontos.length > 300 && <p className="text-grafite-claro mt-1">Mostrando os 300 mais recentes. A exportação traz todos.</p>}
            </div>
          </div>
        )}

        {aba === 'mapa' && calc && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={cartao}>
              <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-navy">Linha do tempo</h2><input type="date" title="Escolha o dia que a linha do tempo vai mostrar" className="border border-navy/20 px-2 min-h-[40px] text-sm" value={dia} onChange={e => setDia(e.target.value)} /></div>
              <p className="text-xs text-grafite-claro mb-2">{calc.doDia.km.toFixed(1)} km no dia · {calc.doDia.pontos} pontos</p>
              {calc.linha.length === 0 ? <p className="text-sm text-grafite">Nenhuma parada de 5 minutos ou mais neste dia.</p> :
                <ol className="text-sm space-y-1">{calc.linha.map((x, i) => <li key={i} className={x.tipo === 'parado' ? 'text-navy' : 'text-grafite-claro'}>{hora(x.de)}–{hora(x.ate)} · {x.texto}</li>)}</ol>}
            </div>
            <div className={cartao}>
              <h2 className="font-semibold text-navy">Últimos 7 dias</h2>
              <p className="text-xs text-grafite-claro mb-2">{calc.semana.km.toFixed(1)} km · {calc.semana.dias} dias com dados</p>
              <ul className="text-sm space-y-1">{calc.semana.porLugar.map(x => <li key={x.lugar.id}>{x.lugar.nome || 'Lugar sem nome'}: {fmtMin(x.minutos)}</li>)}</ul>
            </div>
            <div className={cartao + ' md:col-span-2'}>
              <h2 className="font-semibold text-navy">Lugares frequentes</h2>
              <p className="text-xs text-grafite-claro mb-2">Paradas de 5 minutos ou mais num raio de 100 m viram um lugar. Dê um nome (casa, escritório, fórum).</p>
              {calc.lugares.length === 0 ? <p className="text-sm text-grafite">Ainda não há paradas. Grave por algumas horas.</p> :
                <ul className="space-y-2">{calc.lugares.map(l => <LinhaLugar key={l.id} l={l} onNome={n => nomear(l, n)} />)}</ul>}
            </div>
          </div>
        )}

        {aba === 'camera' && (
          <div className={cartao + ' space-y-3'}>
            <p className="text-sm text-grafite">A câmera diz <b>onde</b> você está: tipo de ambiente, se há alguém na cena (sem saber quem) e placas ou códigos impressos. Roda neste aparelho; a imagem não é guardada nem enviada, só o resultado. Não há leitura de rosto, emoção, mentira ou perfil.</p>
            <div className="flex gap-2">
              {!camLigada ? <button className={botaoCheio} onClick={ligarCamera} title="Ligar a câmera traseira como sensor de lugar"><Camera className="inline w-4 h-4 mr-1" />Ligar câmera</button>
                : <><button className="min-h-[44px] px-4 text-sm bg-critico text-white" onClick={desligarCamera} title="Desligar a câmera na hora">Desligar câmera</button><button className={botao} onClick={lerCena} title="Ler o ambiente agora">Ler agora</button></>}
            </div>
            <div className={camLigada ? 'relative max-w-md' : 'hidden'}>
              <video ref={video} playsInline muted className="w-full border-4 border-critico" />
              <span className="absolute top-2 left-2 bg-critico text-white text-xs px-2 py-1">● CÂMERA LIGADA</span>
            </div>
            {ultimaCena && <p className="text-sm text-navy">Agora: <b>{ultimaCena.ambiente}</b> · {ultimaCena.pessoas} pessoa(s) na cena · {ultimaCena.objetos.join(', ') || 'sem objetos de referência'}{ultimaCena.codigos.length ? ` · códigos: ${ultimaCena.codigos.join(', ')}` : ''}</p>}
            <h2 className="font-semibold text-navy pt-2">Leituras gravadas ({dados.cenas.length})</h2>
            <ul className="text-xs max-h-60 overflow-auto">{[...dados.cenas].reverse().slice(0, 100).map(c => <li key={c.hash} className="border-t border-navy/5 py-1">{new Date(c.t).toLocaleString('pt-BR')} · {c.ambiente} · {c.pessoas} pessoa(s) · {c.objetos.join(', ')}</li>)}</ul>
          </div>
        )}

        {aba === 'satelite' && (
          <div className="space-y-4">
            <div className={cartao}>
              <h2 className="font-semibold text-navy"><Satellite className="inline w-4 h-4 mr-1" />Cenas de satélite sobre você</h2>
              <div className="flex flex-wrap gap-2 my-2">
                <button className={botao} onClick={() => procurarCenas('sentinel-2-l2a')} title="Cenas do Sentinel-2 dos últimos 60 dias sobre a sua última posição">Sentinel-2 (10 m)</button>
                <button className={botao} onClick={() => procurarCenas('landsat-c2-l2')} title="Cenas do Landsat 8 e 9 dos últimos 60 dias">Landsat (30 m)</button>
              </div>
              {cenas.length > 0 && <table className="w-full text-xs"><thead><tr className="text-left text-grafite"><th>Data</th><th>Satélite</th><th title="Percentual da cena coberto por nuvem">Nuvem</th><th /></tr></thead>
                <tbody>{cenas.map(c => <tr key={c.id} className="border-t border-navy/5"><td>{c.data}</td><td>{c.satelite}</td><td>{c.nuvem ?? '—'}%</td><td className="text-right space-x-1">
                  <button className="underline" onClick={() => verCena(c, false)} title="Mostrar a cena em cor real no mapa">cor real</button>
                  {c.colecao === 'sentinel-2-l2a' && <button className="underline" onClick={() => verCena(c, true)} title="Índice de vegetação: verde é mata ou plantação, vermelho é solo exposto ou cidade">vegetação (NDVI)</button>}
                </td></tr>)}</tbody></table>}
            </div>
            <div className={cartao}>
              <h2 className="font-semibold text-navy">Município onde você está</h2>
              <button className={botao + ' my-2'} onClick={verMunicipio} title="Consulta IBGE (limite e população) e GDELT (notícias). Sai do aparelho só a posição arredondada a ~1 km.">Ver ficha do município</button>
              {municipio && <div className="text-sm space-y-1">
                <p><b>{municipio.nome}/{municipio.uf}</b> · código IBGE {municipio.codigo} · população (Censo 2022): {municipio.populacao2022?.toLocaleString('pt-BR') ?? 'não veio'}</p>
                <p className="text-xs text-grafite-claro">Fontes: {municipio.fontes.join('; ')}</p>
                <h3 className="font-semibold text-navy pt-2">Notícias dos últimos 7 dias (GDELT)</h3>
                {noticias.length === 0 ? <p className="text-grafite">Nenhuma notícia encontrada.</p> : <ul className="text-xs space-y-1">{noticias.slice(0, 20).map(n => <li key={n.url}><a className="underline" href={n.url} target="_blank" rel="noreferrer noopener" title="Abre a notícia no site de origem, numa aba nova">{n.titulo}</a> · {n.fonte} · {n.data}</li>)}</ul>}
              </div>}
            </div>
            <div className={cartao}>
              <h2 className="font-semibold text-navy">Satélites abertos (inventário G5)</h2>
              <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="text-left text-grafite"><th>Satélite</th><th>O que mede</th><th>Resolução</th><th>Passa a cada</th><th>Licença</th><th>No mapa</th></tr></thead>
                <tbody>{SATELITES.map(s => <tr key={s.nome} className="border-t border-navy/5 align-top" title={s.catalogo}><td>{s.nome}</td><td>{s.mede}</td><td>{s.resolucao}</td><td>{s.revisita}</td><td>{s.licenca}</td><td>{s.noMapa ? 'sim' : 'ainda não'}</td></tr>)}</tbody></table></div>
              <h3 className="font-semibold text-navy pt-3">Camadas públicas que ainda faltam (G6)</h3>
              <ul className="text-xs list-disc pl-5">{CAMADAS_PENDENTES.map(c => <li key={c.nome}>{c.nome}: {c.caminho}</li>)}</ul>
            </div>
          </div>
        )}

        {aba === 'grafo' && grafo && calc && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={cartao}>
              <h2 className="font-semibold text-navy"><Network className="inline w-4 h-4 mr-1" />Grafo</h2>
              <p className="text-sm text-grafite">{grafo.nos.length} nós e {grafo.arestas.length} ligações.</p>
              <ul className="text-xs mt-2">{Object.entries(grafo.nos.reduce<Record<string, number>>((a, n) => ({ ...a, [n.tipo]: (a[n.tipo] ?? 0) + 1 }), {})).map(([t, n]) => <li key={t}>{t}: {n}</li>)}</ul>
              <div className="max-h-60 overflow-auto text-xs mt-2">{grafo.arestas.slice(0, 80).map((a, i) => <div key={i} className="border-t border-navy/5 py-0.5" title={a.fonte}>{rotulo(grafo.nos, a.de)} <b>{a.tipo}</b> {rotulo(grafo.nos, a.para)}{a.peso != null ? ` (${a.peso})` : ''}</div>)}</div>
            </div>
            <div className={cartao}>
              <h2 className="font-semibold text-navy">Para onde você deve ir em seguida</h2>
              {calc.previsao.length === 0 ? <p className="text-sm text-grafite">Precisa de mais paradas para prever. Com uma semana de dados a previsão começa a fazer sentido.</p> :
                <ul className="text-sm space-y-1">{calc.previsao.map(p => { const l = calc.lugares.find(x => x.id === p.lugarId); return <li key={p.lugarId}>{l?.nome || 'Lugar sem nome'}: {Math.round(p.chance * 100)}% <span className="text-xs text-grafite-claro">(visto {p.vezes} vez(es))</span></li> })}</ul>}
              <p className="text-xs text-grafite-claro mt-2">Como é feita: conta quantas vezes, saindo do lugar atual, você foi para cada outro (cadeia de Markov com suavização). Poucos dados = chance pouco confiável; o número de vezes vistas está ao lado para isso ficar claro.</p>
            </div>
          </div>
        )}

        {aba === 'dados' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={cartao + ' space-y-2'}>
              <h2 className="font-semibold text-navy"><Download className="inline w-4 h-4 mr-1" />Exportar (arquivo aberto)</h2>
              <div className="flex flex-wrap gap-2">
                <button className={botao} onClick={() => exportar('geojson')} title="Mapa inteiro: trajeto, pontos, paradas e lugares">GeoJSON</button>
                <button className={botao} onClick={() => exportar('csv')} title="Todos os pontos em planilha">CSV</button>
                <button className={botao} onClick={() => exportar('grafo')} title="Nós e ligações do grafo, com a fonte de cada ligação">Ligações do mapa (arquivo JSON)</button>
              </div>
              <button className={botao} onClick={conferir} title="Refaz a conta do código de conferência de cada registro (hash) e diz se algo foi mexido">Conferir o lastro (corrente de códigos)</button>
              {corrente && <p className="text-xs text-navy">{corrente}</p>}
            </div>
            <div className={cartao + ' space-y-2'}>
              <h2 className="font-semibold text-navy"><Trash2 className="inline w-4 h-4 mr-1" />Apagar</h2>
              <div className="flex gap-2 items-center"><input type="date" title="Escolha o dia que vai ser apagado" className="border border-navy/20 px-2 min-h-[44px] text-sm" value={dia} onChange={e => setDia(e.target.value)} /><button className={botao} onClick={() => apagar({ dia })} title="Apagar pontos e leituras de câmera deste dia">Apagar o dia</button></div>
              {calc && calc.lugares.length > 0 && <div className="flex flex-wrap gap-1">{calc.lugares.slice(0, 8).map(l => <button key={l.id} className="px-2 py-1 border border-navy/20 text-xs" onClick={() => apagar({ lugar: l })} title="Apagar tudo num raio de 150 m deste lugar">Apagar “{l.nome || 'sem nome'}”</button>)}</div>}
              <div className="flex flex-wrap gap-2 pt-2">
                <button className={botao} onClick={async () => { pararGravacao(); desligarCamera(); await cofre.revogar(); atualizar(cofre) }} title="Retirar o consentimento: para de gravar e volta ao termo">Revogar consentimento</button>
                <button className="min-h-[44px] px-4 text-sm bg-critico text-white" onClick={() => apagar('tudo')} title="Apaga o cofre inteiro deste aparelho, sem volta">Apagar tudo</button>
              </div>
            </div>
            <div className={cartao + ' md:col-span-2'}>
              <h2 className="font-semibold text-navy">Registro de acesso ({dados.acessos.length})</h2>
              <ul className="text-xs max-h-60 overflow-auto">{[...dados.acessos].reverse().map(a => <li key={a.hash} className="border-t border-navy/5 py-0.5" title={a.hash}>{new Date(a.t).toLocaleString('pt-BR')} · {a.acao}{a.detalhe ? ` · ${a.detalhe}` : ''}</li>)}</ul>
              <p className="text-xs text-grafite-claro mt-2">Termo aceito por {dados.consentimento.titular} em {new Date(dados.consentimento.aceitoEm).toLocaleString('pt-BR')} · hash {dados.consentimento.hash.slice(0, 16)}…</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function rotulo(nos: { id: string; rotulo: string }[], id: string) {
  const r = nos.find(n => n.id === id)?.rotulo ?? id
  return r.length > 50 ? r.slice(0, 50) + '…' : r
}

function LinhaLugar({ l, onNome }: { l: Lugar; onNome: (n: string) => void }) {
  const [nome, setNome] = useState(l.nome)
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <input className="border border-navy/20 px-2 min-h-[40px] w-44" placeholder="Nome (ex.: casa)" value={nome} onChange={e => setNome(e.target.value)} onBlur={() => nome !== l.nome && onNome(nome)} title="Dê um nome a este lugar" />
      <span className="text-grafite">{l.visitas} visita(s) · {fmtMin(l.minutos)}</span>
    </li>
  )
}
