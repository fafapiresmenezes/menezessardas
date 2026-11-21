// Tela do app de inspeção de obra: funciona sem internet, guarda no próprio aparelho.
import { useEffect, useMemo, useState } from 'react'
import { MODELOS_INSPECAO, novaInspecao, resumoInspecao, fecharInspecao, relatorioInspecao, inspecoesParaCSV, carregarInspecoes, salvarInspecoes, novoId, type Inspecao, type EstadoItem } from '@/lib/engenharia/inspecao'

const caixa = 'bg-white p-5 shadow-sm'
const botao = 'text-sm px-3 py-1 border border-navy/30 text-navy hover:bg-navy/5'
const armazem = () => { try { return window.localStorage } catch { return null } }

function baixar(nome: string, conteudo: string, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** reduz a foto para no máximo 1280 px e JPEG 0,7, para caber no aparelho */
function reduzirFoto(f: File): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader()
    r.onerror = () => erro(new Error('Não foi possível ler a foto.'))
    r.onload = () => {
      const img = new Image()
      img.onerror = () => ok(String(r.result))
      img.onload = () => {
        const esc = Math.min(1, 1280 / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc)
        const ctx = c.getContext('2d')
        if (!ctx) return ok(String(r.result))
        ctx.drawImage(img, 0, 0, c.width, c.height)
        ok(c.toDataURL('image/jpeg', 0.7))
      }
      img.src = String(r.result)
    }
    r.readAsDataURL(f)
  })
}

