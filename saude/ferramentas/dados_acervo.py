# -*- coding: utf-8 -*-
# Fase S (saúde): escolas de referência, grade da graduação, programas de doutorado e as skills de dados e de
# inteligência de mercado em saúde.

# QS World University Rankings by Subject 2025, Medicine, posições 1 a 100 (lidas em 13/11/2026 em
# xuanxiao.org/en/rankings/qs/subject/medicine/2025, espelho da tabela da QS). "=" é empate.
QS_MEDICINA_2025 = '''
1|Harvard University|Estados Unidos
2|University of Oxford|Reino Unido
3|Stanford University|Estados Unidos
4|Johns Hopkins University|Estados Unidos
5|University of Cambridge|Reino Unido
6|University of California, San Francisco|Estados Unidos
7|Imperial College London|Reino Unido
8|University College London|Reino Unido
9|Karolinska Institutet|Suécia
10|Yale University|Estados Unidos
11|Massachusetts Institute of Technology|Estados Unidos
12|University of California, Los Angeles|Estados Unidos
13|University of Pennsylvania|Estados Unidos
14|University of Toronto|Canadá
15|King's College London|Reino Unido
16|Duke University|Estados Unidos
17|Columbia University|Estados Unidos
18|National University of Singapore|Singapura
19|University of Michigan|Estados Unidos
20|University of Edinburgh|Reino Unido
21|London School of Hygiene & Tropical Medicine|Reino Unido
22|University of California San Diego|Estados Unidos
23|University of Washington|Estados Unidos
24|University of Hong Kong|Hong Kong
25=|Chinese University of Hong Kong|Hong Kong
25=|The University of Melbourne|Austrália
27|The University of Sydney|Austrália
28|McGill University|Canadá
29=|Peking University|China
29=|University of California, Berkeley|Estados Unidos
31|Cornell University|Estados Unidos
32|Heidelberg University|Alemanha
33|University of Manchester|Reino Unido
34|University of Chicago|Estados Unidos
35|New York University|Estados Unidos
36=|KU Leuven|Bélgica
36=|University of Amsterdam|Países Baixos
38=|Emory University|Estados Unidos
38=|Seoul National University|Coreia do Sul
38=|University of British Columbia|Canadá
41|McMaster University|Canadá
42=|Erasmus University Rotterdam|Países Baixos
42=|Northwestern University|Estados Unidos
44|University of Glasgow|Reino Unido
45|Sorbonne Université|França
46|Washington University in St. Louis|Estados Unidos
47|Monash University|Austrália
48|The University of Tokyo|Japão
49|University of Pittsburgh|Estados Unidos
50|The University of Texas MD Anderson Cancer Center|Estados Unidos
51|Boston University|Estados Unidos
52|University of Copenhagen|Dinamarca
53|Ludwig-Maximilians-Universität München|Alemanha
54|University of North Carolina at Chapel Hill|Estados Unidos
55|Yonsei University|Coreia do Sul
56=|Baylor College of Medicine|Estados Unidos
56=|Universitat de Barcelona|Espanha
58|Universidade de São Paulo|Brasil
59=|Fudan University|China
59=|Queen Mary University of London|Reino Unido
59=|Tsinghua University|China
59=|University of Bristol|Reino Unido
63|UNSW Sydney|Austrália
64|Utrecht University|Países Baixos
65|Leiden University|Países Baixos
66|University of Zurich|Suíça
67|University of Birmingham|Reino Unido
68|Medical University of Vienna|Áustria
69|Maastricht University|Países Baixos
70|Vanderbilt University|Estados Unidos
71|Shanghai Jiao Tong University|China
72=|ETH Zurich|Suíça
72=|Kyoto University|Japão
74|University of Liverpool|Reino Unido
75|The University of Queensland|Austrália
76|National Taiwan University|Taiwan
77|Université Paris Cité|França
78=|Mayo Clinic College of Medicine and Science|Estados Unidos
78=|Technical University of Munich|Alemanha
80|University of Milan|Itália
81|University of Southampton|Reino Unido
82|University of Oslo|Noruega
83|Trinity College Dublin|Irlanda
84=|Nanyang Technological University|Singapura
84=|The Ohio State University|Estados Unidos
86=|University of Alberta|Canadá
86=|Université de Montréal|Canadá
88|Case Western Reserve University|Estados Unidos
89=|Icahn School of Medicine at Mount Sinai|Estados Unidos
89=|University of Groningen|Países Baixos
89=|Zhejiang University|China
92|Lund University|Suécia
93|Charité - Universitätsmedizin Berlin|Alemanha
94|Sapienza University of Rome|Itália
95|Newcastle University|Reino Unido
96=|University of Bologna|Itália
96=|University of Leeds|Reino Unido
96=|University of Nottingham|Reino Unido
99=|Pontificia Universidad Católica de Chile|Chile
99=|University of Cape Town|África do Sul
'''

