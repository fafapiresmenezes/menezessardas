// Theye Suporte Jurídico — braço de serviços do Instituto THEYE: estudos para entidades do direito (OAB, associações,
// casas legislativas, defensorias, universidades e setor imobiliário) voltados ao avanço da legislação brasileira.
import { arred, somarDias } from './base'

export const TEMAS: Record<string, string> = {
  locacao: 'Locação e mercado imobiliário', condominio: 'Condomínios e convivência urbana', ia: 'Inteligência artificial no Judiciário e na advocacia',
  lgpd: 'Proteção de dados (LGPD)', esg: 'ESG, sustentabilidade e compliance', inovacao: 'Inovação, proptechs e sandboxes regulatórios',
  ciber: 'Cibersegurança e criptografia pós-quântica', acesso: 'Jurimetria e acesso à justiça',
}
export const ENTIDADES: Record<string, string> = {
  oab: 'OAB (seccional, subseção ou comissão)', setorial: 'Associação setorial (imobiliárias, administradoras, condomínios)', legislativo: 'Casa legislativa ou frente parlamentar',
  defensoria: 'Defensoria Pública ou Ministério Público', universidade: 'Universidade ou centro de pesquisa', empresa: 'Empresa ou proptech', consumidores: 'Entidade de defesa de consumidores ou inquilinos',
}
export const OBJETIVOS: Record<string, string> = {
  propor: 'Propor uma lei ou mudança normativa', avaliar: 'Avaliar uma lei ou projeto em tramitação', posicionar: 'Tomar posição pública com base em evidências',
  capacitar: 'Capacitar associados ou servidores', litigio: 'Apoiar litígio estratégico ou amicus curiae',
}

export type Estudo = { id: string; nome: string; entregaveis: string; semanas: number; horas: number }
export const CATALOGO: Estudo[] = [
  { id: 'nota-tecnica', nome: 'Nota técnica sobre projeto de lei', entregaveis: 'Análise de constitucionalidade, mérito e técnica legislativa do PL, com sugestão de emendas.', semanas: 2, horas: 24 },
  { id: 'air', nome: 'Análise de impacto legislativo/regulatório (AIR)', entregaveis: 'Relatório no padrão do Decreto 10.411/2020: problema, afetados, alternativas, impactos e recomendação.', semanas: 6, horas: 120 },
  { id: 'arr', nome: 'Avaliação de resultado de lei em vigor (ARR)', entregaveis: 'Mede se a lei atingiu os objetivos, com dados e indicadores antes/depois.', semanas: 6, horas: 100 },
  { id: 'jurimetria', nome: 'Estudo jurimétrico do tema nos tribunais', entregaveis: 'Base de decisões, taxa de êxito por tese, tempo de tramitação e perfil dos julgadores.', semanas: 4, horas: 80 },
  { id: 'pesquisa', nome: 'Pesquisa de opinião com a classe ou o setor', entregaveis: 'Questionário validado, amostra calculada, coleta e relatório com margem de erro.', semanas: 4, horas: 60 },
  { id: 'comparado', nome: 'Direito comparado e experiência internacional', entregaveis: 'Como 3 a 5 países regulam o tema e o que funcionou.', semanas: 3, horas: 50 },
  { id: 'anteprojeto', nome: 'Minuta de anteprojeto de lei com justificativa', entregaveis: 'Texto conforme a LC 95/1998, justificativa e quadro comparativo com a lei atual.', semanas: 3, horas: 60 },
  { id: 'cartilha', nome: 'Cartilha em linguagem simples', entregaveis: 'Material para o cidadão explicar direitos e deveres do tema, com teste de legibilidade.', semanas: 2, horas: 30 },
  { id: 'capacitacao', nome: 'Curso ou oficina para a entidade', entregaveis: 'Oficina de 4 a 8 horas com material, exercícios e certificado.', semanas: 1, horas: 16 },
  { id: 'audiencia', nome: 'Apoio em audiência pública ou comissão', entregaveis: 'Parecer, roteiro de fala e dados para a audiência pública.', semanas: 2, horas: 30 },
  { id: 'monitoramento', nome: 'Monitoramento legislativo mensal do tema', entregaveis: 'Boletim mensal com projetos novos, andamentos e alertas (assinatura).', semanas: 4, horas: 10 },
]
const est = (id: string) => CATALOGO.find(e => e.id === id)!

