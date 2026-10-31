import { useCallback, useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { Cloud, Download, Folder, FolderPlus, History, Lock, Trash2, Upload } from 'lucide-react'

// Nuvem do escritório: arquivos no armazenamento privado do Supabase (bucket "nuvem").
// "escritorio/" é compartilhada com a equipe liberada; "pessoal/<id>/" só o dono vê (regras no banco).
// Versões (Passo 15): ao enviar um arquivo com o mesmo nome, a versão anterior vai para
// "<pasta>/.versoes/<nome>/<data-hora>"; guardamos as 5 últimas e dá para restaurar qualquer uma.
const MAX_VERSOES = 5
type Item = { name: string; id: string | null; metadata: { size?: number } | null; updated_at?: string }

export default function NuvemPage() {
  const [area, setArea] = useState<'escritorio' | 'pessoal'>('escritorio')
  const [uid, setUid] = useState('')
  const [sub, setSub] = useState('')
  const [itens, setItens] = useState<Item[]>([])
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [versoesDe, setVersoesDe] = useState<string | null>(null)
  const [versoes, setVersoes] = useState<Item[]>([])
  const base = area === 'escritorio' ? 'escritorio' : `pessoal/${uid}`
  const pasta = sub ? `${base}/${sub}` : base

  useEffect(() => { supabase.auth.getUser().then(r => setUid(r.data.user?.id ?? '')) }, [])
  const carregar = useCallback(async () => {
    if (area === 'pessoal' && !uid) return
    const { data, error } = await supabase.storage.from('nuvem').list(pasta, { limit: 500, sortBy: { column: 'name', order: 'asc' } })
    if (error) setMsg(error.message)
    setItens((data ?? []).filter(i => i.name !== '.pasta' && i.name !== '.versoes') as Item[])
  }, [area, uid, pasta])
  useEffect(() => { carregar() }, [carregar])

  const listarVersoes = async (n: string) => {
    const { data } = await supabase.storage.from('nuvem').list(`${pasta}/.versoes/${n}`, { limit: 50, sortBy: { column: 'name', order: 'desc' } })
    return ((data ?? []).filter(v => v.id !== null) as Item[])
  }
  // Guarda a versão atual do arquivo em .versoes e mantém só as MAX_VERSOES mais recentes.
  const arquivarVersao = async (n: string) => {
    const atual = itens.find(i => i.name === n && i.id !== null)
    if (!atual) return
    const carimbo = new Date().toISOString().replace(/[:.]/g, '-')
    const { error } = await supabase.storage.from('nuvem').move(`${pasta}/${n}`, `${pasta}/.versoes/${n}/${carimbo}`)
    if (error) throw new Error(`não foi possível guardar a versão anterior: ${error.message}`)
    const todas = await listarVersoes(n)
    const sobras = todas.slice(MAX_VERSOES).map(v => `${pasta}/.versoes/${n}/${v.name}`)
    if (sobras.length) await supabase.storage.from('nuvem').remove(sobras)
  }
  const abrirVersoes = async (n: string) => {
    if (versoesDe === n) { setVersoesDe(null); return }
    setVersoes(await listarVersoes(n)); setVersoesDe(n)
  }
  const restaurar = async (n: string, versao: string) => {
    if (!confirm(`Restaurar a versão de ${fmtCarimbo(versao)} de ${n}? A versão atual fica guardada no histórico.`)) return
    setOcupado(true); setMsg('')
    try {
      await arquivarVersao(n)
      const { error } = await supabase.storage.from('nuvem').copy(`${pasta}/.versoes/${n}/${versao}`, `${pasta}/${n}`)
      if (error) throw new Error(error.message)
      setMsg(`Versão de ${fmtCarimbo(versao)} restaurada.`)
      await carregar(); setVersoes(await listarVersoes(n))
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
    setOcupado(false)
  }
  const fmtCarimbo = (c: string) => {
    const m = c.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/)
    if (!m) return c
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  const enviar = async (arqs: FileList | null) => {
    if (!arqs?.length) return
    setOcupado(true); setMsg('')
    for (const a of Array.from(arqs)) {
      const nome = a.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\- ]/g, '_')
      try {
        if (itens.some(i => i.name === nome && i.id !== null)) await arquivarVersao(nome)
      } catch (e) { setMsg(`${a.name}: ${e instanceof Error ? e.message : String(e)}`); continue }
      const { error } = await supabase.storage.from('nuvem').upload(`${pasta}/${nome}`, a, { upsert: false })
      if (error) setMsg(`${a.name}: ${error.message.includes('row-level') ? 'sem permissão para enviar aqui' : error.message}`)
    }
    setOcupado(false); setVersoesDe(null); carregar()
  }
  const baixar = async (n: string) => {
    const { data, error } = await supabase.storage.from('nuvem').createSignedUrl(`${pasta}/${n}`, 60, { download: n })
    if (error) return setMsg(error.message)
    window.location.href = data.signedUrl
  }
  const apagar = async (n: string) => {
    if (!confirm(`Apagar ${n}?`)) return
    const { data, error } = await supabase.storage.from('nuvem').remove([`${pasta}/${n}`])
    setMsg(error ? error.message : data?.length ? '' : 'Sem permissão para apagar.')
    carregar()
  }
  const novaPasta = async () => {
    const n = prompt('Nome da nova pasta')?.trim().replace(/[^\w\- ]/g, '_')
    if (!n) return
    const { error } = await supabase.storage.from('nuvem').upload(`${pasta}/${n}/.pasta`, new Blob(['']))
    if (error) setMsg(error.message)
    carregar()
  }
  const kb = (b?: number) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

  return (
    <Layout title="Nuvem do escritório">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Nuvem do escritório</p>
        <h2 className="font-serif text-3xl text-navy mt-1 flex items-center gap-3"><Cloud className="text-dourado" aria-hidden="true" /> Arquivos protegidos</h2>
        <p className="text-grafite mt-2 text-sm flex items-start gap-2"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Armazenamento privado no Brasil (São Paulo), criptografado em trânsito e em repouso. Cada download gera um link que expira em 60 segundos. A pasta Pessoal só você vê; a do Escritório, só a equipe liberada. Ao enviar um arquivo com o mesmo nome, a versão anterior fica guardada (últimas {MAX_VERSOES}) e pode ser restaurada.</p>
        <div className="flex gap-2 mt-6" role="tablist">
          {(['escritorio', 'pessoal'] as const).map(a => (
            <button key={a} role="tab" aria-selected={area === a} onClick={() => { setArea(a); setSub('') }}
              className={`min-h-[44px] px-5 text-sm uppercase tracking-wider border ${area === a ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}>{a === 'escritorio' ? 'Escritório' : 'Pessoal'}</button>
          ))}
        </div>
        <div className="bg-white border border-navy/10 mt-4 p-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <nav aria-label="Caminho" className="text-sm text-grafite">
              <button className="underline" onClick={() => setSub('')}>{area === 'escritorio' ? 'Escritório' : 'Pessoal'}</button>
              {sub.split('/').filter(Boolean).map((p, i, arr) => <span key={i}> / <button className="underline" onClick={() => setSub(arr.slice(0, i + 1).join('/'))}>{p}</button></span>)}
            </nav>
            <div className="flex gap-2">
              <button onClick={novaPasta} className="min-h-[44px] px-4 border border-navy/20 text-sm inline-flex items-center gap-2"><FolderPlus size={16} aria-hidden="true" />Nova pasta</button>
              <label className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center gap-2 cursor-pointer">
                <Upload size={16} aria-hidden="true" />{ocupado ? 'Enviando…' : 'Enviar arquivos'}
                <input data-testid="nuvem-enviar" type="file" multiple className="sr-only" onChange={e => enviar(e.target.files)} />
              </label>
            </div>
          </div>
          {msg && <p role="alert" className="text-sm text-red-700 mt-3">{msg}</p>}
          <ul className="mt-4 divide-y divide-navy/10" data-testid="nuvem-lista">
            {!itens.length && <li className="py-6 text-sm text-grafite">Pasta vazia. Arraste ou envie arquivos (até 50 MB cada).</li>}
            {itens.map(i => i.id === null ? (
              <li key={i.name} className="py-3"><button onClick={() => setSub(sub ? `${sub}/${i.name}` : i.name)} className="inline-flex items-center gap-2 text-navy font-medium"><Folder size={18} className="text-dourado" aria-hidden="true" />{i.name}</button></li>
            ) : (
              <li key={i.name} className="py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-navy break-all">{i.name} <span className="text-grafite text-xs ml-2">{kb(i.metadata?.size)}</span></span>
                <span className="flex gap-1 shrink-0">
                  <button onClick={() => baixar(i.name)} aria-label={`Baixar ${i.name}`} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/20"><Download size={16} /></button>
                  <button onClick={() => abrirVersoes(i.name)} aria-label={`Versões de ${i.name}`} aria-expanded={versoesDe === i.name} data-testid={`versoes-${i.name}`} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/20"><History size={16} /></button>
                  <button onClick={() => apagar(i.name)} aria-label={`Apagar ${i.name}`} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-navy/20"><Trash2 size={16} /></button>
                </span>
              </li>
            )).flatMap((el, idx) => {
              const i = itens[idx]
              if (!i || versoesDe !== i.name) return [el]
              return [el, (
                <li key={`${i.name}-versoes`} className="py-3 pl-6 bg-navy/[0.03]" data-testid="lista-versoes">
                  <p className="text-xs uppercase tracking-wider text-grafite">Versões anteriores de {i.name} (até {MAX_VERSOES} guardadas)</p>
                  {!versoes.length && <p className="text-sm text-grafite mt-1">Ainda não há versões anteriores. Elas aparecem quando você envia um arquivo com o mesmo nome.</p>}
                  <ul className="mt-1 space-y-1">
                    {versoes.map(v => (
                      <li key={v.name} className="text-sm flex items-center justify-between gap-3" data-testid="versao">
                        <span>{fmtCarimbo(v.name)} <span className="text-grafite text-xs ml-2">{kb(v.metadata?.size)}</span></span>
                        <button onClick={() => restaurar(i.name, v.name)} disabled={ocupado} className="min-h-[36px] px-3 text-xs border border-navy text-navy">Restaurar</button>
                      </li>
                    ))}
                  </ul>
                </li>
              )]
            })}
          </ul>
        </div>
      </div>
    </Layout>
  )
}
