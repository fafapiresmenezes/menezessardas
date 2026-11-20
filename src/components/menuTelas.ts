// O mapa de todas as telas da plataforma (pedido de M, 12/11/2026: "organizar, separar de maneira hierárquica").
// Passo A27: o menu tem os MESMOS quatro blocos da tela de entrada — 1. Todo dia, 2. Processos, 3. Escrever peças,
// 4. Escritório — mais "Minha conta" e, só para o Instituto THEYE, o bloco do Instituto. Nada de um bloco por assunto
// solto: menu e entrada contam a mesma história.
// Este arquivo é a ÚNICA fonte do nome de cada tela: o menu, a tela de entrada, a busca global e a lista de telas
// (src/data/rotas.ts) leem daqui, por `nomeDaTela`. Assim uma tela não volta a ter três nomes diferentes.
// Cada tela (ou bloco) tem um NÍVEL: quem não é daquele nível nem vê o item no menu. O banco continua sendo quem
// protege os dados; aqui é só arrumação, para ninguém ver botão que não é para si.
import { KeyRound, Building2, CalendarDays, Bell, FileBarChart, Gauge, ShieldCheck, Truck, Scale, Settings, Users, MessageSquare, TrendingUp, FlaskConical, Wallet, Home, Globe, FolderKanban, Inbox, UserCheck, Sunrise, Timer, FileText, Radar, Briefcase, Cloud, Banknote, ClipboardList, FileSearch, Library, Vote, KeySquare, Wrench, GraduationCap, Gavel, Filter, PiggyBank, SearchCheck, CalendarClock, UserPlus, PenLine, BookOpen, Compass, FolderInput, Store, LayoutGrid, SlidersHorizontal, AppWindow, Network, MapPin, HeartPulse, type LucideIcon, Droplets, Ruler, Target, Coins, Landmark} from 'lucide-react'

export type Nivel = 'todos' | 'gestao' | 'financeiro' | 'admin' | 'instituto'
export interface Tela { icon: LucideIcon; label: string; href: string; nivel?: Nivel }
export interface GrupoMenu { id: string; titulo: string; bloco: string; nivel: Nivel; dica: string; itens: Tela[] }
/** O que a pessoa pode ver: vem do cargo (sócio e gestor veem o conjunto), da função de administrador e do Instituto. */
export interface Visao { veTudo: boolean; admin: boolean; instituto: boolean; sede: boolean; /** Pedido de M (19/11/2026): o dinheiro do escritório é só do chefe (sócio ou administração) e de quem ele liberar na tela Hierarquia. */ financeiro?: boolean; /** Telas que o nível de cima escondeu desta pessoa (três níveis em cascata). */ ocultas?: string[] }

export const ROTULO_NIVEL: Record<Nivel, string> = { todos: '', gestao: 'sócios, gestor e administração', financeiro: 'sócios, administração e quem eles liberarem', admin: 'administrador', instituto: 'só o Instituto' }
export const EXPLICA_NIVEL: Record<Nivel, string> = {
  todos: 'Todas as pessoas do escritório veem este grupo.',
  gestao: 'Só sócios, o gestor e a administração veem isto: são os números e o dinheiro do escritório inteiro.',
  financeiro: 'Só sócios, a administração e quem eles liberarem na tela Hierarquia veem isto: é o dinheiro do escritório.',
  admin: 'Só quem administra o escritório vê isto: liberar pessoas, definir cargos e acompanhar o consumo.',
  instituto: 'Só a administração do Instituto THEYE vê isto: é o que cuida da plataforma inteira.',
}