const PRINCIPAL: Record<string, string> = { propor: 'anteprojeto', avaliar: 'air', posicionar: 'nota-tecnica', capacitar: 'capacitacao', litigio: 'jurimetria' }
const COMPLEMENTOS: Record<string, string[]> = {
  propor: ['air', 'comparado', 'audiencia'], avaliar: ['jurimetria', 'pesquisa', 'nota-tecnica'], posicionar: ['pesquisa', 'cartilha', 'audiencia'],
  capacitar: ['cartilha', 'monitoramento'], litigio: ['nota-tecnica', 'comparado'],
}
const POR_ENTIDADE: Record<string, string> = { oab: 'capacitacao', setorial: 'pesquisa', legislativo: 'audiencia', defensoria: 'cartilha', universidade: 'comparado', empresa: 'monitoramento', consumidores: 'cartilha' }
const GANCHO: Record<string, string> = {
  locacao: 'a Lei 8.245/1991 tem mais de 30 anos e concentra disputas sobre garantias, reajuste e despejo — tema central do Instituto',
  condominio: 'as regras de condomínio do Código Civil (arts. 1.331 a 1.358) e a locação por temporada por aplicativo geram conflitos crescentes',
  ia: 'o uso de IA por tribunais e advogados ainda tem regulação esparsa (Resolução CNJ 615/2025 e projetos no Congresso)',
  lgpd: 'a LGPD e as resoluções da ANPD afetam cadastro de inquilinos, fiadores e clientes',
  esg: 'critérios ESG chegam aos contratos e às exigências de investidores e financiadores',
  inovacao: 'sandboxes da CVM, do Banco Central e da SUSEP permitem testar produtos imobiliários com regra temporária',
  ciber: 'a transição para criptografia pós-quântica exige revisar guarda de documentos e assinaturas',
  acesso: 'dados abertos dos tribunais permitem medir tempo e custo do acesso à justiça',
}

/** Recomendador de cross-selling: estudo principal + complementares + recorrente, com o argumento de valor. */
export function recomendarEstudos(entidade: string, tema: string, objetivo: string) {
  const principal = est(PRINCIPAL[objetivo] ?? 'nota-tecnica')
  const ids = new Set<string>([...(COMPLEMENTOS[objetivo] ?? []), POR_ENTIDADE[entidade] ?? 'cartilha'])
  ids.delete(principal.id); ids.delete('monitoramento')
  const complementares = [...ids].slice(0, 3).map(est)
  const recorrente = est('monitoramento')
  const argumento = `Para ${ENTIDADES[entidade] ?? 'a entidade'}, que quer ${(OBJETIVOS[objetivo] ?? '').toLowerCase()} em ${TEMAS[tema] ?? 'o tema'}: ${GANCHO[tema] ?? ''}. O estudo principal entrega a base técnica; os complementares dão evidência e alcance; o monitoramento mantém a entidade à frente das mudanças.`
  return { principal, complementares, recorrente, argumento }
}

/** Orçamento: horas × valor da hora × complexidade; 10% de desconto a partir de 3 estudos; cronograma em sequência. */
export function orcarEstudos(ids: string[], valorHora: number, complexidade: number, respondentes: number, custoRespondente: number, inicio: string) {
  const itens = ids.map(est).filter(Boolean)
  let cursor = inicio
  const linhas = itens.map(e => {
    const valor = arred(e.horas * valorHora * complexidade + (e.id === 'pesquisa' ? respondentes * custoRespondente : 0))
    const de = cursor, ate = somarDias(cursor, e.semanas * 7 - 1)
    cursor = somarDias(ate, 1)
    return { estudo: e, valor, de, ate }
  })
  const bruto = arred(linhas.reduce((s, l) => s + l.valor, 0))
  const desconto = itens.length >= 3 ? arred(bruto * 0.1) : 0
  return { linhas, bruto, desconto, total: arred(bruto - desconto), entrega: linhas.length ? linhas[linhas.length - 1].ate : inicio }
}

