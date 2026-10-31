// Passo 48: variáveis nos modelos e "Preencher com o caso".
// Variáveis aceitas entre chaves duplas: {{cliente}}, {{caso}}, {{processo}}, {{area}}, {{imovel}}, {{contrato}}, {{hoje}}.
// Também preenche os colchetes vazios logo após rótulos conhecidos (Cliente: [ ], Locatário: [ ], Autor: [ ], Reclamada: [ ] …).
export type CasoParaModelo = { titulo: string; cliente?: string | null; area?: string | null; numero_processo?: string | null; imovel?: string | null; contrato?: string | null }
export const VARIAVEIS_MODELO = ['{{cliente}}', '{{caso}}', '{{processo}}', '{{area}}', '{{imovel}}', '{{contrato}}', '{{hoje}}']
const ROTULOS_CLIENTE = ['Cliente', 'Locatário', 'Locador', 'Autor', 'Réu', 'Reclamada', 'Reclamante', 'Comodatário', 'Comodante', 'Contratante', 'Contratada', 'Consumidor']
const ROTULOS_IMOVEL = ['Imóvel']

export function preencherModelo(pedido: string, caso: CasoParaModelo): { texto: string; preenchidas: string[] } {
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
