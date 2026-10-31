// Passo 52 (Onda E): tour guiado "Como usar esta tela", 3 passos por tela, em português simples.
export type PassoTour = { titulo: string; texto: string; seletor?: string }
export const TOURS: Record<string, { nome: string; passos: PassoTour[] }> = {
  '/dashboard': { nome: 'Painel', passos: [
    { titulo: 'Os números são botões', texto: 'Toque em qualquer número do topo para abrir a lista por trás dele (contratos vencendo, prazos, casos).', seletor: '[data-testid=indicadores-painel], main section' },
    { titulo: 'Metas do mês', texto: 'Cada função tem a sua barra: verde no ritmo, amarela em atenção, vermelha abaixo do esperado até hoje.', seletor: '[data-testid=metas-do-mes]' },
    { titulo: 'Quer ver só o seu dia?', texto: 'Use "Meu dia" no menu: lá ficam os prazos, tarefas e o consultor da semana da sua função.', seletor: 'a[href="/meu-dia"]' } ] },
  '/imoveis': { nome: 'Imóveis', passos: [
    { titulo: 'Busque antes de cadastrar', texto: 'Digite rua, matrícula ou cliente na busca; se o imóvel já existe, abra em vez de duplicar.', seletor: 'input[type=search], input[placeholder*="Buscar"]' },
    { titulo: 'Novo imóvel ou importar', texto: 'Um imóvel: botão "Novo imóvel". Muitos de uma vez: "Importar CSV" aceita a planilha da imobiliária.', seletor: 'a[href="/imoveis/novo"], a[href="/imoveis/importar"]' },
    { titulo: 'Sigilo', texto: 'Dentro do imóvel, o cadeado restringe quem vê documentos e contratos daquele imóvel.' } ] },
  '/contratos': { nome: 'Contratos', passos: [
    { titulo: 'A IA lê o PDF', texto: 'Em "Novo contrato", envie o PDF: partes, datas, valor e índice são preenchidos para você conferir.', seletor: 'a[href="/contratos/novo"]' },
    { titulo: 'Cores dos prazos', texto: 'Vermelho vence em 30 dias, amarelo em 90. Reajuste pelo IGP-M e renovatória aparecem dentro do contrato.' },
    { titulo: 'Ligue ao imóvel e ao caso', texto: 'Cada contrato aponta para um imóvel e pode virar um caso em "Casos e projetos" com um clique.' } ] },
  '/projetos': { nome: 'Casos e projetos', passos: [
    { titulo: 'Comece por um modelo', texto: 'Escolha um dos 6 modelos (ação, contrato, due diligence…) e as etapas são criadas sozinhas.', seletor: 'button:has-text("Novo caso"), [data-testid=novo-caso]' },
    { titulo: 'Arraste as etapas', texto: 'A fazer, em revisão, feito: arraste o cartão. Prazos vencidos ficam em vermelho e vão para Alertas.' },
    { titulo: 'Portal e honorários', texto: 'Dentro do caso: link do Portal para o cliente acompanhar, honorários previstos e cobrança por PIX.' } ] },
  '/agenda': { nome: 'Agenda', passos: [
    { titulo: 'Tudo em um calendário', texto: 'Prazos de casos, intimações e compromissos no mesmo mês. Toque em um dia para ver e criar.' },
    { titulo: 'No seu Outlook', texto: '"Conectar ao Outlook" assina a agenda; cada prazo novo também chega por e-mail como convite.', seletor: 'button:has-text("Outlook"), a:has-text("Outlook")' },
    { titulo: 'Semana em PDF', texto: 'Baixe a semana ou receba toda sexta às 17h; dá para importar um .ics exportado do Outlook sem duplicar.', seletor: '[data-testid=semana-pdf]' } ] },
  '/intimacoes': { nome: 'Intimações', passos: [
    { titulo: 'Chegam às 7h', texto: 'Todo dia a plataforma busca as intimações das OABs cadastradas no DJEN/CNJ e calcula o prazo em dias úteis.' },
    { titulo: 'Urgência primeiro', texto: 'A lista vem por urgência; cada intimação já cria uma tarefa para o responsável.' },
    { titulo: 'Faltam OABs?', texto: 'Cadastre as OABs da equipe em Configurações para a busca funcionar para todos.', seletor: 'a[href="/configuracoes"]' } ] },
  '/assistente': { nome: 'Assistente jurídico', passos: [
    { titulo: 'Escolha o agente', texto: 'Cada botão é um especialista (pesquisa, peças, cálculo…). Modo Redigir usa o seu estilo de escrita.', seletor: '[role=tablist], [data-testid=agentes]' },
    { titulo: 'Avalie a resposta', texto: 'Marque útil ou não útil: isso entra em Indicadores e melhora o acompanhamento.' },
    { titulo: 'Gasto controlado', texto: 'Cada resposta custa centavos; o total e a projeção do mês ficam em Consumo.', seletor: 'a[href="/consumo"]' } ] },
  '/meu-dia': { nome: 'Meu dia', passos: [
    { titulo: 'Diga a sua função', texto: 'Sócia, advogada, estagiário, secretária ou financeiro: a tela e as metas mudam conforme a escolha.', seletor: 'select, [role=radiogroup]' },
    { titulo: 'Consultor da semana', texto: 'Toda segunda um consultor da sua função sugere 5 ações; marque as que fez.' },
    { titulo: 'Calculadora de prazos', texto: 'Conte dias úteis com feriados do Rio sem sair da tela.' } ] },
  '/honorarios': { nome: 'Honorários', passos: [
    { titulo: 'Régua de cobrança', texto: 'Cada caso mostra previsto, recebido e atraso; a carta de cobrança sai pronta.' },
    { titulo: 'Cobrar por PIX', texto: 'Gera QR e copia e cola com a chave do escritório (Configurações); a baixa concilia sozinha.' },
    { titulo: 'Rentabilidade', texto: 'Horas lançadas × valor-hora contra o honorário: veja quais casos dão lucro.' } ] },
  '/configuracoes': { nome: 'Configurações', passos: [
    { titulo: 'Chave de IA e PIX', texto: 'A chave Anthropic liga o Assistente; a chave PIX liga a cobrança. Só administradores editam.' },
    { titulo: 'Segurança', texto: 'Ative o 2FA (obrigatório para administradores a partir de 06/11/2026) e revise os acessos.' },
    { titulo: 'Seu estilo', texto: 'Envie até 10 peças suas: o Assistente passa a redigir no seu estilo.' } ] },
}
export function tourDaRota(pathname: string) {
  const chave = Object.keys(TOURS).find(k => pathname === k || pathname.startsWith(k + '/'))
  return chave ? { rota: chave, ...TOURS[chave] } : null
}
