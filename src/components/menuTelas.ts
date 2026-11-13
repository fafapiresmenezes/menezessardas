// O mapa de todas as telas da plataforma (pedido de M, 12/11/2026: "organizar, separar de maneira hierárquica").
// Passo A27: o menu tem os MESMOS quatro blocos da tela de entrada — 1. Todo dia, 2. Processos, 3. Escrever peças,
// 4. Escritório — mais "Minha conta" e, só para o THEYE Institute, o bloco do Instituto. Nada de um bloco por assunto
// solto: menu e entrada contam a mesma história.
// Este arquivo é a ÚNICA fonte do nome de cada tela: o menu, a tela de entrada, a busca global e a lista de telas
// (src/data/rotas.ts) leem daqui, por `nomeDaTela`. Assim uma tela não volta a ter três nomes diferentes.
// Cada tela (ou bloco) tem um NÍVEL: quem não é daquele nível nem vê o item no menu. O banco continua sendo quem
// protege os dados; aqui é só arrumação, para ninguém ver botão que não é para si.
import { Building2, CalendarDays, Bell, FileBarChart, Gauge, ShieldCheck, Truck, Scale, Settings, Users, MessageSquare, TrendingUp, FlaskConical, Wallet, Home, Globe, FolderKanban, Inbox, UserCheck, Sunrise, Timer, FileText, Radar, Briefcase, Cloud, Banknote, ClipboardList, FileSearch, Library, Vote, KeySquare, Wrench, GraduationCap, Gavel, Filter, PiggyBank, SearchCheck, CalendarClock, UserPlus, PenLine, BookOpen, Compass, FolderInput, Store, LayoutGrid, SlidersHorizontal, Network, MapPin, type LucideIcon } from 'lucide-react'

export type Nivel = 'todos' | 'gestao' | 'admin' | 'instituto'
export interface Tela { icon: LucideIcon; label: string; href: string; nivel?: Nivel }
export interface GrupoMenu { id: string; titulo: string; bloco: string; nivel: Nivel; dica: string; itens: Tela[] }
/** O que a pessoa pode ver: vem do cargo (sócio e gestor veem o conjunto), da função de administrador e do Instituto. */
export interface Visao { veTudo: boolean; admin: boolean; instituto: boolean; sede: boolean }

export const ROTULO_NIVEL: Record<Nivel, string> = { todos: '', gestao: 'sócios e gestor', admin: 'administrador', instituto: 'só o Instituto' }
export const EXPLICA_NIVEL: Record<Nivel, string> = {
  todos: 'Todas as pessoas do escritório veem este grupo.',
  gestao: 'Só sócios, o gestor e a administração veem isto: são os números e o dinheiro do escritório inteiro.',
  admin: 'Só quem administra o escritório vê isto: liberar pessoas, definir cargos e acompanhar o consumo.',
  instituto: 'Só a administração do THEYE Institute vê isto: é o que cuida da plataforma inteira.',
}

