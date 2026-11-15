# -*- coding: utf-8 -*-
# Passo E1 do plano mestre THEYE v4: catálogo das matérias de engenharia (e das matérias do Instituto aplicadas à engenharia).
# Cada linha de matéria: "Nome :: tópico; tópico; tópico :: norma; norma". Sem normas na linha, valem as normas-base do ramo.
# Matérias equivalentes de escolas diferentes viram uma só; o nome original fica em `nomes_originais` só quando conferido.

ESCOLAS = {
    'MIT': ('Massachusetts Institute of Technology', 'https://catalog.mit.edu/subjects/'),
    'Stanford': ('Stanford University', 'https://explorecourses.stanford.edu/'),
    'ETH': ('ETH Zurique', 'https://www.vvz.ethz.ch/'),
    'Imperial': ('Imperial College London', 'https://www.imperial.ac.uk/study/courses/'),
    'TU Delft': ('Delft University of Technology', 'https://studiegids.tudelft.nl/'),
    'Berkeley': ('University of California, Berkeley', 'https://guide.berkeley.edu/courses/'),
    'Poli-USP': ('Escola Politécnica da USP', 'https://uspdigital.usp.br/jupiterweb/'),
    'ITA': ('Instituto Tecnológico de Aeronáutica', 'https://www.ita.br/'),
    'Unicamp': ('Universidade Estadual de Campinas', 'https://www.dac.unicamp.br/portal/'),
    'UFRJ/COPPE': ('UFRJ, Escola Politécnica e COPPE', 'https://www.coppe.ufrj.br/'),
    'UFSC': ('Universidade Federal de Santa Catarina', 'https://cagr.sistemas.ufsc.br/'),
    'UFMG': ('Universidade Federal de Minas Gerais', 'https://ufmg.br/cursos/graduacao'),
    'UFRGS': ('Universidade Federal do Rio Grande do Sul', 'https://www1.ufrgs.br/graduacao/xInformacoesAcademicas/'),
    'IME': ('Instituto Militar de Engenharia', 'https://www.ime.eb.mil.br/'),
}

TODAS = list(ESCOLAS)

# ramo: (nome, escolas que oferecem o ramo, normas-base, bibliografia de referência, matérias)
RAMOS = {}

def ramo(cod, nome, escolas, normas, biblio, materias):
    RAMOS[cod] = dict(nome=nome, escolas=escolas, normas=normas, biblio=biblio, materias=materias)

# ---------------------------------------------------------------- núcleo comum
ramo('basico', 'Ciclo básico de engenharia', TODAS,
 ['SI (Sistema Internacional de Unidades, Inmetro)', 'NBR 10068 (folha de desenho)', 'NBR 8403 (linhas em desenho técnico)'],
 ['Stewart, Cálculo', 'Halliday, Resnick e Walker, Fundamentos de Física', 'Strang, Introduction to Linear Algebra', 'Boyce e DiPrima, Equações Diferenciais Elementares'],
 '''
Cálculo diferencial e integral I :: limites e continuidade; derivadas e aplicações; integral definida e teorema fundamental ::
Cálculo diferencial e integral II :: funções de várias variáveis; derivadas parciais e gradiente; integrais múltiplas ::
Cálculo vetorial :: campos vetoriais; integrais de linha e de superfície; teoremas de Green, Gauss e Stokes ::
Álgebra linear :: matrizes e sistemas lineares; espaços vetoriais; autovalores e diagonalização ::
Equações diferenciais ordinárias :: EDOs de primeira ordem; equações lineares de segunda ordem; transformada de Laplace; sistemas lineares ::
Equações diferenciais parciais :: séries de Fourier; equações do calor, da onda e de Laplace; separação de variáveis ::
Probabilidade e estatística para engenharia :: variáveis aleatórias; distribuições; inferência e intervalos de confiança; regressão ::
Cálculo numérico :: zeros de funções; sistemas lineares por métodos diretos e iterativos; interpolação; integração numérica ::
Física I (mecânica) :: cinemática; leis de Newton; energia e momento; rotação de corpos rígidos ::
Física II (fluidos, ondas e termodinâmica) :: oscilações e ondas; fluidos; temperatura e primeira lei ::
Física III (eletromagnetismo) :: lei de Coulomb e Gauss; potencial elétrico; circuitos; indução e equações de Maxwell ::
Química geral para engenharia :: estrutura atômica e ligações; estequiometria; termoquímica; eletroquímica e corrosão ::
Desenho técnico e geometria descritiva :: projeções ortogonais; cortes e vistas; cotagem; perspectivas :: NBR 10067 (princípios gerais de representação); NBR 10126 (cotagem)
Introdução à programação para engenharia :: algoritmos e estruturas de controle; funções; vetores e matrizes; programação científica ::
Mecânica geral (estática) :: equilíbrio de partícula e de corpo rígido; treliças e máquinas; centroides e momentos de inércia; atrito ::
Economia e engenharia econômica :: valor do dinheiro no tempo; VPL, TIR e payback; depreciação; análise de alternativas ::
Ética, exercício profissional e responsabilidade técnica :: sistema Confea/Crea; ART; responsabilidade civil e penal do engenheiro; código de ética :: Lei 5.194/1966 (exercício da engenharia); Lei 6.496/1977 (ART); Resolução Confea 1.002/2002 (código de ética)
''')

# ---------------------------------------------------------------- estruturas
ramo('estrutural', 'Engenharia de estruturas', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME', 'Unicamp', 'ITA'],
 ['NBR 6118 (estruturas de concreto)', 'NBR 8681 (ações e segurança)', 'NBR 6120 (ações para cálculo de edificações)', 'NBR 6123 (vento)'],
 ['Süssekind, Curso de Análise Estrutural', 'Hibbeler, Resistência dos Materiais', 'Fusco, Técnica de Armar as Estruturas de Concreto', 'Carvalho e Figueiredo Filho, Cálculo e Detalhamento de Estruturas Usuais de Concreto Armado', 'Pfeil e Pfeil, Estruturas de Aço'],
 '''
Resistência dos materiais I :: tensão e deformação; carga axial; torção; flexão e cisalhamento em vigas ::
Resistência dos materiais II :: estado plano de tensões; círculo de Mohr; deflexão de vigas; flambagem de colunas ::
Teoria das estruturas I (isostática) :: estruturas isostáticas; diagramas de esforços; linhas de influência; treliças ::
Teoria das estruturas II (hiperestática) :: método das forças; método dos deslocamentos; processo de Cross; pórticos planos ::
Análise matricial de estruturas :: matriz de rigidez; montagem global; pórticos espaciais; implementação computacional ::
Método dos elementos finitos :: formulação variacional; elementos de barra, placa e sólido; convergência; erros de modelagem ::
Dinâmica das estruturas :: sistemas de um grau de liberdade; análise modal; resposta a vibrações; amortecimento :: NBR 15421 (projeto de estruturas resistentes a sismos)
Ações e segurança nas estruturas :: estados-limites último e de serviço; coeficientes de ponderação; combinações de ações; vento e temperatura :: NBR 8681; NBR 6120; NBR 6123
Concreto armado I :: materiais e durabilidade; flexão simples no ELU; cisalhamento; ancoragem e detalhamento :: NBR 6118; NBR 7480 (aço para armaduras)
Concreto armado II :: lajes maciças e nervuradas; pilares e flexão composta; efeitos de segunda ordem; escadas e reservatórios :: NBR 6118
Concreto protendido :: perdas de protensão; verificação em serviço; ELU de vigas protendidas; traçado de cabos :: NBR 6118
Estruturas de aço :: tração e compressão; flexão e flambagem lateral; ligações parafusadas e soldadas :: NBR 8800 (estruturas de aço e mistas); NBR 14762 (perfis formados a frio)
Estruturas mistas de aço e concreto :: vigas mistas; conectores de cisalhamento; pilares mistos; lajes com fôrma de aço :: NBR 8800
Estruturas de madeira :: propriedades da madeira; peças tracionadas e comprimidas; flexão; ligações :: NBR 7190 (estruturas de madeira)
Alvenaria estrutural :: blocos e argamassas; compressão e flexão; modulação; controle de fissuração :: NBR 16868 (alvenaria estrutural)
Estruturas pré-moldadas :: consolos e ligações; transporte e montagem; estabilidade global :: NBR 9062 (estruturas de concreto pré-moldado)
Pontes e grandes estruturas :: cargas móveis e linhas de influência; superestrutura e mesoestrutura; aparelhos de apoio :: NBR 7187 (pontes de concreto); NBR 7188 (cargas móveis em pontes)
Estruturas em situação de incêndio :: curvas de incêndio; tempo requerido de resistência ao fogo; métodos tabulares e simplificados :: NBR 15200 (concreto em incêndio); NBR 14323 (aço em incêndio); NBR 14432 (exigências de resistência ao fogo)
Estabilidade global de edifícios :: parâmetros alfa e gama-z; efeitos de segunda ordem; contraventamento :: NBR 6118
Patologia, inspeção e recuperação de estruturas :: mecanismos de deterioração; inspeção e ensaios; reforço com fibras e encamisamento; vida útil :: NBR 6118; NBR 15575 (desempenho de edificações); NBR 16747 (inspeção predial)
Fôrmas e escoramentos :: dimensionamento de fôrmas; escoramento e reescoramento; ciclos de concretagem :: NBR 15696 (fôrmas e escoramentos)
''')

