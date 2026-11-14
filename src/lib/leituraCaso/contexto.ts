// Leitura geral e contextualização do caso, só a partir do texto que o advogado escreve ou cola.
// Extrai datas, valores, prazos, números de processo e dispositivos de lei, monta a linha do tempo
// e aponta o que costuma faltar para cada tipo de ação. Nada sai do aparelho.

export interface FatoDatado { data: string; iso: string; trecho: string }
export interface Contexto {
  linhaDoTempo: FatoDatado[]
  valores: { texto: string; valor: number; trecho: string }[]
  processos: string[]
  dispositivos: string[]
  frases: number
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Divide o texto em frases, sem quebrar em "art. 9º", "R$ 1.200,00", "fls." ou datas. */
export function frases(texto: string): string[] {
  const protegido = texto
    .replace(/\b(art|arts|fls|nº|n|inc|par|al|sr|sra|dr|dra|exmo|exma|cf|p|pp|ss|v|vs|ltda|s\.a)\./gi, m => m.replace('.', '․'))
    .replace(/(\d)\.(\d)/g, '$1․$2')
  return protegido
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(f => f.replace(/․/g, '.').trim())
    .filter(f => f.length > 2)
}

function iso(d: number, m: number, a: number): string | null {
  if (a < 100) a += a < 50 ? 2000 : 1900
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

/** Datas no formato 10/03/2024, 10.03.24, 10-03-2024 ou "10 de março de 2024". */
export function datasNoTexto(t: string): { texto: string; iso: string }[] {
  const achadas: { texto: string; iso: string; pos: number }[] = []
  for (const m of t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) {
    const i = iso(+m[1], +m[2], +m[3]); if (i) achadas.push({ texto: m[0], iso: i, pos: m.index ?? 0 })
  }
  const re = new RegExp(`\\b(\\d{1,2})º?\\s+de\\s+(${MESES.join('|')})\\s+de\\s+(\\d{4})\\b`, 'gi')
  for (const m of t.matchAll(re)) {
    const i = iso(+m[1], MESES.indexOf(m[2].toLowerCase()) + 1, +m[3]); if (i) achadas.push({ texto: m[0], iso: i, pos: m.index ?? 0 })
  }
  return achadas.sort((a, b) => a.pos - b.pos).map(({ texto, iso }) => ({ texto, iso }))
}

/** Valores em reais: R$ 1.200,50, R$ 3 mil, R$ 2,5 milhões. */
export function valoresNoTexto(t: string): { texto: string; valor: number }[] {
  const out: { texto: string; valor: number }[] = []
  for (const m of t.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)(\s*(milhões|milhão|mil|bilhões|bilhão)\b)?/gi)) {
    let v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
    if (Number.isNaN(v)) continue
    const mult = (m[3] ?? '').toLowerCase()
    if (mult === 'mil') v *= 1e3; else if (mult.startsWith('milh')) v *= 1e6; else if (mult.startsWith('bilh')) v *= 1e9
    out.push({ texto: m[0].trim(), valor: v })
  }
  return out
}

/** Horários: 14h, 14h30, 14:30, às 9 horas. */
export function horasNoTexto(t: string): string[] {
  const out: string[] = []
  for (const m of t.matchAll(/\b([01]?\d|2[0-3])\s*(?:h|:|horas?)\s*([0-5]\d)?\b/gi)) out.push(`${m[1].padStart(2, '0')}:${m[2] ?? '00'}`)
  return out
}

export const processosNoTexto = (t: string) => [...new Set([...t.matchAll(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g)].map(m => m[0]))]

export function dispositivosNoTexto(t: string): string[] {
  const re = /\b(?:art(?:igo)?s?\.?\s*\d+[º°o]?(?:[-–]\w)?(?:,?\s*(?:§|par[áa]grafo)\s*\d+[º°]?|,?\s*inc(?:iso)?\.?\s*[IVXLC]+)*(?:,?\s*d[ao]s?\s+(?:Lei|Decreto|CPC|CC|CDC|CLT|CF|CTN|CP|CPP|ECA)(?:\s+n?º?\s*[\d.]+(?:\/\d{2,4})?)?)?|Lei\s+n?º?\s*[\d.]+\/\d{2,4}|S[úu]mula\s+(?:Vinculante\s+)?n?º?\s*\d+(?:\s+do\s+(?:STF|STJ|TST|TJ\w{2}))?|Tema\s+\d+\s+do\s+(?:STF|STJ))/gi
  return [...new Set([...t.matchAll(re)].map(m => m[0].replace(/\s+/g, ' ').trim()))]
}

