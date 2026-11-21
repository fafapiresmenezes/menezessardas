# -*- coding: utf-8 -*-
# 500 agentes de produção de engenharia (pedido de M, 20/11/2026): 25 disciplinas x 20 funções de produção.
# Cada agente traz entradas, método passo a passo, saídas com formato, verificações, indicadores, normas por país
# (Brasil, Angola, Namíbia, Egito, Europa, EAU, EUA, internacional) e a instrução completa para colar num agente.
# Base: as 22 disciplinas da biblioteca de prompts v1 (dados_disciplinas_v1.py) + 3 disciplinas novas.
# Uso: python3 engenharia/ferramentas/gerar_agentes_500.py
import hashlib, json, os, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import dados_disciplinas_v1 as base  # noqa: E402
from dados_normas import PAISES, CATEGORIAS, NOTAS_PAIS  # noqa: E402

RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
EMITIDO = '2026-11-20'

NOVAS = [
    dict(id='pontes-obras-de-arte', nome='Pontes, viadutos e obras de arte especiais',
         entregaveis=['concepção estrutural e método construtivo', 'modelo de grelha ou de elementos finitos', 'planta de formas e armação de superestrutura, mesoestrutura e infraestrutura', 'aparelhos de apoio e juntas', 'plano de inspeção'],
         calculos=['trem-tipo e linhas de influência', 'efeitos de temperatura, retração e fluência', 'protensão e perdas', 'fadiga', 'impacto e frenagem', 'fases construtivas (balanços sucessivos, lançamento incremental)'],
         interfaces=['geotecnia (fundações em leito de rio)', 'hidrologia (cheia de projeto e erosão de pilares)', 'rodovia (geometria e gabarito)', 'ambiental'],
         dados=['levantamento batimétrico', 'sondagens no leito', 'série de vazões e cotas de cheia']),
    dict(id='portos-maritimas', nome='Obras marítimas, portos e terminais',
         entregaveis=['arranjo geral do terminal', 'projeto de cais, píer ou dolfins', 'quebra-mar e proteção costeira', 'dragagem e bota-fora', 'defensas e cabeços de amarração'],
         calculos=['clima de ondas e onda de projeto', 'atracação e amarração (energia de atracação)', 'estabilidade de enrocamento', 'estacas sob carga lateral', 'corrosão e vida útil em ambiente marinho'],
         interfaces=['navegação e autoridade portuária', 'geotecnia marinha', 'ambiental (dragagem e fauna)', 'operação do terminal'],
         dados=['série de ondas e ventos (reanálise ERA5)', 'marés e correntes', 'batimetria e sondagens marinhas']),
    dict(id='telecom-data-centers', nome='Telecomunicações, cabeamento e data centers',
         entregaveis=['arquitetura de rede e de cabeamento', 'salas técnicas e encaminhamentos', 'projeto de data center (energia, refrigeração, segurança)', 'plano de redundância (nível Tier)', 'caderno de testes de certificação'],
         calculos=['balanço de potência e de refrigeração (PUE)', 'redundância N, N+1, 2N', 'orçamento de perdas ópticas', 'dimensionamento de UPS e geradores'],
         interfaces=['elétrica de potência', 'climatização', 'segurança contra incêndio (supressão a gás)', 'cibersegurança'],
         dados=['carga de TI prevista por rack', 'clima local (temperatura de bulbo úmido)', 'disponibilidade exigida pelo cliente']),
]

DISCIPLINAS = [dict(d) for d in base.DISCIPLINAS] + NOVAS

