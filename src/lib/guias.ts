// Guia de primeira visita de cada tela (pedido de M, 12/11/2026): quem usa é advogado, não é de TI.
// Cada guia tem de 3 a 5 passos numerados, em frases curtas e sem jargão técnico.

export interface Guia {
  titulo: string
  passos: string[]
}

export const GUIAS: Record<string, Guia> = {
  '/inicio': {
    titulo: 'Como começar',
    passos: [
      'Esta é a sua tela de entrada. Ela mostra o que precisa da sua atenção hoje.',
      'O menu fica à esquerda. Passe o cursor sobre qualquer item e aparece a explicação do que ele faz.',
      'Comece por "Meu dia" para ver prazos e tarefas, ou por "Meus processos" para ver a sua carteira.',
      'Em dúvida, passe o cursor sobre o botão: toda ação tem uma dica dizendo o que acontece ao clicar.',
    ],
  },
  '/engenharia': {
    titulo: 'Como usar a Engenharia',
    passos: [
      'Esta é a plataforma de engenharia, ainda em demonstração. Ela funciona como a do direito, com as palavras da engenharia.',
      'Em "Cálculo estrutural", preencha os dados da viga: a conta aparece inteira, passo a passo, com o item da norma.',
      'Use "Baixar memória de cálculo" para levar a conta ao engenheiro responsável, que confere e assina com ART.',
      'Em "Matérias e consultores", busque por matéria ou pela norma (por exemplo, NBR 6118).',
    ],
  },
  '/meu-dia': {
    titulo: 'Como usar o Meu dia',
    passos: [
      'Aqui estão os seus prazos, intimações e tarefas de hoje, separados por tipo de direito.',
      'O que vence primeiro aparece em cima. Vermelho é urgente, amarelo é atenção.',
      'Clique em um item para abrir o processo ou a peça ligada a ele.',
      'Use "Imprimir" para levar a lista do dia a uma reunião.',
    ],
  },
  '/processos': {
    titulo: 'Como usar Meus processos (carteira de processos)',
    passos: [
      'Esta é a sua carteira. Você vê os processos sob a sua responsabilidade; sócios e gestor veem os de todo o escritório.',
      'Use a busca para achar um processo pelo número, pelo cliente ou pela parte contrária.',
      'O robô consulta o CNJ a cada 4 horas e avisa quando há movimentação nova.',
      'Clique em um processo para ver prazos, peças e histórico.',
    ],
  },
  '/processos-antigos': {
    titulo: 'Como inserir processos antigos',
    passos: [
      'Use esta tela para trazer os processos que você já acompanhava antes de entrar na plataforma.',
      'Escreva o seu nome do jeito que aparece no Diário Oficial e, se souber, a sua OAB.',
      'Clique em "Buscar agora". O sistema procura os seus processos no CNJ e mostra andamentos, prazos e intimações.',
      'Os prazos aparecem separados por tipo de direito (cível, trabalhista, penal e outros).',
      'Use "Pôr todos os prazos na agenda" e cadastre os processos achados. Até cadastrar, só você vê esta lista.',
    ],
  },
  '/intimacoes': {
    titulo: 'Como usar as Intimações',
    passos: [
      'Aqui chegam as publicações dos seus processos, lidas pelo robô.',
      'Cada intimação já vem com o prazo contado pelo código certo.',
      'Depois de ler, clique em "Marcar como lida" para ela sair da lista de pendentes.',
    ],
  },
  '/prazos': {
    titulo: 'Como usar a calculadora de prazos',
    passos: [
      'Escolha o tipo de direito (processo civil, trabalhista, penal e outros).',
      'Escolha o ato (contestação, apelação, embargos e outros). Dá para procurar pelo nome.',
      'Informe a data da intimação. A tela mostra a data final do prazo.',
      'Confira sempre no tribunal: a conta é apoio, a responsabilidade pelo prazo é do advogado.',
    ],
  },
  '/assistente': {
    titulo: 'Como usar o Assistente jurídico',
    passos: [
      'Escreva a sua pergunta ou o pedido de peça, como escreveria para um colega.',
      'Envie. O agente lê a lei no site do Planalto e responde citando o artigo e a lei.',
      'Você pode copiar o texto, baixar em Word já formatado ou guardar na biblioteca.',
      'A resposta é sempre um rascunho: revise, corrija e só então use. O que estiver entre colchetes é para você conferir.',
    ],
  },
  '/agenda': {
    titulo: 'Como usar a Agenda',
    passos: [
      'A agenda reúne audiências, prazos e compromissos.',
      'O calendário mostra o mês. O botão "Hoje" volta para o mês atual.',
      'Nas outras ações da agenda, conecte ao Outlook ou ao Google Agenda: os prazos passam a aparecer no seu celular sozinhos.',
    ],
  },
  '/equipe': {
    titulo: 'Como organizar a equipe',
    passos: [
      'Esta tela é de quem administra o escritório.',
      'Se alguém pediu para entrar, o pedido aparece no topo: toque em "Liberar para trabalhar" ou em "Recusar".',
      'Na lista "Pessoas com acesso", no campo "Função", escolha o que cada pessoa pode fazer: administrar, operar ou só ler.',
      'No campo "Cargo na hierarquia", escolha o que ela pode ver: sócio e gestor veem tudo; pleno e júnior veem só o que é deles.',
      'A mudança é salva na hora. Não há botão de salvar.',
    ],
  },
  '/honorarios': {
    titulo: 'Como usar os Honorários',
    passos: [
      'Aqui ficam os honorários de cada caso: o combinado, o recebido e o que falta.',
      'Você vê os casos sob a sua responsabilidade; sócios e gestor veem todos.',
      'Antes de clicar em um botão, passe o cursor sobre ele: a dica diz o que vai acontecer.',
    ],
  },
  '/horas': {
    titulo: 'Como lançar horas',
    passos: [
      'Escolha o caso em que você trabalhou.',
      'Informe o tempo e descreva em uma frase o que fez.',
      'Clique em "Lançar". As horas entram no relatório do caso e do mês.',
    ],
  },
  '/relatorios': {
    titulo: 'Como ler os Relatórios',
    passos: [
      'Os relatórios mostram os números do período: processos, prazos, horas e honorários.',
      'Você vê os números do que é seu; sócios e gestor veem os do escritório inteiro.',
      'Use "Baixar o PDF deste mês" ou "Imprimir" para levar o relatório a uma reunião.',
    ],
  },
  '/leitura-do-caso': {
    titulo: 'Como usar a Leitura do caso',
    passos: [
      'Escolha um processo para o sistema ler o que já foi publicado nele.',
      'A tela mostra o contexto, a estatística do tribunal em casos parecidos e uma faixa de acordo.',
      'É apoio à decisão: a previsão vem com margem de incerteza e não substitui a sua análise.',
    ],
  },
  '/migracao': {
    titulo: 'Como trazer dados do sistema antigo',
    passos: [
      'Escolha no computador os arquivos do sistema antigo (Excel, CSV, Word, PDF) ou arraste para esta tela.',
      'A plataforma reconhece o que é processo, cliente, prazo e financeiro. Se reconhecer errado, corrija na própria tabela.',
      'Escolha quem fica responsável pelos processos e grave.',
      'Nada é apagado. Se algo sair errado, use "Desfazer" para voltar ao que era antes.',
    ],
  },
  '/parametros-escrita': {
    titulo: 'Como ajustar o jeito de escrever do robô',
    passos: [
      'Aqui você vê e ajusta as regras que o robô segue ao rascunhar peças.',
      'Cada setor do direito tem um redator titular, inspirado no método de um grande jurista.',
      'Mude só o que tiver certeza e clique em "Salvar parâmetros". Vale a partir da próxima peça.',
    ],
  },
}

export const chaveGuia = (caminho: string) => `lsm-guia-visto:${caminho}`