export function lerContexto(texto: string): Contexto {
  const fs = frases(texto)
  const linhaDoTempo: FatoDatado[] = []
  const valores: Contexto['valores'] = []
  for (const f of fs) {
    for (const d of datasNoTexto(f)) linhaDoTempo.push({ data: d.texto, iso: d.iso, trecho: f })
    for (const v of valoresNoTexto(f)) valores.push({ ...v, trecho: f })
  }
  linhaDoTempo.sort((a, b) => a.iso.localeCompare(b.iso))
  return { linhaDoTempo, valores, processos: processosNoTexto(texto), dispositivos: dispositivosNoTexto(texto), frases: fs.length }
}

// O que costuma decidir cada tipo de ação. "palavras" detecta se o fato já foi mencionado no relato.
export interface PontoChave { id: string; texto: string; palavras: string[]; base?: string }
export interface TipoAcao { valor: string; rotulo: string; jurimetria: boolean; pontos: PontoChave[] }

const PONTOS_DESPEJO: PontoChave[] = [
  { id: 'contrato', texto: 'Contrato de locação (escrito ou prova da relação)', palavras: ['contrato', 'locação', 'locacao'], base: 'Lei 8.245/91, art. 9º, III' },
  { id: 'debito', texto: 'Planilha do débito discriminada', palavras: ['planilha', 'débito', 'debito', 'aluguéis', 'alugueis'], base: 'Lei 8.245/91, art. 62, I' },
  { id: 'garantia', texto: 'Garantia (fiador, caução, seguro) e se há liminar possível', palavras: ['fiador', 'caução', 'caucao', 'seguro fiança', 'garantia'], base: 'Lei 8.245/91, art. 59, §1º, IX' },
  { id: 'purgacao', texto: 'Purgação da mora já usada nos últimos 24 meses?', palavras: ['purga', 'purgação', 'purgacao', 'emenda da mora'], base: 'Lei 8.245/91, art. 62, parágrafo único' },
  { id: 'notificacao', texto: 'Notificação ou tentativa de acordo prévia', palavras: ['notifica', 'notificação', 'whatsapp', 'e-mail', 'carta'] },
  ]