function localAtual(): Promise<GeolocationPosition | null> {
  return new Promise(ok => {
    if (!('geolocation' in navigator)) return ok(null)
    navigator.geolocation.getCurrentPosition(p => ok(p), () => ok(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
  })
}

export default function InspecaoObra() {
  const [lista, setLista] = useState<Inspecao[]>(() => carregarInspecoes(armazem()))
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [form, setForm] = useState({ modelo: MODELOS_INSPECAO[0].id, obra: '', local: '', responsavel: '' })
  const [aviso, setAviso] = useState('')
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => {
    if (!salvarInspecoes(armazem(), lista)) setAviso('O aparelho ficou sem espaço para guardar. Baixe o relatório e apague inspeções antigas ou fotos.')
  }, [lista])

  const aberta = lista.find(i => i.id === abertaId) ?? null
  const mudar = (fn: (i: Inspecao) => Inspecao) => setLista(ls => ls.map(i => (i.id === abertaId ? { ...fn(i), atualizadaEm: new Date().toISOString() } : i)))
  const r = useMemo(() => (aberta ? resumoInspecao(aberta) : null), [aberta])

  const criar = () => {
    const i = novaInspecao(form.modelo, form)
    setLista(ls => [i, ...ls]); setAbertaId(i.id); setAviso('')
  }
  const addFoto = async (f: File | undefined) => {
    if (!f || !aberta) return
    setAviso('Lendo a foto e o local…')
    const [dataUrl, pos] = await Promise.all([reduzirFoto(f), localAtual()])
    mudar(i => ({ ...i, fotos: [...i.fotos, { id: novoId('f'), dataUrl, quando: new Date().toISOString(), lat: pos?.coords.latitude, lon: pos?.coords.longitude, precisaoM: pos?.coords.accuracy, legenda: '' }] }))
    setAviso(pos ? '' : 'Foto guardada sem localização (o aparelho não liberou o local).')
  }

  return (
    <div className="space-y-4">
      <div className={`${caixa} text-sm flex flex-wrap justify-between gap-2`}>
        <p>Funciona sem internet: tudo fica guardado neste aparelho. Use no celular, na obra; as fotos levam hora e local.</p>
        <span className={`text-xs px-2 py-0.5 ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`} data-testid="inspecao-rede">{online ? 'com internet' : 'sem internet: guardando no aparelho'}</span>
      </div>
      {aviso && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3" role="status">{aviso}</p>}

      {!aberta && (
        <>
          <form className={`${caixa} grid sm:grid-cols-4 gap-3 text-sm`} onSubmit={e => { e.preventDefault(); criar() }} aria-label="Nova inspeção">
            <label className="flex flex-col sm:col-span-4">Serviço
              <select className="border border-navy/20 px-2 py-1" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} data-testid="inspecao-modelo">
                {MODELOS_INSPECAO.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.normas})</option>)}
              </select></label>
            <label className="flex flex-col">Obra<input className="border border-navy/20 px-2 py-1" value={form.obra} onChange={e => setForm({ ...form, obra: e.target.value })} /></label>
            <label className="flex flex-col">Local (pavimento, eixo)<input className="border border-navy/20 px-2 py-1" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} /></label>
            <label className="flex flex-col">Responsável<input className="border border-navy/20 px-2 py-1" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></label>
            <div className="flex items-end"><button type="submit" className="text-sm px-3 py-1.5 bg-navy text-white">Começar inspeção</button></div>
          </form>
          <div className={caixa}>
            <div className="flex justify-between items-center mb-2"><h4 className="text-navy font-medium">Inspeções guardadas neste aparelho ({lista.length})</h4>
              {lista.length > 0 && <button type="button" className={botao} onClick={() => baixar('inspecoes.csv', inspecoesParaCSV(lista), 'text/csv')}>Baixar todas (.csv)</button>}</div>
            {lista.length === 0 ? <p className="text-sm text-grafite-claro">Nenhuma ainda.</p> : (
              <ul className="text-sm divide-y divide-navy/10" data-testid="inspecao-lista">{lista.map(i => { const s = resumoInspecao(i); return (
                <li key={i.id} className="py-2 flex flex-wrap justify-between gap-2">
                  <span><strong>{i.servico}</strong> · {i.obra || 'sem obra'} · {i.local || 'sem local'} · {i.criadaEm.slice(0, 10)} · {s.nc} NC · {i.fotos.length} foto(s) · {i.fechada ? 'fechada' : 'em aberto'}</span>
                  <span className="flex gap-2"><button type="button" className={botao} onClick={() => setAbertaId(i.id)}>Abrir</button>
                    <button type="button" className="text-xs text-red-700" onClick={() => { if (window.confirm('Apagar esta inspeção deste aparelho?')) setLista(ls => ls.filter(x => x.id !== i.id)) }}>apagar</button></span>
                </li>) })}</ul>
            )}
          </div>
        </>
      )}

      {aberta && r && (
        <div className="space-y-4">
          <div className={`${caixa} flex flex-wrap justify-between gap-2 text-sm`}>
            <div><h3 className="text-navy font-medium">{aberta.servico}</h3><p className="text-grafite-claro">{aberta.obra || 'sem obra'} · {aberta.local || 'sem local'} · {aberta.responsavel || 'sem responsável'}</p></div>
            <div data-testid="inspecao-resumo">{r.ok} ok · <span className={r.nc ? 'text-red-700 font-medium' : ''}>{r.nc} NC</span> · {r.na} n/a · {r.pendentes} pendente(s){r.conformidadePct !== null && <> · conformidade {r.conformidadePct.toFixed(0)}%</>}</div>
          </div>
          <ol className={`${caixa} space-y-3 text-sm`}>
            {aberta.itens.map((x, k) => (
              <li key={x.id} className="border-b border-navy/10 pb-2">
                <div className="flex flex-wrap justify-between gap-2"><span>{k + 1}. {x.texto}</span>
                  <span className="flex gap-1" role="radiogroup" aria-label={`Estado do item ${k + 1}`}>
                    {(['ok', 'nc', 'na'] as EstadoItem[]).map(e => (
                      <button key={e} type="button" role="radio" aria-checked={x.estado === e} disabled={aberta.fechada}
                        className={`text-xs px-2 py-1 border ${x.estado === e ? (e === 'nc' ? 'bg-red-700 text-white border-red-700' : 'bg-navy text-white border-navy') : 'border-navy/30'}`}
                        onClick={() => mudar(i => ({ ...i, itens: i.itens.map(y => (y.id === x.id ? { ...y, estado: y.estado === e ? null : e } : y)) }))}>{e === 'ok' ? 'Conforme' : e === 'nc' ? 'Não conforme' : 'N/A'}</button>
                    ))}
                  </span></div>
                {(x.estado === 'nc' || x.obs) && <input aria-label={`Observação do item ${k + 1}`} disabled={aberta.fechada} placeholder={x.estado === 'nc' ? 'Descreva a não conformidade (obrigatório)' : 'Observação'} className={`mt-1 w-full border px-2 py-1 ${x.estado === 'nc' && !x.obs ? 'border-red-400' : 'border-navy/20'}`} value={x.obs} onChange={e => mudar(i => ({ ...i, itens: i.itens.map(y => (y.id === x.id ? { ...y, obs: e.target.value } : y)) }))} />}
              </li>
            ))}
          </ol>
          <div className={`${caixa} space-y-2`}>
            <div className="flex flex-wrap gap-2 items-center"><h4 className="text-navy font-medium mr-2">Fotos ({aberta.fotos.length})</h4>
              {!aberta.fechada && <label className={`${botao} cursor-pointer`}>Tirar ou escolher foto<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { addFoto(e.target.files?.[0]); e.target.value = '' }} /></label>}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{aberta.fotos.map((f, k) => (
              <figure key={f.id} className="text-xs">
                <img src={f.dataUrl} alt={`Foto ${k + 1} da inspeção`} className="w-full h-28 object-cover border border-navy/10" />
                <figcaption className="text-grafite-claro">{f.quando.slice(0, 16).replace('T', ' ')}{f.lat !== undefined ? ` · ${f.lat.toFixed(5)}, ${f.lon!.toFixed(5)}` : ' · sem local'}</figcaption>
                <input aria-label={`Legenda da foto ${k + 1}`} disabled={aberta.fechada} className="w-full border border-navy/10 px-1" placeholder="legenda" value={f.legenda} onChange={e => mudar(i => ({ ...i, fotos: i.fotos.map(y => (y.id === f.id ? { ...y, legenda: e.target.value } : y)) }))} />
              </figure>))}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={botao} onClick={() => setAbertaId(null)}>Voltar à lista</button>
            {!aberta.fechada && <button type="button" className="text-sm px-3 py-1 bg-navy text-white disabled:opacity-50" disabled={!r.podeFechar} title={r.podeFechar ? '' : 'Avalie todos os itens e descreva cada não conformidade'}
              onClick={() => { try { const f = fecharInspecao(aberta); setLista(ls => ls.map(i => (i.id === f.id ? f : i))); setAviso('') } catch (e) { setAviso((e as Error).message) } }}>Fechar inspeção</button>}
            <button type="button" className={botao} onClick={() => baixar(`inspecao-${aberta.criadaEm.slice(0, 10)}.txt`, relatorioInspecao(aberta))}>Baixar relatório (.txt)</button>
          </div>
        </div>
      )}
      <p className="text-xs text-grafite-claro">Enviar as inspeções para o servidor da empresa (para o escritório ver na hora) entra quando a separação por empresa estiver ligada nesta frente; até lá, o relatório e a planilha saem por download.</p>
    </div>
  )
}