# normas por país que valem para cada disciplina (categorias da matriz)
CAT = {
    'estrutural-concreto': ['acoes', 'vento', 'sismo', 'concreto', 'materiais'],
    'estrutural-aco': ['acoes', 'vento', 'sismo', 'aco'],
    'estrutural-madeira': ['acoes', 'vento', 'madeira'],
    'geotecnica-fundacoes': ['fundacoes', 'acoes'],
    'hidrossanitaria-predial': ['hidraulica_predial', 'edificacao'],
    'saneamento-redes': ['saneamento', 'ambiente'],
    'drenagem-urbana': ['saneamento', 'rodovias'],
    'recursos-hidricos': ['saneamento', 'barragens', 'ambiente'],
    'eletrica-predial': ['eletrica_bt', 'spda'],
    'eletrica-potencia': ['eletrica_mt', 'energia_renovavel'],
    'mecanica-hvac': ['hvac_energia', 'edificacao'],
    'mecanica-maquinas': ['seguranca_trabalho', 'qualidade'],
    'transportes-rodovias': ['rodovias'],
    'construcao-planejamento': ['planejamento', 'contratos', 'seguranca_trabalho'],
    'ambiental-licenciamento': ['ambiente'],
    'seguranca-do-trabalho': ['seguranca_trabalho'],
    'materiais-tecnologia': ['materiais', 'concreto'],
    'energia-renovavel': ['energia_renovavel', 'eletrica_mt'],
    'geomatica-sensoriamento': ['geomatica'],
    'industrial-processos': ['qualidade', 'seguranca_trabalho'],
    'mineracao-barragens': ['barragens', 'fundacoes', 'ambiente'],
    'incendio-e-emergencia': ['incendio', 'edificacao'],
    'pontes-obras-de-arte': ['pontes', 'concreto', 'fundacoes', 'sismo'],
    'portos-maritimas': ['portos', 'fundacoes', 'ambiente'],
    'telecom-data-centers': ['telecom_dados', 'eletrica_bt', 'hvac_energia'],
}

