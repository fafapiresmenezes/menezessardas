// App de inspeção de obra (ferramenta P3 do Plano Master de Engenharia), versão 1.
// Lista de verificação por serviço, não conformidades, fotos com local e hora, guardado no próprio aparelho
// (funciona sem internet) e relatório para baixar. As listas citam normas só pelo número; o critério de
// aceitação de cada item é o do projeto e da norma do país da obra, conferido pelo responsável técnico.

export type EstadoItem = 'ok' | 'nc' | 'na' | null
export interface ItemInspecao { id: string; texto: string; estado: EstadoItem; obs: string }
export interface FotoInspecao { id: string; dataUrl: string; quando: string; lat?: number; lon?: number; precisaoM?: number; legenda: string }
export interface Inspecao {
  id: string; obra: string; local: string; servico: string; responsavel: string
  criadaEm: string; atualizadaEm: string; fechada: boolean
  itens: ItemInspecao[]; fotos: FotoInspecao[]
}

export const MODELOS_INSPECAO: { id: string; nome: string; normas: string; itens: string[] }[] = [
  { id: 'formas-armadura', nome: 'Fôrmas e armadura antes da concretagem', normas: 'NBR 14931, NBR 6118 / EN 13670 / ACI 117 e 301', itens: [
    'Fôrmas alinhadas, no prumo e nas cotas do projeto', 'Escoramento e contraventamento conferidos', 'Fôrmas limpas, estanques e com desmoldante',
    'Bitola, quantidade e posição das barras conforme o projeto', 'Espaçadores garantem o cobrimento do projeto', 'Emendas e ancoragens nos comprimentos do projeto',
    'Furos e passagens de instalações posicionados antes de concretar', 'Armadura limpa, sem ferrugem solta, óleo ou barro'] },
  { id: 'concretagem', nome: 'Concretagem', normas: 'NBR 12655, NBR 14931 / EN 206 / ACI 301', itens: [
    'Nota fiscal confere com o traço e a classe pedidos', 'Abatimento (slump) medido e dentro da faixa pedida', 'Corpos de prova moldados e identificados',
    'Tempo desde a saída da central dentro do limite', 'Lançamento sem segregar (altura de queda controlada)', 'Adensamento sem vazios nem excesso de vibração',
    'Cura iniciada logo após o acabamento', 'Juntas de concretagem no lugar previsto'] },
  { id: 'alvenaria', nome: 'Alvenaria de vedação', normas: 'NBR 8545, NBR 15270 / EN 1996', itens: [
    'Blocos do tipo e da resistência especificados', 'Primeira fiada nivelada e na locação do projeto', 'Prumo e alinhamento das fiadas',
    'Juntas com espessura uniforme e preenchidas', 'Amarração nas paredes e pilares (tela ou ferro-cabelo)', 'Vergas e contravergas nos vãos',
    'Encunhamento feito só depois do prazo previsto'] },
  { id: 'impermeabilizacao', nome: 'Impermeabilização', normas: 'NBR 9575, NBR 9574', itens: [
    'Superfície regularizada, limpa e seca', 'Cantos arredondados (meia-cana)', 'Ralos e passagens tratados antes da manta',
    'Sobreposições na medida da especificação', 'Teste de estanqueidade por 72 h sem vazamento', 'Proteção mecânica executada'] },
  { id: 'hidraulica', nome: 'Instalações hidrossanitárias', normas: 'NBR 5626, NBR 8160', itens: [
    'Material e diâmetro conforme o projeto', 'Declividade do esgoto conferida', 'Fixação e suportes no espaçamento indicado',
    'Teste de pressão da água fria/quente sem queda', 'Teste de estanqueidade do esgoto', 'Registros e caixas acessíveis'] },
  { id: 'eletrica', nome: 'Instalações elétricas', normas: 'NBR 5410 / IEC 60364', itens: [
    'Eletrodutos e caixas na posição do projeto', 'Bitola dos condutores conforme o projeto', 'Cores dos condutores respeitadas',
    'Aterramento e equipotencialização ligados', 'Dispositivos DR nos circuitos exigidos', 'Quadro identificado e com diagrama',
    'Resistência de isolamento medida e registrada'] },
  { id: 'seguranca', nome: 'Segurança do trabalho', normas: 'NR-18, NR-35 / ISO 45001', itens: [
    'Trabalhadores com EPI adequado à tarefa', 'Guarda-corpos e proteção de periferia instalados', 'Linha de vida e cinto em trabalho em altura',
    'Andaimes inspecionados e liberados', 'Área de içamento isolada', 'Extintores e rotas de fuga desimpedidos'] },
]