# 50 escolas médicas brasileiras de referência. A ordem NÃO é ranking: é a lista de partida para conferir no
# Ranking Universitário Folha (curso de Medicina), no Enade/CPC do Inep e na nota dos programas de pós na
# Plataforma Sucupira. Por isso cada uma sai com conferido: false.
ESCOLAS_BRASIL = '''
Faculdade de Medicina da USP (FMUSP)|SP
Faculdade de Medicina de Ribeirão Preto da USP (FMRP-USP)|SP
Escola Paulista de Medicina da Unifesp|SP
Faculdade de Ciências Médicas da Unicamp|SP
Faculdade de Medicina de Botucatu da Unesp|SP
Faculdade de Medicina da UFRJ|RJ
Faculdade de Medicina da UFMG|MG
Faculdade de Medicina da UFRGS|RS
Universidade Federal de Ciências da Saúde de Porto Alegre (UFCSPA)|RS
Escola de Medicina da PUCRS|RS
Faculdade de Medicina da Universidade Federal Fluminense (UFF)|RJ
Faculdade de Ciências Médicas da UERJ|RJ
Escola de Medicina e Cirurgia da Unirio|RJ
Universidade Federal do Paraná (UFPR), curso de Medicina|PR
Pontifícia Universidade Católica do Paraná (PUCPR), Escola de Medicina|PR
Universidade Federal de Santa Catarina (UFSC), curso de Medicina|SC
Faculdade de Medicina da Universidade de Brasília (UnB)|DF
Faculdade de Medicina da Universidade Federal de Goiás (UFG)|GO
Faculdade de Medicina da Universidade Federal da Bahia (UFBA)|BA
Escola Bahiana de Medicina e Saúde Pública|BA
Centro de Ciências Médicas da Universidade Federal de Pernambuco (UFPE)|PE
Faculdade de Medicina da Universidade Federal do Ceará (UFC)|CE
Universidade Federal do Rio Grande do Norte (UFRN), curso de Medicina|RN
Universidade Federal da Paraíba (UFPB), curso de Medicina|PB
Universidade Federal de Sergipe (UFS), curso de Medicina|SE
Universidade Federal de Alagoas (Ufal), Faculdade de Medicina|AL
Universidade Federal do Pará (UFPA), Faculdade de Medicina|PA
Universidade Federal do Amazonas (Ufam), Faculdade de Medicina|AM
Universidade Federal de Mato Grosso do Sul (UFMS), Faculdade de Medicina|MS
Universidade Federal de Uberlândia (UFU), Faculdade de Medicina|MG
Universidade Federal de Juiz de Fora (UFJF), Faculdade de Medicina|MG
Universidade Federal do Triângulo Mineiro (UFTM)|MG
Universidade Federal de São Carlos (UFSCar), curso de Medicina|SP
Faculdade de Medicina de São José do Rio Preto (Famerp)|SP
Faculdade de Ciências Médicas da Santa Casa de São Paulo|SP
Faculdade Israelita de Ciências da Saúde Albert Einstein|SP
Faculdade de Medicina da PUC-Campinas|SP
Faculdade de Medicina do ABC (Centro Universitário FMABC)|SP
Faculdade de Medicina de Jundiaí|SP
Faculdade de Medicina de Marília (Famema)|SP
Universidade Estadual de Londrina (UEL), curso de Medicina|PR
Universidade Estadual de Maringá (UEM), curso de Medicina|PR
Universidade Federal de Pelotas (UFPel), Faculdade de Medicina|RS
Universidade Federal de Santa Maria (UFSM), curso de Medicina|RS
Faculdade de Ciências Médicas de Minas Gerais|MG
Universidade Federal do Espírito Santo (Ufes), curso de Medicina|ES
Universidade Federal de Campina Grande (UFCG), curso de Medicina|PB
Universidade Federal do Maranhão (UFMA), curso de Medicina|MA
Universidade Federal do Piauí (UFPI), curso de Medicina|PI
Universidade Federal de Mato Grosso (UFMT), Faculdade de Medicina|MT
'''

