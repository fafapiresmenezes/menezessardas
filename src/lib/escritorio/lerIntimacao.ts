// Lê uma publicação do Diário de Justiça Eletrônico Nacional (DJEN) e diz o que fazer e até quando.
// Serve para assumir processos de um advogado que saiu: cada intimação vira "o que fazer · vence em".
// É um apoio para conferir, nunca a palavra final: quem assina confere o prazo na própria publicação.
import { ATOS_POR_CODIGO, calcularPrazoPorCodigo, rotuloPrazo, type AtoPrazo, type Codigo } from '@/lib/prazos/codigos'
import { somarDias, prorrogarParaDiaUtil, diasEntre, br, diaDaSemana } from '@/lib/ferramentas/base'
import type { Publicacao } from '@/lib/pesquisa/fontesOficiais'

export type Urgencia = 'vencido' | 'urgente' | 'breve' | 'depois' | 'ler'
export type PrazoLido = {
  chave: string
  publicacao: Publicacao
  codigo: Codigo
  /** O que fazer, em linguagem direta. */
  oQueFazer: string
  ato: AtoPrazo | null
  /** Data em que a publicação conta como feita (1º dia útil depois da disponibilização). */
  publicadaEm: string
  /** Último dia do prazo (ou dia da audiência). null quando não deu para saber. */
  vence: string | null
  diaSemana: string | null
  urgencia: Urgencia
  /** Quanto confiar na leitura automática. */
  confianca: 'alta' | 'media' | 'baixa'
  /** O trecho da publicação que justifica a leitura. */
  trecho: string
  /** Outra providência possível (ex.: recorrer da sentença). */
  outra?: string
  avisos: string[]
}

export const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
const ato = (id: string) => ATOS_POR_CODIGO.find(a => a.id === id)!

/** Ramo do processo pelo número CNJ (J) e pelo nome do órgão. */
export function codigoDoProcesso(numero: string, orgao: string | null = '', classe: string | null = ''): Codigo {
  const d = numero.replace(/\D/g, '')
  const j = d.length === 20 ? d[13] : ''
  const o = semAcento(`${orgao ?? ''} ${classe ?? ''}`)
  if (j === '5') return 'CLT'
  if (/infancia|juventude|ato infracional/.test(o)) return 'ECA'
  if (/criminal|penal|acao penal|inquerito|habeas corpus|execucao penal|vec\b|violencia domestica|juri\b/.test(o)) return 'CPP'
  if (/juizado|turma recursal|jec\b|jef\b/.test(o)) return 'JEC'
  if (/execucao fiscal/.test(o)) return 'LEF'
  if (/recuperacao judicial|falencia/.test(o)) return 'FAL'
  return 'CPC'
}

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, sessenta: 60, noventa: 90 }
const NUM = `(\\d{1,3}|${Object.keys(NUMEROS).join('|')})`
const RE_PRAZO = new RegExp(`(?:prazo (?:comum |sucessivo |improrrogavel )?de|no prazo de|em|dentro de) ${NUM}\\s*(?:\\([^)]{0,20}\\)\\s*)?dias?(\\s+uteis|\\s+corridos)?`)

/** Prazo escrito pelo juiz na publicação ("no prazo de 15 (quinze) dias"), se houver. */
export function prazoEscrito(texto: string): { dias: number; corridos: boolean } | null {
  const m = semAcento(texto).match(RE_PRAZO)
  if (!m) return null
  const dias = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]]
  if (!dias || dias > 120) return null
  return { dias, corridos: /corridos/.test(m[2] ?? '') }
}