let seq = 0
export const novoId = (prefixo = 'i') => `${prefixo}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function novaInspecao(modeloId: string, dados: { obra: string; local: string; responsavel: string }, agora = new Date()): Inspecao {
  const m = MODELOS_INSPECAO.find(x => x.id === modeloId)
  if (!m) throw new Error(`Modelo de inspeção desconhecido: ${modeloId}`)
  const t = agora.toISOString()
  return {
    id: novoId('insp'), obra: dados.obra.trim(), local: dados.local.trim(), responsavel: dados.responsavel.trim(), servico: m.nome,
    criadaEm: t, atualizadaEm: t, fechada: false,
    itens: m.itens.map((texto, k) => ({ id: `${m.id}-${k + 1}`, texto, estado: null, obs: '' })), fotos: [],
  }
}

export function resumoInspecao(i: Inspecao) {
  const avaliados = i.itens.filter(x => x.estado && x.estado !== 'na')
  const ok = avaliados.filter(x => x.estado === 'ok').length
  const nc = i.itens.filter(x => x.estado === 'nc')
  const pendentes = i.itens.filter(x => x.estado === null).length
  return {
    total: i.itens.length, ok, nc: nc.length, na: i.itens.filter(x => x.estado === 'na').length, pendentes,
    conformidadePct: avaliados.length ? (ok / avaliados.length) * 100 : null,
    ncSemObs: nc.filter(x => !x.obs.trim()).length,
    podeFechar: pendentes === 0 && nc.every(x => x.obs.trim().length > 0),
  }
}

/** fechar exige todos os itens avaliados e toda não conformidade descrita */
export function fecharInspecao(i: Inspecao, agora = new Date()): Inspecao {
  const r = resumoInspecao(i)
  if (r.pendentes) throw new Error(`Faltam ${r.pendentes} item(ns) por avaliar.`)
  if (r.ncSemObs) throw new Error(`${r.ncSemObs} não conformidade(s) sem descrição.`)
  return { ...i, fechada: true, atualizadaEm: agora.toISOString() }
}

export function relatorioInspecao(i: Inspecao): string {
  const r = resumoInspecao(i)
  const marca = (e: EstadoItem) => (e === 'ok' ? 'Conforme' : e === 'nc' ? 'NÃO CONFORME' : e === 'na' ? 'Não se aplica' : 'Pendente')
  const L = [
    `RELATÓRIO DE INSPEÇÃO: ${i.servico}`,
    `Obra: ${i.obra || '—'} · Local: ${i.local || '—'} · Responsável: ${i.responsavel || '—'}`,
    `Aberta em ${i.criadaEm.replace('T', ' ').slice(0, 16)} UTC · ${i.fechada ? 'FECHADA' : 'em aberto'} · atualizada em ${i.atualizadaEm.replace('T', ' ').slice(0, 16)} UTC`,
    `Resultado: ${r.ok} conforme(s), ${r.nc} não conforme(s), ${r.na} não se aplica, ${r.pendentes} pendente(s)` + (r.conformidadePct === null ? '' : ` · conformidade ${r.conformidadePct.toFixed(0)}%`),
    '',
    ...i.itens.map((x, k) => `${k + 1}. [${marca(x.estado)}] ${x.texto}${x.obs ? `\n   Obs.: ${x.obs}` : ''}`),
    '',
    `Fotos: ${i.fotos.length}`,
    ...i.fotos.map((f, k) => `  F${k + 1} ${f.quando.replace('T', ' ').slice(0, 16)} UTC${f.lat !== undefined ? ` · ${f.lat.toFixed(6)}, ${f.lon!.toFixed(6)} (±${Math.round(f.precisaoM ?? 0)} m)` : ' · sem localização'}${f.legenda ? ` · ${f.legenda}` : ''}`),
    '',
    'Registro de campo. O critério de aceitação de cada item é o do projeto e da norma do país da obra; o responsável técnico confere e assina.',
  ]
  return L.join('\n')
}

export function inspecoesParaCSV(lista: Inspecao[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const linhas = ['Inspeção;Obra;Local;Serviço;Responsável;Aberta em;Fechada;Item;Estado;Observação;Fotos']
  for (const i of lista) for (const x of i.itens) linhas.push([i.id, esc(i.obra), esc(i.local), esc(i.servico), esc(i.responsavel), i.criadaEm, i.fechada ? 'sim' : 'não', esc(x.texto), x.estado ?? 'pendente', esc(x.obs), String(i.fotos.length)].join(';'))
  return linhas.join('\n')
}

// ---------------------------------------------------------------- guardar no aparelho

export interface Armazem { getItem(k: string): string | null; setItem(k: string, v: string): void }
const CHAVE = 'theye-engenharia-inspecoes-v1'

export function carregarInspecoes(a: Armazem | null): Inspecao[] {
  try { const t = a?.getItem(CHAVE); const v = t ? JSON.parse(t) : []; return Array.isArray(v) ? v : [] } catch { return [] }
}

/** devolve false quando o aparelho não tem mais espaço (fotos pesam): o chamador avisa a pessoa */
export function salvarInspecoes(a: Armazem | null, lista: Inspecao[]): boolean {
  try { a?.setItem(CHAVE, JSON.stringify(lista)); return true } catch { return false }
}