export const SO_SEDE = ['/imoveis', '/fornecedores', '/alertas', '/instituto']
export const gruposMenu: GrupoMenu[] = [
  { id: 'hoje', titulo: '1. Todo dia', bloco: 'Todo dia', nivel: 'todos', dica: 'Comece por aqui', itens: [
    { icon: Home, label: 'Início', href: '/inicio' },
    { icon: Sunrise, label: 'Meu dia', href: '/meu-dia' },
    { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
    { icon: Inbox, label: 'Intimações', href: '/intimacoes' },
    { icon: Bell, label: 'Alertas', href: '/alertas' },
    { icon: CalendarClock, label: 'Prazos por código', href: '/prazos' },
    { icon: Timer, label: 'Horas trabalhadas', href: '/horas' },
    { icon: Wrench, label: 'Ferramentas do dia a dia', href: '/ferramentas' },
    { icon: Cloud, label: 'Nuvem do escritório', href: '/nuvem' },
    { icon: LayoutGrid, label: 'Painel', href: '/dashboard' },
  ] },
  // Passo A27: o imobiliário é uma área do direito como as outras — imóveis, locação e fornecedores entram aqui,
  // junto com os processos, em vez de formarem um mundo à parte no menu.
  { id: 'processos', titulo: '2. Processos', bloco: 'Processos', nivel: 'todos', dica: 'Ver, incluir e acompanhar', itens: [
    { icon: Gavel, label: 'Carteira de processos', href: '/processos' },
    { icon: FolderKanban, label: 'Casos e projetos', href: '/projetos' },
    { icon: UserPlus, label: 'Inserir processos antigos', href: '/processos-antigos' },
    { icon: FolderInput, label: 'Trazer do sistema antigo', href: '/migracao' },
    { icon: Radar, label: 'Monitoramento de processos', href: '/monitoramento' },
    { icon: Compass, label: 'Leitura do caso e predição', href: '/leitura-do-caso' },
    { icon: SearchCheck, label: 'Pesquisa e due diligence', href: '/pesquisa' },
    { icon: FileSearch, label: 'Parte adversa', href: '/parte-adversa' },
    { icon: UserCheck, label: 'Checagem de contraparte', href: '/kyc' },
    { icon: ClipboardList, label: 'Perfil do cliente', href: '/perfil-cliente' },
    { icon: Building2, label: 'Imóveis', href: '/imoveis' },
    { icon: KeySquare, label: 'Administração de locação', href: '/administracao' },
    { icon: Truck, label: 'Fornecedores', href: '/fornecedores' },
  ] },
  { id: 'pecas', titulo: '3. Escrever peças', bloco: 'Escrever peças', nivel: 'todos', dica: 'O robô escreve do seu jeito', itens: [
    { icon: MessageSquare, label: 'Assistente jurídico', href: '/assistente' },
    { icon: FileText, label: 'Modelos de peças', href: '/modelos' },
    { icon: Scale, label: 'Legislação', href: '/legislacao' },
    { icon: Globe, label: 'Fontes do advogado', href: '/fontes' },
    { icon: Library, label: 'Repositório e biblioteca', href: '/biblioteca' },
    { icon: PenLine, label: 'Meu jeito de escrever', href: '/meu-estilo' },
    { icon: BookOpen, label: 'Parâmetros de escrita', href: '/parametros-escrita' },
  ] },
  { id: 'escritorio', titulo: '4. Escritório', bloco: 'Escritório', nivel: 'todos', dica: 'Orientação, números e equipe', itens: [
    { icon: Briefcase, label: 'Consultores do escritório', href: '/consultores' },
    { icon: ShieldCheck, label: 'Compliance e LGPD', href: '/compliance' },
    { icon: ShieldCheck, label: 'Trilha de auditoria', href: '/trilha' },
    { icon: Gauge, label: 'Indicadores', href: '/indicadores', nivel: 'gestao' },
    { icon: Filter, label: 'Funil de vendas', href: '/funil', nivel: 'gestao' },
    { icon: PiggyBank, label: 'Financeiro', href: '/financeiro', nivel: 'gestao' },
    { icon: ClipboardList, label: 'Medições', href: '/medicoes', nivel: 'gestao' },
    { icon: Banknote, label: 'Honorários', href: '/honorarios', nivel: 'gestao' },
    { icon: FileBarChart, label: 'Relatórios', href: '/relatorios', nivel: 'gestao' },
    { icon: TrendingUp, label: 'Previsões', href: '/previsoes', nivel: 'gestao' },
    { icon: Users, label: 'Área do administrador', href: '/equipe', nivel: 'admin' },
    { icon: Network, label: 'Hierarquia', href: '/hierarquia', nivel: 'admin' },
    { icon: Wallet, label: 'Consumo', href: '/consumo', nivel: 'admin' },
  ] },
  // Passo A27: as telas do Instituto saem do menu do escritório. O escritório cliente não vê a administração
  // da plataforma nem a pesquisa do Instituto; só quem entra pelo THEYE Institute vê este bloco.
  { id: 'instituto', titulo: 'THEYE Institute', bloco: 'Instituto', nivel: 'instituto', dica: 'A plataforma inteira', itens: [
    { icon: FlaskConical, label: 'THEYE Institute', href: '/instituto' },
    { icon: GraduationCap, label: 'Estudos para entidades', href: '/estudos' },
    { icon: Vote, label: 'Enquetes do direito', href: '/enquetes' },
    { icon: TrendingUp, label: 'Mercado jurídico', href: '/mercado' },
    { icon: Store, label: 'Soluções jurídicas', href: '/solucoes' },
    { icon: MapPin, label: 'Geolocalização (MVP)', href: '/geolocalizacao' },
    { icon: Banknote, label: 'Royalties', href: '/royalties' },
  ] },
  { id: 'conta', titulo: 'Minha conta', bloco: 'Minha conta', nivel: 'todos', dica: 'Do seu jeito', itens: [
    { icon: SlidersHorizontal, label: 'Meu jeito de trabalhar', href: '/meu-jeito' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ] },
]

const NOMES: Record<string, string> = Object.fromEntries(gruposMenu.flatMap(g => g.itens.map(i => [i.href, i.label])))
/** O nome da tela, um só, para o menu, a entrada, a busca e a lista de telas. */
export const nomeDaTela = (href: string): string | undefined => NOMES[href]

/** Os atalhos de cada bloco na tela de entrada: só o destino e a frase que explica. O NOME vem do menu. */
export interface AtalhoInicio { id: string; destino: string; texto: string; icone: LucideIcon; so?: 'admin' | 'veTudo' }
const ATALHOS_INICIO: Record<string, AtalhoInicio[]> = {
  hoje: [
    { id: 'ir-meu-dia', destino: '/meu-dia', texto: 'Prazos, tarefas e intimações de hoje e da semana.', icone: CalendarClock },
    { id: 'ir-agenda', destino: '/agenda', texto: 'Audiências, prazos e compromissos no calendário.', icone: CalendarDays },
    { id: 'ir-intimacoes', destino: '/intimacoes', texto: 'O que chegou dos tribunais e ainda não foi lido.', icone: Inbox },
  ],
  processos: [
    { id: 'ir-processos', destino: '/processos', texto: 'Os processos que estão sob a sua responsabilidade.', icone: Gavel },
    { id: 'ir-processos-antigos', destino: '/processos-antigos', texto: 'Planilha ou nome do advogado: cadastra, busca no CNJ e mostra os prazos.', icone: UserPlus },
    { id: 'ir-pesquisa', destino: '/pesquisa', texto: 'Processo, pessoa ou empresa numa caixa só.', icone: SearchCheck },
  ],
  pecas: [
    { id: 'ir-assistente', destino: '/assistente', texto: 'Pede uma peça ou tira uma dúvida: o robô redige e responde citando a lei.', icone: MessageSquare },
    { id: 'ir-meu-estilo', destino: '/meu-estilo', texto: 'Ensine o seu estilo com peças que você já escreveu.', icone: PenLine },
    { id: 'ir-parametros', destino: '/parametros-escrita', texto: 'Tamanho, linguagem e estrutura das peças.', icone: BookOpen },
  ],
  escritorio: [
    { id: 'ir-consultores', destino: '/consultores', texto: 'Um consultor por área do direito diz o que fazer primeiro.', icone: Briefcase },
    { id: 'ir-indicadores', destino: '/indicadores', texto: 'Metas, prazos cumpridos e resultado do conjunto.', icone: Gauge, so: 'veTudo' },
    { id: 'ir-equipe', destino: '/equipe', texto: 'Liberar quem pediu para entrar e definir o cargo de cada pessoa.', icone: Users, so: 'admin' },
  ],
}

/**
 * Os quatro blocos da tela de entrada, na ordem e com os nomes do menu: a entrada lê daqui, e por isso
 * nenhuma tela pode ter um nome na entrada e outro no menu.
 */
export const BLOCOS_INICIO = gruposMenu
  .filter(g => /^\d\. /.test(g.titulo))
  .map(g => ({
    id: g.id,
    titulo: g.bloco,
    dica: g.dica,
    itens: (ATALHOS_INICIO[g.id] ?? []).map(a => ({ ...a, titulo: nomeDaTela(a.destino) ?? a.destino })),
  }))

/** Menu simples de quem ainda não escolheu o seu: só o que se usa todo dia. */
export const ATALHOS_PADRAO = ['/inicio', '/meu-dia', '/agenda', '/intimacoes', '/processos', '/processos-antigos', '/meu-estilo', '/parametros-escrita']
export const MAX_ATALHOS = 14

export function podeVerNivel(nivel: Nivel, v: Visao): boolean {
  if (nivel === 'gestao') return v.veTudo || v.admin
  if (nivel === 'admin') return v.admin
  if (nivel === 'instituto') return v.instituto
  return true
}

/** Os grupos que a pessoa enxerga, já sem as telas que não são para ela. */
export function gruposVisiveis(v: Visao): GrupoMenu[] {
  return gruposMenu
    .filter(g => podeVerNivel(g.nivel, v))
    .map(g => ({ ...g, itens: g.itens.filter(i => (v.sede || !SO_SEDE.includes(i.href)) && podeVerNivel(i.nivel ?? 'todos', v)) }))
    .filter(g => g.itens.length > 0)
}

export interface Atalho extends Tela { bloco: string; dica: string }
/** O menu simples da pessoa: os atalhos que ela escolheu, na ordem dela; tela que ela não pode ver fica de fora. */
export function atalhosDoMenu(escolhidos: string[] | undefined, v: Visao): Atalho[] {
  const grupos = gruposVisiveis(v)
  const saida: Atalho[] = []
  for (const href of escolhidos?.length ? escolhidos : ATALHOS_PADRAO) {
    const g = grupos.find(x => x.itens.some(i => i.href === href))
    const tela = g?.itens.find(i => i.href === href)
    if (g && tela && !saida.some(a => a.href === href)) saida.push({ ...tela, bloco: g.bloco, dica: g.dica })
  }
  return saida
}

// Autoexplicativo: ao passar o mouse em qualquer item do menu, uma frase diz para que a tela serve.
export const DICAS: Record<string, string> = {
  '/inicio': 'A tela de entrada: o que fazer agora e todas as matérias do direito',
  '/meu-dia': 'O que vence hoje e nos próximos dias, separado por área do direito',
  '/processos-antigos': 'Trazer processos de antes da plataforma: planilha ou busca no tribunal',
  '/migracao': 'Importar tudo do sistema antigo do escritório, com como desfazer',
  '/dashboard': 'Números gerais do escritório em um só painel',
  '/intimacoes': 'Publicações e intimações recebidas, com o que fazer em cada uma',
  '/agenda': 'Audiências, reuniões e compromissos, com avisos por e-mail',
  '/prazos': 'Prazo certo por código: CPC, CLT, CPP, Juizados e outros',
  '/projetos': 'Casos e projetos do escritório, com tarefas dentro de cada um',
  '/processos': 'Carteira de processos com andamentos e prazos de cada um',
  '/pesquisa': 'Pesquisa e due diligence sobre pessoas e empresas em fontes públicas',
  '/leitura-do-caso': 'Contexto do caso, chance de êxito e roteiro de perguntas',
  '/monitoramento': 'Vigiar processos no tribunal e avisar quando algo sair',
  '/parte-adversa': 'O que se sabe da parte contrária em fontes públicas',
  '/kyc': 'Checar quem é a contraparte antes de contratar ou processar',
  '/perfil-cliente': 'Ficha de cada cliente: casos, contatos e preferências',
  '/funil': 'Clientes em potencial, da primeira conversa ao contrato',
  '/financeiro': 'Entradas, saídas e saldo do escritório',
  '/medicoes': 'Medição de cada contrato, público e privado, e o aviso quando o pagamento atrasa',
  '/royalties': 'Os 5% do Instituto em cada venda de serviço, e em que conta eles caem',
  '/geolocalizacao': 'MVP de geolocalização no próprio titular: posição, câmera como sensor de lugar, satélites e município, tudo cifrado no aparelho',
  '/honorarios': 'Honorários combinados, cobrados e recebidos, caso por caso',
  '/horas': 'Lançar as horas trabalhadas e ver o ritmo da meta',
  '/imoveis': 'Imóveis administrados, contratos e documentos',
  '/administracao': 'Administração de locações: cobranças, repasses e reajustes',
  '/fornecedores': 'Fornecedores do escritório e dos imóveis',
  '/alertas': 'Avisos de vencimento e reajuste de contratos',
  '/legislacao': 'Ler a lei direto do Planalto, artigo por artigo',
  '/assistente': 'Perguntar, redigir peça ou comparar caminhos com a IA',
  '/modelos': 'Modelos prontos de peças e documentos do escritório',
  '/fontes': 'Tribunais, diários e fontes oficiais em um só lugar',
  '/biblioteca': 'Tudo o que já foi pesquisado e os repositórios abertos de teses, legislação e jurisprudência',
  '/parametros-escrita': 'Como o robô escreve: redatores, tom e formatação das peças',
  '/meu-estilo': 'Ensinar à plataforma o seu jeito de escrever',
  '/ferramentas': 'Calculadoras, validadores e listas de verificação do dia a dia',
  '/compliance': 'LGPD, integridade e conformidade do escritório',
  '/indicadores': 'Indicadores e metas (OKRs) do escritório',
  '/relatorios': 'Relatórios prontos para imprimir ou exportar',
  '/trilha': 'Registro do que foi feito, com carimbo que prova a data',
  '/instituto': 'Pesquisa e estudos do THEYE Institute',
  '/consultores': 'Consultores de IA por nível e por especialidade',
  '/estudos': 'Estudos para entidades, órgãos e associações',
  '/enquetes': 'Enquetes sobre temas do direito',
  '/mercado': 'O mercado jurídico em números, pela pesquisa do Instituto',
  '/previsoes': 'Previsões e riscos da carteira',
  '/solucoes': 'A plataforma oferecida a outros escritórios (vertente comercial)',
  '/nuvem': 'Arquivos do escritório guardados na nuvem',
  '/consumo': 'Quanto cada pessoa consome de IA e quanto custa',
  '/equipe': 'Pessoas do escritório, funções e permissões',
  '/hierarquia': 'Quem é sócio, gestor, pleno e júnior — o cargo decide o que cada pessoa vê',
  '/settings': 'Configurações da conta e da plataforma',
  '/meu-jeito': 'Escolher o que aparece no seu menu, onde a plataforma abre e o tamanho da letra',
}