ramo('geotecnica', 'Engenharia geotécnica', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME', 'Unicamp'],
 ['NBR 6122 (projeto e execução de fundações)', 'NBR 6484 (sondagem SPT)', 'NBR 8036 (programação de sondagens)'],
 ['Pinto, Curso Básico de Mecânica dos Solos', 'Das, Fundamentos de Engenharia Geotécnica', 'Velloso e Lopes, Fundações', 'Cintra e Aoki, Fundações por Estacas'],
 '''
Geologia de engenharia :: minerais e rochas; intemperismo e solos residuais; mapeamento geológico-geotécnico ::
Mecânica dos solos I :: índices físicos; granulometria e limites de consistência; classificação; compactação :: NBR 7181 (análise granulométrica); NBR 6459 (limite de liquidez); NBR 7180 (limite de plasticidade); NBR 7182 (compactação)
Mecânica dos solos II :: tensões no solo; permeabilidade e fluxo; adensamento; resistência ao cisalhamento ::
Investigação geotécnica :: sondagem SPT; ensaio de cone (CPT); ensaios de laboratório; programação de sondagens :: NBR 6484; NBR 8036; NBR 12069 (ensaio de penetração de cone)
Fundações rasas :: capacidade de carga; recalques; sapatas e radiers :: NBR 6122
Fundações profundas :: estacas e tubulões; capacidade por métodos semiempíricos; prova de carga; grupos de estacas :: NBR 6122; NBR 16903 (prova de carga estática em fundação profunda)
Estabilidade de taludes :: métodos de equilíbrio limite; fator de segurança; estabilização e drenagem :: NBR 11682 (estabilidade de encostas)
Estruturas de contenção :: empuxo de terra; muros de arrimo; cortinas atirantadas e solo grampeado :: NBR 11682; NBR 5629 (tirantes ancorados no terreno)
Obras de terra e barragens :: aterros sobre solos moles; barragens de terra e enrocamento; instrumentação :: Lei 12.334/2010 (Política Nacional de Segurança de Barragens); NBR 13028 (barragens de mineração)
Mecânica das rochas :: propriedades e classificação de maciços; túneis e escavações; estabilidade de taludes rochosos ::
Geotecnia ambiental :: contaminação de solos; barreiras e liners; aterros sanitários :: NBR 13896 (aterros de resíduos não perigosos)
Melhoramento e reforço de solos :: geossintéticos; colunas de brita; drenos verticais; jet grouting ::
''')

ramo('hidraulica', 'Hidráulica, recursos hídricos e saneamento', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'Unicamp'],
 ['Lei 14.026/2020 (marco legal do saneamento)', 'Lei 9.433/1997 (Política Nacional de Recursos Hídricos)'],
 ['Azevedo Netto, Manual de Hidráulica', 'Porto, Hidráulica Básica', 'Tsutiya, Abastecimento de Água', 'von Sperling, Introdução à Qualidade das Águas e ao Tratamento de Esgotos', 'Tucci, Hidrologia: Ciência e Aplicação'],
 '''
Mecânica dos fluidos :: hidrostática; equação da continuidade e de Bernoulli; quantidade de movimento; análise dimensional ::
Hidráulica de condutos forçados :: perda de carga; associação de tubulações; redes malhadas; golpe de aríete ::
Hidráulica de canais :: escoamento uniforme e Manning; energia específica; ressalto hidráulico; remanso ::
Hidrologia :: ciclo hidrológico; precipitação e chuvas intensas; escoamento superficial; hidrogramas ::
Drenagem urbana :: método racional; microdrenagem e macrodrenagem; reservatórios de detenção :: NBR 10844 (águas pluviais em edificações)
Sistemas de abastecimento de água :: estudos de concepção; captação e adução; reservação; redes de distribuição :: NBR 12211 (concepção de abastecimento); NBR 12218 (rede de distribuição)
Tratamento de água :: coagulação e floculação; decantação e filtração; desinfecção; padrão de potabilidade :: NBR 12216 (projeto de estação de tratamento de água); Portaria GM/MS 888/2021 (potabilidade)
Sistemas de esgotamento sanitário :: redes coletoras; interceptores; estações elevatórias :: NBR 9649 (redes coletoras de esgoto)
Tratamento de esgotos :: tratamento preliminar e primário; lodos ativados; reatores anaeróbios; lagoas :: NBR 12209 (estações de tratamento de esgoto); Resolução CONAMA 430/2011 (lançamento de efluentes)
Máquinas hidráulicas e estações de bombeamento :: curvas de bombas; NPSH e cavitação; associação de bombas; turbinas ::
Instalações hidráulicas e sanitárias prediais :: água fria e quente; esgoto predial; águas pluviais; dimensionamento por pesos :: NBR 5626 (água fria e quente); NBR 8160 (esgoto sanitário); NBR 10844
Obras hidráulicas e barragens :: vertedouros e dissipadores; tomadas d'água; segurança de barragens :: Lei 12.334/2010
Gestão de recursos hídricos :: outorga; enquadramento de corpos d'água; comitês de bacia; cobrança :: Lei 9.433/1997; Resolução CONAMA 357/2005 (classificação de corpos d'água)
Hidráulica costeira e portuária :: ondas e marés; transporte de sedimentos; obras de abrigo ::
Aproveitamento de água de chuva e reúso :: captação e reservação; tratamento simplificado; usos não potáveis :: NBR 15527 (aproveitamento de água de chuva); NBR 16783 (fontes alternativas não potáveis)
''')

ramo('transportes', 'Engenharia de transportes', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME', 'ITA'],
 ['Manuais do DNIT (projeto geométrico, pavimentação e drenagem)', 'Lei 9.503/1997 (Código de Trânsito Brasileiro)'],
 ['Bernucci et al., Pavimentação Asfáltica: Formação Básica para Engenheiros', 'Pimenta e Oliveira, Projeto Geométrico de Rodovias', 'Garber e Hoel, Traffic and Highway Engineering', 'Ortúzar e Willumsen, Modelling Transport'],
 '''
Planejamento de transportes :: modelo de quatro etapas; pesquisas origem-destino; demanda e oferta :: Lei 12.587/2012 (Política Nacional de Mobilidade Urbana)
Engenharia de tráfego :: fluxo, densidade e velocidade; capacidade e nível de serviço; semáforos; sinalização :: Manual Brasileiro de Sinalização de Trânsito (CONTRAN)
Projeto geométrico de vias :: curvas horizontais e verticais; superelevação; distâncias de visibilidade; interseções :: Manual de Projeto Geométrico de Rodovias Rurais (DNIT/IPR)
Pavimentação :: materiais de pavimentação; dimensionamento de pavimentos flexíveis e rígidos; misturas asfálticas :: Manual de Pavimentação (DNIT/IPR); NBR 9781 (peças de concreto para pavimentação)
Gerência e manutenção de pavimentos :: avaliação funcional e estrutural; deflectometria; restauração ::
Drenagem de vias :: drenagem superficial e profunda; bueiros; dimensionamento hidrológico :: Manual de Drenagem de Rodovias (DNIT/IPR)
Engenharia ferroviária :: via permanente; material rodante; capacidade de linha; sinalização ferroviária ::
Portos e vias navegáveis :: terminais portuários; hidrovias; operação e logística portuária ::
Aeroportos :: sistemas de pistas; terminais de passageiros; capacidade aeroportuária :: RBAC 154 (projeto de aeródromos)
Transporte público e mobilidade urbana :: redes de transporte coletivo; BRT e metrô; acessibilidade :: NBR 9050 (acessibilidade); NBR 14022 (acessibilidade em ônibus)
Logística e transporte de cargas :: roteirização; modais e intermodalidade; centros de distribuição ::
Segurança viária :: análise de acidentes; auditoria de segurança viária; medidas de moderação de tráfego :: Lei 9.503/1997
Terraplenagem e equipamentos :: movimento de terra; diagrama de massas; produtividade de equipamentos ::
''')