// ---------- AIR (Decreto 10.411/2020, art. 6º) ----------
export const SECOES_AIR: [string, string][] = [
  ['sumario', 'I — Sumário executivo, objetivo, conciso e em linguagem simples'],
  ['problema', 'II — Identificação do problema regulatório, suas causas e extensão'],
  ['afetados', 'III — Agentes econômicos, usuários e demais afetados'],
  ['base', 'IV — Fundamentação legal'],
  ['objetivos', 'V — Objetivos pretendidos'],
  ['alternativas', 'VI — Alternativas, inclusive a de não agir e soluções não normativas'],
  ['impactos', 'VII — Possíveis impactos de cada alternativa'],
  ['participacao', 'VIII — Contribuições recebidas em participação social'],
  ['internacional', 'IX — Mapeamento da experiência internacional'],
  ['riscos', 'X — Efeitos e riscos da edição, alteração ou revogação'],
  ['comparacao', 'XI — Comparação das alternativas e metodologia usada (art. 7º)'],
  ['implementacao', 'XII — Estratégia de implementação, fiscalização e monitoramento'],
]
export function montarAir(titulo: string, secoes: Record<string, string>) {
  const preenchidas = SECOES_AIR.filter(([k]) => (secoes[k] ?? '').trim().length >= 20)
  const texto = [`RELATÓRIO DE ANÁLISE DE IMPACTO — ${titulo.trim() || '[tema]'}`, 'Estrutura: Decreto 10.411/2020, art. 6º. Elaborado com o Instituto THEYE.', '',
    ...SECOES_AIR.flatMap(([k, rot]) => [rot.toUpperCase(), (secoes[k] ?? '').trim() || '[a preencher]', ''])].join('\n')
  return { texto, pct: Math.round(100 * preenchidas.length / SECOES_AIR.length), pendentes: SECOES_AIR.filter(([k]) => !preenchidas.some(([p]) => p === k)).map(([, r]) => r) }
}

export function multicriterio(criteriosTxt: string, alternativasTxt: string) {
  const criterios = criteriosTxt.split('\n').map(l => l.split(';')).filter(p => p[0]?.trim()).map(([n, p]) => ({ nome: n.trim(), peso: Math.max(0, Number(String(p).replace(',', '.')) || 0) }))
  const soma = criterios.reduce((s, c) => s + c.peso, 0)
  if (!criterios.length || soma <= 0) throw new Error('Informe ao menos um critério com peso maior que zero')
  const alternativas = alternativasTxt.split('\n').map(l => l.split(';')).filter(p => p[0]?.trim()).map(([n, ...notas]) => {
    const ns = criterios.map((_, i) => Math.max(0, Math.min(10, Number(String(notas[i] ?? '0').replace(',', '.')) || 0)))
    return { nome: n.trim(), notas: ns, pontuacao: arred(ns.reduce((s, x, i) => s + x * criterios[i].peso / soma, 0)) }
  })
  if (!alternativas.length) throw new Error('Informe ao menos uma alternativa')
  return { criterios: criterios.map(c => ({ ...c, pesoNormalizado: arred(100 * c.peso / soma, 1) })), ranking: [...alternativas].sort((a, b) => b.pontuacao - a.pontuacao) }
}

const Z: Record<string, number> = { '90': 1.645, '95': 1.96, '99': 2.576 }
/** Tamanho de amostra para proporção, com correção para população finita. */
export function tamanhoAmostra(populacao: number, confianca: string, margemPct: number, proporcaoPct = 50) {
  const z = Z[confianca] ?? 1.96, e = margemPct / 100, p = proporcaoPct / 100
  if (e <= 0) throw new Error('A margem de erro precisa ser maior que zero')
  const n0 = z * z * p * (1 - p) / (e * e)
  const n = populacao > 0 ? n0 / (1 + (n0 - 1) / populacao) : n0
  return { n0: Math.ceil(n0), n: Math.ceil(n), z }
}

/** LC 95/1998, art. 8º, § 1º: inclui o dia da publicação e o último dia; vigora no dia seguinte. */
export function vacatioLegis(publicacao: string, dias: number) {
  const ultimoDia = somarDias(publicacao, dias - 1)
  return { ultimoDia, vigencia: somarDias(publicacao, dias) }
}

