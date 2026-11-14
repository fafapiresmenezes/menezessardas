// Passo 53 (Onda E): lista única das telas da plataforma, usada pelo teste de telas em "Testar tudo", pela busca
// global, pela escolha da tela inicial nas Configurações e pelo E2E.
// Passo A27: o NOME de cada tela não é escrito aqui. Ele vem do mapa das telas (src/components/menuTelas.ts),
// o mesmo que alimenta o menu e a tela de entrada. As telas que não estão no menu (formulários e telas internas)
// trazem o nome do título que aparece na própria tela.
import { gruposMenu, nomeDaTela } from '@/components/menuTelas'

/** Telas que não ficam no menu: são abertas de dentro de outra tela. O nome é o título da própria tela. */
const TELAS_INTERNAS: Record<string, string> = {
  '/imoveis/novo': 'Novo imóvel',
  '/imoveis/importar': 'Importar imóveis por planilha',
  '/contrato/novo': 'Novo contrato',
  '/processos/importar': 'Importar processos anteriores',
  '/laboratorio-admin': 'Laboratório de autoavaliação (administradores)',
}

const ROTAS = [
  ...gruposMenu.flatMap(g => g.itens.map(i => i.href)),
  ...Object.keys(TELAS_INTERNAS),
]

export const ROTAS_TELAS: { rota: string; nome: string }[] = ROTAS.map(rota => ({ rota, nome: nomeDaTela(rota) ?? TELAS_INTERNAS[rota] ?? rota }))
