// Navegador interno: tribunais, diários, jurisprudência e pesquisa abertos sem sair da plataforma.
// Cada aba guarda o próprio histórico; sites que se recusam a aparecer dentro de outra página
// abrem numa janela ao lado (metade direita da tela), e a escolha fica lembrada por site.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, PanelRight, Plus, Star, X, History, AppWindow } from 'lucide-react'
import {
  SITES, endereco, dominio, modoPara, lembrarModo, registrarVisita, historico as lerHistorico, limparHistorico,
  favoritos as lerFavoritos, alternarFavorito, abrirJanelaAoLado, type ModoAbertura, type Visita,
} from '@/lib/navegador'

interface Aba { id: number; pilha: string[]; pos: number; modo: ModoAbertura; recarga: number; titulo: string }

const GRUPOS = Array.from(new Set(SITES.map(s => s.grupo)))
const BUSCAS = SITES.filter(s => s.busca)
let proximoId = 1
const abaNova = (): Aba => ({ id: proximoId++, pilha: [], pos: -1, modo: 'aqui', recarga: 0, titulo: 'Nova aba' })

export default function NavegadorPage() {
  const [params, setParams] = useSearchParams()
  const [abas, setAbas] = useState<Aba[]>(() => [abaNova()])
  const [ativaId, setAtivaId] = useState(() => abas[0].id)
  const ativa = abas.find(a => a.id === ativaId) ?? abas[0]
  const atual = ativa.pos >= 0 ? ativa.pilha[ativa.pos] : ''
  const [digitado, setDigitado] = useState('')
  const [historico, setHistorico] = useState<Visita[]>(lerHistorico)
  const [favoritos, setFavoritos] = useState<Visita[]>(lerFavoritos)
  const [aviso, setAviso] = useState('')
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => { setDigitado(atual) }, [atual, ativaId])

  const mudarAba = (id: number, f: (a: Aba) => Aba) => setAbas(lista => lista.map(a => (a.id === id ? f(a) : a)))

  const abrir = (url: string, titulo?: string, opcoes: { naJanela?: boolean } = {}) => {
    const modo = modoPara(url)
    mudarAba(ativa.id, a => {
      const pilha = [...a.pilha.slice(0, a.pos + 1), url]
      return { ...a, pilha, pos: pilha.length - 1, modo, titulo: titulo ?? dominio(url) }
    })
    setHistorico(registrarVisita(url, titulo ?? dominio(url)))
    setAviso('')
    // Só tenta a janela ao lado quando há um clique da pessoa (senão o navegador bloqueia o pop-up).
    if (modo === 'janela' && opcoes.naJanela !== false) {
      if (!abrirJanelaAoLado(url)) setAviso('O navegador bloqueou a janela ao lado. Clique em "Abrir na janela ao lado" ou permita pop-ups para a plataforma.')
    }
  }

  // Link vindo de outra tela: /navegador?u=https://...
  useEffect(() => {
    const u = params.get('u')
    if (!u) return
    const url = endereco(u)
    if (url) abrir(url, undefined, { naJanela: false })
    params.delete('u')
    setParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ir = (ev?: React.FormEvent) => {
    ev?.preventDefault()
    const url = endereco(digitado)
    if (!url) { setAviso('Digite um endereço (ex.: tjrj.jus.br) ou o que quer pesquisar.'); return }
    abrir(url)
  }
  const voltar = () => mudarAba(ativa.id, a => (a.pos > 0 ? { ...a, pos: a.pos - 1, modo: modoPara(a.pilha[a.pos - 1]) } : a))
  const avancar = () => mudarAba(ativa.id, a => (a.pos < a.pilha.length - 1 ? { ...a, pos: a.pos + 1, modo: modoPara(a.pilha[a.pos + 1]) } : a))
  const recarregar = () => mudarAba(ativa.id, a => ({ ...a, recarga: a.recarga + 1 }))
  const trocarModo = (modo: ModoAbertura) => {
    if (!atual) return
    lembrarModo(atual, modo)
    mudarAba(ativa.id, a => ({ ...a, modo }))
    if (modo === 'janela' && !abrirJanelaAoLado(atual)) setAviso('O navegador bloqueou a janela ao lado. Permita pop-ups para a plataforma e tente de novo.')
  }
  const novaAba = () => { const a = abaNova(); setAbas(l => [...l, a]); setAtivaId(a.id); setTimeout(() => campo.current?.focus(), 0) }
  const fecharAba = (id: number) => setAbas(l => {
    const resto = l.filter(a => a.id !== id)
    if (!resto.length) { const a = abaNova(); setAtivaId(a.id); return [a] }
    if (id === ativaId) setAtivaId(resto[Math.max(0, l.findIndex(a => a.id === id) - 1)].id)
    return resto
  })

  const ehFavorito = useMemo(() => favoritos.some(f => f.url === atual), [favoritos, atual])
  const termoBusca = digitado.trim() && !/^https?:\/\//i.test(digitado.trim()) ? digitado.trim() : ''
  const botao = 'min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-sm border border-navy/15 text-navy hover:border-dourado disabled:opacity-40 disabled:hover:border-navy/15'

  return (
    <Layout title="Navegador interno">
      <div className="flex flex-col gap-3" data-testid="navegador">
        {/* Abas */}
        <div role="tablist" aria-label="Abas do navegador" className="flex items-end gap-1 overflow-x-auto border-b border-navy/15">
          {abas.map(a => (
            <div key={a.id} className={`flex items-center max-w-[220px] border border-b-0 rounded-t-sm ${a.id === ativa.id ? 'bg-white border-navy/20' : 'bg-navy/5 border-transparent'}`}>
              <button role="tab" aria-selected={a.id === ativa.id} onClick={() => setAtivaId(a.id)} className="px-3 py-2 text-sm text-navy truncate" title={a.pilha[a.pos] ?? a.titulo}>{a.titulo}</button>
              <button onClick={() => fecharAba(a.id)} aria-label={`Fechar aba ${a.titulo}`} className="p-1 mr-1 text-grafite-claro hover:text-navy"><X size={14} /></button>
            </div>
          ))}
          <button onClick={novaAba} aria-label="Nova aba" title="Nova aba" className="p-2 text-navy hover:text-dourado"><Plus size={18} /></button>
        </div>

        {/* Barra de endereço */}
        <form onSubmit={ir} className="flex flex-wrap md:flex-nowrap items-center gap-2">
          <button type="button" onClick={voltar} disabled={ativa.pos <= 0} aria-label="Voltar" title="Voltar" className={botao}><ArrowLeft size={16} /></button>
          <button type="button" onClick={avancar} disabled={ativa.pos >= ativa.pilha.length - 1} aria-label="Avançar" title="Avançar" className={botao}><ArrowRight size={16} /></button>
          <button type="button" onClick={recarregar} disabled={!atual} aria-label="Recarregar" title="Recarregar" className={botao}><RotateCw size={16} /></button>
          <input
            ref={campo}
            value={digitado}
            onChange={ev => setDigitado(ev.target.value)}
            placeholder="Endereço (ex.: tjrj.jus.br) ou o que quer pesquisar"
            aria-label="Endereço ou pesquisa"
            data-testid="navegador-endereco"
            className="flex-1 min-w-[200px] min-h-[40px] px-3 border border-navy/20 rounded-sm bg-white text-navy"
          />
          <button type="submit" className="min-h-[40px] px-4 bg-navy text-white rounded-sm text-sm">Ir</button>
          <button type="button" onClick={() => atual && setFavoritos(alternarFavorito(atual, ativa.titulo))} disabled={!atual} aria-pressed={ehFavorito} aria-label={ehFavorito ? 'Tirar dos favoritos' : 'Guardar nos favoritos'} title={ehFavorito ? 'Tirar dos favoritos' : 'Guardar nos favoritos'} className={botao}>
            <Star size={16} className={ehFavorito ? 'fill-dourado text-dourado' : ''} />
          </button>
          <button type="button" onClick={() => trocarModo('janela')} disabled={!atual} title="Abrir na janela ao lado (para sites que não aparecem aqui dentro)" className={`${botao} px-3 gap-2 text-sm`}><PanelRight size={16} /><span className="hidden lg:inline">Janela ao lado</span></button>
          <a href={atual || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!atual} title="Abrir numa aba nova do navegador" className={`${botao} ${atual ? '' : 'pointer-events-none opacity-40'}`}><ExternalLink size={16} /></a>
        </form>

        {/* Busca em fontes: aparece quando o que foi digitado é um termo, não um endereço */}
        {termoBusca && (
          <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="navegador-buscar-em">
            <span className="text-grafite-claro">Pesquisar “{termoBusca}” em:</span>
            {BUSCAS.map(s => (
              <button key={s.nome} type="button" onClick={() => abrir(s.busca!(termoBusca), `${s.nome}: ${termoBusca}`)} className="px-3 py-1 border border-navy/15 rounded-full text-navy hover:border-dourado">{s.nome}</button>
            ))}
          </div>
        )}

        {aviso && <p role="status" className="text-sm text-navy bg-dourado/10 border border-dourado/40 px-3 py-2">{aviso}</p>}

        {/* Área da página */}
        {!atual ? (
          <Inicio abrir={abrir} favoritos={favoritos} historico={historico} limpar={() => { limparHistorico(); setHistorico([]) }} />
        ) : ativa.modo === 'aqui' ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-grafite-claro">
              A página ficou em branco ou mostra “recusou a conexão”? Esse site não deixa ser mostrado dentro de outra página.{' '}
              <button type="button" onClick={() => trocarModo('janela')} className="underline decoration-dourado text-navy">Abrir na janela ao lado</button> (fica lembrado para {dominio(atual)}).
            </p>
            <iframe
              key={`${ativa.id}-${ativa.pos}-${ativa.recarga}`}
              src={atual}
              title={`Página: ${ativa.titulo}`}
              data-testid="navegador-quadro"
              className="w-full bg-white border border-navy/15"
              style={{ height: 'calc(100vh - 290px)', minHeight: 420 }}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
            />
          </div>
        ) : (
          <div className="bg-white border border-navy/15 p-6 flex flex-col items-start gap-3" data-testid="navegador-janela">
            <AppWindow className="text-dourado" size={28} aria-hidden />
            <h2 className="font-serif text-xl text-navy">{dominio(atual)} abre na janela ao lado</h2>
            <p className="text-sm text-grafite-claro max-w-2xl">
              Este site não permite ser mostrado dentro de outra página (regra de segurança do próprio site). Ele abre numa janela
              do lado direito da tela, e a plataforma continua aqui. As próximas páginas que você abrir deste site vão para a mesma janela.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { if (!abrirJanelaAoLado(atual)) setAviso('O navegador bloqueou a janela ao lado. Permita pop-ups para a plataforma e tente de novo.') }} className="min-h-[40px] px-4 bg-navy text-white rounded-sm text-sm inline-flex items-center gap-2"><PanelRight size={16} />Abrir na janela ao lado</button>
              <button type="button" onClick={() => trocarModo('aqui')} className="min-h-[40px] px-4 border border-navy/20 rounded-sm text-sm text-navy">Tentar mostrar aqui dentro</button>
            </div>
            <p className="text-xs text-grafite-claro break-all">{atual}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function Inicio({ abrir, favoritos, historico, limpar }: { abrir: (url: string, titulo?: string) => void; favoritos: Visita[]; historico: Visita[]; limpar: () => void }) {
  return (
    <div className="grid gap-6" data-testid="navegador-inicio">
      <p className="text-sm text-grafite-claro max-w-3xl">
        Abra tribunais, diários oficiais, jurisprudência e leis sem sair da plataforma. Digite um endereço ou um termo na barra
        acima, ou escolha um atalho. Sites que não deixam ser mostrados aqui dentro abrem numa janela ao lado.
      </p>
      {favoritos.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-dourado mb-2">Favoritos</h2>
          <div className="flex flex-wrap gap-2">
            {favoritos.map(f => <button key={f.url} type="button" onClick={() => abrir(f.url, f.titulo)} className="px-3 py-2 bg-white border border-navy/15 text-sm text-navy hover:border-dourado inline-flex items-center gap-2"><Star size={14} className="fill-dourado text-dourado" />{f.titulo}</button>)}
          </div>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GRUPOS.map(g => (
          <section key={g} className="bg-white border border-navy/15 p-4">
            <h2 className="font-medium text-navy mb-2">{g}</h2>
            <ul className="space-y-1">
              {SITES.filter(s => s.grupo === g).map(s => (
                <li key={s.nome}>
                  <button type="button" onClick={() => abrir(s.url, s.nome)} className="text-sm text-navy hover:text-dourado text-left inline-flex items-center gap-2" title={`${s.url} — ${modoPara(s.url) === 'aqui' ? 'abre aqui dentro' : 'abre na janela ao lado'}`}>
                    {modoPara(s.url) === 'aqui' ? <AppWindow size={14} aria-hidden className="text-grafite-claro" /> : <PanelRight size={14} aria-hidden className="text-grafite-claro" />}
                    {s.nome}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-xs text-grafite-claro inline-flex items-center gap-3"><span className="inline-flex items-center gap-1"><AppWindow size={14} aria-hidden />abre aqui dentro</span><span className="inline-flex items-center gap-1"><PanelRight size={14} aria-hidden />abre na janela ao lado</span></p>
      {historico.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] uppercase tracking-[0.16em] text-dourado inline-flex items-center gap-2"><History size={14} />Visitados recentemente</h2>
            <button type="button" onClick={limpar} className="text-xs text-grafite-claro underline">Limpar</button>
          </div>
          <ul className="divide-y divide-navy/10 bg-white border border-navy/15">
            {historico.slice(0, 10).map(v => (
              <li key={v.url}><button type="button" onClick={() => abrir(v.url, v.titulo)} className="w-full text-left px-3 py-2 text-sm text-navy hover:bg-navy/5 truncate">{v.titulo} <span className="text-grafite-claro">· {dominio(v.url)}</span></button></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