ramo('construcao', 'Construção civil e gestão de obras', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME', 'Unicamp'],
 ['NBR 15575 (desempenho de edificações)', 'NR-18 (segurança na construção)', 'Lei 14.133/2021 (licitações e contratos)'],
 ['Mattos, Como Preparar Orçamentos de Obras', 'Mattos, Planejamento e Controle de Obras', 'Mehta e Monteiro, Concreto: Microestrutura, Propriedades e Materiais', 'Eastman et al., Manual de BIM'],
 '''
Materiais de construção I :: aglomerantes e cimento Portland; agregados; argamassas :: NBR 16697 (cimento Portland); NBR 7211 (agregados para concreto)
Materiais de construção II :: dosagem e controle do concreto; aço; cerâmicos; polímeros e madeira :: NBR 12655 (concreto, preparo e controle); NBR 5739 (ensaio de compressão); NBR 8953 (classes de concreto)
Tecnologia das construções I :: canteiro de obras; locação; fundações e estrutura; alvenarias :: NR-18
Tecnologia das construções II :: revestimentos; impermeabilização; coberturas; esquadrias :: NBR 9575 (impermeabilização); NBR 13755 (revestimento cerâmico de fachadas)
Execução de estruturas de concreto :: fôrmas, armação e concretagem; cura; controle tecnológico :: NBR 14931 (execução de estruturas de concreto)
Orçamento de obras :: composições de custo; SINAPI e SICRO; BDI; curva ABC :: Decreto 7.983/2013 (orçamento de obras com recursos federais); NBR 12721 (custos unitários de construção)
Planejamento e controle de obras :: estrutura analítica; caminho crítico; linha de balanço; valor agregado ::
Gerenciamento de projetos de engenharia :: escopo, prazo e custo; riscos; contratos; partes interessadas :: ISO 21502 (gerenciamento de projetos)
BIM e modelagem da informação da construção :: modelos federados; níveis de desenvolvimento; IFC; compatibilização :: NBR ISO 19650 (gestão da informação com BIM); NBR 15965 (classificação da informação da construção)
Desempenho e conforto das edificações :: desempenho térmico; acústico; lumínico; durabilidade e vida útil de projeto :: NBR 15575; NBR 15220 (desempenho térmico)
Construção industrializada e enxuta :: pré-fabricação; steel frame e wood frame; construção enxuta ::
Sustentabilidade na construção :: certificações ambientais; gestão de resíduos da construção; eficiência energética :: Resolução CONAMA 307/2002 (resíduos da construção)
Avaliação de imóveis e perícias de engenharia :: métodos comparativo e evolutivo; inferência estatística; laudos periciais :: NBR 14653 (avaliação de bens); NBR 13752 (perícias de engenharia na construção civil)
Licitações e contratos de obras públicas :: modalidades e regimes de execução; projeto básico e executivo; medição e aditivos :: Lei 14.133/2021
Instalações prediais de prevenção e combate a incêndio :: saídas de emergência; hidrantes e sprinklers; detecção e alarme :: NBR 9077 (saídas de emergência); NBR 13714 (hidrantes e mangotinhos); NBR 10897 (chuveiros automáticos); NBR 17240 (detecção e alarme)
Acessibilidade e desenho universal :: rotas acessíveis; sanitários; sinalização tátil e visual :: NBR 9050
Manutenção e inspeção predial :: plano de manutenção; inspeção predial; manual de uso e operação :: NBR 5674 (manutenção de edificações); NBR 14037 (manual de uso, operação e manutenção); NBR 16747
''')

# ---------------------------------------------------------------- mecânica e afins
ramo('mecanica', 'Engenharia mecânica', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['NR-12 (segurança em máquinas)', 'ISO 12100 (segurança de máquinas, princípios de projeto)'],
 ['Budynas e Nisbett, Elementos de Máquinas de Shigley', 'Norton, Projeto de Máquinas', 'Çengel e Boles, Termodinâmica', 'Incropera et al., Fundamentos de Transferência de Calor e de Massa', 'Fox, McDonald e Pritchard, Introdução à Mecânica dos Fluidos'],
 '''
Dinâmica de corpos rígidos :: cinemática plana e espacial; equações de Newton-Euler; energia e impulso; métodos de Lagrange ::
Mecanismos e cinemática de máquinas :: análise de posição, velocidade e aceleração; cames; trens de engrenagens ::
Elementos de máquinas I :: critérios de falha estática; fadiga; eixos; uniões parafusadas e soldadas ::
Elementos de máquinas II :: engrenagens; mancais de rolamento e deslizamento; molas; freios e embreagens :: ISO 6336 (capacidade de carga de engrenagens); ISO 281 (vida de rolamentos)
Termodinâmica I :: propriedades de substâncias puras; primeira lei; segunda lei e entropia ::
Termodinâmica II :: ciclos de potência e refrigeração; misturas e psicrometria; combustão ::
Transferência de calor :: condução; convecção; radiação; trocadores de calor ::
Mecânica dos fluidos para máquinas :: escoamento viscoso; camada-limite; escoamento compressível; turbomáquinas ::
Vibrações mecânicas :: sistemas de um e vários graus de liberdade; análise modal; isolamento e balanceamento :: ISO 20816 (medição e avaliação de vibração em máquinas)
Processos de fabricação por usinagem :: torneamento e fresamento; parâmetros de corte; CNC ::
Processos de conformação e fundição :: laminação, forjamento e estampagem; fundição; metalurgia do pó ::
Soldagem :: processos de soldagem; metalurgia da solda; qualificação de procedimentos e soldadores :: AWS D1.1 (soldagem estrutural em aço); ASME IX (qualificação de soldagem)
Metrologia e tolerâncias :: incerteza de medição; ajustes e tolerâncias; tolerâncias geométricas :: ISO 286 (tolerâncias e ajustes); ISO 1101 (tolerâncias geométricas); Guia para a expressão da incerteza de medição (GUM)
Projeto mecânico e de produto :: metodologia de projeto; desenho assistido por computador; prototipagem; análise de falhas ::
Refrigeração e ar-condicionado :: carga térmica; ciclos de refrigeração; qualidade do ar interior :: NBR 16401 (instalações de ar-condicionado)
Máquinas térmicas e motores :: motores de combustão interna; turbinas a gás e a vapor; geração de vapor ::
Vasos de pressão e tubulações industriais :: projeto de vasos; inspeção de segurança; tubulações de processo :: NR-13 (caldeiras, vasos de pressão e tubulações); ASME BPVC Seção VIII; ASME B31.3 (tubulações de processo)
Manutenção industrial e confiabilidade :: manutenção preditiva; confiabilidade e disponibilidade; FMEA e análise de causa raiz :: ISO 55000 (gestão de ativos)
Sistemas fluidomecânicos (hidráulica e pneumática) :: bombas e compressores; circuitos hidráulicos e pneumáticos; atuadores ::
Engenharia automotiva :: dinâmica veicular; trem de força; segurança veicular :: Resoluções CONTRAN de segurança veicular
Energias renováveis e eficiência energética :: energia solar térmica e fotovoltaica; eólica; biomassa; auditoria energética :: ISO 50001 (gestão de energia)
''')