export const SO_SEDE = ['/imoveis', '/administracao', '/fornecedores', '/alertas']
export const gruposMenu: GrupoMenu[] = [
  { id: 'hoje', titulo: '1. Todo dia', bloco: 'Todo dia', nivel: 'todos', dica: 'Comece por aqui', itens: [
    { icon: Home, label: 'Início', href: '/inicio' },
    { icon: Sunrise, label: 'Meu dia', href: '/meu-dia' },
    { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
    { icon: Inbox, label: 'Intimações', href: '/intimacoes' },
    { icon: CalendarClock, label: 'Prazos por código', href: '/prazos' },
    { icon: Timer, label: 'Horas trabalhadas', href: '/horas' },
    { icon: Wrench, label: 'Ferramentas do dia a dia', href: '/ferramentas' },
    { icon: Cloud, label: 'Nuvem do escritório', href: '/nuvem' },
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
    { icon: Bell, label: 'Alertas de contratos', href: '/alertas' },
    { icon: LayoutGrid, label: 'Painel de imóveis', href: '/dashboard' },
  ] },
  { id: 'pecas', titulo: '3. Escrever peças', bloco: 'Escrever peças', nivel: 'todos', dica: 'Pesquisar e redigir', itens: [
    { icon: MessageSquare, label: 'Assistente jurídico', href: '/assistente' },
    { icon: FileText, label: 'Modelos de peças', href: '/modelos' },
    { icon: Scale, label: 'Legislação', href: '/legislacao' },
    { icon: AppWindow, label: 'Navegador interno', href: '/navegador' },
    { icon: Globe, label: 'Fontes do advogado', href: '/fontes' },
    { icon: Library, label: 'Repositório e biblioteca', href: '/biblioteca' },
    { icon: PenLine, label: 'Meu jeito de escrever', href: '/meu-estilo' },
    { icon: BookOpen, label: 'Parâmetros de escrita', href: '/parametros-escrita' },
  ] },
  { id: 'escritorio', titulo: '4. Escritório', bloco: 'Escritório', nivel: 'todos', dica: 'Orientação, números e equipe', itens: [
    { icon: Briefcase, label: 'Consultores de IA', href: '/consultores' },
    { icon: ShieldCheck, label: 'Compliance e LGPD', href: '/compliance' },
    { icon: ShieldCheck, label: 'Trilha de auditoria', href: '/trilha' },
    { icon: Gauge, label: 'Indicadores', href: '/indicadores', nivel: 'gestao' },
    { icon: Filter, label: 'Funil de vendas', href: '/funil', nivel: 'gestao' },
    { icon: PiggyBank, label: 'Financeiro', href: '/financeiro', nivel: 'financeiro' },
    { icon: Banknote, label: 'Honorários', href: '/honorarios', nivel: 'financeiro' },
    { icon: FileBarChart, label: 'Relatórios', href: '/relatorios', nivel: 'gestao' },
    { icon: TrendingUp, label: 'Previsões', href: '/previsoes', nivel: 'gestao' },
    { icon: Users, label: 'Área do administrador', href: '/equipe', nivel: 'admin' },
    { icon: Network, label: 'Hierarquia', href: '/hierarquia', nivel: 'gestao' },
    { icon: KeyRound, label: 'Banco de senhas', href: '/banco-de-senhas', nivel: 'gestao' },
    { icon: Wallet, label: 'Consumo', href: '/consumo', nivel: 'admin' },
  ] },
  // Passo A27: as telas do Instituto saem do menu do escritório. O escritório cliente não vê a administração
  // da plataforma nem a pesquisa do Instituto; só quem entra pelo Instituto THEYE vê este bloco.
  // Pedido de M (19/11/2026): o Instituto não mora dentro da plataforma jurídica. Ele é um quadrado à parte,
  // uma plataforma própria, como a do direito. Aqui fica só a porta de saída, e só a administração do
  // Instituto a enxerga: as telas do Instituto estão em FRENTES ('instituto'), com menu próprio.
  { id: 'instituto', titulo: 'Instituto THEYE', bloco: 'Instituto', nivel: 'instituto', dica: 'Plataforma à parte', itens: [
    { icon: LayoutGrid, label: 'Frentes do Instituto', href: '/frentes-do-instituto' },
  ] },
  { id: 'conta', titulo: 'Minha conta', bloco: 'Minha conta', nivel: 'todos', dica: 'Do seu jeito', itens: [
    { icon: SlidersHorizontal, label: 'Meu jeito de trabalhar', href: '/meu-jeito' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ] },
]

/**
 * Menu da casa de perfil "projectos" (fundos internacionais, 18/11/2026). É um produto próprio: nenhuma tela de advocacia entra aqui.
 * Só aparecem telas que já existem; os ecrãs da fase C do trilho entram neste menu à medida que ficam prontos.
 * Os nomes são os mesmos do título de cada tela, como em todo o menu.
 */
export const gruposProjectos: GrupoMenu[] = [
  { id: 'visao', titulo: '1. Visão', bloco: 'Visão', nivel: 'todos', dica: 'O estado de tudo num ecrã', itens: [
    { icon: Gauge, label: 'Visão do presidente', href: '/visao-presidente' },
    { icon: FolderKanban, label: 'Carteira de projectos', href: '/carteira-projectos' },
  ] },
  { id: 'obra', titulo: '2. Obra', bloco: 'Obra', nivel: 'todos', dica: 'Medição e assinaturas por nível', itens: [
    { icon: Ruler, label: 'Medição de obra por nível', href: '/demonstracao-obra' },
  ] },
  { id: 'contratos', titulo: '3. Contratos', bloco: 'Contratos', nivel: 'todos', dica: 'Contratos, obrigações e prazos', itens: [
    { icon: FileText, label: 'Contratos e obrigações', href: '/contratos-obrigacoes' },
  ] },
  { id: 'pagamentos', titulo: '4. Pagamentos', bloco: 'Pagamentos', nivel: 'todos', dica: 'Fila de pagamentos por estado', itens: [
    { icon: Wallet, label: 'Pagamentos', href: '/pagamentos-fundos' },
  ] },
  { id: 'fornecedores', titulo: '5. Fornecedores', bloco: 'Fornecedores', nivel: 'todos', dica: 'Fornecedores por estado e nota', itens: [
    { icon: Store, label: 'Fornecedores', href: '/fornecedores-fundos' },
  ] },
  { id: 'garantias', titulo: '6. Garantias e licenças', bloco: 'Garantias', nivel: 'todos', dica: 'Garantias e licenças por validade', itens: [
    { icon: KeySquare, label: 'Garantias e licenças', href: '/garantias-licencas' },
  ] },
  { id: 'riscos', titulo: '7. Riscos', bloco: 'Riscos', nivel: 'todos', dica: 'Riscos e litígios por nível', itens: [
    { icon: Radar, label: 'Riscos e litígios', href: '/riscos-litigios' },
  ] },
  { id: 'documentos', titulo: '8. Documentos', bloco: 'Documentos', nivel: 'todos', dica: 'Documentos e registo de auditoria', itens: [
    { icon: Library, label: 'Documentos e auditoria', href: '/documentos-fundos' },
  ] },
  { id: 'assistente-f', titulo: '9. Assistente', bloco: 'Assistente', nivel: 'todos', dica: 'Perguntas em linguagem simples', itens: [
    { icon: MessageSquare, label: 'Assistente', href: '/assistente-fundos' },
  ] },
  { id: 'estudos-gov', titulo: '10. Estudos para o governo', bloco: 'Estudos', nivel: 'todos', dica: 'Estudos num molde fixo, com fontes', itens: [
    { icon: Landmark, label: 'Estudos para o governo', href: '/estudos-governo' },
  ] },
  { id: 'biblioteca-f', titulo: '11. Biblioteca e especialistas', bloco: 'Biblioteca', nivel: 'todos', dica: 'Teses, cursos abertos e o catálogo de especialistas', itens: [
    { icon: BookOpen, label: 'Biblioteca e especialistas', href: '/biblioteca-teses' },
  ] },
  { id: 'criador-gov', titulo: '12. Criador de projectos', bloco: 'Criador', nivel: 'gestao', dica: 'Dossiês de projecto para o governo, em rascunho', itens: [
    { icon: FolderKanban, label: 'Criador de projectos para o governo', href: '/criador-projectos' },
  ] },
  { id: 'robos-gov', titulo: '13. Robôs de projectos', bloco: 'Robôs', nivel: 'gestao', dica: 'A esteira dos robôs e das propostas', itens: [
    { icon: Network, label: 'Robôs de projectos para o governo', href: '/robos-governo' },
  ] },
  { id: 'risco', titulo: '2. Risco e auditoria', bloco: 'Risco e auditoria', nivel: 'gestao', dica: 'Quem fez o quê, e quando', itens: [
    { icon: ClipboardList, label: 'Trilha de auditoria', href: '/trilha' },
  ] },
  { id: 'casa', titulo: '3. Casa', bloco: 'Casa', nivel: 'todos', dica: 'Pessoas, níveis e conta', itens: [
    { icon: Users, label: 'Hierarquia', href: '/hierarquia', nivel: 'gestao' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ] },
]

const NOMES: Record<string, string> = Object.fromEntries([...gruposProjectos, ...gruposMenu].flatMap(g => g.itens.map(i => [i.href, i.label])))
/** O nome da tela, um só, para o menu, a entrada, a busca e a lista de telas. */
export const nomeDaTela = (href: string): string | undefined => NOMES[href] ?? TELAS_DO_INSTITUTO().find(i => i.href === href)?.label

/** Os atalhos de cada bloco na tela de entrada: só o destino e a frase que explica. O NOME vem do menu. */
export interface AtalhoInicio { id: string; destino: string; texto: string; icone: LucideIcon; so?: 'admin' | 'veTudo' }
const ATALHOS_INICIO: Record<string, AtalhoInicio[]> = {
  hoje: [
    { id: 'ir-meu-dia', destino: '/meu-dia', texto: 'Prazos, tarefas e intimações de hoje e da semana.', icone: Sunrise },
    { id: 'ir-agenda', destino: '/agenda', texto: 'Audiências, prazos e compromissos no calendário.', icone: CalendarDays },
    { id: 'ir-intimacoes', destino: '/intimacoes', texto: 'O que chegou dos tribunais e ainda não foi lido.', icone: Inbox },
  ],
  processos: [
    { id: 'ir-processos', destino: '/processos', texto: 'Os processos que estão sob a sua responsabilidade.', icone: Gavel },
    { id: 'ir-processos-antigos', destino: '/processos-antigos', texto: 'Planilha ou nome do advogado: cadastra, busca no CNJ e mostra os prazos.', icone: UserPlus },
    { id: 'ir-pesquisa', destino: '/pesquisa', texto: 'Processo, pessoa ou empresa numa caixa só.', icone: SearchCheck },
  ],
  pecas: [
    { id: 'ir-assistente', destino: '/assistente', texto: 'Peça uma minuta ou tire uma dúvida: o assistente redige e responde citando a lei.', icone: MessageSquare },
    { id: 'ir-meu-estilo', destino: '/meu-estilo', texto: 'Ensine o seu estilo com peças que você já escreveu.', icone: PenLine },
    { id: 'ir-parametros', destino: '/parametros-escrita', texto: 'Tamanho, linguagem e estrutura das peças.', icone: BookOpen },
  ],
  escritorio: [
    { id: 'ir-consultores', destino: '/consultores', texto: 'Um consultor por área do direito diz o que fazer primeiro.', icone: Briefcase },
    { id: 'ir-indicadores', destino: '/indicadores', texto: 'Metas, prazos cumpridos e resultado do conjunto.', icone: Gauge, so: 'veTudo' },
    { id: 'ir-equipe', destino: '/equipe', texto: 'Liberar quem pediu para entrar e definir a função de cada pessoa.', icone: Users, so: 'admin' },
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
export const ATALHOS_PADRAO = ['/inicio', '/meu-dia', '/agenda', '/intimacoes', '/processos', '/assistente', '/meu-estilo', '/parametros-escrita']
export const MAX_ATALHOS = 14

/** Telas que ninguém esconde de ninguém: sem elas a pessoa não trabalha nem cuida da própria conta. */
export const TELAS_FIXAS = ['/meu-dia', '/inicio', '/settings', '/meu-jeito', '/hierarquia']

export function podeVerNivel(nivel: Nivel, v: Visao): boolean {
  if (nivel === 'gestao') return v.veTudo || v.admin
  if (nivel === 'financeiro') return v.admin || v.financeiro === true
  if (nivel === 'admin') return v.admin
  if (nivel === 'instituto') return v.instituto
  return true
}

/** Os grupos que a pessoa enxerga, já sem as telas que não são para ela. */
export function gruposVisiveis(v: Visao, perfil: 'direito' | 'projectos' = 'direito'): GrupoMenu[] {
  if (perfil === 'projectos') {
    return gruposProjectos
      .filter(g => podeVerNivel(g.nivel, v))
      .map(g => ({ ...g, itens: g.itens.filter(i => podeVerNivel(i.nivel ?? 'todos', v)) }))
      .filter(g => g.itens.length > 0)
  }
  return gruposMenu
    .filter(g => podeVerNivel(g.nivel, v))
    .map(g => ({ ...g, itens: g.itens.filter(i => (v.sede || !SO_SEDE.includes(i.href)) && podeVerNivel(i.nivel ?? 'todos', v) && !(v.ocultas ?? []).includes(i.href)) }))
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
  '/visao-presidente': 'Todos os projectos num ecrã, com a cor de cada um, o contratado, o medido e os avisos a tratar',
  '/carteira-projectos': 'Lista dos projectos por país e sector, com cor e avanço, e filtros para encontrar depressa',
  '/contratos-obrigacoes': 'Cada contrato com partes, valor, lei e foro, e as obrigações como prazos com dono',
  '/pagamentos-fundos': 'Fila de pagamentos por estado, ligados à medição e ao projecto, com o motivo de retenção quando há',
  '/fornecedores-fundos': 'Fornecedores por estado, com o tipo, o país, os projectos e uma nota de desempenho',
  '/garantias-licencas': 'Garantias e licenças por validade, com alerta de proximidade',
  '/riscos-litigios': 'Riscos e litígios por nível, cada um com a medida proposta',
  '/documentos-fundos': 'Os documentos do projecto e o registo de quem fez o quê e quando',
  '/assistente-fundos': 'Perguntas do dia a dia respondidas em linguagem simples a partir dos dados da plataforma',
  '/estudos-governo': 'Estudos para apresentar ao governo, num molde fixo com pergunta, método, limites e fontes',
  '/biblioteca-teses': 'A biblioteca interna: repositórios de teses, cursos abertos e o catálogo de especialistas, tudo com licença',
  '/criador-projectos': 'Monta o dossiê-rascunho de um projecto para o governo: estudos, equipa e fontes, com aprovação humana',
  '/robos-governo': 'Os robôs que preparam e apresentam propostas, e a esteira por estado, sempre com uma pessoa a decidir',
  '/demonstracao-obra': 'Boletim de medição, assinaturas por nível e o que cada cargo vê, com dados de demonstração',
  '/inicio': 'A tela de entrada: o que fazer agora e todas as matérias do direito',
  '/meu-dia': 'O que vence hoje e nos próximos dias, separado por área do direito',
  '/processos-antigos': 'Trazer processos de antes da plataforma: planilha ou busca no tribunal',
  '/migracao': 'Importar tudo do sistema antigo do escritório, com opção de desfazer',
  '/dashboard': 'Imóveis e contratos com vencimento próximo, num só painel',
  '/intimacoes': 'Publicações e intimações recebidas, com o que fazer em cada uma',
  '/agenda': 'Audiências, reuniões e compromissos, com avisos por e-mail',
  '/prazos': 'Prazo certo por código: CPC, CLT, CPP, Juizados e outros',
  '/projetos': 'Casos e projetos do escritório, com tarefas dentro de cada um',
  '/processos': 'Carteira de processos com andamentos e prazos de cada um',
  '/pesquisa': 'Pesquisa e due diligence sobre pessoas e empresas em fontes públicas',
  '/leitura-do-caso': 'Contexto do caso, chance de êxito e roteiro de perguntas',
  '/monitoramento': 'Acompanhar processos no tribunal e avisar quando houver andamento',
  '/parte-adversa': 'O que se sabe da parte contrária em fontes públicas',
  '/kyc': 'Checar quem é a contraparte antes de contratar ou processar',
  '/perfil-cliente': 'Ficha de cada cliente: casos, contatos e preferências',
  '/funil': 'Clientes em potencial, da primeira conversa ao contrato',
  '/financeiro': 'Entradas, saídas e saldo do escritório',
  '/medicoes': 'Medição dos contratos de serviço do Instituto com cada plataforma, e o aviso quando o pagamento atrasa',
  '/royalties': 'Os 5% do Instituto em cada venda de serviço, e em que conta eles caem',
  '/engenharia': 'A plataforma de engenharia: matérias, consultores e cálculo de estrutura com memória de cálculo',
  '/superficie-de-ataque': 'Mapa do que um invasor alcançaria e o que fazer em cada ponto, por enquanto com dados de exemplo',
  '/aguas': 'A casa de Águas: reservatórios, leis de água e saneamento com link oficial, casos e fontes públicas',
  '/agua': 'Medição diária dos reservatórios publicada pela ANA: volume, nível e vazões, com a data em que cada número chegou',
  '/trilhas': 'Plano de estudo por nicho, montado sobre a ementa dos consultores, com a fonte de cada módulo',
  '/pesquisa-ia': 'O que a frente de IA está tentando descobrir, como mede e o que faria abandonar cada hipótese',
  '/regua': 'Quanto cada modelo erra fora da amostra e se ele bate o palpite simples de repetir o último valor',
  '/escolha-do-mercado': 'Matriz com os mercados candidatos pontuados, a fonte do dado de cada um e o que derruba cada um',
  '/caderno-de-produtos': 'Os 21 produtos do Instituto com preço médio de referência, entregas e a chancela sugerida de cada um',
  '/mapa-de-receita': 'Cada produto com quem compra, o preço quando já foi decidido, o custo de atender e o que falta para vender',
  '/saude': 'A plataforma de saúde: especialidades médicas, consultores e o lastro dos prompts',
  '/geolocalizacao': 'MVP de geolocalização no próprio titular: posição, câmera como sensor de lugar, satélites e município, tudo cifrado no aparelho',
  '/honorarios': 'Honorários combinados, cobrados e recebidos, caso por caso',
  '/horas': 'Lançar as horas trabalhadas e ver o ritmo da meta',
  '/imoveis': 'Imóveis administrados, contratos e documentos',
  '/administracao': 'Administração de locações: cobranças, repasses e reajustes',
  '/fornecedores': 'Fornecedores do escritório e dos imóveis',
  '/alertas': 'Avisos de vencimento e reajuste dos contratos de locação',
  '/legislacao': 'Ler a lei direto do Planalto, artigo por artigo',
  '/assistente': 'Perguntar, redigir peça ou comparar caminhos com a IA',
  '/modelos': 'Modelos prontos de peças e documentos do escritório',
  '/navegador': 'Abrir tribunais, diários e pesquisa sem sair da plataforma',
  '/fontes': 'Tribunais, diários e fontes oficiais em um só lugar',
  '/biblioteca': 'Tudo o que já foi pesquisado e os repositórios abertos de teses, legislação e jurisprudência',
  '/parametros-escrita': 'Tom, tamanho e estrutura das peças que o assistente escreve',
  '/meu-estilo': 'Ensinar à plataforma o seu jeito de escrever',
  '/ferramentas': 'Calculadoras, validadores e listas de verificação do dia a dia',
  '/compliance': 'LGPD, integridade e conformidade do escritório',
  '/indicadores': 'Indicadores e metas do escritório',
  '/relatorios': 'Relatórios prontos para imprimir ou exportar',
  '/trilha': 'Registro do que foi feito, com carimbo que prova a data',
  '/instituto': 'Pesquisa e estudos do Instituto THEYE',
  '/frentes-do-instituto': 'Lista das frentes do Instituto: cada uma abre direto no seu segmento',
  '/escritorios-do-projeto': 'Cadastro dos escritórios que aparecem na lista do Criar conta',
  '/agentes-instituto': 'Os agentes especialistas do acervo da casa e o catálogo dos consultores com ementa e fontes',
  '/preditiva': 'Plataforma preditiva: previsões de mercado com incerteza declarada',
  '/educacao': 'Educação e capacitação do Instituto: trilhas, cursos e materiais',
  '/ciberseguranca': 'Cibersegurança: rastros, superfície de ataque e resposta a incidentes',
  '/geomapeamento': 'Geomapeamento: camadas e mapas por tema, para análise e laudo',
  '/governo': 'Governo: estudos para órgãos e políticas públicas',
  '/civico': 'Cívico: enquetes e participação cidadã',
  '/quantum': 'Computação quântica e direito: cenários e preparo',
  '/carbono': "Carbono: Entender o mercado de carbono regulado e voluntário, com a regra e a fonte de cada número à vista.",
  '/petroleo': "Petróleo e gás: Regulação do petróleo e gás, contratos e royalties, com a norma e a fonte de cada afirmação.",
  '/psicologia': "Psicologia: Apoio a psicólogos com literatura citada e ética profissional, sem diagnosticar ninguém.",
  '/psiquiatria': "Psiquiatria: Apoio a médicos psiquiatras com literatura citada, sem diagnosticar nem prescrever.",
  '/biosseguranca': "Biossegurança: Normas de biossegurança e de pesquisa com organismos, só no lado da conformidade e da proteção.",
  '/transumanismo': "Transumanismo: Ética, direito e regulação do que une corpo e tecnologia, em pesquisa aberta e sem promessa.",
  '/marketing': "Marketing: Marketing com prova: o que se afirma tem fonte, e a lei de dados e de consumo fica à vista.",
  '/fundos-internacionais': "Plataforma, Governança, Fundos Internacionais: Governar projetos financiados por fundos internacionais: quem decide, o que foi medido e o que se presta de contas a cada financiador.",
  '/publicidade': "Publicidade: Publicidade dentro da regra: o que o código de autorregulação e a lei de consumo permitem e proíbem.",
  '/estalecas': 'Jogo da Moeda do Olho: previsões de brincadeira com crédito interno, sem dinheiro, que alimentam o estudo de calibragem',
  '/infraestrutura': "Infraestrutura e obras públicas: Obras, concessões e parcerias público-privadas, do edital à medição, com método aberto.",
  '/energia': "Energia: Setor elétrico, renováveis e transição energética, com a regra da ANEEL e o dado oficial à vista.",
  '/agronegocio': "Agronegócio: Safra, crédito rural, rastreabilidade e regra ambiental do campo, com o dado oficial de cada número.",
  '/mineracao': "Mineração: Títulos minerários, barragens e royalties da mineração, com a norma e a fonte oficial de cada dado.",
  '/transporte': "Transporte e logística: Rodovias, portos, ferrovias, frete e cadeia de suprimentos, com o dado público de cada trecho.",
  '/seguranca-publica': "Segurança pública: Estudos de segurança pública com dado oficial, sem perfilar pessoas nem prever crime de indivíduo.",
  '/cidades-inteligentes': "Cidades inteligentes: Serviços urbanos com sensor, dado aberto e privacidade desde o desenho.",
  '/financas': "Finanças, bancos e seguros: Regulação financeira, pagamentos, crédito e seguros, com a norma do Banco Central e da SUSEP à vista.",
  '/telecom': "Telecomunicações e conectividade: Redes, 5G, satélite e inclusão digital, com a regra da Anatel e o mapa de cobertura oficial.",
  '/espacial': "Espaço e satélites: Observação da Terra, satélites e economia espacial, para governo e empresa.",
  '/robotica': "Robótica e automação: Robôs, automação industrial e agentes de software, com segurança e responsabilidade definidas.",
  '/transparencia-social': "Projetos sociais: 2% de tudo o que o Instituto recebe sai primeiro para causas sociais no Brasil, com prestação de contas aberta.",
  '/ontologia-empresas': "Ontologia preditiva para empresas: O método central do Instituto aplicado ao negócio: um grafo que liga clientes, fornecedores, mercado e risco.",
  '/ia': 'IA e superinteligência: modelos, agentes e consultores',
  '/consultores': 'Um consultor de IA por área do direito diz o que fazer primeiro',
  '/estudos': 'Estudos para entidades, órgãos e associações',
  '/enquetes': 'Enquetes sobre temas do direito',
  '/previsoes': 'Previsões e riscos da carteira',
  '/solucoes': 'A plataforma oferecida a outros escritórios (vertente comercial)',
  '/nuvem': 'Arquivos do escritório guardados na nuvem',
  '/consumo': 'Quanto cada pessoa consome de IA e quanto custa',
  '/equipe': 'Pessoas do escritório: liberar acesso e definir a função',
  '/banco-de-senhas': 'Senhas do escritório, guardadas embaralhadas com a frase-mestra',
  '/hierarquia': 'Quem é sócio, gestor, pleno e júnior — o cargo decide o que cada pessoa vê',
  '/settings': 'Configurações da conta e da plataforma',
  '/meu-jeito': 'Escolher o que aparece no seu menu, onde a plataforma abre e o tamanho da letra',
}

/**
 * Pedido de M em 14/11/2026 08h33: "A aba de engenharia tá com a plataforma de direito dentro."
 * Cada frente do Instituto é uma plataforma à parte. Quem está numa tela de uma frente vê no menu só as
 * telas dessa frente e o caminho de volta para as outras frentes: nada de "Processos", "Escrever peças"
 * ou o nome do escritório de advocacia. O direito continua com o menu dele, sem nenhuma mudança.
 */
export interface Frente { id: string; nome: string; itens: Tela[] }
export const FRENTES: Frente[] = [
  { id: 'instituto', nome: 'Plataforma do Instituto', itens: [
    { icon: LayoutGrid, label: 'Frentes do Instituto', href: '/frentes-do-instituto' },
    { icon: FlaskConical, label: 'Administração do Instituto', href: '/instituto' },
    { icon: Building2, label: 'Escritórios do projeto', href: '/escritorios-do-projeto' },
    { icon: Users, label: 'Agentes do Instituto', href: '/agentes-instituto' },
    { icon: BookOpen, label: 'Caderno de produtos', href: '/caderno-de-produtos' },
    { icon: Vote, label: 'Enquetes do direito', href: '/enquetes' },
    { icon: Store, label: 'Soluções jurídicas', href: '/solucoes' },
    { icon: Target, label: 'Escolha do mercado', href: '/escolha-do-mercado' },
    { icon: Coins, label: 'Mapa de receita', href: '/mapa-de-receita' },
    { icon: Banknote, label: 'Royalties', href: '/royalties' },
    { icon: ClipboardList, label: 'Medições de contratos', href: '/medicoes' },
  ] },
  { id: 'engenharia', nome: 'Engenharia', itens: [{ icon: Wrench, label: 'Engenharia', href: '/engenharia' }] },
  { id: 'saude', nome: 'Saúde', itens: [{ icon: HeartPulse, label: 'Saúde', href: '/saude' }] },
  { id: 'geolocalizacao', nome: 'Geolocalização', itens: [{ icon: MapPin, label: 'Geolocalização', href: '/geolocalizacao' }] },
  { id: 'predicao', nome: 'Predição', itens: [
    { icon: TrendingUp, label: 'Predição (mercado)', href: '/preditiva' },
    { icon: Ruler, label: 'Régua de acerto dos modelos', href: '/regua' },
    { icon: Vote, label: 'Jogo da Moeda do Olho', href: '/estalecas' },
  ] },
  { id: 'aguas', nome: 'Águas', itens: [
    { icon: Droplets, label: 'Águas', href: '/aguas' },
    { icon: Droplets, label: 'Água dos reservatórios (ANA)', href: '/agua' },
  ] },
  { id: 'educacao', nome: 'Educação e capacitação', itens: [
    { icon: GraduationCap, label: 'Educação e capacitação', href: '/educacao' },
    { icon: GraduationCap, label: 'Trilhas de estudo', href: '/trilhas' },
  ] },
  { id: 'ciberseguranca', nome: 'Cibersegurança', itens: [
    { icon: ShieldCheck, label: 'Cibersegurança', href: '/ciberseguranca' },
    { icon: ShieldCheck, label: 'Superfície de ataque', href: '/superficie-de-ataque' },
  ] },
  { id: 'geomapeamento', nome: 'Geomapeamento', itens: [
    { icon: Compass, label: 'Geomapeamento', href: '/geomapeamento' },
    { icon: Droplets, label: 'Água dos reservatórios (ANA)', href: '/agua' },
  ] },
  { id: 'governo', nome: 'Governo', itens: [
    { icon: Building2, label: 'Governo', href: '/governo' },
    { icon: GraduationCap, label: 'Estudos para entidades', href: '/estudos' },
  ] },
  { id: 'civico', nome: 'Cívico', itens: [{ icon: Vote, label: 'Cívico', href: '/civico' }] },
  { id: 'quantum', nome: 'Computação quântica', itens: [{ icon: FlaskConical, label: 'Computação quântica', href: '/quantum' }] },
  { id: 'carbono', nome: "Carbono", itens: [{ icon: FlaskConical, label: "Carbono", href: '/carbono' }] },
  { id: 'petroleo', nome: "Petróleo e gás", itens: [{ icon: FlaskConical, label: "Petróleo e gás", href: '/petroleo' }] },
  { id: 'psicologia', nome: "Psicologia", itens: [{ icon: FlaskConical, label: "Psicologia", href: '/psicologia' }] },
  { id: 'psiquiatria', nome: "Psiquiatria", itens: [{ icon: FlaskConical, label: "Psiquiatria", href: '/psiquiatria' }] },
  { id: 'biosseguranca', nome: "Biossegurança", itens: [{ icon: FlaskConical, label: "Biossegurança", href: '/biosseguranca' }] },
  { id: 'transumanismo', nome: "Transumanismo", itens: [{ icon: FlaskConical, label: "Transumanismo", href: '/transumanismo' }] },
  { id: 'marketing', nome: "Marketing", itens: [{ icon: FlaskConical, label: "Marketing", href: '/marketing' }] },
  { id: 'publicidade', nome: "Publicidade", itens: [{ icon: FlaskConical, label: "Publicidade", href: '/publicidade' }] },
  { id: 'infraestrutura', nome: "Infraestrutura e obras públicas", itens: [{ icon: Building2, label: "Infraestrutura e obras públicas", href: '/infraestrutura' }] },
  { id: 'energia', nome: "Energia", itens: [{ icon: FlaskConical, label: "Energia", href: '/energia' }] },
  { id: 'agronegocio', nome: "Agronegócio", itens: [{ icon: FlaskConical, label: "Agronegócio", href: '/agronegocio' }] },
  { id: 'mineracao', nome: "Mineração", itens: [{ icon: FlaskConical, label: "Mineração", href: '/mineracao' }] },
  { id: 'transporte', nome: "Transporte e logística", itens: [{ icon: FlaskConical, label: "Transporte e logística", href: '/transporte' }] },
  { id: 'seguranca-publica', nome: "Segurança pública", itens: [{ icon: ShieldCheck, label: "Segurança pública", href: '/seguranca-publica' }] },
  { id: 'cidades', nome: "Cidades inteligentes", itens: [{ icon: Compass, label: "Cidades inteligentes", href: '/cidades-inteligentes' }] },
  { id: 'financas', nome: "Finanças, bancos e seguros", itens: [{ icon: Wallet, label: "Finanças, bancos e seguros", href: '/financas' }] },
  { id: 'telecom', nome: "Telecomunicações e conectividade", itens: [{ icon: FlaskConical, label: "Telecomunicações e conectividade", href: '/telecom' }] },
  { id: 'espacial', nome: "Espaço e satélites", itens: [{ icon: Compass, label: "Espaço e satélites", href: '/espacial' }] },
  { id: 'robotica', nome: "Robótica e automação", itens: [{ icon: FlaskConical, label: "Robótica e automação", href: '/robotica' }] },
  { id: 'projetos-sociais', nome: "Projetos sociais", itens: [{ icon: HeartPulse, label: "Projetos sociais", href: '/transparencia-social' }] },
  { id: 'ontologia', nome: "Ontologia preditiva para empresas", itens: [{ icon: Gauge, label: "Ontologia preditiva para empresas", href: '/ontologia-empresas' }] },
  { id: 'fundos', nome: "Plataforma, Governança, Fundos Internacionais", itens: [
    { icon: Building2, label: "Plataforma, Governança, Fundos Internacionais", href: '/fundos-internacionais' },
    { icon: Gauge, label: 'Visão do presidente', href: '/visao-presidente' },
    { icon: FolderKanban, label: 'Carteira de projectos', href: '/carteira-projectos' },
    { icon: FileText, label: 'Contratos e obrigações', href: '/contratos-obrigacoes' },
    { icon: Wallet, label: 'Pagamentos', href: '/pagamentos-fundos' },
    { icon: Store, label: 'Fornecedores', href: '/fornecedores-fundos' },
    { icon: KeySquare, label: 'Garantias e licenças', href: '/garantias-licencas' },
    { icon: Radar, label: 'Riscos e litígios', href: '/riscos-litigios' },
    { icon: Library, label: 'Documentos e auditoria', href: '/documentos-fundos' },
    { icon: MessageSquare, label: 'Assistente', href: '/assistente-fundos' },
    { icon: Landmark, label: 'Estudos para o governo', href: '/estudos-governo' },
    { icon: BookOpen, label: 'Biblioteca e especialistas', href: '/biblioteca-teses' },
    { icon: FolderKanban, label: 'Criador de projectos para o governo', href: '/criador-projectos' },
    { icon: Network, label: 'Robôs de projectos para o governo', href: '/robos-governo' },
    { icon: Ruler, label: 'Medição de obra por nível', href: '/demonstracao-obra' },
  ] },
  { id: 'ia', nome: 'IA e superinteligência', itens: [
    { icon: FlaskConical, label: 'IA e superinteligência', href: '/ia' },
    { icon: FlaskConical, label: 'Agenda de pesquisa em IA', href: '/pesquisa-ia' },
  ] },
]
/** A frente da tela aberta, ou nada quando a tela é do direito (ou da administração). */
/** As telas da Plataforma do Instituto (saíram do menu do direito em 19/11/2026). */
export function TELAS_DO_INSTITUTO(): Tela[] {
  return FRENTES.find(f => f.id === 'instituto')?.itens ?? []
}

export function frenteDe(pathname: string): Frente | undefined {
  return FRENTES.find(f => f.itens.some(i => pathname === i.href || pathname.startsWith(`${i.href}/`)))
}