# Graduação em medicina: Diretrizes Curriculares Nacionais (Resolução CNE/CES 3/2014), áreas de atenção,
# gestão e educação em saúde. "Nome :: tópicos"
GRADUACAO = '''
Anatomia humana :: anatomia sistêmica e topográfica; anatomia por imagem; dissecção
Histologia e embriologia :: tecidos; desenvolvimento embrionário; malformações
Bioquímica e biologia molecular :: metabolismo; genética molecular; sinalização celular
Fisiologia humana :: cardiovascular; respiratória; renal; endócrina; neurofisiologia
Farmacologia :: farmacocinética; farmacodinâmica; classes terapêuticas
Microbiologia e imunologia :: bactérias; vírus; fungos; resposta imune
Parasitologia :: protozoários; helmintos; doenças negligenciadas
Patologia geral e especial :: lesão celular; inflamação; neoplasias
Semiologia médica :: anamnese; exame físico; raciocínio clínico
Bioestatística e epidemiologia :: desenhos de estudo; inferência; medidas de associação
Medicina baseada em evidências :: pergunta PICO; leitura crítica; níveis de evidência
Saúde coletiva e SUS :: Lei 8.080/1990; atenção primária; vigilância em saúde
Ética médica e bioética :: Código de Ética Médica (Resolução CFM 2.217/2018); sigilo; consentimento
Comunicação clínica :: relação médico-paciente; más notícias (protocolo SPIKES)
Psicologia médica :: desenvolvimento humano; adoecimento e enfrentamento
Medicina legal na graduação :: atestados; declaração de óbito; noções de perícia
Internato em clínica médica :: enfermaria; ambulatório; urgência
Internato em cirurgia :: centro cirúrgico; pré e pós-operatório
Internato em pediatria :: puericultura; alojamento conjunto; emergência pediátrica
Internato em ginecologia e obstetrícia :: pré-natal; sala de parto
Internato em saúde mental :: CAPS; emergência psiquiátrica
Internato em medicina de família e urgência :: unidade básica; SAMU e pronto-socorro
Simulação clínica e segurança do paciente :: habilidades; erro médico; metas internacionais
Informática em saúde :: prontuário eletrônico; telessaúde; LGPD na saúde
'''