/** Data e hora de audiência citada no texto, se houver. */
export function audienciaNoTexto(texto: string): { data: string; hora: string | null } | null {
  const t = semAcento(texto)
  // Pauta de tribunal vem como "EDITAL-PAUTA ... SESSÃO ... 04/11/2026, A PARTIR DE 13:30": a data fica longe do título.
  const i = t.search(/audiencia|sessao de julgamento|pauta de julgamento|edital[- ]?pauta|sessao (presencial|virtual|ordinaria|extraordinaria|do dia)/)
  if (i < 0) return null
  const janela = t.slice(Math.max(0, i - 120), i + 600)
  const m = janela.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ?? janela.match(/(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})/)
  if (!m) return null
  const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const mes = /^\d+$/.test(m[2]) ? Number(m[2]) : meses.indexOf(m[2]) + 1
  if (mes < 1 || mes > 12) return null
  const h = janela.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/)
  return { data: `${m[3]}-${String(mes).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`, hora: h ? `${h[1].padStart(2, '0')}:${h[2] ?? '00'}` : null }
}

/** Trecho de até ~220 caracteres em volta da palavra que decidiu a leitura. */
function trechoEm(texto: string, re: RegExp): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  const i = semAcento(limpo).search(re)
  if (i < 0) return limpo.slice(0, 220) + (limpo.length > 220 ? '…' : '')
  const ini = Math.max(0, i - 80)
  return (ini > 0 ? '…' : '') + limpo.slice(ini, i + 140).trim() + (i + 140 < limpo.length ? '…' : '')
}

type Regra = { re: RegExp; id: (c: Codigo) => string | null; texto: string; confianca: PrazoLido['confianca']; outra?: (c: Codigo) => string | undefined; legal?: boolean }
const recursoDaSentenca = (c: Codigo) => (c === 'CLT' ? 'clt-ro' : c === 'JEC' ? 'jec-recurso' : c === 'CPP' ? 'cpp-apelacao' : 'cpc-apelacao')
const edDo = (c: Codigo) => (c === 'CLT' ? 'clt-ed' : c === 'JEC' ? 'jec-ed' : c === 'CPP' ? 'cpp-ed' : 'cpc-ed')
const outraRecurso = (c: Codigo) => { const a = ato(recursoDaSentenca(c)); return `Se for recorrer: ${a.ato.toLowerCase()} em ${rotuloPrazo(a)} (${a.base}).` }

