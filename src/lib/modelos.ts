// Passo 48: variáveis nos modelos e "Preencher com o caso".
// Variáveis aceitas entre chaves duplas: {{cliente}}, {{caso}}, {{processo}}, {{area}}, {{imovel}}, {{contrato}}, {{hoje}}.
// Também preenche os colchetes vazios logo após rótulos conhecidos (Cliente: [ ], Locatário: [ ], Autor: [ ], Reclamada: [ ] …).
export type CasoParaModelo = { titulo: string; cliente?: string | null; area?: string | null; numero_processo?: string | null; imovel?: string | null; contrato?: string | null }
export const VARIAVEIS_MODELO = ['{{cliente}}', '{{caso}}', '{{processo}}', '{{area}}', '{{imovel}}', '{{contrato}}', '{{hoje}}']
const ROTULOS_CLIENTE = ['Cliente', 'Locatário', 'Locador', 'Autor', 'Réu', 'Reclamada', 'Reclamante', 'Comodatário', 'Comodante', 'Contratante', 'Contratada', 'Consumidor']
const ROTULOS_IMOVEL = ['Imóvel']

// Passo D06 (Diamante): dados do contrato e do imóvel (partes, valor, prazo, garantia, índice) entram nos campos do modelo.
export type ContratoParaModelo = { locador?: string | null; locatario?: string | null; imovel?: string | null; valor?: number | null; prazoMeses?: number | null; garantia?: string | null; indice?: string | null; inicio?: string | null; vencimento?: string | null }
const moeda = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dataBr = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}` }
export function preencherComContrato(pedido: string, c: ContratoParaModelo): { texto: string; preenchidas: string[] } {
  const preenchidas = new Set<string>()
  let texto = pedido
  const troca = (re: RegExp, valor: string | null | undefined, chave: string, montar: (v: string) => string = v => `$1${v}`) => { if (valor && re.test(texto)) { texto = texto.replace(re, montar(valor)); preenchidas.add(chave) } }
  troca(/((?:Locador|Comodante|Contratante):\s*)\[\s*\]/, c.locador, 'locador')
  troca(/((?:Locatário|Comodatário|Contratada):\s*)\[\s*\]/, c.locatario, 'locatário')
  troca(/(Imóvel:\s*)\[\s*\]/, c.imovel, 'imóvel')
  troca(/((?:Aluguel|Valor):\s*R\$\s*)\[\s*\]/, c.valor ? moeda(c.valor) : null, 'valor')
  troca(/(Prazo:\s*)\[\s*\](\s*meses)/, c.prazoMeses ? String(c.prazoMeses) : null, 'prazo', v => `$1${v}$2`)
  troca(/(Garantia:\s*)\[\s*\]/, c.garantia, 'garantia')
  troca(/\[índice\]/, c.indice, 'índice', v => v)
  troca(/\[data\]/, c.vencimento ? dataBr(c.vencimento) : null, 'data', v => v)
  const extras = [c.garantia && !preenchidas.has('garantia') ? `garantia ${c.garantia}` : '', c.indice && !preenchidas.has('índice') ? `reajuste pelo ${c.indice}` : '', c.inicio ? `início ${dataBr(c.inicio)}` : '', c.vencimento && !preenchidas.has('data') ? `vencimento ${dataBr(c.vencimento)}` : ''].filter(Boolean)
  if (extras.length) texto += ` Dados do contrato: ${extras.join(', ')}.`
  return { texto, preenchidas: [...preenchidas] }
}

export function preencherModelo(pedido: string, caso: CasoParaModelo, contrato?: ContratoParaModelo | null): { texto: string; preenchidas: string[] } {
  if (contrato) {
    const c = preencherComContrato(pedido, contrato)
    const r = preencherModelo(c.texto, { ...caso, imovel: caso.imovel ?? contrato.imovel, contrato: caso.contrato ?? contrato.locatario })
    return { texto: r.texto, preenchidas: [...new Set([...c.preenchidas, ...r.preenchidas])] }
  }
  const hoje = new Date().toLocaleDateString('pt-BR')
  const valores: Record<string, string | null | undefined> = { cliente: caso.cliente, caso: caso.titulo, processo: caso.numero_processo, area: caso.area, imovel: caso.imovel, contrato: caso.contrato, hoje }
  const preenchidas = new Set<string>()
  let texto = pedido.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => { const v = valores[k]; if (v) { preenchidas.add(k); return v } return m })
  // Rótulo seguido de colchetes vazios: o primeiro rótulo de pessoa recebe o cliente; "Imóvel: [ ]" recebe o imóvel.
  if (caso.cliente) {
    // O primeiro rótulo de pessoa que aparece no texto recebe o cliente (o advogado ajusta se for a outra parte).
    const re = new RegExp(`((?:${ROTULOS_CLIENTE.join('|')}):\\s*)\\[\\s*\\]`)
    if (re.test(texto)) { texto = texto.replace(re, `$1${caso.cliente}`); preenchidas.add('cliente') }
  }
  if (caso.imovel) for (const r of ROTULOS_IMOVEL) { const re = new RegExp(`(${r}:\\s*)\\[\\s*\\]`); if (re.test(texto)) { texto = texto.replace(re, `$1${caso.imovel}`); preenchidas.add('imovel') } }
  const extras = [caso.numero_processo && !preenchidas.has('processo') ? `processo ${caso.numero_processo}` : '', caso.area && !preenchidas.has('area') ? `área ${caso.area}` : ''].filter(Boolean)
  texto += ` Dados do caso "${caso.titulo}"${caso.cliente ? ` (cliente ${caso.cliente})` : ''}${extras.length ? ': ' + extras.join(', ') : ''}. Mantenha entre colchetes o que ainda faltar.`
  return { texto, preenchidas: [...preenchidas] }
}