ramo('mecatronica', 'Engenharia de controle e automação (mecatrônica)', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['IEC 61131-3 (linguagens de CLP)', 'IEC 62443 (segurança de automação industrial)', 'IEC 61508 (segurança funcional)'],
 ['Ogata, Engenharia de Controle Moderno', 'Franklin, Powell e Emami-Naeini, Sistemas de Controle para Engenharia', 'Craig, Robótica', 'Siciliano et al., Robotics: Modelling, Planning and Control'],
 '''
Sinais e sistemas :: sistemas lineares e invariantes; convolução; transformadas de Fourier, Laplace e Z ::
Sistemas de controle I :: modelagem; resposta transitória; lugar das raízes; controladores PID ::
Sistemas de controle II :: resposta em frequência; Bode e Nyquist; espaço de estados; observadores ::
Controle digital :: amostragem; projeto discreto; implementação em microcontrolador ::
Controle ótimo e robusto :: LQR e filtro de Kalman; controle preditivo; robustez ::
Automação industrial e CLP :: controladores lógicos programáveis; diagramas Ladder e SFC; redes industriais :: IEC 61131-3
Instrumentação industrial :: sensores e transdutores; malhas de controle; simbologia de instrumentação :: ISA 5.1 (simbologia de instrumentação)
Robótica :: cinemática direta e inversa; dinâmica de manipuladores; planejamento de trajetórias :: ISO 10218 (segurança de robôs industriais)
Sistemas embarcados :: microcontroladores; sistemas de tempo real; interfaces e periféricos ::
Sistemas a eventos discretos e manufatura integrada :: autômatos e redes de Petri; supervisórios; integração empresa-chão de fábrica :: ISA-95 (integração empresa-controle)
Segurança funcional de máquinas e processos :: análise de risco; níveis de integridade de segurança; sistemas instrumentados :: IEC 61508; IEC 61511 (sistemas instrumentados de segurança); ISO 13849 (partes de comandos relacionadas à segurança)
Veículos autônomos e drones :: navegação e localização; fusão sensorial; controle de veículos aéreos não tripulados :: RBAC-E 94 (aeronaves não tripuladas)
''')

ramo('aeronautica', 'Engenharia aeronáutica e aeroespacial', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'ITA', 'UFMG', 'Poli-USP', 'UFSC'],
 ['RBAC 21 (certificação de produto aeronáutico)', 'RBAC 25 (aeronaves categoria transporte)'],
 ['Anderson, Fundamentals of Aerodynamics', 'Raymer, Aircraft Design: A Conceptual Approach', 'Megson, Aircraft Structures for Engineering Students', 'Wertz e Larson, Space Mission Analysis and Design'],
 '''
Aerodinâmica :: escoamento potencial; teoria de aerofólios; asas finitas; escoamento compressível ::
Mecânica do voo :: desempenho de aeronaves; estabilidade estática e dinâmica; controle ::
Estruturas aeronáuticas :: estruturas de paredes finas; fadiga e tolerância ao dano; materiais compósitos ::
Propulsão aeronáutica e espacial :: turbojatos e turbofans; foguetes; ciclos de propulsão ::
Projeto de aeronaves :: requisitos de missão; dimensionamento conceitual; certificação :: RBAC 21; RBAC 23 (aviões categoria normal); RBAC 25
Mecânica orbital e sistemas espaciais :: órbitas keplerianas; manobras orbitais; subsistemas de satélites ::
Aviônica e software embarcado :: barramentos aviônicos; software de bordo crítico; certificação de software e hardware :: DO-178C (software aeronáutico); DO-254 (hardware aeronáutico)
Engenharia de sistemas aeronáuticos :: desenvolvimento de sistemas; avaliação de segurança; rastreabilidade de requisitos :: SAE ARP4754A (desenvolvimento de sistemas); SAE ARP4761 (avaliação de segurança)
Manutenção aeronáutica e aeronavegabilidade continuada :: programas de manutenção; aeronavegabilidade continuada; confiabilidade :: RBAC 43 (manutenção); RBAC 145 (organizações de manutenção)
Ensaios em voo e túnel de vento :: instrumentação de ensaio; planejamento de ensaios; redução de dados ::
''')

ramo('naval', 'Engenharia naval e oceânica', ['MIT', 'TU Delft', 'Imperial', 'Poli-USP', 'UFRJ/COPPE', 'UFSC'],
 ['SOLAS (salvaguarda da vida humana no mar)', 'MARPOL (prevenção da poluição por navios)', 'NORMAM (normas da autoridade marítima)'],
 ['Lewis (ed.), Principles of Naval Architecture', 'Rawson e Tupper, Basic Ship Theory', 'Faltinsen, Sea Loads on Ships and Offshore Structures'],
 '''
Arquitetura naval e hidrostática :: geometria do casco; flutuação; estabilidade intacta e em avaria :: NORMAM; SOLAS
Resistência ao avanço e propulsão :: resistência de casco; hélices; ensaios em tanque de provas ::
Estruturas navais e oceânicas :: viga-navio; resistência longitudinal; fadiga; regras de sociedades classificadoras :: Regras unificadas da IACS
Hidrodinâmica de corpos flutuantes e comportamento no mar :: ondas oceânicas; movimentos no mar; cargas de onda ::
Sistemas oceânicos e plataformas offshore :: plataformas fixas e flutuantes; ancoragem; risers :: API RP 2A (plataformas fixas offshore)
Projeto do navio :: espiral de projeto; arranjo geral; máquinas e equipamentos :: SOLAS; MARPOL
Construção naval e estaleiros :: processos de construção em blocos; soldagem naval; planejamento de estaleiro ::
Máquinas marítimas :: propulsão diesel e elétrica; sistemas auxiliares; eficiência energética de navios :: MARPOL Anexo VI
''')

# ---------------------------------------------------------------- elétrica e computação
ramo('eletrica', 'Engenharia elétrica (potência e energia)', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['NBR 5410 (instalações elétricas de baixa tensão)', 'NR-10 (segurança em eletricidade)', 'PRODIST (ANEEL, procedimentos de distribuição)'],
 ['Alexander e Sadiku, Fundamentos de Circuitos Elétricos', 'Chapman, Fundamentos de Máquinas Elétricas', 'Glover, Sarma e Overbye, Power System Analysis and Design', 'Creder, Instalações Elétricas', 'Mohan, Undeland e Robbins, Power Electronics'],
 '''
Circuitos elétricos I :: leis de Kirchhoff; análise nodal e de malhas; teoremas de rede; circuitos de primeira e segunda ordem ::
Circuitos elétricos II :: regime senoidal e fasores; potência em corrente alternada; circuitos trifásicos; resposta em frequência ::
Eletromagnetismo aplicado :: campos estáticos; materiais magnéticos; ondas eletromagnéticas e linhas ::
Conversão eletromecânica de energia :: circuitos magnéticos; transformadores; princípios de máquinas rotativas ::
Máquinas elétricas :: máquinas de corrente contínua; motores de indução; máquinas síncronas; acionamentos ::
Eletrônica de potência :: conversores CC-CC; retificadores; inversores; controle de motores ::
Sistemas elétricos de potência I :: componentes simétricas; fluxo de carga; modelagem de linhas e transformadores ::
Sistemas elétricos de potência II :: curto-circuito; estabilidade; operação e despacho :: IEC 60909 (correntes de curto-circuito)
Proteção de sistemas elétricos :: relés; coordenação de proteção; transformadores de instrumento :: IEC 61850 (comunicação em subestações)
Instalações elétricas prediais e industriais :: dimensionamento de condutores; proteção e seletividade; aterramento; projeto :: NBR 5410; NBR 14039 (instalações de média tensão)
Proteção contra descargas atmosféricas :: avaliação de risco; SPDA externo; medidas de proteção contra surtos :: NBR 5419 (proteção contra descargas atmosféricas)
Geração, transmissão e distribuição de energia :: usinas; linhas de transmissão; redes de distribuição; perdas :: PRODIST
Qualidade da energia elétrica :: harmônicos; afundamentos de tensão; fator de potência :: PRODIST Módulo 8 (qualidade da energia); IEEE 519 (harmônicos)
Energia solar fotovoltaica :: recurso solar; dimensionamento de sistemas; conexão à rede e micro e minigeração :: NBR 16690 (instalações fotovoltaicas); Lei 14.300/2022 (micro e minigeração distribuída)
Energia eólica e armazenamento :: recurso eólico; aerogeradores; baterias e armazenamento :: IEC 61400 (turbinas eólicas)
Mercado e planejamento energético :: setor elétrico brasileiro; leilões; tarifas; planejamento da expansão ::
Segurança em instalações e serviços em eletricidade :: análise de risco elétrico; desenergização; vestimentas e EPIs; arco elétrico :: NR-10
Iluminação e eficiência energética em edificações :: grandezas luminotécnicas; projeto de iluminação; eficiência de sistemas :: NBR ISO/CIE 8995-1 (iluminação de ambientes de trabalho)
''')