# Skills de dados e de inteligência de mercado em saúde (o pedido de M: "skills de inteligência de mercado,
# dados"). Cada uma vira um consultor. "Nome :: o que faz :: fontes oficiais"
SKILLS_DADOS = '''
Dados do SUS (DATASUS) :: lê e cruza SIH, SIA, SIM, SINASC e SINAN por município e por ano; explica limites de cada base :: DATASUS TabNet; OpenDataSUS
Rede assistencial (CNES) :: mapeia hospitais, leitos, equipamentos e profissionais por região; acha vazio assistencial :: Cadastro Nacional de Estabelecimentos de Saúde (CNES)
Saúde suplementar (ANS) :: beneficiários por operadora e região; sinistralidade; reclamações; reajustes :: ANS dados abertos; D-TISS; IDSS
Preço de procedimentos :: compara tabela SUS (SIGTAP), TUSS e CBHPM; monta referência de honorário médico :: SIGTAP; TUSS (ANS); CBHPM (AMB)
Preço de medicamentos :: preço fábrica e máximo ao consumidor; compras públicas :: CMED/Anvisa; Banco de Preços em Saúde (BPS)
Registro sanitário :: situação de registro de medicamento, dispositivo e alimento; alertas e recolhimentos :: Anvisa (consultas e dados abertos)
Ensaios clínicos :: quem pesquisa o quê, fase, patrocinador e centro no Brasil e no mundo :: ClinicalTrials.gov; ReBEC; ICTRP/OMS
Incorporação de tecnologias :: decisões e relatórios da Conitec; PCDT; rol da ANS :: Conitec; Rol de Procedimentos da ANS
Judicialização da saúde :: ações por medicamento, plano de saúde e erro médico; tese do STF e do STJ; ponte com o braço jurídico :: CNJ Justiça em Números; DataJud; Temas 6, 500, 793 e 1234 do STF
Demografia médica :: médicos por especialidade, região e idade; oferta de residência :: Demografia Médica no Brasil (FMUSP/AMB); CFM; CNRM
Epidemiologia e carga de doença :: incidência, prevalência, DALYs e projeções :: GBD (IHME); Vigitel; PNS (IBGE)
Mercado de saúde (empresas) :: receita, margem e consolidação de hospitais, laboratórios e operadoras listadas :: demonstrações na CVM; relatórios da ANS
Inteligência competitiva para clínicas :: concorrência local, demanda por especialidade, ticket médio e captação :: CNES; ANS; IBGE (renda por município)
Vigilância de surtos e notícias :: sinais de surto e de risco sanitário em notícias e boletins :: GDELT; boletins epidemiológicos do Ministério da Saúde; ProMED
Literatura científica :: busca estruturada, filtro por desenho de estudo e nível de evidência :: PubMed/MEDLINE; Cochrane Library; LILACS/BVS; OpenAlex
Teses e dissertações :: busca por programa, nota CAPES e orientador :: Catálogo de Teses e Dissertações da CAPES; BDTD/Ibict; Plataforma Sucupira
Indicadores de qualidade hospitalar :: mortalidade ajustada, reinternação, infecção, tempo de permanência :: Anvisa (IRAS); ANS (QUALISS); Proadi-SUS
Economia da saúde :: custo-efetividade, impacto orçamentário e precificação por valor :: Diretrizes Metodológicas do Ministério da Saúde; Conitec
LGPD e dado sensível de saúde :: base legal, anonimização, compartilhamento e incidente :: Lei 13.709/2018 (arts. 11 e 13); ANPD
IA clínica e validação de algoritmos :: acurácia, calibração, viés e regulação de software como dispositivo médico :: Anvisa RDC 657/2022 (software como dispositivo médico); TRIPOD-AI; CONSORT-AI
'''

# Programas de doutorado de referência para buscar teses (o pedido de M: "teses de PhD rating A+++").
# No Brasil a régua é a nota CAPES (7 é a máxima). A nota de cada programa NÃO foi conferida nesta rodada,
# porque o container não alcança a Sucupira; o campo nota_capes fica "a conferir" até a conferência.
PROGRAMAS_DOUTORADO = '''
USP|Cardiologia (FMUSP / InCor)|Medicina I
USP|Ciências Médicas (FMUSP)|Medicina I
USP|Oncologia (FMUSP)|Medicina I
USP|Fisiopatologia Experimental (FMUSP)|Medicina I
USP|Psiquiatria (FMUSP)|Medicina II
USP|Patologia (FMUSP)|Medicina II
USP|Clínica Médica (FMRP-USP)|Medicina I
USP|Neurologia (FMRP-USP)|Medicina II
USP|Saúde Pública (FSP-USP)|Saúde Coletiva
Unifesp|Medicina (Cardiologia)|Medicina I
Unifesp|Psiquiatria e Psicologia Médica|Medicina II
Unifesp|Infectologia|Medicina II
Unifesp|Oftalmologia e Ciências Visuais|Medicina III
Unicamp|Clínica Médica|Medicina I
Unicamp|Ciências Médicas|Medicina II
UFRGS|Cardiologia e Ciências Cardiovasculares|Medicina I
UFRGS|Endocrinologia|Medicina I
UFRGS|Ciências Médicas: Endocrinologia, Metabologia e Nutrição|Medicina I
UFRGS|Psiquiatria e Ciências do Comportamento|Medicina II
UFRGS|Epidemiologia|Saúde Coletiva
UFPel|Epidemiologia|Saúde Coletiva
UFMG|Ciências da Saúde: Infectologia e Medicina Tropical|Medicina II
UFMG|Ciências Aplicadas à Saúde do Adulto|Medicina I
UFRJ|Clínica Médica|Medicina I
UFRJ|Medicina (Cardiologia)|Medicina I
Fiocruz|Medicina Tropical (IOC)|Medicina II
Fiocruz|Epidemiologia em Saúde Pública (ENSP)|Saúde Coletiva
UFBA|Saúde Coletiva (ISC)|Saúde Coletiva
UFC|Ciências Médicas|Medicina I
UnB|Ciências Médicas|Medicina I
'''