# 20 funções de produção. extra = categorias de normas que a função acrescenta.
FUNCOES = [
 dict(id='dados-de-entrada', nome='Levantamento e saneamento dos dados de entrada', extra=['geomatica'],
  objetivo='Reunir, conferir e congelar tudo o que o projeto precisa saber antes de calcular.',
  metodo=['Listar os dados exigidos pela disciplina e pela norma do país da obra', 'Conferir origem, data e unidade de cada dado (topografia, sondagem, cargas, requisitos do dono)', 'Marcar lacuna, conflito e dado sem fonte; propor ensaio ou levantamento para cada lacuna', 'Emitir a base de premissas com número de revisão'],
  saidas=['base de premissas revisada (PDF e planilha)', 'lista de lacunas com ensaio proposto e custo estimado'],
  verificacoes=['nenhum dado sem fonte e sem data', 'unidades no Sistema Internacional', 'datum e sistema de coordenadas declarados'],
  kpis=['% de dados com fonte', 'n.º de lacunas abertas']),
 dict(id='concepcao', nome='Concepção e estudo de alternativas', extra=['custos'],
  objetivo='Comparar pelo menos três soluções e recomendar uma, com custo, prazo, risco e carbono lado a lado.',
  metodo=['Definir critérios e pesos com o dono antes de comparar', 'Esboçar cada alternativa com pré-dimensionamento de ordem de grandeza', 'Estimar custo (classe 5 da AACE, faixa larga), prazo e emissões de cada uma', 'Montar matriz de decisão e análise de sensibilidade dos pesos'],
  saidas=['relatório de alternativas', 'matriz de decisão em planilha', 'croquis de cada alternativa'],
  verificacoes=['as alternativas cumprem os requisitos mínimos de norma', 'a recomendação muda se os pesos variarem 20%? dizer'],
  kpis=['custo por unidade funcional (por m², por km, por m³/s)', 'carbono incorporado estimado']),
 dict(id='pre-dimensionamento', nome='Pré-dimensionamento', extra=[],
  objetivo='Fixar as dimensões iniciais de cada elemento por regras de ordem de grandeza conferíveis à mão.',
  metodo=['Aplicar relações de esbeltez, taxas e vazões típicas da disciplina', 'Conferir as dimensões contra limites mínimos da norma do país', 'Registrar a regra usada em cada elemento para rastreio'],
  saidas=['tabela de pré-dimensionamento por elemento', 'planta-esquema com dimensões'],
  verificacoes=['dimensão mínima de norma respeitada', 'compatível com a arquitetura e as interferências conhecidas'],
  kpis=['% de elementos pré-dimensionados', 'desvio médio entre pré e dimensionamento final (medido depois)']),
 dict(id='modelagem-analise', nome='Modelo de cálculo e análise', extra=['acoes'],
  objetivo='Montar o modelo de análise (estrutural, hidráulico, elétrico ou térmico) e extrair os esforços ou grandezas de projeto.',
  metodo=['Escolher o tipo de modelo e justificar as simplificações', 'Lançar geometria, materiais, apoios e condições de contorno', 'Aplicar ações e combinações conforme a norma do país da obra', 'Rodar, conferir equilíbrio global e ordem de grandeza por conta à mão', 'Exportar envoltórias e resultados por elemento'],
  saidas=['arquivo do modelo (formato nativo e IFC Structural Analysis View quando couber)', 'relatório de análise com conferência à mão'],
  verificacoes=['soma de reações = soma de cargas (erro < 1%)', 'deslocamentos e grandezas dentro do esperado por conta simplificada'],
  kpis=['erro de equilíbrio global', 'n.º de combinações analisadas']),
 dict(id='dimensionamento', nome='Dimensionamento e verificação', extra=[],
  objetivo='Dimensionar e verificar cada elemento nos estados-limites (ou critérios equivalentes da disciplina), com memória conferível.',
  metodo=['Para cada elemento, aplicar a verificação da norma do país, com cláusula citada', 'Registrar fórmula, valores substituídos com unidade e resultado', 'Comparar com a norma de referência internacional quando o contrato pedir (ex.: Eurocódigo x ACI)', 'Marcar cada elemento como aprovado, aprovado com ressalva ou reprovado'],
  saidas=['memória de cálculo por elemento (PDF lastreado)', 'tabela-resumo de taxa de aproveitamento'],
  verificacoes=['taxa de aproveitamento ≤ 1,00 em todos os elementos', 'cláusula da norma citada em cada verificação'],
  kpis=['taxa de aproveitamento média e máxima', '% de elementos reprovados']),
 dict(id='projeto-detalhado', nome='Projeto detalhado (executivo) automático', extra=[],
  objetivo='Gerar o projeto executivo completo: pranchas, detalhes, tabelas e notas, no nível em que a obra executa sem perguntar.',
  metodo=['Partir do dimensionamento aprovado; nada é desenhado sem cálculo de origem', 'Gerar plantas, cortes, elevações e detalhes por regras de detalhamento da norma do país', 'Detalhar todos os pontos singulares (nós, aberturas, juntas, transições)', 'Gerar tabelas (armaduras, peças, equipamentos, circuitos) direto do modelo', 'Aplicar carimbo, legenda, revisão e lista de desenhos'],
  saidas=['pranchas em DWG/DXF e PDF', 'tabelas de materiais em planilha', 'lista de desenhos com revisão'],
  verificacoes=['cada detalhe ligado ao cálculo que o originou', 'regras de detalhamento (cobrimento, ancoragem, espaçamento, folgas) conferidas', 'campo de assinatura e registro do responsável técnico'],
  kpis=['pranchas emitidas / previstas', 'n.º de RFIs (dúvidas da obra) por prancha']),
 dict(id='modelagem-bim', nome='Modelagem BIM e gestão da informação', extra=['bim'],
  objetivo='Produzir o modelo da disciplina no nível de informação exigido, pronto para coordenação, quantitativos e obra.',
  metodo=['Ler o plano de execução BIM (BEP) e os requisitos de informação do dono (EIR)', 'Modelar no nível de informação pedido (LOIN) com classificação e propriedades', 'Exportar IFC conforme a ISO 16739 e validar o arquivo', 'Publicar no ambiente comum de dados (CDE) com estado e revisão'],
  saidas=['modelo nativo e IFC validado', 'relatório de validação de propriedades', 'registro no CDE'],
  verificacoes=['IFC abre sem erro e mantém propriedades', 'classificação preenchida em todos os objetos', 'coordenadas e origem do projeto corretas'],
  kpis=['% de objetos com propriedades completas', 'n.º de erros de validação do IFC']),
 dict(id='compatibilizacao', nome='Compatibilização e detecção de interferências', extra=['bim'],
  objetivo='Achar e resolver os choques entre disciplinas antes que virem retrabalho na obra.',
  metodo=['Federar os modelos das disciplinas', 'Rodar detecção de interferências com tolerâncias por par de disciplinas', 'Agrupar choques por causa e propor solução com dono da ação', 'Acompanhar até fechar e registrar em formato BCF'],
  saidas=['relatório de interferências (BCF e PDF)', 'matriz de responsabilidades por choque'],
  verificacoes=['falso positivo filtrado (tolerância declarada)', 'nenhum choque crítico aberto na emissão para obra'],
  kpis=['choques abertos por semana', 'tempo médio de resolução']),
 dict(id='quantitativos', nome='Quantitativos de materiais e serviços', extra=['medicao'],
  objetivo='Levantar as quantidades do modelo e dos desenhos pela regra de medição do contrato, com rastreio até o elemento.',
  metodo=['Escolher a regra de medição do contrato (SINAPI, NRM2, POMI, CESMM4, ASAQS, ICMS)', 'Extrair quantidades do modelo por classificação e conferir 10% por amostragem manual', 'Aplicar perdas e sobras declaradas por material', 'Montar a lista de quantidades (BoQ) com código, unidade e critério'],
  saidas=['lista de quantidades (BoQ) em planilha', 'relatório de conferência por amostragem'],
  verificacoes=['diferença modelo x amostragem manual < 2%', 'regra de medição citada em cada item', 'perdas declaradas e não escondidas no preço'],
  kpis=['desvio da amostragem', 'itens sem critério de medição']),
 dict(id='especificacao', nome='Especificação técnica e caderno de encargos', extra=['materiais', 'qualidade'],
  objetivo='Escrever o que deve ser comprado e como deve ser executado e recebido, sem item genérico.',
  metodo=['Para cada material e serviço: desempenho exigido, norma de produto, ensaio de recebimento', 'Critérios de aceitação e de rejeição mensuráveis', 'Alternativas equivalentes aceitas e como comprovar a equivalência'],
  saidas=['caderno de especificações por capítulo', 'plano de ensaios de recebimento'],
  verificacoes=['nenhuma marca exclusiva sem justificativa (exigência de compras públicas)', 'ensaio e norma de produto em cada item'],
  kpis=['itens especificados / itens da BoQ']),
 dict(id='orcamento-capex', nome='Orçamento e CAPEX', extra=['custos', 'medicao'],
  objetivo='Transformar quantidades em custo de investimento, com classe de estimativa, faixa de incerteza e contingência explicada.',
  metodo=['Declarar a classe de estimativa (AACE 18R-97 ou 56R-08) conforme o grau de definição do projeto', 'Compor preços unitários (material, mão de obra, equipamento) com fonte e data, na moeda do país', 'Somar custos diretos, indiretos, BDI ou margem, impostos locais e câmbio', 'Calcular contingência por análise de risco (Monte Carlo) e dar faixa P10 / P50 / P90', 'Separar CAPEX por fase e por pacote de contratação'],
  saidas=['orçamento em planilha com curva ABC', 'relatório de CAPEX com P10/P50/P90', 'base de preços com fonte e data'],
  verificacoes=['todo preço tem fonte e data', 'câmbio e data-base declarados', 'faixa de incerteza compatível com a classe da AACE'],
  kpis=['custo por unidade funcional', 'contingência % do custo base', 'largura da faixa P10–P90']),
 dict(id='engenharia-de-valor', nome='Engenharia de valor e otimização do projeto', extra=['custos'],
  objetivo='Reduzir custo, prazo ou carbono sem perder função, segurança ou conformidade com a norma.',
  metodo=['Mapear as funções de cada sistema e o custo de cada função', 'Gerar alternativas (materiais, vãos, sistemas, padronização) e otimizar por algoritmo quando couber', 'Recalcular as alternativas e conferir conformidade normativa', 'Apresentar economia com faixa e impacto em prazo, manutenção e risco'],
  saidas=['relatório de engenharia de valor com propostas numeradas', 'comparativo antes x depois'],
  verificacoes=['nenhuma proposta reduz segurança abaixo da norma', 'economia recalculada, não estimada a olho'],
  kpis=['economia de CAPEX %', 'redução de carbono %', 'variação no custo de ciclo de vida']),
 dict(id='planejamento-4d', nome='Planejamento e cronograma 4D', extra=['planejamento'],
  objetivo='Montar o cronograma executivo ligado ao modelo e aos quantitativos, com caminho crítico e recursos.',
  metodo=['Quebrar o escopo em estrutura analítica (EAP) ligada à BoQ', 'Calcular durações por produtividade e quantidade, com fonte da produtividade', 'Ligar atividades ao modelo (4D) e simular a sequência', 'Calcular caminho crítico, folgas e histograma de recursos', 'Rodar análise de risco de prazo (P50/P80)'],
  saidas=['cronograma (formato XER/XML e PDF)', 'simulação 4D', 'histograma de mão de obra e equipamentos'],
  verificacoes=['sem atividade solta (todas com predecessora e sucessora)', 'produtividade com fonte', 'datas de marcos do contrato respeitadas'],
  kpis=['folga total do caminho crítico', 'probabilidade de cumprir o prazo contratual']),
 dict(id='otimizacao-de-obra', nome='Otimização da execução da obra', extra=['planejamento', 'seguranca_trabalho'],
  objetivo='Achar a melhor sequência, logística e uso de recursos no canteiro para reduzir prazo e custo.',
  metodo=['Modelar restrições (frentes de serviço, gruas, acessos, clima, entregas)', 'Otimizar sequência e alocação de recursos (programação linear ou heurística) e comparar com o plano atual', 'Planejar canteiro e logística (layout, estoques, just-in-time)', 'Aplicar planejamento puxado (Last Planner) com meta semanal'],
  saidas=['plano de ataque otimizado', 'layout de canteiro por fase', 'plano semanal com restrições removidas'],
  verificacoes=['plano respeita segurança do trabalho e licenças', 'ganho calculado contra o plano de referência'],
  kpis=['PPC (percentual de planos concluídos)', 'produtividade (homem-hora por unidade)', 'dias ganhos no caminho crítico']),
 dict(id='indicadores-medicao', nome='Indicadores e medição de obra', extra=['planejamento', 'medicao'],
  objetivo='Medir avanço físico e financeiro e criar os indicadores que o cliente quer olhar, com fórmula, meta e faixa.',
  metodo=['Receber do cliente os indicadores que ele quer e completar com o mínimo de mercado', 'Definir fórmula, fonte do dado, frequência, meta e faixa de alerta de cada indicador', 'Calcular valor agregado (CPI, SPI, EAC, VAC) a cada medição', 'Emitir boletim de medição com memória e evidência (foto, ensaio, diário)'],
  saidas=['painel de indicadores', 'boletim de medição com memória', 'curva S prevista x realizada'],
  verificacoes=['serviço só é medido com qualidade aprovada', 'cada indicador tem fórmula e fonte', 'valor agregado fecha com a medição'],
  kpis=['CPI', 'SPI', 'EAC', 'desvio de avanço físico', 'indicadores sob medida do cliente']),
 dict(id='controle-qualidade', nome='Controle da qualidade e ensaios', extra=['qualidade', 'materiais'],
  objetivo='Garantir que o executado é o projetado, com plano de inspeção e ensaios e tratamento de não conformidades.',
  metodo=['Montar plano de inspeção e ensaio (ITP) por serviço, com ponto de espera e de testemunho', 'Definir amostragem e critério de aceitação estatístico', 'Registrar não conformidades, causa e ação corretiva', 'Analisar resultados (cartas de controle) e liberar o serviço'],
  saidas=['plano de inspeção e ensaio', 'registro de não conformidades', 'relatório de controle estatístico'],
  verificacoes=['laboratório com competência demonstrada (ISO/IEC 17025)', 'nenhum serviço liberado com não conformidade aberta'],
  kpis=['% de lotes aprovados', 'n.º de não conformidades abertas', 'tempo de fechamento de não conformidade']),
 dict(id='conformidade-internacional', nome='Conformidade normativa por país', extra=['edificacao', 'contratos'],
  objetivo='Conferir o projeto contra as normas do país da obra e do financiador, e apontar o que muda ao trocar de país.',
  metodo=['Identificar país, autoridade aprovadora, financiador e normas exigidas no contrato', 'Conferir cada verificação contra a norma do país e o anexo nacional', 'Listar diferenças relevantes entre a norma de origem do projeto e a do país (coeficientes, cargas, cobrimentos)', 'Marcar cada referência que precisa ser conferida na edição vigente'],
  saidas=['matriz de conformidade por norma e por cláusula', 'lista de diferenças entre normas com impacto no projeto'],
  verificacoes=['nenhuma norma citada sem número', 'edição e anexo nacional declarados', 'exigências do financiador incluídas'],
  kpis=['% de cláusulas conferidas', 'n.º de referências a conferir']),
 dict(id='riscos-e-pleitos', nome='Riscos, contrato e pleitos', extra=['contratos', 'planejamento'],
  objetivo='Antecipar riscos técnicos e contratuais e preparar a defesa de prazo e custo quando houver evento.',
  metodo=['Montar registro de riscos com probabilidade, impacto, dono e resposta', 'Ler o contrato (FIDIC, NEC ou lei local) e mapear prazos de notificação', 'Para cada evento, preparar análise de atraso (janelas ou impacto) e de custo', 'Emitir notificação dentro do prazo contratual'],
  saidas=['registro de riscos', 'calendário de notificações contratuais', 'relatório de pleito com análise de atraso'],
  verificacoes=['prazo de notificação nunca perdido', 'análise de atraso segue protocolo citado'],
  kpis=['riscos com resposta / total', 'notificações no prazo %', 'valor de pleitos reconhecidos']),
 dict(id='comissionamento-asbuilt', nome='Comissionamento e cadastro como construído', extra=['qualidade', 'bim'],
  objetivo='Provar que o sistema funciona como projetado e entregar o cadastro fiel do que foi construído.',
  metodo=['Escrever o plano de comissionamento com testes de cada sistema', 'Executar e registrar testes funcionais e de desempenho', 'Atualizar desenhos e modelo para como construído', 'Entregar manuais, garantias e dados de ativos (formato COBie quando pedido)'],
  saidas=['relatório de comissionamento', 'modelo e desenhos como construído', 'pacote de dados de ativos'],
  verificacoes=['todos os testes com resultado e evidência', 'diferenças projeto x obra registradas'],
  kpis=['% de sistemas comissionados', 'pendências na entrega']),
 dict(id='operacao-opex', nome='Operação, manutenção e custo de ciclo de vida', extra=['custos', 'qualidade'],
  objetivo='Planejar a manutenção e calcular OPEX e custo de ciclo de vida para o dono decidir com o custo total.',
  metodo=['Listar ativos e modos de falha (FMEA) e definir estratégia de manutenção', 'Estimar OPEX anual (energia, manutenção, pessoal) com faixa', 'Calcular custo de ciclo de vida (valor presente) e comparar alternativas', 'Definir indicadores de desempenho do ativo'],
  saidas=['plano de manutenção', 'modelo de OPEX e de custo de ciclo de vida em planilha'],
  verificacoes=['taxa de desconto e horizonte declarados', 'OPEX com fonte e faixa'],
  kpis=['custo de ciclo de vida por unidade funcional', 'disponibilidade do ativo', 'MTBF (tempo médio entre falhas)']),
]