// A ordem importa: a primeira regra que casar decide.
const REGRAS: Regra[] = [
  { re: /contrarraz\w* (ao |aos |a |de )?(recurso )?(especial|extraordinario)/, id: () => 'cpc-contrarrazoes-resp', texto: 'Responder ao recurso especial ou extraordinário (contrarrazões)', confianca: 'alta', legal: true },
  { re: /(contrarraz|contraminuta)\w* (ao |de )?agravo|resposta ao agravo/, id: c => (c === 'CLT' ? 'clt-contrarrazoes' : 'ad-agravo'), texto: 'Responder ao agravo (contraminuta)', confianca: 'alta', legal: true },
  { re: /contrarraz|contra-?razoes|oferecer resposta ao recurso|responder ao recurso/, id: c => (c === 'CLT' ? 'clt-contrarrazoes' : c === 'JEC' ? 'jec-contrarrazoes' : c === 'CPP' ? 'cpp-razoes' : 'cpc-contrarrazoes'), texto: 'Responder ao recurso da outra parte (contrarrazões)', confianca: 'alta', legal: true },
  { re: /sobre (os )?embargos de declaracao|embargos de declaracao opostos|art\.? 1\.?023,? ?§ ?2/, id: c => edDo(c), texto: 'Responder aos embargos de declaração da outra parte', confianca: 'alta', legal: true },
  { re: /replica|sobre a contestacao|em reconvencao|sobre a reconvencao/, id: () => 'cpc-replica', texto: 'Responder à contestação (réplica)', confianca: 'alta', legal: true },
  { re: /laudo pericial|sobre o laudo|esclarecimentos do perito/, id: () => 'cpc-laudo', texto: 'Dizer o que acha do laudo do perito', confianca: 'alta' },
  { re: /quesitos|assistente tecnico|honorarios periciais|proposta de honorarios do perito/, id: () => 'cpc-assistente', texto: 'Indicar assistente técnico e mandar as perguntas ao perito (quesitos)', confianca: 'media' },
  { re: /alegacoes finais|razoes finais|memoriais/, id: c => (c === 'CPP' ? 'cpp-memoriais' : 'cpc-razoes-finais'), texto: 'Entregar as alegações finais (memoriais)', confianca: 'alta' },
  { re: /emend\w* (a )?(peticao )?inicial|emendar a inicial|emende/, id: () => 'cpc-emenda', texto: 'Corrigir a petição inicial (emenda)', confianca: 'alta' },
  { re: /art\.? 523|pagamento voluntario|efetu\w* o pagamento|pague o debito|pagar o debito/, id: () => 'cpc-pagamento-523', texto: 'Pagar a dívida ou avisar o cliente para pagar (cumprimento de sentença)', confianca: 'alta', legal: true },
  { re: /impugna\w* (ao )?cumprimento|art\.? 525/, id: () => 'cpc-impugnacao', texto: 'Contestar o cumprimento de sentença (impugnação)', confianca: 'media', legal: true },
  { re: /especifi\w* (as )?provas|provas que pretende/, id: () => 'cpc-generico', texto: 'Dizer quais provas quer produzir', confianca: 'media' },
  { re: /para contestar|apresentar contestacao|prazo de contestacao|ofere\w* contestacao|cite-se|fica citad/, id: () => 'cpc-contestacao', texto: 'Defender o cliente (contestação). Confira de quando conta: audiência, juntada do mandado ou do aviso de recebimento', confianca: 'media', legal: true },
  { re: /cumpra-se o (v\.?|venerando|r\.?|respeitavel)?\s*acordao|retorno dos autos|baixa dos autos/, id: () => 'cpc-generico', texto: 'O processo voltou do tribunal. Dizer ao juiz o que o cliente requer (manifestação)', confianca: 'media' },
  { re: /embargos[^.]{0,60}(rejeitad|inadmitid|nao acolh)|rejeito os embargos|inadmito os embargos|deixo de acolh\w+ os embargos/, id: c => recursoDaSentenca(c), texto: 'Embargos de declaração rejeitados: o prazo do recurso principal volta a correr por inteiro. Se o cliente era o embargante, recorrer; se era o embargado, nada a fazer', confianca: 'media', legal: true },
  { re: /julgo (im)?procedente|julgo parcialmente|julgo extint|homologo|resolvo o merito|sentenca/, id: c => edDo(c), texto: 'Saiu a sentença. Ler com o cliente; se houver ponto omisso ou contraditório, embargos de declaração', confianca: 'media', outra: outraRecurso, legal: true },
  { re: /acordao|acordam|negaram provimento|deram provimento|por unanimidade|por maioria/, id: c => edDo(c), texto: 'Saiu o acórdão (decisão do tribunal). Ler; se houver omissão, embargos de declaração', confianca: 'media', outra: c => (c === 'CLT' ? 'Se for recorrer: recurso de revista em 8 dias úteis (CLT, art. 896).' : c === 'JEC' ? undefined : 'Se for recorrer: recurso especial ou extraordinário em 15 dias úteis (CPC, art. 1.003, § 5º).'), legal: true },
  { re: /defiro|indefiro|decisao interlocutoria|tutela (de urgencia|antecipada)|liminar/, id: c => edDo(c), texto: 'Saiu uma decisão no meio do processo. Ler; se prejudicar o cliente, avaliar recurso', confianca: 'baixa', outra: c => (c === 'CPC' ? 'Se couber agravo de instrumento: 15 dias úteis (CPC, arts. 1.015 e 1.003, § 5º).' : undefined), legal: true },
  { re: /manifest|diga(m)? |digam|ciencia|fale(m)? sobre|cumpra|junte|providencie|recolh\w* (as )?custas|comprove/, id: () => 'cpc-generico', texto: 'Responder ao que o juiz pediu (manifestação)', confianca: 'media' },
]