export const TIPOS_ACAO: TipoAcao[] = [
  { valor: 'despejo', rotulo: 'Despejo por falta de pagamento', jurimetria: true, pontos: PONTOS_DESPEJO },
  { valor: 'despejo_cumulado', rotulo: 'Despejo cumulado com cobrança', jurimetria: true, pontos: PONTOS_DESPEJO },
  { valor: 'renovatoria', rotulo: 'Ação renovatória', jurimetria: true, pontos: [
    { id: 'prazo', texto: 'Contrato(s) escritos somando 5 anos ou mais', palavras: ['cinco anos', '5 anos', 'prazo'], base: 'Lei 8.245/91, art. 51, I e II' },
    { id: 'ramo', texto: 'Mesmo ramo de atividade há 3 anos', palavras: ['ramo', 'atividade', 'três anos', '3 anos'], base: 'Lei 8.245/91, art. 51, III' },
    { id: 'janela', texto: 'Ajuizamento entre 1 ano e 6 meses antes do fim', palavras: ['ajuiz', 'decad', 'seis meses', '6 meses'], base: 'Lei 8.245/91, art. 51, §5º' },
    { id: 'proposta', texto: 'Proposta de novo aluguel e laudo', palavras: ['proposta', 'laudo', 'avaliação', 'avaliacao'], base: 'Lei 8.245/91, art. 71, IV' },
  ] },
  { valor: 'revisional', rotulo: 'Revisional de aluguel', jurimetria: true, pontos: [
    { id: 'tres', texto: 'Três anos de vigência ou do último acordo', palavras: ['três anos', '3 anos', 'último acordo', 'ultimo acordo'], base: 'Lei 8.245/91, art. 19' },
    { id: 'mercado', texto: 'Prova do preço de mercado (laudo, anúncios)', palavras: ['laudo', 'mercado', 'anúncio', 'anuncio', 'avaliação'] },
  ] },
  { valor: 'consignacao', rotulo: 'Consignação em pagamento', jurimetria: true, pontos: [
    { id: 'recusa', texto: 'Recusa ou dúvida sobre quem recebe', palavras: ['recus', 'dúvida', 'duvida'], base: 'CC, art. 335' },
    { id: 'deposito', texto: 'Depósito integral do valor devido', palavras: ['depósito', 'deposito', 'deposit'], base: 'CPC, art. 542, I' },
  ] },
  { valor: 'execucao', rotulo: 'Execução de título extrajudicial', jurimetria: true, pontos: [
    { id: 'titulo', texto: 'Título executivo (contrato com duas testemunhas, cheque, nota)', palavras: ['título', 'titulo', 'testemunhas', 'cheque', 'nota promissória'], base: 'CPC, art. 784' },
    { id: 'calculo', texto: 'Memória de cálculo atualizada', palavras: ['cálculo', 'calculo', 'memória', 'atualiza'], base: 'CPC, art. 798, I, b' },
    { id: 'bens', texto: 'Bens conhecidos do devedor', palavras: ['bens', 'imóvel', 'imovel', 'veículo', 'veiculo', 'conta'] },
    { id: 'prescricao', texto: 'Prescrição (data de vencimento)', palavras: ['venc', 'prescri'], base: 'CC, art. 206' },
  ] },
  { valor: 'usucapiao', rotulo: 'Usucapião', jurimetria: true, pontos: [
    { id: 'tempo', texto: 'Tempo de posse e modalidade', palavras: ['posse', 'anos'], base: 'CC, arts. 1.238 a 1.242' },
    { id: 'animus', texto: 'Posse mansa, pacífica, com ânimo de dono', palavras: ['mansa', 'pacífica', 'pacifica', 'dono', 'iptu'] },
    { id: 'planta', texto: 'Planta e memorial descritivo', palavras: ['planta', 'memorial'], base: 'CPC, art. 246, §3º; LRP, art. 216-A' },
    { id: 'confrontantes', texto: 'Confrontantes identificados', palavras: ['confront', 'vizinh'] },
  ] },
  { valor: 'indenizatoria', rotulo: 'Indenização (danos materiais e morais)', jurimetria: false, pontos: [
    { id: 'ato', texto: 'Ato ilícito ou falha do serviço descrito com data', palavras: ['falha', 'ilícit', 'ilicit', 'cobrança indevida', 'negativ'], base: 'CC, arts. 186 e 927; CDC, art. 14' },
    { id: 'dano', texto: 'Prova do dano e do valor', palavras: ['dano', 'prejuízo', 'prejuizo', 'nota fiscal', 'orçamento'] },
    { id: 'nexo', texto: 'Nexo entre a conduta e o dano', palavras: ['causou', 'em razão', 'por causa', 'nexo'] },
    { id: 'reclamacao', texto: 'Reclamação prévia (protocolo, Procon, consumidor.gov)', palavras: ['protocolo', 'procon', 'consumidor.gov', 'reclama'] },
  ] },
  { valor: 'trabalhista', rotulo: 'Reclamação trabalhista', jurimetria: false, pontos: [
    { id: 'vinculo', texto: 'Período do vínculo, função e salário', palavras: ['admit', 'demit', 'salário', 'salario', 'função', 'funcao'] },
    { id: 'jornada', texto: 'Jornada e controle de ponto', palavras: ['jornada', 'ponto', 'hora extra', 'horas extras'], base: 'CLT, art. 74, §2º' },
    { id: 'prescricao', texto: 'Prescrição bienal e quinquenal', palavras: ['prescri', 'dois anos', '2 anos'], base: 'CF, art. 7º, XXIX' },
    { id: 'testemunhas', texto: 'Testemunhas disponíveis', palavras: ['testemunha'] },
  ] },
  { valor: 'outra', rotulo: 'Outra ação', jurimetria: false, pontos: [] },
]

export const tipoAcao = (v: string) => TIPOS_ACAO.find(t => t.valor === v) ?? TIPOS_ACAO[TIPOS_ACAO.length - 1]

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Pontos-chave do tipo de ação, marcando os que o relato já menciona. */
export function pontosDoCaso(acao: string, texto: string): (PontoChave & { mencionado: boolean })[] {
  const t = semAcento(texto)
  return tipoAcao(acao).pontos.map(p => ({ ...p, mencionado: p.palavras.some(w => t.includes(semAcento(w))) }))
}
