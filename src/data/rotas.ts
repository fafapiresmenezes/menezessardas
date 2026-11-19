// Passo 53 (Onda E): lista única das telas da plataforma, usada pelo teste de telas em "Testar tudo", pela busca
// global, pela escolha da tela inicial nas Configurações e pelo E2E.
// Passo A27: o NOME de cada tela não é escrito aqui. Ele vem do mapa das telas (src/components/menuTelas.ts),
// o mesmo que alimenta o menu e a tela de entrada. As telas que não estão no menu (formulários e telas internas)
// trazem o nome do título que aparece na própria tela.
import { FRENTES, TELAS_DO_INSTITUTO, gruposMenu, gruposVisiveis, nomeDaTela, type Visao } from '@/components/menuTelas'

/** Telas que não ficam no menu: são abertas de dentro de outra tela. O nome é o título da própria tela. */
const TELAS_INTERNAS: Record<string, string> = {
  '/imoveis/novo': 'Novo imóvel',
  '/imoveis/importar': 'Importar imóveis por planilha',
  '/contrato/novo': 'Novo contrato',
  '/processos/importar': 'Importar processos anteriores',
  '/laboratorio-admin': 'Laboratório de autoavaliação (administradores)',
}

const ROTAS = [
  ...new Set([...gruposMenu.flatMap(g => g.itens.map(i => i.href)), ...TELAS_DO_INSTITUTO().map(i => i.href)]),
  ...Object.keys(TELAS_INTERNAS),
]

export const ROTAS_TELAS: { rota: string; nome: string }[] = ROTAS.map(rota => ({ rota, nome: nomeDaTela(rota) ?? TELAS_INTERNAS[rota] ?? rota }))

/** Telas internas que só fazem sentido para quem vê a tela "mãe" delas. */
const MAE_DA_INTERNA: Record<string, string> = {
  '/imoveis/novo': '/imoveis', '/imoveis/importar': '/imoveis', '/contrato/novo': '/imoveis',
  '/processos/importar': '/processos', '/laboratorio-admin': '/instituto',
}

/**
 * As telas que ESTA pessoa pode ver (pedido de M, 18/11/2026: o escritório cliente não vê nada do Instituto).
 * A busca global e a escolha da tela inicial leem daqui, e não de ROTAS_TELAS: a lista completa mostrava
 * Royalties, Caderno de produtos e as frentes do Instituto para qualquer advogado do escritório.
 */
export function rotasVisiveis(v: Visao): { rota: string; nome: string }[] {
  const abertas = new Set(gruposVisiveis(v).flatMap(g => g.itens.map(i => i.href)))
  // O Instituto é uma plataforma à parte (19/11/2026): as telas dele saíram do menu do direito, mas a
  // administração do Instituto continua a encontrá-las pela busca e pela escolha da tela inicial.
  if (v.instituto) for (const f of FRENTES) for (const i of f.itens) abertas.add(i.href)
  return ROTAS_TELAS.filter(r => abertas.has(r.rota) || (MAE_DA_INTERNA[r.rota] !== undefined && abertas.has(MAE_DA_INTERNA[r.rota])))
}