ramo('eletronica', 'Engenharia eletrônica', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['IEC 62368-1 (segurança de equipamentos eletrônicos)', 'CISPR 32 (compatibilidade eletromagnética de equipamentos multimídia)'],
 ['Sedra e Smith, Microeletrônica', 'Horowitz e Hill, The Art of Electronics', 'Razavi, Design of Analog CMOS Integrated Circuits', 'Wakerly, Digital Design'],
 '''
Dispositivos eletrônicos :: física de semicondutores; diodos; transistores bipolares e MOS ::
Circuitos eletrônicos analógicos :: amplificadores; realimentação; amplificadores operacionais; resposta em frequência ::
Sistemas digitais :: álgebra booleana; circuitos combinacionais e sequenciais; máquinas de estado; FPGA ::
Arquitetura de computadores :: conjunto de instruções; pipeline; hierarquia de memória ::
Microeletrônica e circuitos integrados :: processo CMOS; projeto de circuitos integrados analógicos e digitais; leiaute ::
Processamento digital de sinais :: amostragem; transformada discreta de Fourier; filtros FIR e IIR ::
Eletrônica de radiofrequência e micro-ondas :: linhas de transmissão; casamento de impedâncias; amplificadores de RF; antenas ::
Compatibilidade eletromagnética :: emissão e imunidade; blindagem e aterramento; ensaios de EMC :: IEC 61000 (compatibilidade eletromagnética); CISPR 32
Projeto de placas de circuito impresso :: leiaute; integridade de sinal; fabricação e montagem :: IPC-2221 (projeto de placas impressas); IPC-A-610 (aceitabilidade de montagens)
Instrumentação eletrônica e medidas :: conversores AD e DA; ruído; aquisição de dados ::
Optoeletrônica e fotônica :: fontes e detectores ópticos; fibras ópticas; dispositivos fotônicos ::
''')

ramo('telecom', 'Engenharia de telecomunicações', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'IME'],
 ['Recomendações ITU-T e ITU-R', 'Regulamentação da Anatel'],
 ['Haykin, Sistemas de Comunicação', 'Proakis e Salehi, Digital Communications', 'Goldsmith, Wireless Communications', 'Kurose e Ross, Redes de Computadores e a Internet'],
 '''
Princípios de comunicações :: modulação analógica; ruído; teoria da informação ::
Comunicações digitais :: modulação digital; codificação de canal; equalização; probabilidade de erro ::
Antenas e propagação :: parâmetros de antenas; arranjos; modelos de propagação :: ITU-R P.525 (atenuação em espaço livre); ITU-R P.526 (difração)
Comunicações móveis e sem fio :: sistemas celulares; OFDM e MIMO; redes 4G e 5G :: Especificações técnicas 3GPP
Comunicações ópticas :: fibras ópticas; transmissores e receptores; redes ópticas :: ITU-T G.652 (fibra monomodo)
Redes de telecomunicações :: comutação; roteamento; qualidade de serviço; redes de transporte ::
Comunicações por satélite :: enlaces satelitais; órbitas e cobertura; acesso múltiplo ::
Projeto de redes de acesso e banda larga :: redes FTTH; dimensionamento; implantação em municípios ::
Exposição a campos eletromagnéticos e licenciamento de estações :: limites de exposição humana; licenciamento de estações; compartilhamento de infraestrutura :: Lei 11.934/2009 (exposição a campos eletromagnéticos); Lei 13.116/2015 (Lei Geral das Antenas)
''')

ramo('computacao', 'Engenharia de computação e software', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['ISO/IEC 25010 (qualidade de produto de software)', 'Lei 13.709/2018 (LGPD)'],
 ['Cormen et al., Algoritmos: Teoria e Prática', 'Tanenbaum e Bos, Sistemas Operacionais Modernos', 'Silberschatz, Korth e Sudarshan, Sistema de Banco de Dados', 'Sommerville, Engenharia de Software', 'Kleppmann, Designing Data-Intensive Applications'],
 '''
Algoritmos e estruturas de dados :: listas, árvores e grafos; ordenação e busca; análise de complexidade ::
Projeto e análise de algoritmos :: divisão e conquista; programação dinâmica; algoritmos gulosos; NP-completude ::
Matemática discreta :: lógica; conjuntos e relações; combinatória; teoria dos grafos ::
Teoria da computação :: autômatos e linguagens formais; computabilidade; complexidade ::
Programação orientada a objetos :: classes e herança; polimorfismo; padrões de projeto ::
Sistemas operacionais :: processos e threads; escalonamento; memória virtual; sistemas de arquivos ::
Redes de computadores :: camadas e protocolos; TCP/IP; roteamento; aplicações da internet :: IEEE 802.3 (Ethernet); IEEE 802.11 (redes sem fio)
Bancos de dados :: modelo relacional e SQL; normalização; transações; índices ::
Engenharia de software :: requisitos; arquitetura; testes; processos ágeis :: ISO/IEC 12207 (processos de ciclo de vida de software); ISO/IEC 25010
Compiladores :: análise léxica e sintática; análise semântica; geração e otimização de código ::
Sistemas distribuídos :: consistência e consenso; replicação; tolerância a falhas ::
Computação gráfica e visualização :: transformações geométricas; rasterização; visualização científica ::
Interação humano-computador e acessibilidade digital :: usabilidade; projeto centrado no usuário; acessibilidade web :: WCAG 2.2 (W3C); eMAG (modelo de acessibilidade em governo eletrônico)
Computação de alto desempenho :: paralelismo; GPU; programação com MPI e OpenMP ::
Computação científica e simulação :: métodos numéricos em larga escala; simulação de sistemas físicos; verificação e validação ::
''')

# ---------------------------------------------------------------- processos e materiais
ramo('quimica', 'Engenharia química', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['NR-13 (caldeiras, vasos de pressão e tubulações)', 'NR-20 (inflamáveis e combustíveis)'],
 ['Fogler, Elementos de Engenharia das Reações Químicas', 'Bird, Stewart e Lightfoot, Fenômenos de Transporte', 'Smith, Van Ness e Abbott, Introdução à Termodinâmica da Engenharia Química', 'Green e Southard (eds.), Perry\'s Chemical Engineers\' Handbook', 'Turton et al., Analysis, Synthesis and Design of Chemical Processes'],
 '''
Balanços de massa e energia :: balanços em processos com e sem reação; reciclo e purga; balanços transientes ::
Termodinâmica química :: equilíbrio de fases; propriedades de misturas; equilíbrio químico ::
Fenômenos de transporte :: transporte de quantidade de movimento, calor e massa; analogias ::
Operações unitárias I :: escoamento de fluidos; bombeamento; separações sólido-fluido ::
Operações unitárias II :: destilação; absorção; extração; secagem ::
Cinética e reatores químicos :: leis de velocidade; reatores ideais; reatores não ideais; catálise ::
Controle de processos químicos :: dinâmica de processos; malhas de controle; sintonia ::
Projeto de processos e plantas químicas :: síntese de processos; estimativa de custos; integração energética ::
Segurança de processos :: análise de perigos (HAZOP); estudos de risco; alívio de pressão :: NR-20; API 520 (dimensionamento de dispositivos de alívio)
Engenharia bioquímica e biotecnologia industrial :: cinética microbiana; biorreatores; separação de bioprodutos ::
Tratamento de efluentes industriais :: caracterização; processos físico-químicos e biológicos; reúso :: Resolução CONAMA 430/2011
Petroquímica e refino :: destilação de petróleo; craqueamento; tratamento de derivados ::
Engenharia de polímeros :: síntese; reologia; processamento de polímeros ::
Tanques de armazenamento e transferência de produtos :: projeto de tanques atmosféricos; bacias de contenção; inspeção :: API 650 (tanques soldados de armazenamento); NBR 17505 (armazenamento de líquidos inflamáveis)
''')