// Publicações em que NÃO há prazo para o nosso cliente: o ato é de cartório, ou a ordem é para outra parte (MP, recorrente, contador).
// Antes, o robô tratava todas como "manifestação em 5 dias" e mandava o advogado atrás de um prazo que não existe.
// Só vale quando a publicação é curta e não traz prazo escrito: se houver prazo, a regra normal decide.
const SEM_PRAZO: { re: RegExp; texto: string; outra?: string }[] = [
  { re: /migrad\w+ (do sistema \w+ )?para o sistema eproc|foram migrados.{0,40}eproc|processo.{0,40}migrado.{0,40}eproc/, texto: 'Processo migrado para o eproc: não há prazo. Cada advogado deve fazer o primeiro acesso com certificado digital e conferir os dados', outra: 'Depois do primeiro acesso, os prazos passam a correr pelo eproc.' },
  { re: /(de-se|remetam-se (os autos )?|vista )(ao|a) (mp|ministerio publico|parquet)|ao ministerio publico para parecer|para parecer de merito/, texto: 'Vista ao Ministério Público: o prazo é do MP, não do cliente. Acompanhar o parecer', outra: 'Quando o parecer sair, responder só se for contrário ao cliente.' },
  { re: /(ao|a|ao\(s\)|a\(s\)) (parte\(s\) )?recorrente\(?s?\)? (para|sobre)|intime-?se,? derradeiramente,? a subscritora|ao recorrente,? para regulariza|vista a\(s\) parte\(s\) recorrente/, texto: 'Ordem dirigida à parte que recorreu: o prazo é dela, não do cliente. Acompanhar se ela cumpre; se não cumprir, o recurso pode não ser conhecido' },
  { re: /remetam-se os autos ao contador|ao contador judicial para|ao administrador judicial\.?$|a inventariante\.?$/, texto: 'Os autos vão para o contador ou para outro auxiliar: ainda não há prazo para o cliente. O prazo nasce quando houver nova vista' },
  { re: /nada a prover.{0,80}(sentenca|acordao).{0,60}(transitad|cumpra-se)|ja ha sentenca nos autos|sentenca.{0,40}transitada em julgado.{0,30}cumpra-se/, texto: 'O juiz negou o pedido porque já há sentença transitada em julgado. Não é uma sentença nova: o caminho é o cumprimento da sentença (se o cliente ganhou)', outra: 'Se o pedido negado era do cliente e prejudica: embargos de declaração em 5 dias úteis, só se houver vício.' },
  { re: /distribua-se o processo|distribuido ao|redistribuid/, texto: 'O processo foi distribuído a um relator: não há prazo. Anotar o relator e acompanhar' },
  { re: /^\s*(\w+ )?(oficie-se|expeca-se (oficio|mandado|alvara|certidao)|anote-se|junte-se|certifique-se)[^.]{0,200}\.?\s*$/, texto: 'Ato de cartório (ofício, anotação ou mandado): não há prazo para o cliente. Conferir se o cliente precisa acompanhar o cumprimento' },
]

function lerSemPrazo(texto: string, t: string) {
  if (t.length > 1200 || prazoEscrito(texto)) return null
  return SEM_PRAZO.find(r => r.re.test(t)) ?? null
}