ESCOLAS = ['MIT', 'Stanford (CIFE, construção virtual)', 'ETH Zurique', 'Imperial College', 'TU Delft', 'UC Berkeley', 'Cambridge', 'Universidade de Tóquio', 'Poli-USP', 'COPPE/UFRJ', 'Universidade do Porto (FEUP)', 'Universidade da Cidade do Cabo']

REGRAS = [
    'Norma citada pelo número e pela cláusula; o texto da norma nunca é copiado.',
    'Todo cálculo é rascunho de apoio: o engenheiro habilitado no país da obra confere e assina (no Brasil, com ART no Crea).',
    'Número estimado vem com faixa e hipótese.',
    'Referência marcada "conferir" precisa ser confirmada na edição vigente e no anexo nacional antes de entrar em projeto assinado.',
]

def normas_por_pais(cats):
    out = {}
    for p in PAISES:
        vistos, lista = set(), []
        for c in cats:
            for n in CATEGORIAS[c][1].get(p, []):
                if n['codigo'] not in vistos:
                    vistos.add(n['codigo']); lista.append(n)
        out[p] = lista
    return out

def instrucao(d, f, normas):
    linhas = [
        f'<papel>Você é o agente "{f["nome"]}" da disciplina "{d["nome"]}" na plataforma de engenharia do THEYE Institute. Trabalha para obras no Brasil, em Angola, na Namíbia, no Egito, na Europa e nos Emirados.</papel>',
        f'<objetivo>{f["objetivo"]}</objetivo>',
        '<entrada>País da obra (obrigatório), autoridade aprovadora, financiador, normas do contrato, moeda e data-base; e os dados da disciplina: ' + '; '.join(d.get('dados', [])) + '. Fora do Brasil, troque as fontes brasileiras pelas oficiais do país e pelas globais abertas (Copernicus, ERA5, WorldPop, OpenStreetMap, Copernicus DEM).</entrada>',
        '<metodo>' + ' '.join(f'{i + 1}. {m}.' for i, m in enumerate(f['metodo'])) + '</metodo>',
        '<calculos_da_disciplina>' + '; '.join(d.get('calculos', [])) + '.</calculos_da_disciplina>',
        '<entregaveis_da_disciplina>' + '; '.join(d.get('entregaveis', [])) + '.</entregaveis_da_disciplina>',
        '<interfaces>' + '; '.join(d.get('interfaces', [])) + '.</interfaces>',
        '<normas_por_pais>' + ' '.join(f'[{PAISES[p]}] ' + '; '.join(n['codigo'] + (' (conferir)' if n['conferir'] else '') for n in lst) + '.' for p, lst in normas.items() if lst) + ' Use a coluna do país da obra; cite a internacional quando o contrato ou o financiador pedir.</normas_por_pais>',
        '<saidas>' + '; '.join(f['saidas']) + '.</saidas>',
        '<verificacoes>' + '; '.join(f['verificacoes']) + '.</verificacoes>',
        '<indicadores>' + '; '.join(f['kpis']) + '.</indicadores>',
        '<regras>' + ' '.join(REGRAS) + '</regras>',
        '<formato>Primeiro o resultado e a decisão; depois a tabela de cálculo com fórmula, valores, unidades e cláusula; por fim o que o engenheiro responsável tem de conferir antes de assinar.</formato>',
    ]
    return '\n'.join(linhas)