ramo('materiais', 'Engenharia de materiais e metalúrgica', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'IME'],
 ['ISO 6892-1 (ensaio de tração em metais)', 'ASTM E8 (ensaio de tração)'],
 ['Callister e Rethwisch, Ciência e Engenharia de Materiais', 'Ashby e Jones, Engenharia de Materiais', 'Porter e Easterling, Phase Transformations in Metals and Alloys', 'Dieter, Mechanical Metallurgy'],
 '''
Ciência dos materiais :: estrutura cristalina; defeitos; difusão; diagramas de fase ::
Ensaios mecânicos dos materiais :: tração; dureza; impacto; fadiga e fluência :: ISO 6892-1; ASTM E23 (impacto Charpy); ASTM E18 (dureza Rockwell)
Caracterização de materiais :: microscopia óptica e eletrônica; difração de raios X; análise térmica :: ASTM E112 (tamanho de grão)
Metalurgia física :: transformações de fase; tratamentos térmicos; aços e ligas não ferrosas ::
Metalurgia extrativa e siderurgia :: redução de minérios; alto-forno e aciaria; refino ::
Materiais cerâmicos :: processamento cerâmico; propriedades; cerâmicas avançadas ::
Materiais poliméricos :: estrutura de polímeros; propriedades mecânicas; ensaios :: ASTM D638 (tração em plásticos)
Materiais compósitos :: matrizes e reforços; micromecânica; fabricação ::
Corrosão e proteção :: eletroquímica da corrosão; formas de corrosão; proteção catódica e revestimentos ::
Seleção de materiais :: índices de mérito; mapas de Ashby; ciclo de vida ::
Mecânica da fratura e análise de falhas :: tenacidade à fratura; propagação de trincas; fractografia ::
Nanomateriais e materiais funcionais :: nanoestruturas; materiais para energia; materiais inteligentes ::
Manufatura aditiva :: processos de impressão 3D; materiais para manufatura aditiva; qualificação de peças :: ISO/ASTM 52900 (terminologia de manufatura aditiva)
''')

ramo('producao', 'Engenharia de produção', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'Unicamp'],
 ['ISO 9001 (gestão da qualidade)', 'ISO 45001 (saúde e segurança ocupacional)'],
 ['Slack, Brandon-Jones e Johnston, Administração da Produção', 'Montgomery, Introdução ao Controle Estatístico da Qualidade', 'Hillier e Lieberman, Introdução à Pesquisa Operacional', 'Ballou, Gerenciamento da Cadeia de Suprimentos/Logística Empresarial'],
 '''
Pesquisa operacional I :: programação linear; método simplex; dualidade; análise de sensibilidade ::
Pesquisa operacional II :: programação inteira; redes; teoria de filas; simulação ::
Planejamento e controle da produção :: previsão de demanda; MRP; programação da produção; gestão de estoques ::
Gestão da qualidade :: ferramentas da qualidade; controle estatístico de processo; Seis Sigma :: ISO 9001
Ergonomia e projeto do trabalho :: biomecânica; cognição; análise ergonômica do trabalho :: NR-17 (ergonomia)
Engenharia de métodos e tempos :: estudo de tempos; balanceamento de linhas; leiaute ::
Logística e cadeia de suprimentos :: gestão da cadeia; transporte e armazenagem; projeto de redes logísticas ::
Gestão de projetos :: ciclo de vida; cronograma e custos; riscos; métodos ágeis :: ISO 21502; ISO 31000 (gestão de riscos)
Engenharia econômica e finanças corporativas :: análise de investimentos; custo de capital; análise de risco ::
Gestão de operações de serviços :: projeto de serviços; capacidade e filas; qualidade em serviços ::
Produção enxuta e melhoria contínua :: sistema Toyota; mapeamento do fluxo de valor; kaizen ::
Gestão da inovação e do desenvolvimento de produtos :: processo de desenvolvimento; propriedade intelectual; inovação aberta :: Lei 10.973/2004 (Lei de Inovação)
Sistemas de gestão integrados :: qualidade, ambiente e segurança; auditorias; certificação :: ISO 9001; ISO 14001; ISO 45001
Ciência de dados para operações :: análise exploratória; previsão; otimização orientada por dados ::
''')

ramo('ambiental', 'Engenharia ambiental e sanitária', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'Unicamp'],
 ['Lei 6.938/1981 (Política Nacional do Meio Ambiente)', 'Resolução CONAMA 001/1986 (EIA/RIMA)', 'Resolução CONAMA 237/1997 (licenciamento)'],
 ['Sánchez, Avaliação de Impacto Ambiental: Conceitos e Métodos', 'Braga et al., Introdução à Engenharia Ambiental', 'Davis e Masten, Princípios de Engenharia Ambiental', 'von Sperling, Introdução à Qualidade das Águas e ao Tratamento de Esgotos'],
 '''
Ciências do ambiente e ecologia :: ecossistemas; ciclos biogeoquímicos; biodiversidade ::
Qualidade da água e controle da poluição hídrica :: parâmetros de qualidade; autodepuração; enquadramento :: Resolução CONAMA 357/2005; Resolução CONAMA 430/2011
Poluição atmosférica :: fontes e dispersão de poluentes; padrões de qualidade do ar; controle de emissões :: Resolução CONAMA 491/2018 (qualidade do ar)
Resíduos sólidos :: classificação; coleta e transporte; tratamento; aterros sanitários :: Lei 12.305/2010 (Política Nacional de Resíduos Sólidos); NBR 10004 (classificação de resíduos)
Licenciamento e avaliação de impacto ambiental :: EIA/RIMA; licenças prévia, de instalação e de operação; condicionantes :: Resolução CONAMA 001/1986; Resolução CONAMA 237/1997
Áreas contaminadas e remediação :: investigação; avaliação de risco; técnicas de remediação :: Resolução CONAMA 420/2009 (áreas contaminadas)
Mudanças climáticas e inventário de emissões :: gases de efeito estufa; inventários; mitigação e adaptação :: ISO 14064 (inventário de gases de efeito estufa); Lei 12.187/2009 (Política Nacional sobre Mudança do Clima)
Gestão ambiental empresarial :: sistemas de gestão ambiental; auditoria; análise de ciclo de vida :: ISO 14001; ISO 14040 (análise de ciclo de vida)
Modelagem ambiental :: modelos de qualidade da água; dispersão atmosférica; geoprocessamento aplicado ::
Ruído ambiental e acústica :: medição de ruído; mapas de ruído; controle :: NBR 10151 (ruído em áreas habitadas); NBR 10152 (níveis de pressão sonora em ambientes internos)
Legislação ambiental e áreas protegidas :: Código Florestal; unidades de conservação; crimes ambientais :: Lei 12.651/2012 (Código Florestal); Lei 9.985/2000 (SNUC); Lei 9.605/1998 (crimes ambientais)
''')

ramo('minas', 'Engenharia de minas', ['Imperial', 'TU Delft', 'ETH', 'Poli-USP', 'UFMG', 'UFRGS', 'UFRJ/COPPE'],
 ['NR-22 (segurança na mineração)', 'Normas Reguladoras de Mineração (ANM)', 'Lei 12.334/2010 (segurança de barragens)'],
 ['Hartman e Mutmansky, Introductory Mining Engineering', 'Darling (ed.), SME Mining Engineering Handbook', 'Wills e Finch, Wills\' Mineral Processing Technology', 'Hustrulid, Kuchta e Martin, Open Pit Mine Planning and Design'],
 '''
Prospecção e pesquisa mineral :: métodos geológicos e geofísicos; sondagem; amostragem ::
Avaliação de jazidas e geoestatística :: variografia; krigagem; classificação de recursos e reservas :: Código JORC; NI 43-101 (relatório de recursos minerais)
Lavra a céu aberto :: projeto de cava; desmonte com explosivos; carregamento e transporte :: NR-22
Lavra subterrânea :: métodos de lavra; ventilação; suporte de escavações :: NR-22
Tratamento de minérios :: cominuição; classificação; concentração por flotação e gravidade ::
Barragens de rejeitos e pilhas de estéril :: projeto; monitoramento; descaracterização :: Lei 12.334/2010; Lei 14.066/2020 (alteração da política de barragens); NBR 13028
Planejamento de mina e economia mineral :: sequenciamento; avaliação econômica; fechamento de mina ::
Desmonte de rochas com explosivos :: explosivos e acessórios; plano de fogo; vibração e ultralançamento :: NBR 9653 (redução de riscos no desmonte com explosivos)
Fechamento de mina e recuperação de áreas degradadas :: plano de fechamento; recuperação; monitoramento pós-fechamento ::
''')