/** Verificação de técnica legislativa (LC 95/1998) em uma minuta colada. */
export function verificarMinuta(texto: string) {
  const achados: { ok: boolean; texto: string }[] = []
  const primeiroArt = texto.search(/\bArt\.\s*1/)
  achados.push({ ok: primeiroArt > 0 && texto.slice(0, primeiroArt).trim().length > 15, texto: 'Ementa antes do art. 1º, explicitando o objeto da lei (art. 5º)' })
  const arts = [...texto.matchAll(/\bArt\.\s*(\d+)\s*(º|o|°)?(\.)?/g)]
  const numeros = arts.map(a => Number(a[1]))
  achados.push({ ok: arts.length > 0, texto: `Artigos identificados: ${arts.length}` })
  const ordinalErrado = arts.filter(a => (Number(a[1]) <= 9 && !a[2]) || (Number(a[1]) >= 10 && a[2]))
  achados.push({ ok: ordinalErrado.length === 0, texto: ordinalErrado.length ? `Numeração: ordinal até o 9º e cardinal a partir do 10 (art. 10, I) — corrigir ${ordinalErrado.map(a => a[0].trim()).join(', ')}` : 'Numeração dos artigos: ordinal até o 9º, cardinal a partir do 10 (art. 10, I)' })
  const lacunas = numeros.filter((n, i) => i > 0 && n !== numeros[i - 1] + 1)
  achados.push({ ok: lacunas.length === 0, texto: lacunas.length ? `Sequência de artigos com salto ou repetição perto do art. ${lacunas.join(', ')}` : 'Sequência de artigos contínua' })
  const parag = [...texto.matchAll(/§\s*(\d+)\s*(º|o|°)?/g)].filter(a => (Number(a[1]) <= 9 && !a[2]) || (Number(a[1]) >= 10 && a[2]))
  achados.push({ ok: parag.length === 0, texto: parag.length ? `Parágrafos: "§ 1º" até "§ 9º" e "§ 10" em diante (art. 10, III) — corrigir ${parag.map(p => p[0]).join(', ')}` : 'Parágrafos numerados corretamente (art. 10, III)' })
  achados.push({ ok: !/revogam-se\s+as\s+disposi[çc][õo]es\s+em\s+contr[áa]rio/i.test(texto), texto: 'Sem "revogam-se as disposições em contrário": a cláusula revogatória deve listar o que revoga (art. 9º)' })
  const vigencia = /entra(r[aá])?\s+em\s+vigor/i.test(texto)
  achados.push({ ok: vigencia, texto: 'Cláusula de vigência presente (art. 8º)' })
  if (/em\s+vigor\s+na\s+data\s+de\s+sua\s+publica[çc][ãa]o/i.test(texto)) achados.push({ ok: true, texto: 'Vigência imediata: só para leis de pequena repercussão; prefira "após decorridos N dias" (art. 8º, caput)' })
  const longas = texto.split(/(?<=[.;:])\s+/).filter(f => f.split(/\s+/).length > 60)
  achados.push({ ok: longas.length === 0, texto: longas.length ? `${longas.length} dispositivo(s) com mais de 60 palavras: divida em incisos ou parágrafos (art. 11)` : 'Dispositivos com frases curtas (art. 11, I)' })
  return { achados, problemas: achados.filter(a => !a.ok).length }
}

export function mapaPartesInteressadas(texto: string) {
  const q = { 'Gerenciar de perto': [] as string[], 'Manter satisfeito': [] as string[], 'Manter informado': [] as string[], 'Monitorar': [] as string[] }
  for (const l of texto.split('\n')) {
    const [nome, p, i] = l.split(';').map(s => s?.trim())
    if (!nome) continue
    const poder = Number(p) || 0, interesse = Number(i) || 0
    q[poder >= 3 && interesse >= 3 ? 'Gerenciar de perto' : poder >= 3 ? 'Manter satisfeito' : interesse >= 3 ? 'Manter informado' : 'Monitorar'].push(nome)
  }
  return q
}

export function preRegistro(c: Record<string, string>) {
  const campos: [string, string][] = [['titulo', 'Título do estudo'], ['pergunta', 'Pergunta de pesquisa'], ['hipoteses', 'Hipóteses (definidas antes de ver os dados)'], ['desenho', 'Desenho e fontes de dados'], ['amostra', 'Amostra e critério de parada'], ['variaveis', 'Variáveis e como serão medidas'], ['analise', 'Plano de análise'], ['exclusao', 'Critérios de exclusão de dados']]
  const faltam = campos.filter(([k]) => !(c[k] ?? '').trim()).map(([, r]) => r)
  const texto = ['PRÉ-REGISTRO DE ESTUDO — Instituto THEYE', ...campos.map(([k, r]) => `${r}: ${(c[k] ?? '').trim() || '[a preencher]'}`), '', 'Registre este texto na Trilha (selo de data) antes de coletar os dados.'].join('\n')
  return { texto, faltam }
}