agentes = []
n = 0
for d in DISCIPLINAS:
    for f in FUNCOES:
        n += 1
        cats = list(dict.fromkeys(CAT[d['id']] + f['extra']))
        normas = normas_por_pais(cats)
        agentes.append({
            'id': f'AP-{n:03d}',
            'codigo': f'{d["id"]}.{f["id"]}',
            'nome': f'{f["nome"]} · {d["nome"]}',
            'disciplina': d['id'], 'disciplina_nome': d['nome'],
            'funcao': f['id'], 'funcao_nome': f['nome'],
            'objetivo': f['objetivo'],
            'metodo': f['metodo'], 'saidas': f['saidas'], 'verificacoes': f['verificacoes'], 'indicadores': f['kpis'],
            'categorias_normas': cats,
            'normas_por_pais': normas,
            'instrucao': instrucao(d, f, normas),
        })

assert len(agentes) == 500, len(agentes)

def sha(x):
    return hashlib.sha256(json.dumps(x, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

pacote = {
    'titulo': '500 agentes de produção de engenharia',
    'emitido': EMITIDO,
    'pedido': 'M, 20/11/2026: projeto detalhado automático, BIM, dimensionamento, quantitativos, CAPEX, otimização de obra e indicadores, com normas do mundo todo.',
    'paises': PAISES, 'notas_paises': NOTAS_PAIS,
    'disciplinas': [{'id': d['id'], 'nome': d['nome']} for d in DISCIPLINAS],
    'funcoes': [{'id': f['id'], 'nome': f['nome'], 'objetivo': f['objetivo']} for f in FUNCOES],
    'escolas_de_referencia': ESCOLAS,
    'regras': REGRAS,
    'estado': 'fichas e instruções prontas; nenhum agente foi provado nesta volta (as provas existentes valem para os 12 especialistas)',
    'total': len(agentes),
    'agentes': agentes,
}
pacote['sha256'] = sha(pacote['agentes'])

normas = {'paises': PAISES, 'notas': NOTAS_PAIS, 'categorias': {k: {'nome': v[0], 'normas': v[1]} for k, v in CATEGORIAS.items()}}
normas['sha256'] = sha(normas['categorias'])

os.makedirs(os.path.join(RAIZ, 'engenharia', 'agentes-500'), exist_ok=True)
with open(os.path.join(RAIZ, 'engenharia', 'agentes-500', 'agentes-producao-500.json'), 'w', encoding='utf-8') as fh:
    json.dump(pacote, fh, ensure_ascii=False, indent=1)
with open(os.path.join(RAIZ, 'src', 'lib', 'engenharia', 'normas-paises.json'), 'w', encoding='utf-8') as fh:
    json.dump(normas, fh, ensure_ascii=False)
# versão enxuta para a tela (sem a instrução longa nem as normas repetidas)
tela = {'sha256': pacote['sha256'], 'disciplinas': pacote['disciplinas'], 'funcoes': pacote['funcoes'],
        'agentes': [{k: a[k] for k in ('id', 'disciplina', 'funcao', 'saidas', 'indicadores', 'categorias_normas')} for a in agentes]}
with open(os.path.join(RAIZ, 'src', 'lib', 'engenharia', 'agentes-producao.json'), 'w', encoding='utf-8') as fh:
    json.dump(tela, fh, ensure_ascii=False)

conferir = sum(1 for c in CATEGORIAS.values() for lst in c[1].values() for x in lst if x['conferir'])
total_n = sum(1 for c in CATEGORIAS.values() for lst in c[1].values() for x in lst)
print('agentes:', len(agentes), '| disciplinas:', len(DISCIPLINAS), '| funções:', len(FUNCOES))
print('normas na matriz:', total_n, '| a conferir:', conferir, '| categorias:', len(CATEGORIAS), '| países:', len(PAISES))
print('sha256 agentes:', pacote['sha256'])
print('sha256 normas:', normas['sha256'])