ramo('petroleo', 'Engenharia de petróleo e gás', ['Stanford', 'Imperial', 'TU Delft', 'Poli-USP', 'Unicamp', 'UFRJ/COPPE'],
 ['Resoluções da ANP', 'NR-37 (segurança em plataformas de petróleo)'],
 ['Thomas (org.), Fundamentos de Engenharia de Petróleo', 'Rosa, Carvalho e Xavier, Engenharia de Reservatórios de Petróleo', 'Bourgoyne et al., Applied Drilling Engineering', 'Economides et al., Petroleum Production Systems'],
 '''
Geologia do petróleo :: sistemas petrolíferos; bacias sedimentares; rochas-reservatório ::
Perfuração de poços :: sondas; fluidos de perfuração; revestimento e cimentação; controle de poço :: API 5CT (revestimento e tubulação de produção)
Engenharia de reservatórios :: propriedades de rochas e fluidos; balanço de materiais; análise de testes de poço ::
Simulação de reservatórios :: modelos de escoamento em meios porosos; ajuste de histórico; previsão de produção ::
Elevação e escoamento :: elevação natural e artificial; escoamento multifásico; garantia de escoamento ::
Completação e estimulação de poços :: completação; fraturamento hidráulico; acidificação ::
Processamento primário de petróleo e gás natural :: separação; tratamento de óleo e gás; água produzida ::
Sistemas submarinos de produção :: árvores de natal molhadas; dutos e risers; manifolds :: ISO 13628 (sistemas submarinos de produção)
Regulação e economia do petróleo :: regimes de concessão e partilha; participações governamentais; avaliação econômica de projetos :: Lei 9.478/1997 (Lei do Petróleo); Lei 12.351/2010 (partilha de produção)
''')

ramo('biomedica', 'Engenharia biomédica', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Unicamp', 'UFRJ/COPPE', 'UFSC'],
 ['NBR IEC 60601-1 (segurança de equipamento eletromédico)', 'ISO 14971 (gestão de risco de dispositivos médicos)', 'RDC Anvisa 751/2022 (regularização de dispositivos médicos)'],
 ['Enderle e Bronzino, Introduction to Biomedical Engineering', 'Webster (ed.), Medical Instrumentation: Application and Design', 'Ratner et al., Biomaterials Science'],
 '''
Fisiologia para engenharia :: sistemas cardiovascular, respiratório e nervoso; modelagem fisiológica ::
Instrumentação biomédica :: biopotenciais; sensores biomédicos; segurança elétrica :: NBR IEC 60601-1
Processamento de sinais biomédicos :: ECG, EEG e EMG; filtragem; extração de características ::
Imagens médicas :: raios X e tomografia; ressonância magnética; ultrassom; processamento de imagens ::
Biomateriais :: biocompatibilidade; materiais para implantes; avaliação biológica :: ISO 10993 (avaliação biológica de dispositivos médicos)
Biomecânica :: mecânica de tecidos; marcha e movimento; próteses e órteses ::
Engenharia clínica e gestão de tecnologia em saúde :: manutenção de equipamentos médicos; avaliação de tecnologias; ambiente hospitalar :: RDC Anvisa 509/2021 (gerenciamento de tecnologias em saúde); NBR 13534 (instalações elétricas em estabelecimentos assistenciais de saúde)
Regulação e qualidade de dispositivos médicos :: classes de risco; gestão da qualidade; software como dispositivo médico :: ISO 13485 (qualidade de dispositivos médicos); IEC 62304 (software de dispositivos médicos); ISO 14971
''')

ramo('agricola', 'Engenharia agrícola', ['Unicamp', 'UFRGS', 'UFMG', 'Berkeley', 'ETH', 'TU Delft'],
 ['NR-31 (segurança no trabalho rural)', 'ISO 4254 (segurança de máquinas agrícolas)'],
 ['Bernardo, Mantovani, Silva e Soares, Manual de Irrigação', 'Mialhe, Máquinas Agrícolas: Ensaios e Certificação', 'Pereira, Angelocci e Sentelhas, Agrometeorologia'],
 '''
Máquinas e mecanização agrícola :: tratores; máquinas de preparo, plantio e colheita; gestão de frotas :: ISO 4254; NR-31
Irrigação e drenagem agrícola :: necessidade hídrica das culturas; sistemas de irrigação; drenagem :: Lei 12.787/2013 (Política Nacional de Irrigação)
Construções rurais e ambiência :: instalações zootécnicas; armazéns; conforto térmico animal ::
Pós-colheita e armazenagem de grãos :: secagem; aeração; armazenagem ::
Agricultura de precisão :: GNSS e sensores; mapas de produtividade; aplicação em taxa variável ::
Conservação do solo e da água :: erosão; práticas conservacionistas; manejo de bacias rurais :: Lei 12.651/2012
Energia na agricultura :: biocombustíveis; biodigestores; eletrificação rural ::
''')

ramo('cartografica', 'Engenharia cartográfica e de agrimensura', ['ETH', 'TU Delft', 'UFRGS', 'IME', 'UFSC', 'Poli-USP'],
 ['NBR 13133 (levantamento topográfico)', 'Norma Técnica para Georreferenciamento de Imóveis Rurais (INCRA)', 'Especificações técnicas da INDE (CONCAR)'],
 ['Monico, Posicionamento pelo GNSS', 'Gemael, Introdução ao Ajustamento de Observações', 'Câmara, Davis e Monteiro, Introdução à Ciência da Geoinformação', 'Jensen, Sensoriamento Remoto do Ambiente'],
 '''
Topografia :: instrumentos topográficos; poligonação; nivelamento; levantamentos planialtimétricos :: NBR 13133
Geodésia :: forma da Terra; sistemas de referência; SIRGAS2000; transformações de coordenadas :: Resolução IBGE R.PR 1/2005 (SIRGAS2000)
Ajustamento de observações :: método dos mínimos quadrados; propagação de covariâncias; controle de qualidade ::
Posicionamento por GNSS :: sistemas GNSS; métodos de posicionamento; RTK e PPP ::
Cartografia e projeções cartográficas :: projeções UTM e outras; escalas; generalização; padrões de qualidade cartográfica :: ET-CQDG (controle de qualidade de dados geoespaciais, CONCAR)
Fotogrametria :: geometria de imagens; aerotriangulação; ortofotos; aerolevantamento com drones ::
Sensoriamento remoto :: comportamento espectral; satélites de observação da Terra; classificação de imagens; radar ::
Sistemas de informação geográfica :: modelos de dados espaciais; análise espacial; bancos de dados geográficos ::
Cadastro técnico multifinalitário e georreferenciamento de imóveis :: cadastro urbano; georreferenciamento de imóveis rurais; regularização fundiária :: Lei 10.267/2001 (georreferenciamento de imóveis rurais); Lei 13.465/2017 (regularização fundiária)
Rede de referência cadastral municipal :: implantação de marcos; integração ao sistema geodésico; uso pelo município :: NBR 14166 (rede de referência cadastral municipal)
''')

ramo('nuclear', 'Engenharia nuclear', ['MIT', 'Berkeley', 'ETH', 'Imperial', 'TU Delft', 'UFRJ/COPPE', 'IME'],
 ['CNEN NN 3.01 (diretrizes básicas de proteção radiológica)', 'Normas de segurança da AIEA'],
 ['Lamarsh e Baratta, Introduction to Nuclear Engineering', 'Duderstadt e Hamilton, Nuclear Reactor Analysis', 'Knoll, Radiation Detection and Measurement'],
 '''
Física nuclear para engenharia :: estrutura do núcleo; decaimento radioativo; reações nucleares ::
Física de reatores :: difusão de nêutrons; criticalidade; cinética de reatores ::
Termo-hidráulica de reatores :: geração e remoção de calor; escoamento bifásico; acidentes de perda de refrigerante ::
Proteção radiológica e dosimetria :: grandezas dosimétricas; blindagem; limites de dose :: CNEN NN 3.01
Detecção e medida de radiação :: detectores a gás, cintiladores e semicondutores; espectrometria ::
Ciclo do combustível e rejeitos radioativos :: mineração e enriquecimento; combustível irradiado; gerência de rejeitos :: CNEN NN 8.01 (gerência de rejeitos de baixo e médio níveis)
Segurança e licenciamento de instalações nucleares :: defesa em profundidade; análise probabilística de segurança; licenciamento :: CNEN NE 1.04 (licenciamento de instalações nucleares); AIEA SSR-2/1 (projeto de usinas nucleares)
Aplicações nucleares na medicina e na indústria :: radioterapia e medicina nuclear; radiografia industrial; irradiação ::
''')

