// Navegador interno: abre sites de tribunais, diários e pesquisa sem sair da plataforma.
// Muitos sites públicos (tribunais, Google, JusBrasil) proíbem ser mostrados dentro de outra página
// (cabeçalho X-Frame-Options / frame-ancestors). O navegador não consegue ler essa proibição de outro site,
// então cada endereço tem um "modo": "aqui" (dentro da tela) ou "janela" (janela ao lado, do mesmo tamanho
// da metade da tela, que a plataforma reaproveita). Sites que já sabemos que bloqueiam começam em "janela";
// a escolha da pessoa para cada site fica lembrada neste computador.

export type ModoAbertura = 'aqui' | 'janela'

export interface SiteAtalho {
  nome: string
  url: string
  grupo: 'Tribunais' | 'Diários e intimações' | 'Jurisprudência' | 'Legislação' | 'Cadastros e índices' | 'Pesquisa'
  /** Busca com termo, quando o site aceita ir direto ao resultado. */
  busca?: (termo: string) => string
}

const e = encodeURIComponent

export const SITES: SiteAtalho[] = [
  { grupo: 'Tribunais', nome: 'TJRJ – consulta processual', url: 'https://www3.tjrj.jus.br/consultaprocessual/' },
  { grupo: 'Tribunais', nome: 'PJe TJRJ', url: 'https://tjrj.pje.jus.br/1g/login.seam' },
  { grupo: 'Tribunais', nome: 'TJSP – e-SAJ', url: 'https://esaj.tjsp.jus.br/cpopg/open.do' },
  { grupo: 'Tribunais', nome: 'TRF2', url: 'https://www.trf2.jus.br/' },
  { grupo: 'Tribunais', nome: 'TRT1 (Rio)', url: 'https://www.trt1.jus.br/' },
  { grupo: 'Tribunais', nome: 'STJ', url: 'https://www.stj.jus.br/' },
  { grupo: 'Tribunais', nome: 'STF', url: 'https://portal.stf.jus.br/' },
  { grupo: 'Tribunais', nome: 'TST', url: 'https://www.tst.jus.br/' },
  { grupo: 'Diários e intimações', nome: 'Comunica PJe (DJEN)', url: 'https://comunica.pje.jus.br/', busca: t => `https://comunica.pje.jus.br/consulta?texto=${e(t)}` },
  { grupo: 'Diários e intimações', nome: 'Diário Oficial da União', url: 'https://www.in.gov.br/', busca: t => `https://www.in.gov.br/consulta/-/buscar/dou?q=${e(t)}` },
  { grupo: 'Diários e intimações', nome: 'Querido Diário (municípios)', url: 'https://queridodiario.ok.org.br/', busca: t => `https://queridodiario.ok.org.br/pesquisa?term=${e(t)}` },
  { grupo: 'Jurisprudência', nome: 'STJ – jurisprudência', url: 'https://scon.stj.jus.br/SCON/', busca: t => `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${e(t)}` },
  { grupo: 'Jurisprudência', nome: 'STF – jurisprudência', url: 'https://jurisprudencia.stf.jus.br/', busca: t => `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=${e(t)}` },
  { grupo: 'Jurisprudência', nome: 'TST – jurisprudência', url: 'https://jurisprudencia.tst.jus.br/' },
  { grupo: 'Jurisprudência', nome: 'JusBrasil', url: 'https://www.jusbrasil.com.br/', busca: t => `https://www.jusbrasil.com.br/busca?q=${e(t)}` },
  { grupo: 'Jurisprudência', nome: 'Escavador', url: 'https://www.escavador.com/', busca: t => `https://www.escavador.com/busca?q=${e(t)}` },
  { grupo: 'Legislação', nome: 'Planalto – Código Civil', url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm' },
  { grupo: 'Legislação', nome: 'Planalto – CPC', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm' },
  { grupo: 'Legislação', nome: 'Planalto – Lei do Inquilinato', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm' },
  { grupo: 'Legislação', nome: 'LexML', url: 'https://www.lexml.gov.br/', busca: t => `https://www.lexml.gov.br/busca/search?keyword=${e(t)}` },
  { grupo: 'Cadastros e índices', nome: 'Receita – CNPJ', url: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp' },
  { grupo: 'Cadastros e índices', nome: 'OAB – Cadastro Nacional', url: 'https://cna.oab.org.br/' },
  { grupo: 'Cadastros e índices', nome: 'Banco Central – Calculadora do Cidadão', url: 'https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores' },
  { grupo: 'Pesquisa', nome: 'Google', url: 'https://www.google.com/', busca: t => `https://www.google.com/search?q=${e(t)}` },
  { grupo: 'Pesquisa', nome: 'Wikipédia', url: 'https://pt.wikipedia.org/', busca: t => `https://pt.wikipedia.org/w/index.php?search=${e(t)}` },
]

// Domínios que sabidamente se recusam a aparecer dentro de outra página. Começam em "janela ao lado".
const BLOQUEIAM = [
  'google.', 'jusbrasil.com.br', 'escavador.com', 'gov.br', 'jus.br', 'oab.org.br', 'bing.com', 'linkedin.com',
  'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com', 'whatsapp.com', 'microsoft.com', 'office.com',
]
// Exceções conhecidas que deixam ser mostradas dentro (páginas estáticas antigas do Planalto, Wikipédia).
const DEIXAM = ['planalto.gov.br', 'wikipedia.org', 'queridodiario.ok.org.br', 'lexml.gov.br']

const CHAVE_MODOS = 'theye-navegador-modos'
const CHAVE_HISTORICO = 'theye-navegador-historico'
const CHAVE_FAVORITOS = 'theye-navegador-favoritos'

/** Transforma o que a pessoa digitou em endereço: URL completa, domínio solto ou busca no Google. */
export function endereco(entrada: string): string | null {
  const t = entrada.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) {
    try { return new URL(t).toString() } catch { return null }
  }
  // "tjrj.jus.br", "www.stj.jus.br/algo": tem ponto, sem espaço e termina num nome de domínio plausível.
  // O último pedaço do domínio precisa ter letras (assim "0006978-02.2021.8.19.0212", número de processo, vira pesquisa).
  if (!/\s/.test(t) && /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(t)) {
    try { return new URL(`https://${t}`).toString() } catch { /* cai na pesquisa */ }
  }
  return `https://www.google.com/search?q=${e(t)}`
}

export function dominio(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

const casa = (host: string, lista: string[]) => lista.some(d => d.endsWith('.') ? host.startsWith(d) || host.includes(`.${d}`) : host === d || host.endsWith(`.${d}`))

function ler<T>(chave: string, padrao: T): T {
  try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) as T : padrao } catch { return padrao }
}
function gravar(chave: string, valor: unknown) {
  try { localStorage.setItem(chave, JSON.stringify(valor)) } catch { /* sem armazenamento: só não lembra */ }
}

/** Modo inicial para o endereço: o que a pessoa escolheu antes para o site; senão, o que sabemos do site. */
export function modoPara(url: string): ModoAbertura {
  const host = dominio(url)
  const escolhido = ler<Record<string, ModoAbertura>>(CHAVE_MODOS, {})[host]
  if (escolhido) return escolhido
  if (casa(host, DEIXAM)) return 'aqui'
  if (casa(host, BLOQUEIAM)) return 'janela'
  return 'aqui'
}

export function lembrarModo(url: string, modo: ModoAbertura) {
  const host = dominio(url)
  if (!host) return
  gravar(CHAVE_MODOS, { ...ler<Record<string, ModoAbertura>>(CHAVE_MODOS, {}), [host]: modo })
}

export interface Visita { url: string; titulo: string; em: string }

export function historico(): Visita[] { return ler<Visita[]>(CHAVE_HISTORICO, []) }
export function registrarVisita(url: string, titulo = dominio(url)) {
  const lista = [{ url, titulo, em: new Date().toISOString() }, ...historico().filter(v => v.url !== url)].slice(0, 30)
  gravar(CHAVE_HISTORICO, lista)
  return lista
}
export function limparHistorico() { gravar(CHAVE_HISTORICO, []) }

export function favoritos(): Visita[] { return ler<Visita[]>(CHAVE_FAVORITOS, []) }
export function alternarFavorito(url: string, titulo = dominio(url)): Visita[] {
  const atuais = favoritos()
  const lista = atuais.some(f => f.url === url) ? atuais.filter(f => f.url !== url) : [{ url, titulo, em: new Date().toISOString() }, ...atuais]
  gravar(CHAVE_FAVORITOS, lista)
  return lista
}

/** Abre (ou reaproveita) a janela ao lado, ocupando a metade direita da tela. */
export function abrirJanelaAoLado(url: string): boolean {
  const w = Math.max(480, Math.round((window.screen?.availWidth ?? 1280) / 2))
  const h = window.screen?.availHeight ?? 800
  const left = (window.screen?.availWidth ?? 1280) - w
  const janela = window.open(url, 'theye-navegador', `popup,width=${w},height=${h},left=${left},top=0`)
  if (!janela) return false
  // A janela ao lado não precisa mexer na plataforma: corta a ligação de volta (proteção contra "tabnabbing").
  try { janela.opener = null } catch { /* outra origem */ }
  try { janela.focus() } catch { /* outra origem */ }
  return true
}
