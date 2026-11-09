// Passo D19 (Diamante): app instalável (PWA) com avisos no celular para prazos críticos e intimações urgentes.
// Os avisos são locais: a própria tela, ao abrir ou a cada 30 minutos, confere o banco e avisa uma vez por dia por item.
// Nada de servidor de push nem de dado pessoal fora do aparelho.
import { diasAte, formatarData } from './datas'

export type Aviso = { chave: string; titulo: string; corpo: string; rota: string }
export type IntimacaoCritica = { id: string | number; lida: boolean; prazo_final: string | null; tribunal?: string | null; numero_processo?: string | null; tipo?: string | null }
export type CompromissoDoDia = { id: string | number; titulo: string; data_evento: string }

export const DIAS_CRITICOS = 2
const CHAVE_MEMORIA = 'lsm-avisos-mostrados'

function hojeISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Intimação não lida com prazo em até 2 dias (ou vencido) e compromisso de hoje viram avisos, do mais urgente ao menos. */
export function avisosCriticos(intimacoes: IntimacaoCritica[], compromissos: CompromissoDoDia[], hoje = hojeISO()): Aviso[] {
  const lista: { ordem: number; aviso: Aviso }[] = []
  for (const i of intimacoes) {
    if (i.lida || !i.prazo_final) continue
    const dias = diasAte(i.prazo_final)
    if (dias === null || dias > DIAS_CRITICOS) continue
    const processo = i.numero_processo ? ` · ${i.numero_processo}` : ''
    const titulo = dias < 0 ? `Prazo vencido há ${-dias} dia${-dias === 1 ? '' : 's'}` : dias === 0 ? 'Prazo vence hoje' : `Prazo em ${dias} dia${dias === 1 ? '' : 's'}`
    lista.push({ ordem: dias, aviso: { chave: `intimacao-${i.id}`, titulo, corpo: `${i.tipo || 'Intimação'}${i.tribunal ? ' · ' + i.tribunal : ''}${processo} · até ${formatarData(i.prazo_final)}`, rota: '/intimacoes' } })
  }
  for (const c of compromissos) {
    if (c.data_evento !== hoje) continue
    lista.push({ ordem: 100, aviso: { chave: `compromisso-${c.id}-${hoje}`, titulo: `Hoje: ${c.titulo}`, corpo: `Compromisso da agenda em ${formatarData(hoje)}`, rota: '/agenda' } })
  }
  return lista.sort((a, b) => a.ordem - b.ordem).map(x => x.aviso)
}

type Memoria = { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Cada aviso aparece uma vez por dia; a memória fica só no aparelho. */
export function filtrarNaoMostrados(avisos: Aviso[], memoria: Memoria, hoje = hojeISO()): Aviso[] {
  let vistos: Record<string, string> = {}
  try { vistos = JSON.parse(memoria.getItem(CHAVE_MEMORIA) || '{}') } catch { vistos = {} }
  const novos = avisos.filter(a => vistos[a.chave] !== hoje)
  if (novos.length) {
    const atual: Record<string, string> = {}
    for (const [k, v] of Object.entries(vistos)) if (v === hoje) atual[k] = v
    for (const a of novos) atual[a.chave] = hoje
    try { memoria.setItem(CHAVE_MEMORIA, JSON.stringify(atual)) } catch { /* sem memória local */ }
  }
  return novos
}

export type EstadoAvisos = 'sem-suporte' | 'pedir' | 'permitido' | 'negado'
export function estadoAvisos(): EstadoAvisos {
  if (typeof Notification === 'undefined') return 'sem-suporte'
  if (Notification.permission === 'granted') return 'permitido'
  if (Notification.permission === 'denied') return 'negado'
  return 'pedir'
}

export async function pedirPermissaoAvisos(): Promise<EstadoAvisos> {
  if (estadoAvisos() === 'sem-suporte') return 'sem-suporte'
  try { await Notification.requestPermission() } catch { /* navegador antigo */ }
  return estadoAvisos()
}

export function serviceWorkerDisponivel() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
}

/** Registra o sw.js ao lado do index.html (funciona na raiz e em subpasta). Só em produção. */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerDisponivel() || !import.meta.env.PROD) return null
  // updateViaCache: 'none' obriga o navegador a buscar sw.js direto do servidor a cada registro,
  // em vez de usar uma cópia em cache HTTP — sem isso, um sw.js em cache podia impedir que o
  // navegador percebesse um deploy novo por bem mais tempo que o esperado.
  try { return await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }) } catch { return null }
}

const ICONE = new URL('./icone-192.png', typeof document !== 'undefined' ? document.baseURI : 'https://localhost/').href

export async function mostrarAviso(a: Aviso) {
  if (estadoAvisos() !== 'permitido') return false
  try {
    const reg = serviceWorkerDisponivel() ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg?.active) { reg.active.postMessage({ tipo: 'aviso', ...a, icone: ICONE }); return true }
    const n = new Notification(a.titulo, { body: a.corpo, icon: ICONE, tag: a.chave })
    n.onclick = () => { if (typeof window !== 'undefined') { window.focus(); window.location.hash = a.rota } }
    return true
  } catch { return false }
}

/** Busca os itens críticos (função passada pela tela), filtra o que já foi avisado hoje e mostra o resto. */
export async function verificarAvisosCriticos(buscar: () => Promise<{ intimacoes: IntimacaoCritica[]; compromissos: CompromissoDoDia[] }>, memoria: Memoria | null = typeof localStorage !== 'undefined' ? localStorage : null): Promise<Aviso[]> {
  if (estadoAvisos() !== 'permitido' || !memoria) return []
  const { intimacoes, compromissos } = await buscar()
  const novos = filtrarNaoMostrados(avisosCriticos(intimacoes, compromissos), memoria)
  for (const a of novos.slice(0, 5)) await mostrarAviso(a)
  return novos
}

// Instalação: o navegador oferece o evento beforeinstallprompt; guardamos para o botão "Instalar" da tela.
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let eventoInstalar: EventoInstalar | null = null
const ouvintes = new Set<() => void>()
export function capturarInstalacao() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e as EventoInstalar; ouvintes.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { eventoInstalar = null; ouvintes.forEach(f => f()) })
}
export function aoMudarInstalacao(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export function podeInstalar() { return eventoInstalar !== null }
export function instaladoComoApp() {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
}
export async function instalarApp(): Promise<'aceito' | 'recusado' | 'indisponivel'> {
  if (!eventoInstalar) return 'indisponivel'
  const ev = eventoInstalar
  await ev.prompt()
  const { outcome } = await ev.userChoice
  if (outcome === 'accepted') eventoInstalar = null
  return outcome === 'accepted' ? 'aceito' : 'recusado'
}
/** iPhone/iPad não têm o evento: a instalação é manual, pelo botão Compartilhar. */
export function ehIos() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
}