ramo('seguranca', 'Engenharia de segurança do trabalho', ['Poli-USP', 'UFRJ/COPPE', 'UFSC', 'UFMG', 'UFRGS', 'Unicamp'],
 ['NR-1 (disposições gerais e gerenciamento de riscos ocupacionais)', 'ISO 45001'],
 ['Saliba, Curso Básico de Segurança e Higiene Ocupacional', 'Barbosa Filho, Segurança do Trabalho e Gestão Ambiental', 'Normas de Higiene Ocupacional da Fundacentro'],
 '''
Gerenciamento de riscos ocupacionais :: inventário de riscos; programa de gerenciamento de riscos; hierarquia de controles :: NR-1
Higiene ocupacional :: agentes físicos, químicos e biológicos; avaliação quantitativa; limites de tolerância :: NR-9 (avaliação e controle de exposições ocupacionais); NR-15 (atividades insalubres); NHO 01 Fundacentro (ruído)
Prevenção e controle de perdas :: análise de acidentes; árvore de falhas; custos de acidentes ::
Segurança em máquinas e equipamentos :: proteções; dispositivos de segurança; apreciação de risco :: NR-12
Segurança na construção :: PGR da obra; trabalho em altura; escavações; andaimes :: NR-18; NR-35 (trabalho em altura)
Proteção contra incêndios e explosões :: triângulo do fogo; sistemas de proteção; atmosferas explosivas :: NR-23 (proteção contra incêndios); NR-20
Espaços confinados :: identificação; permissão de entrada; monitoramento atmosférico; resgate :: NR-33 (espaços confinados)
Ergonomia aplicada à segurança :: análise ergonômica; levantamento de cargas; organização do trabalho :: NR-17
Medicina do trabalho e saúde ocupacional :: PCMSO; doenças ocupacionais; primeiros socorros :: NR-7 (PCMSO)
Perícias de insalubridade e periculosidade :: laudos técnicos; adicional de insalubridade e de periculosidade; aposentadoria especial :: NR-15; NR-16 (atividades perigosas)
Gestão de SST e legislação :: SESMT e CIPA; eSocial em SST; responsabilidade do empregador :: NR-4 (SESMT); NR-5 (CIPA); NR-6 (EPI)
''')

ramo('energia', 'Engenharia de energia', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'Unicamp', 'UFRJ/COPPE', 'UFSC', 'UFRGS'],
 ['ISO 50001 (gestão de energia)', 'Lei 10.295/2001 (Política Nacional de Conservação de Energia)'],
 ['Goldemberg e Lucon, Energia, Meio Ambiente e Desenvolvimento', 'Masters, Renewable and Efficient Electric Power Systems', 'Tester et al., Sustainable Energy: Choosing Among Options'],
 '''
Sistemas energéticos e matriz energética :: fontes primárias; balanço energético; cenários de transição ::
Hidrogênio e combustíveis do futuro :: produção de hidrogênio de baixo carbono; armazenamento; células a combustível :: Lei 14.948/2024 (marco legal do hidrogênio de baixa emissão de carbono)
Bioenergia :: biomassa; etanol e biodiesel; biogás e biometano :: Lei 13.576/2017 (RenovaBio)
Eficiência energética na indústria e em edificações :: diagnóstico energético; motores e acionamentos eficientes; etiquetagem de edificações :: ISO 50001; Lei 10.295/2001
Redes inteligentes e recursos energéticos distribuídos :: medição inteligente; resposta da demanda; microrredes ::
Planejamento energético e regulação :: planejamento da expansão; tarifas; regulação de energia ::
''')

# ---------------------------------------------------------------- Instituto THEYE aplicado à engenharia
ramo('instituto', 'Instituto THEYE: IA, cibersegurança, nuvem e superinteligência aplicadas à engenharia', ['MIT', 'Stanford', 'ETH', 'Imperial', 'TU Delft', 'Berkeley', 'Poli-USP', 'ITA', 'Unicamp', 'UFRJ/COPPE', 'UFMG', 'IME'],
 ['ISO/IEC 42001 (sistema de gestão de inteligência artificial)', 'ISO/IEC 27001 (segurança da informação)', 'Lei 13.709/2018 (LGPD)', 'NIST AI RMF 1.0 (gestão de risco de IA)'],
 ['Russell e Norvig, Inteligência Artificial: Uma Abordagem Moderna', 'Goodfellow, Bengio e Courville, Deep Learning', 'Anderson, Security Engineering', 'Erl, Mahmood e Puttini, Cloud Computing: Concepts, Technology and Architecture', 'Bostrom, Superintelligence', 'Russell, Human Compatible'],
 '''
Inteligência artificial :: busca e planejamento; representação do conhecimento; raciocínio sob incerteza; agentes ::
Aprendizado de máquina :: aprendizado supervisionado e não supervisionado; avaliação de modelos; viés e variância ::
Aprendizado profundo :: redes neurais; redes convolucionais; transformadores; treinamento em larga escala ::
Visão computacional para engenharia :: detecção de patologias em estruturas; inspeção por drone; leitura de imagens de satélite ::
IA para projeto e cálculo de engenharia :: modelos substitutos; otimização topológica; projeto generativo com verificação normativa ::
Gêmeos digitais de infraestrutura :: modelos físico-digitais; sensores e IoT; monitoramento de saúde estrutural ::
Modelos de linguagem e agentes especialistas :: modelos de linguagem; recuperação aumentada por documentos; agentes com ferramentas; avaliação ::
Governança e regulação de IA :: gestão de risco de IA; transparência e explicabilidade; regulação brasileira e europeia :: ISO/IEC 42001; ISO/IEC 23894 (gestão de risco de IA); NIST AI RMF 1.0; Regulamento (UE) 2024/1689 (AI Act)
Segurança e alinhamento de sistemas de IA avançada :: alinhamento de objetivos; avaliações de capacidades perigosas; supervisão humana; contenção ::
Superinteligência: cenários, riscos e governança :: trajetórias de capacidade; riscos catastróficos; governança internacional; preparação institucional ::
Cibersegurança :: modelagem de ameaças; criptografia aplicada; segurança de redes; resposta a incidentes :: ISO/IEC 27001; ISO/IEC 27002 (controles de segurança); NIST CSF 2.0
Segurança de software e aplicações :: desenvolvimento seguro; testes de intrusão; verificação de segurança de aplicações :: OWASP ASVS (verificação de segurança de aplicações)
Cibersegurança de infraestrutura crítica e automação industrial :: sistemas SCADA; segmentação de redes industriais; resposta a incidentes em OT :: IEC 62443
Privacidade e proteção de dados em engenharia :: privacidade desde a concepção; relatório de impacto; anonimização :: Lei 13.709/2018 (LGPD); ISO/IEC 27701 (gestão de privacidade)
Computação em nuvem :: modelos de serviço e implantação; arquitetura de nuvem; custos ::
Arquitetura e segurança em nuvem :: identidade e acesso; criptografia e chaves; responsabilidade compartilhada :: ISO/IEC 27017 (segurança em nuvem); ISO/IEC 27018 (dados pessoais em nuvem)
Nuvem de governo e soberania de dados :: contratação de nuvem pelo poder público; localização de dados; continuidade :: Lei 14.133/2021
Engenharia de dados e plataformas de dados :: ingestão e pipelines; data lakes; qualidade e linhagem de dados ::
Internet das coisas e cidades inteligentes :: sensores e conectividade; plataformas urbanas; dados abertos municipais :: NBR ISO 37120 (indicadores para cidades sustentáveis); NBR ISO 37122 (indicadores para cidades inteligentes)
Computação quântica e criptografia pós-quântica :: qubits e algoritmos quânticos; impacto na criptografia; migração pós-quântica :: NIST FIPS 203 (ML-KEM)
Blockchain e registros auditáveis :: cadeias de hash; carimbo de tempo; registros de obra e de projeto auditáveis ::
''')