function atoAdHoc(id: string, codigo: Codigo, dias?: number, corridos?: boolean): AtoPrazo {
  if (id === 'ad-agravo') return { id, codigo: 'CPC', ato: 'Contraminuta de agravo', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 1.019, II, e 1.021, § 2º', dobro: true }
  const corr = corridos || codigo === 'CPP' || codigo === 'ECA' || codigo === 'FAL'
  return { id: 'ad-juiz', codigo, ato: 'Prazo dado pelo juiz', quantidade: dias ?? 5, unidade: corr ? 'dias_corridos' : 'dias_uteis', base: dias ? 'Prazo fixado na publicação (CPC, art. 218, § 1º)' : 'Sem prazo fixado: 5 dias (CPC, art. 218, § 3º)', dobro: true }
}

/** Urgência pelo número de dias corridos até o vencimento. */
export function urgenciaPara(vence: string | null, hoje: string): Urgencia {
  if (!vence) return 'ler'
  const d = diasEntre(hoje, vence)
  return d < 0 ? 'vencido' : d <= 5 ? 'urgente' : d <= 15 ? 'breve' : 'depois'
}

/** 1º dia útil depois da disponibilização no DJEN (Lei 11.419/2006, art. 4º, § 3º). */
export const dataDaPublicacao = (disponibilizacao: string) => prorrogarParaDiaUtil(somarDias(disponibilizacao, 1))

/** Lê uma publicação e devolve a providência e o prazo. */
export function lerIntimacao(p: Publicacao, hoje: string): PrazoLido {
  const codigo = codigoDoProcesso(p.numero, p.orgao, p.classe)
  const texto = `${p.tipo ?? ''} ${p.documento ?? ''} ${p.texto ?? ''}`
  const t = semAcento(texto)
  const publicadaEm = dataDaPublicacao(p.data)
  const base = { chave: `${p.id}`, publicacao: p, codigo, publicadaEm, avisos: [] as string[] }

  const aud = /pauta|audiencia|sessao de julgamento/.test(t) ? audienciaNoTexto(texto) : null
  if (aud && aud.data >= p.data) {
    return { ...base, oQueFazer: `Comparecer à audiência ou sessão${aud.hora ? ` às ${aud.hora}` : ''}. Avisar o cliente e as testemunhas`, ato: null, vence: aud.data, diaSemana: diaDaSemana(aud.data), urgencia: urgenciaPara(aud.data, hoje), confianca: 'media', trecho: trechoEm(texto, /audiencia|sessao de julgamento|pauta/), avisos: ['Data lida do texto da publicação: confira no processo.'] }
  }

  const semPrazo = lerSemPrazo(texto, t)
  if (semPrazo) {
    return { ...base, oQueFazer: semPrazo.texto, ato: null, vence: null, diaSemana: null, urgencia: 'ler', confianca: 'alta', trecho: trechoEm(texto, semPrazo.re), outra: semPrazo.outra, avisos: ['Não há prazo para o cliente nesta publicação. Se o prazo anotado antes for diferente, vale esta leitura.'] }
  }

  const escrito = prazoEscrito(texto)
  const regra = REGRAS.find(r => r.re.test(t))
  if (!regra) {
    if (escrito) {
      const a = atoAdHoc('ad-juiz', codigo, escrito.dias, escrito.corridos)
      const r = calcularPrazoPorCodigo(a, publicadaEm)
      return { ...base, oQueFazer: 'Cumprir o que o juiz pediu no prazo escrito na publicação', ato: a, vence: r.final, diaSemana: r.diaSemana, urgencia: urgenciaPara(r.final, hoje), confianca: 'baixa', trecho: trechoEm(texto, RE_PRAZO), avisos: r.avisos }
    }
    return { ...base, oQueFazer: 'Ler a publicação: não achei um pedido com prazo', ato: null, vence: null, diaSemana: null, urgencia: 'ler', confianca: 'baixa', trecho: trechoEm(texto, /intim|publiq|despacho|decisao/), avisos: [] }
  }

  const id = regra.id(codigo)!
  let a = id.startsWith('ad-') ? atoAdHoc(id, codigo) : ato(id)
  const avisos: string[] = []
  // O prazo escrito pelo juiz vale para manifestações; para recursos e defesas, vale o da lei.
  if (escrito && !regra.legal && escrito.dias !== a.quantidade) {
    a = { ...a, quantidade: escrito.dias, unidade: escrito.corridos ? 'dias_corridos' : a.unidade, base: `Prazo fixado na publicação; ${a.base}` }
  } else if (escrito && regra.legal && escrito.dias !== a.quantidade) {
    avisos.push(`A publicação fala em ${escrito.dias} dias, mas a lei dá ${rotuloPrazo(a)} para este ato. Confira qual vale.`)
  }
  if (id === 'cpc-generico' && !escrito) avisos.push('A publicação não diz o prazo: usei 5 dias úteis (CPC, art. 218, § 3º).')
  if (codigo === 'CPC' && a.codigo === 'CPC' && /fazenda|municipio|estado do|uniao|inss|autarquia|defensoria|ministerio publico/.test(t) && a.dobro) avisos.push('Se o cliente for a Fazenda, o MP ou a Defensoria, o prazo é em dobro.')
  const r = calcularPrazoPorCodigo(a, publicadaEm)
  return {
    ...base, oQueFazer: regra.texto, ato: a, vence: r.final, diaSemana: r.diaSemana, urgencia: urgenciaPara(r.final, hoje),
    confianca: regra.confianca, trecho: trechoEm(texto, regra.re), outra: regra.outra?.(codigo), avisos: [...avisos, ...r.avisos],
  }
}

const ORDEM: Record<Urgencia, number> = { vencido: 0, urgente: 1, breve: 2, depois: 3, ler: 4 }

/** Lê todas, tira repetidas e põe na ordem: vencidos, esta semana, próximos, depois, para ler. */
export function lerTodas(pubs: Publicacao[], hoje: string): PrazoLido[] {
  const vistas = new Set<string>()
  const lidas: PrazoLido[] = []
  for (const p of pubs) {
    if (vistas.has(p.id)) continue
    vistas.add(p.id)
    lidas.push(lerIntimacao(p, hoje))
  }
  // Mesma providência no mesmo processo com o mesmo vencimento: fica uma só.
  const unicas = new Map<string, PrazoLido>()
  for (const l of lidas) {
    const k = `${l.publicacao.numero.replace(/\D/g, '')}|${l.ato?.id ?? l.oQueFazer}|${l.vence ?? l.publicacao.id}`
    if (!unicas.has(k)) unicas.set(k, l)
  }
  return [...unicas.values()].sort((x, y) => ORDEM[x.urgencia] - ORDEM[y.urgencia] || (x.vence ?? '9999').localeCompare(y.vence ?? '9999') || y.publicacao.data.localeCompare(x.publicacao.data))
}

export const ROTULO_URGENCIA: Record<Urgencia, string> = {
  vencido: 'Já venceu', urgente: 'Vence em até 5 dias', breve: 'Vence em até 15 dias', depois: 'Vence depois', ler: 'Ler e decidir',
}

/** Linha de texto para a agenda ou para colar num e-mail. */
export const linhaDoPrazo = (l: PrazoLido) =>
  `${l.vence ? `Vence ${br(l.vence)} (${l.diaSemana})` : 'Sem data'} · ${l.publicacao.numero} · ${l.oQueFazer}${l.ato ? ` · ${rotuloPrazo(l.ato)}, ${l.ato.base}` : ''} · publicado em ${br(l.publicadaEm)}`

/** CSV (separado por ponto e vírgula, como o Excel em português abre). */
export function csvDosPrazos(ls: PrazoLido[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const linhas = ls.map(l => [l.vence ? br(l.vence) : '', ROTULO_URGENCIA[l.urgencia], l.publicacao.numero, l.publicacao.tribunal ?? '', l.publicacao.orgao ?? '', l.oQueFazer, l.ato ? rotuloPrazo(l.ato) : '', l.ato?.base ?? '', br(l.publicacao.data), br(l.publicadaEm), l.confianca, l.trecho].map(v => esc(String(v))).join(';'))
  return ['Vence;Situação;Processo;Tribunal;Órgão;O que fazer;Prazo;Base legal;Disponibilizada;Publicada;Confiança da leitura;Trecho'].concat(linhas).join('\n')
}
