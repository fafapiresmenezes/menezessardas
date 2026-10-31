import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { MonitorCheck, Loader2 } from 'lucide-react'
import { ROTAS_TELAS } from '@/data/rotas'

// Passo 53: abre cada tela da plataforma num quadro invisível (mesma sessão) e confere título, CSS e ausência de erro.
export type ResultadoTela = { rota: string; nome: string; ok: boolean; detalhe: string; ms: number }
const TEMPO_LIMITE = 12000

export async function testarTela(rota: string): Promise<{ ok: boolean; detalhe: string }> {
  return new Promise(resolve => {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;width:1200px;height:800px;left:-9999px;top:0;visibility:hidden'
    f.setAttribute('aria-hidden', 'true'); f.title = `teste ${rota}`
    const fim = (ok: boolean, detalhe: string) => { clearInterval(timer); clearTimeout(limite); f.remove(); resolve({ ok, detalhe }) }
    const ini = Date.now()
    const timer = setInterval(() => {
      try {
        const d = f.contentDocument; if (!d || !d.body) return
        const texto = d.body.innerText || ''
        const h = d.querySelector('h1')?.textContent?.trim() ?? ''
        const fonte = f.contentWindow ? f.contentWindow.getComputedStyle(d.body).fontFamily : ''
        if (/Carregando/.test(texto) && Date.now() - ini < TEMPO_LIMITE - 500) return
        if (!h) { if (Date.now() - ini < 4000) return; return fim(false, 'sem título (h1)') }
        if (!/Inter/.test(fonte)) return fim(false, 'CSS não carregou')
        const erro = texto.match(/(Não foi possível[^\n]{0,60}|Algo deu errado[^\n]{0,60}|\bundefined\b|\bNaN\b)/)
        if (erro) return fim(false, `texto de erro: ${erro[0]}`)
        if (Date.now() - ini < 1500) return
        fim(true, h.slice(0, 40))
      } catch (e) { fim(false, e instanceof Error ? e.message : 'erro') }
    }, 500)
    const limite = setTimeout(() => fim(false, 'não carregou em 12 s'), TEMPO_LIMITE)
    f.src = `${location.pathname}#${rota}`
    document.body.appendChild(f)
  })
}

export default function TesteTelas() {
  const [res, setRes] = useState<ResultadoTela[]>([])
  const [rodando, setRodando] = useState(false)
  // Passo 54: última auditoria WCAG (axe-core em todas as telas), gravada em configuracoes.wcag_ultima pelo roteiro E2E.
  const [wcag, setWcag] = useState<{ data: string; telas: number; serias: number; menores: number; detalhe: string[] } | null>(null)
  useEffect(() => { if (supabaseConfigurado) supabase.from('configuracoes').select('valor').eq('chave', 'wcag_ultima').maybeSingle().then(({ data }) => { try { if (data?.valor) setWcag(JSON.parse(data.valor)) } catch { /* sem auditoria */ } }) }, [])
  const rodar = async () => {
    setRodando(true); setRes([])
    for (const t of ROTAS_TELAS) {
      const ini = performance.now(); const r = await testarTela(t.rota)
      setRes(s => [...s, { ...t, ...r, ms: Math.round(performance.now() - ini) }])
    }
    setRodando(false)
  }
  const oks = res.filter(r => r.ok).length
  return (
    <section className="bg-white p-6 shadow-sm mt-4" aria-labelledby="t-telas" data-testid="teste-telas">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 id="t-telas" className="text-lg">Testar todas as telas</h2>
          <p className="text-sm text-grafite-claro">Abre as {ROTAS_TELAS.length} telas da plataforma uma a uma, aqui mesmo, e confere título, visual (CSS) e mensagens de erro. O mesmo roteiro roda no navegador de teste (E2E) a cada publicação.</p>
        </div>
        <button onClick={rodar} disabled={rodando} data-testid="testar-telas" className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm disabled:opacity-50">
          {rodando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MonitorCheck size={16} aria-hidden="true" />} {rodando ? `Testando ${res.length + 1} de ${ROTAS_TELAS.length}…` : 'Testar telas'}
        </button>
      </div>
      {wcag && (
        <p className="text-sm mb-3" data-testid="wcag-resumo">Acessibilidade (WCAG 2.2 AA, axe-core) em {new Date(wcag.data).toLocaleDateString('pt-BR')}: {wcag.telas} telas auditadas, <b>{wcag.serias} violação(ões) séria(s) ou crítica(s)</b>, {wcag.menores} menor(es).{wcag.detalhe.length ? ` Pendentes: ${wcag.detalhe.join('; ')}` : ' Nenhuma pendência.'}</p>
      )}
      {res.length > 0 && (
        <>
          <p className="text-sm mb-2" aria-live="polite" data-testid="telas-resumo">{oks} de {res.length} telas funcionando{!rodando && res.length === ROTAS_TELAS.length ? ' · concluído' : ''}</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 text-sm">
            {res.map(r => <li key={r.rota} data-testid="tela-resultado" data-ok={r.ok} className={`flex justify-between gap-2 px-2 py-1 border-l-2 ${r.ok ? 'border-regular' : 'border-critico'}`}><span>{r.nome}</span><span className="text-grafite-claro truncate">{r.detalhe} · {r.ms} ms</span></li>)}
          </ul>
        </>
      )}
    </section>
  )
}
