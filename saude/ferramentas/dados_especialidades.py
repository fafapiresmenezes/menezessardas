# -*- coding: utf-8 -*-
# Fase S (saúde) do THEYE: as 55 especialidades médicas reconhecidas no Brasil (Resolução CFM 2.472/2026,
# que revogou a 2.380/2024 e manteve 55 especialidades e 64 áreas de atuação), cada uma com a grade de referência da residência, diretrizes, bibliografia
# e os estudos marcantes que todo especialista conhece.
#
# Linha de módulo: "Nome do módulo :: tópico; tópico; tópico"
# Linha de artigo: "ano | periódico | estudo ou título curto | primeiro autor"
# Artigos entram aqui só quando o estudo é clássico e conhecido pelo nome; DOI e página ficam para a
# conferência automática (campo conferido: false), porque o container não alcança PubMed nem OpenAlex.

ESPECIALIDADES = {}

def esp(cod, nome, acesso, anos, sociedade, diretrizes, biblio, modulos, artigos=''):
    ESPECIALIDADES[cod] = dict(nome=nome, acesso=acesso, anos=anos, sociedade=sociedade,
                               diretrizes=diretrizes, biblio=biblio, modulos=modulos, artigos=artigos)

DIRETO = 'acesso direto'
CM = 'pré-requisito: Clínica Médica'
CG = 'pré-requisito: Cirurgia Geral (ou Cirurgia Básica)'
PED = 'pré-requisito: Pediatria'

esp('acupuntura', 'Acupuntura', DIRETO, 2, 'Colégio Médico Brasileiro de Acupuntura (CMBA)',
 ['Normas CFM sobre acupuntura como ato médico', 'Diretrizes do CMBA', 'WHO Benchmarks for Training in Acupuncture'],
 ['Maciocia, Os Fundamentos da Medicina Chinesa', 'Filshie e White, Medical Acupuncture: A Western Scientific Approach'], '''
Bases neurofisiológicas da acupuntura :: neuromodulação da dor; sistema opioide endógeno; controle inibitório difuso
Anatomia de pontos e meridianos :: localização topográfica; segurança anatômica; pneumotórax e outras complicações
Acupuntura na dor crônica :: lombalgia; cervicalgia; osteoartrite de joelho; cefaleia tensional e enxaqueca
Acupuntura em náusea e vômito :: náusea pós-operatória; náusea da quimioterapia; ponto PC6
Eletroacupuntura e técnicas associadas :: parâmetros de frequência; auriculoterapia; moxabustão e ventosas
Pesquisa em acupuntura :: desenho de ensaio com sham; cegamento; revisão sistemática e metanálise
''', '''
2012 | Archives of Internal Medicine | Acupuncture for chronic pain: individual patient data meta-analysis | Vickers AJ
2007 | Archives of Internal Medicine | GERAC: acupuntura na lombalgia crônica | Haake M
''')

esp('alergia', 'Alergia e Imunologia', CM + ' ou Pediatria', 2, 'Associação Brasileira de Alergia e Imunologia (ASBAI)',
 ['GINA (Global Initiative for Asthma)', 'ARIA (rinite alérgica)', 'Diretrizes da ASBAI', 'WAO Anaphylaxis Guidance'],
 ['Middleton, Allergy: Principles and Practice', 'Abbas, Imunologia Celular e Molecular'], '''
Imunologia básica e clínica :: imunidade inata e adaptativa; hipersensibilidade de Gell e Coombs; citocinas
Asma e rinite alérgica :: diagnóstico funcional; degraus do tratamento; imunobiológicos
Anafilaxia e urticária :: adrenalina intramuscular; urticária crônica espontânea; angioedema hereditário
Alergia alimentar e a medicamentos :: teste de provocação oral; dessensibilização; reações graves a fármacos
Erros inatos da imunidade :: sinais de alerta; imunodeficiência primária; reposição de imunoglobulina
Imunoterapia alérgeno-específica :: indicações; esquemas subcutâneo e sublingual; segurança
''', '''
2015 | New England Journal of Medicine | LEAP: amendoim precoce previne alergia | Du Toit G
''')

esp('anestesio', 'Anestesiologia', DIRETO, 3, 'Sociedade Brasileira de Anestesiologia (SBA)',
 ['Resolução CFM 2.174/2017 (prática do ato anestésico)', 'ASA Practice Guidelines', 'Difficult Airway Society Guidelines'],
 ['Miller, Anesthesia', 'Barash, Clinical Anesthesia', 'Stoelting, Pharmacology and Physiology in Anesthetic Practice'], '''
Farmacologia anestésica :: hipnóticos; opioides; bloqueadores neuromusculares e reversão
Via aérea :: avaliação preditiva; algoritmo da via aérea difícil; videolaringoscopia
Monitorização e segurança :: oximetria e capnografia; profundidade anestésica; checklist de cirurgia segura
Anestesia regional :: bloqueios neuroaxiais; bloqueios periféricos guiados por ultrassom; toxicidade de anestésico local
Anestesia em situações especiais :: obstetrícia; pediatria; cardíaca e neurocirurgia
Dor aguda e recuperação :: analgesia multimodal; ERAS; náusea e vômito pós-operatórios
''', '''
2009 | New England Journal of Medicine | Checklist de cirurgia segura da OMS | Haynes AB
2004 | New England Journal of Medicine | IMPACT: prevenção de náusea e vômito pós-operatórios | Apfel CC
''')

esp('angio', 'Angiologia', CM, 2, 'Sociedade Brasileira de Angiologia e de Cirurgia Vascular (SBACV)',
 ['Diretrizes da SBACV', 'ESVS Guidelines', 'CHEST Antithrombotic Guidelines'],
 ['Rutherford, Vascular Surgery and Endovascular Therapy', 'Maffei, Doenças Vasculares Periféricas'], '''
Doença arterial periférica :: índice tornozelo-braquial; claudicação; tratamento clínico
Trombose venosa e embolia :: escore de Wells; anticoagulação; profilaxia
Insuficiência venosa crônica :: classificação CEAP; terapia compressiva; úlcera venosa
Linfedema e doenças linfáticas :: diagnóstico; drenagem e compressão
Eco-Doppler vascular :: protocolos arterial e venoso; critérios de estenose
Vasculites e acrossíndromes :: fenômeno de Raynaud; arterites
''', '''
2012 | New England Journal of Medicine | EINSTEIN-PE: rivaroxabana na embolia pulmonar | Büller HR
''')

esp('cardio', 'Cardiologia', CM, 2, 'Sociedade Brasileira de Cardiologia (SBC)',
 ['Diretrizes da SBC', 'ESC Guidelines', 'ACC/AHA Guidelines'],
 ['Braunwald, Tratado de Doenças Cardiovasculares', 'Hurst, The Heart'], '''
Síndromes coronarianas :: angina estável; infarto com e sem supra de ST; reperfusão
Insuficiência cardíaca :: fração de ejeção reduzida e preservada; terapia quádrupla; dispositivos
Arritmias :: fibrilação atrial e anticoagulação; bradiarritmias; morte súbita e CDI
Hipertensão arterial e prevenção :: metas pressóricas; dislipidemia; escores de risco
Valvopatias e cardiomiopatias :: estenose aórtica e TAVI; doença reumática; cardiomiopatia hipertrófica
Métodos diagnósticos :: eletrocardiograma; ecocardiograma; teste ergométrico; cateterismo
Doença de Chagas :: forma cardíaca; diagnóstico; tratamento etiológico
''', '''
1994 | The Lancet | 4S: sinvastatina na prevenção secundária | Scandinavian Simvastatin Survival Study Group
1988 | The Lancet | ISIS-2: estreptoquinase e aspirina no infarto | ISIS-2 Collaborative Group
2015 | New England Journal of Medicine | SPRINT: controle intensivo da pressão | Wright JT
2014 | New England Journal of Medicine | PARADIGM-HF: sacubitril-valsartana | McMurray JJV
2019 | New England Journal of Medicine | DAPA-HF: dapagliflozina na insuficiência cardíaca | McMurray JJV
2009 | New England Journal of Medicine | RE-LY: dabigatrana na fibrilação atrial | Connolly SJ
2015 | New England Journal of Medicine | BENEFIT: benznidazol na cardiopatia chagásica | Morillo CA
1999 | New England Journal of Medicine | RALES: espironolactona na insuficiência cardíaca | Pitts B
''')

esp('cir-cardio', 'Cirurgia Cardiovascular', DIRETO, 5, 'Sociedade Brasileira de Cirurgia Cardiovascular (SBCCV)',
 ['Diretrizes da SBCCV', 'EACTS/ESC Guidelines', 'STS Practice Guidelines'],
 ['Kirklin/Barratt-Boyes, Cardiac Surgery', 'Cohn, Cardiac Surgery in the Adult'], '''
Circulação extracorpórea :: perfusão; proteção miocárdica; complicações
Revascularização do miocárdio :: enxertos arteriais e venosos; cirurgia sem CEC
Cirurgia valvar :: plastia mitral; troca valvar aórtica; próteses
Cirurgia da aorta :: dissecção aguda; aneurismas torácicos
Cardiopatias congênitas :: shunts; correções paliativas e definitivas
Assistência circulatória e transplante :: ECMO; dispositivos de assistência ventricular; transplante cardíaco
''', '''
2009 | New England Journal of Medicine | SYNTAX: angioplastia versus cirurgia na doença multiarterial | Serruys PW
2016 | New England Journal of Medicine | STICHES: cirurgia na cardiomiopatia isquêmica | Velazquez EJ
''')

esp('cir-mao', 'Cirurgia da Mão', 'pré-requisito: Ortopedia e Traumatologia ou Cirurgia Plástica', 2, 'Sociedade Brasileira de Cirurgia da Mão (SBCM)',
 ['Diretrizes da SBCM', 'AAOS Clinical Practice Guidelines'],
 ["Green's Operative Hand Surgery", 'Tubiana, The Hand'], '''
Anatomia funcional da mão :: tendões flexores e extensores; nervos periféricos; arcos vasculares
Traumatismos da mão :: fraturas de metacarpos e falanges; lesões tendíneas; amputações e reimplantes
Compressões nervosas :: túnel do carpo; canal de Guyon; síndrome do pronador
Doenças degenerativas e inflamatórias :: Dupuytren; artrose trapézio-metacárpica; artrite reumatoide
Microcirurgia :: retalhos; reimplante; reconstrução de nervos
Mão congênita e reabilitação :: malformações; terapia da mão
''')

esp('cir-cabeca', 'Cirurgia de Cabeça e Pescoço', CG, 3, 'Sociedade Brasileira de Cirurgia de Cabeça e Pescoço (SBCCP)',
 ['NCCN Head and Neck Cancers', 'ATA Thyroid Guidelines', 'Diretrizes da SBCCP'],
 ['Shah, Head and Neck Surgery and Oncology', 'Cummings, Otolaryngology'], '''
Tireoide e paratireoide :: nódulo tireoidiano e Bethesda; tireoidectomia; hiperparatireoidismo
Câncer de boca e orofaringe :: estadiamento; HPV; ressecção e reconstrução
Laringe e hipofaringe :: laringectomias; preservação de órgão
Glândulas salivares :: tumores de parótida; preservação do nervo facial
Esvaziamento cervical :: níveis linfonodais; indicações
Reconstrução em cabeça e pescoço :: retalhos locais e microcirúrgicos
''', '''
1991 | New England Journal of Medicine | VA Laryngeal Cancer Study: preservação de laringe | Department of Veterans Affairs Laryngeal Cancer Study Group
2010 | New England Journal of Medicine | HPV e sobrevida no câncer de orofaringe | Ang KK
''')

esp('cir-digestivo', 'Cirurgia do Aparelho Digestivo', CG, 2, 'Colégio Brasileiro de Cirurgia Digestiva (CBCD)',
 ['Diretrizes do CBCD', 'NCCN Esophageal, Gastric, Pancreatic Cancers', 'Tokyo Guidelines (vias biliares)'],
 ['Sabiston, Tratado de Cirurgia', 'Blumgart, Surgery of the Liver, Biliary Tract and Pancreas'], '''
Esôfago e estômago :: doença do refluxo e fundoplicatura; acalasia; gastrectomia oncológica
Fígado e vias biliares :: colecistite e Tokyo; hepatectomias; transplante hepático
Pâncreas :: pancreatite aguda; duodenopancreatectomia; tumores neuroendócrinos
Cirurgia bariátrica e metabólica :: indicações; bypass e sleeve; complicações
Intestino delgado e cólon :: obstrução; doença inflamatória; câncer colorretal
Videolaparoscopia e robótica :: princípios; curva de aprendizado
''', '''
2006 | New England Journal of Medicine | MAGIC: quimioterapia perioperatória no câncer gástrico | Cunningham D
2012 | New England Journal of Medicine | Cirurgia bariátrica versus tratamento clínico no diabetes (STAMPEDE) | Schauer PR
''')

esp('cir-geral', 'Cirurgia Geral', DIRETO, 3, 'Colégio Brasileiro de Cirurgiões (CBC)',
 ['ATLS (American College of Surgeons)', 'Diretrizes do CBC', 'WSES Guidelines'],
 ['Sabiston, Tratado de Cirurgia', 'Schwartz, Principles of Surgery'], '''
Bases da cirurgia :: resposta metabólica ao trauma; cicatrização; infecção do sítio cirúrgico
Trauma :: ATLS; controle de danos; trauma abdominal e torácico
Abdome agudo :: apendicite; colecistite; obstrução e perfuração
Hérnias da parede abdominal :: inguinais; incisionais; técnicas com tela
Cirurgia ambulatorial e pequenas cirurgias :: lesões de pele; abscessos
Cuidados perioperatórios :: risco cirúrgico; ERAS; nutrição
''', '''
2015 | JAMA | APPAC: antibiótico versus apendicectomia | Salminen P
2020 | New England Journal of Medicine | CODA: antibiótico versus apendicectomia | CODA Collaborative
''')

esp('cir-onco', 'Cirurgia Oncológica', CG, 3, 'Sociedade Brasileira de Cirurgia Oncológica (SBCO)',
 ['NCCN Guidelines', 'Diretrizes da SBCO', 'AJCC Cancer Staging Manual'],
 ['DeVita, Cancer: Principles and Practice of Oncology', 'MD Anderson Surgical Oncology Handbook'], '''
Princípios da cirurgia oncológica :: margens; linfadenectomia; linfonodo sentinela
Tumores do aparelho digestivo :: estômago; cólon e reto; fígado e pâncreas
Sarcomas e melanoma :: ressecção; margens; terapia adjuvante
Tumores ginecológicos e de mama :: abordagem cirúrgica oncológica
Cirurgia citorredutora e HIPEC :: carcinomatose peritoneal
Tratamento multimodal :: neoadjuvância; decisão em junta multidisciplinar
''', '''
2006 | New England Journal of Medicine | MSLT-I: linfonodo sentinela no melanoma | Morton DL
2004 | New England Journal of Medicine | Quimiorradioterapia pré-operatória no câncer de reto | Sauer R
''')

esp('cir-ped', 'Cirurgia Pediátrica', CG, 3, 'Associação Brasileira de Cirurgia Pediátrica (CIPE)',
 ['Diretrizes da CIPE', 'APSA Guidelines'],
 ["Ashcraft's Pediatric Surgery", 'Coran, Pediatric Surgery'], '''
Malformações congênitas :: atresia de esôfago; hérnia diafragmática; defeitos de parede abdominal
Abdome agudo na criança :: apendicite; invaginação intestinal; estenose hipertrófica do piloro
Urologia pediátrica :: criptorquidia; hipospádia; refluxo vesicoureteral
Oncologia pediátrica cirúrgica :: tumor de Wilms; neuroblastoma
Trauma pediátrico :: particularidades; tratamento não operatório
Cirurgia neonatal :: enterocolite necrosante; doença de Hirschsprung
''')

esp('cir-plastica', 'Cirurgia Plástica', CG, 3, 'Sociedade Brasileira de Cirurgia Plástica (SBCP)',
 ['Diretrizes da SBCP', 'ASPS Evidence-Based Guidelines'],
 ["Grabb and Smith's Plastic Surgery", 'Neligan, Plastic Surgery'], '''
Princípios e retalhos :: enxertos; retalhos locais e livres; cicatrização
Queimaduras :: reanimação; enxertia; sequelas
Cirurgia craniofacial :: fissuras labiopalatinas; fraturas de face
Reconstrução de mama :: expansores; retalhos autólogos
Cirurgia estética :: mamoplastias; abdominoplastia; rejuvenescimento facial
Segurança do paciente na cirurgia plástica :: tromboprofilaxia; lipoaspiração segura
''')

esp('cir-toracica', 'Cirurgia Torácica', CG, 2, 'Sociedade Brasileira de Cirurgia Torácica (SBCT)',
 ['Diretrizes da SBCT', 'NCCN Non-Small Cell Lung Cancer', 'ESTS Guidelines'],
 ["Shields' General Thoracic Surgery", 'Pearson, Thoracic and Esophageal Surgery'], '''
Câncer de pulmão :: estadiamento; lobectomia e segmentectomia; cirurgia videoassistida
Pleura :: derrame; empiema; pneumotórax
Mediastino :: timoma; massas mediastinais
Via aérea :: estenose traqueal; broncoscopia
Trauma torácico :: drenagem; toracotomia de urgência
Transplante pulmonar :: indicações; seguimento
''', '''
2011 | New England Journal of Medicine | NLST: rastreamento com tomografia de baixa dose | National Lung Screening Trial Research Team
2022 | The Lancet | JCOG0802: segmentectomia versus lobectomia | Saji H
''')

esp('cir-vascular', 'Cirurgia Vascular', CG, 2, 'Sociedade Brasileira de Angiologia e de Cirurgia Vascular (SBACV)',
 ['Diretrizes da SBACV', 'ESVS Guidelines', 'SVS Practice Guidelines'],
 ['Rutherford, Vascular Surgery and Endovascular Therapy'], '''
Aneurismas de aorta :: rastreamento; reparo aberto e endovascular
Doença carotídea :: endarterectomia; angioplastia com stent
Isquemia de membros :: revascularização; amputações
Acessos para hemodiálise :: fístulas arteriovenosas
Cirurgia endovascular :: técnicas; radioproteção
Trauma vascular :: controle de sangramento; reparo
''', '''
2004 | The Lancet | EVAR trial 1: reparo endovascular do aneurisma | EVAR trial participants
1991 | New England Journal of Medicine | NASCET: endarterectomia na estenose carotídea | North American Symptomatic Carotid Endarterectomy Trial Collaborators
''')

esp('clinica', 'Clínica Médica', DIRETO, 2, 'Sociedade Brasileira de Clínica Médica (SBCM)',
 ['Diretrizes das sociedades de especialidade', 'Protocolos Clínicos e Diretrizes Terapêuticas do Ministério da Saúde (PCDT)', 'UpToDate e DynaMed como apoio'],
 ["Harrison's Principles of Internal Medicine", 'Goldman-Cecil Medicine'], '''
Raciocínio clínico :: anamnese; diagnóstico diferencial; probabilidade pré-teste
Doenças crônicas não transmissíveis :: hipertensão; diabetes; DPOC
Doenças infecciosas na enfermaria :: pneumonia; sepse; infecção urinária
Medicina hospitalar :: manejo de internados; transição do cuidado; alta segura
Emergências clínicas :: dor torácica; dispneia; rebaixamento de consciência
Cuidados paliativos e decisão compartilhada :: diretivas antecipadas; controle de sintomas
''', '''
2001 | New England Journal of Medicine | Terapia precoce guiada por metas na sepse | Rivers E
2014 | New England Journal of Medicine | ProCESS: protocolo na sepse | ProCESS Investigators
''')

esp('colo', 'Coloproctologia', CG, 2, 'Sociedade Brasileira de Coloproctologia (SBCP)',
 ['Diretrizes da Sociedade Brasileira de Coloproctologia', 'ASCRS Clinical Practice Guidelines'],
 ['Corman, Colon and Rectal Surgery', 'Gordon e Nivatvongs, Principles and Practice of Surgery for the Colon, Rectum and Anus'], '''
Doenças anorretais benignas :: hemorroidas; fissura; fístula e abscesso
Câncer colorretal :: rastreamento; colectomias; excisão total do mesorreto
Doença inflamatória intestinal :: tratamento cirúrgico; bolsa ileal
Doença diverticular :: diverticulite; indicações cirúrgicas
Fisiologia anorretal :: incontinência; constipação; manometria
Colonoscopia :: técnica; polipectomia
''', '''
1993 | New England Journal of Medicine | Minnesota: pesquisa de sangue oculto reduz mortalidade | Mandel JS
1982 | British Journal of Surgery | Excisão total do mesorreto | Heald RJ
''')

esp('dermato', 'Dermatologia', DIRETO, 3, 'Sociedade Brasileira de Dermatologia (SBD)',
 ['Consensos da SBD', 'AAD Guidelines', 'Diretriz brasileira de psoríase'],
 ['Bolognia, Dermatology', 'Fitzpatrick, Dermatology', 'Azulay, Dermatologia'], '''
Dermatologia clínica :: lesões elementares; eczemas; psoríase
Infecções cutâneas :: hanseníase; micoses; leishmaniose tegumentar
Oncologia cutânea :: melanoma; carcinomas basocelular e espinocelular; dermatoscopia
Doenças bolhosas e autoimunes :: pênfigo; lúpus cutâneo
Cirurgia dermatológica :: excisões; cirurgia micrográfica de Mohs; criocirurgia
Cosmiatria e laser :: indicações; segurança
''', '''
2017 | Nature | Classificação de câncer de pele por rede neural em nível de dermatologista | Esteva A
''')

esp('endocrino', 'Endocrinologia e Metabologia', CM, 2, 'Sociedade Brasileira de Endocrinologia e Metabologia (SBEM)',
 ['Diretrizes da Sociedade Brasileira de Diabetes', 'ADA Standards of Care in Diabetes', 'Diretrizes da SBEM'],
 ['Williams Textbook of Endocrinology', 'Vilar, Endocrinologia Clínica'], '''
Diabetes mellitus :: classificação; metas; insulinoterapia; agonistas de GLP-1 e iSGLT2
Obesidade :: tratamento farmacológico; cirurgia metabólica
Tireoide :: hipo e hipertireoidismo; nódulos; câncer de tireoide
Hipófise e adrenal :: adenomas; síndrome de Cushing; insuficiência adrenal
Metabolismo ósseo :: osteoporose; paratireoides; vitamina D
Gônadas e endocrinologia reprodutiva :: hipogonadismo; síndrome dos ovários policísticos
''', '''
1993 | New England Journal of Medicine | DCCT: controle intensivo no diabetes tipo 1 | DCCT Research Group
1998 | The Lancet | UKPDS 33: controle intensivo no diabetes tipo 2 | UK Prospective Diabetes Study Group
2002 | New England Journal of Medicine | DPP: estilo de vida e metformina previnem diabetes | Knowler WC
2015 | New England Journal of Medicine | EMPA-REG OUTCOME: empagliflozina | Zinman B
2021 | New England Journal of Medicine | STEP 1: semaglutida na obesidade | Wilding JPH
''')

esp('endoscopia', 'Endoscopia', 'pré-requisito: Clínica Médica, Cirurgia Geral ou Gastroenterologia', 2, 'Sociedade Brasileira de Endoscopia Digestiva (SOBED)',
 ['Diretrizes da SOBED', 'ASGE Guidelines', 'ESGE Guidelines'],
 ["Cotton and Williams' Practical Gastrointestinal Endoscopy", 'Classen, Gastroenterological Endoscopy'], '''
Endoscopia digestiva alta :: técnica; hemorragia digestiva; varizes
Colonoscopia :: preparo; detecção de adenomas; polipectomia
CPRE e ecoendoscopia :: coledocolitíase; drenagens; estadiamento
Endoscopia terapêutica avançada :: mucosectomia; dissecção submucosa; próteses
Sedação e segurança :: monitorização; complicações
Qualidade em endoscopia :: indicadores; taxa de detecção de adenoma
''', '''
2014 | New England Journal of Medicine | Taxa de detecção de adenoma e câncer de intervalo | Corley DA
''')

esp('gastro', 'Gastroenterologia', CM, 2, 'Federação Brasileira de Gastroenterologia (FBG)',
 ['Diretrizes da FBG', 'ACG Clinical Guidelines', 'AASLD Practice Guidance'],
 ["Sleisenger and Fordtran's Gastrointestinal and Liver Disease", 'Yamada, Textbook of Gastroenterology'], '''
Esôfago e estômago :: doença do refluxo; Helicobacter pylori; dispepsia
Intestino :: doença inflamatória intestinal; síndrome do intestino irritável; doença celíaca
Fígado :: hepatites virais; doença hepática gordurosa; cirrose e complicações
Pâncreas e vias biliares :: pancreatites; colestase
Hemorragia digestiva :: estratificação de risco; conduta
Nutrição em gastroenterologia :: má absorção; suporte nutricional
''', '''
1984 | The Lancet | Bactéria curva no estômago de pacientes com gastrite e úlcera | Marshall BJ
2015 | New England Journal of Medicine | Sofosbuvir-velpatasvir na hepatite C | Feld JJ
''')

esp('genetica', 'Genética Médica', DIRETO, 3, 'Sociedade Brasileira de Genética Médica e Genômica (SBGM)',
 ['ACMG Standards for Interpretation of Sequence Variants', 'Diretrizes da SBGM', 'Política Nacional de Atenção às Pessoas com Doenças Raras'],
 ['Thompson & Thompson, Genética Médica', "Emery and Rimoin's Principles and Practice of Medical Genetics"], '''
Genética clínica e dismorfologia :: exame dismorfológico; síndromes cromossômicas
Erros inatos do metabolismo :: triagem neonatal; tratamento dietético e enzimático
Genômica diagnóstica :: exoma e genoma; interpretação de variantes pelo ACMG
Oncogenética :: síndromes de predisposição; BRCA; Lynch
Aconselhamento genético :: risco de recorrência; ética e consentimento
Farmacogenômica e terapias gênicas :: testes farmacogenéticos; terapias avançadas
''', '''
2015 | Genetics in Medicine | Padrões ACMG/AMP para interpretação de variantes | Richards S
2001 | Nature | Sequência inicial do genoma humano | International Human Genome Sequencing Consortium
''')

esp('geriatria', 'Geriatria', CM, 2, 'Sociedade Brasileira de Geriatria e Gerontologia (SBGG)',
 ['Critérios de Beers (AGS)', 'Diretrizes da SBGG', 'Política Nacional de Saúde da Pessoa Idosa'],
 ["Hazzard's Geriatric Medicine and Gerontology", 'Freitas, Tratado de Geriatria e Gerontologia'], '''
Avaliação geriátrica ampla :: funcionalidade; cognição; humor; nutrição
Síndromes geriátricas :: quedas; incontinência; fragilidade; sarcopenia
Demências e delirium :: doença de Alzheimer; prevenção de delirium
Polifarmácia :: critérios de Beers; desprescrição
Cuidados paliativos no idoso :: fim de vida; planejamento antecipado
Instituições de longa permanência e cuidado domiciliar :: modelos de cuidado
''', '''
2001 | Journal of Gerontology: Medical Sciences | Fenótipo de fragilidade | Fried LP
1999 | New England Journal of Medicine | HELP: prevenção de delirium | Inouye SK
''')

esp('go', 'Ginecologia e Obstetrícia', DIRETO, 3, 'Federação Brasileira das Associações de Ginecologia e Obstetrícia (Febrasgo)',
 ['Protocolos da Febrasgo', 'Manuais do Ministério da Saúde (pré-natal, gestação de alto risco)', 'ACOG Practice Bulletins'],
 ['Williams Obstetrics', 'Berek & Novak, Ginecologia', 'Rezende, Obstetrícia'], '''
Pré-natal e assistência ao parto :: rotina de pré-natal; parto vaginal; cesariana
Gestação de alto risco :: pré-eclâmpsia; diabetes gestacional; prematuridade
Emergências obstétricas :: hemorragia pós-parto; eclâmpsia; distocia de ombro
Ginecologia geral :: sangramento uterino anormal; endometriose; climatério
Oncologia ginecológica :: rastreio do câncer de colo; câncer de endométrio e ovário
Reprodução humana e planejamento familiar :: infertilidade; contracepção
''', '''
2017 | New England Journal of Medicine | ASPRE: aspirina previne pré-eclâmpsia | Rolnik DL
2017 | The Lancet | WOMAN: ácido tranexâmico na hemorragia pós-parto | WOMAN Trial Collaborators
2000 | The Lancet | Term Breech Trial | Hannah ME
''')

esp('hemato', 'Hematologia e Hemoterapia', CM, 2, 'Associação Brasileira de Hematologia, Hemoterapia e Terapia Celular (ABHH)',
 ['Diretrizes da ABHH', 'NCCN Hematologic Malignancies', 'Portaria de Consolidação MS sobre hemoterapia'],
 ["Williams Hematology", 'Hoffman, Hematology: Basic Principles and Practice'], '''
Anemias :: ferropriva; megaloblástica; hemolíticas; doença falciforme
Hemostasia e trombose :: hemofilias; trombofilias; anticoagulação
Leucemias :: agudas e crônicas; terapias-alvo
Linfomas e mieloma :: estadiamento; imunoquimioterapia
Hemoterapia :: indicação de hemocomponentes; reações transfusionais
Transplante de medula e terapia celular :: autólogo e alogênico; CAR-T
''', '''
2001 | New England Journal of Medicine | Imatinibe na leucemia mieloide crônica | Druker BJ
2017 | New England Journal of Medicine | ZUMA-1: CAR-T no linfoma | Neelapu SS
''')

esp('homeopatia', 'Homeopatia', DIRETO, 2, 'Associação Médica Homeopática Brasileira (AMHB)',
 ['Normas da AMHB', 'Farmacopeia Homeopática Brasileira'],
 ['Hahnemann, Organon da Arte de Curar'], '''
Fundamentos históricos da homeopatia :: princípios de Hahnemann; matéria médica
Semiologia homeopática :: repertorização; individualização
Farmacotécnica homeopática :: dinamizações; Farmacopeia Homeopática Brasileira
Avaliação crítica da evidência :: revisões sistemáticas; efeito placebo; desenho de ensaios
Ética e limites terapêuticos :: não substituir tratamento de eficácia comprovada
''', '''
2005 | The Lancet | Efeitos clínicos da homeopatia comparados a placebo: metanálise | Shang A
''')

esp('infecto', 'Infectologia', DIRETO, 3, 'Sociedade Brasileira de Infectologia (SBI)',
 ['PCDT do Ministério da Saúde (HIV, hepatites, tuberculose)', 'IDSA Guidelines', 'Surviving Sepsis Campaign'],
 ["Mandell, Douglas and Bennett's Principles and Practice of Infectious Diseases", 'Veronesi, Tratado de Infectologia'], '''
Antimicrobianos :: farmacologia; gestão de antimicrobianos; resistência
HIV e infecções sexualmente transmissíveis :: terapia antirretroviral; PrEP e PEP
Tuberculose e micobacterioses :: diagnóstico; esquemas; tuberculose resistente
Doenças tropicais e arboviroses :: dengue; malária; leishmaniose; febre amarela
Infecções relacionadas à assistência :: controle de infecção hospitalar; precauções
Sepse e infecções graves :: abordagem inicial; foco; descalonamento
''', '''
2011 | New England Journal of Medicine | HPTN 052: tratamento como prevenção do HIV | Cohen MS
2016 | JAMA | Sepsis-3: novas definições de sepse | Singer M
2021 | New England Journal of Medicine | RECOVERY: dexametasona na COVID-19 | RECOVERY Collaborative Group
''')

esp('mastologia', 'Mastologia', 'pré-requisito: Cirurgia Geral ou Ginecologia e Obstetrícia', 2, 'Sociedade Brasileira de Mastologia (SBM)',
 ['Diretrizes da SBM', 'NCCN Breast Cancer', 'Consenso de St. Gallen'],
 ['Harris, Diseases of the Breast', 'Bland & Copeland, The Breast'], '''
Rastreamento e imagem :: mamografia; BI-RADS; ressonância
Doenças benignas da mama :: nódulos; mastites; descarga papilar
Câncer de mama :: subtipos moleculares; estadiamento; cirurgia conservadora
Linfonodo sentinela e axila :: biópsia; esvaziamento
Tratamento sistêmico :: hormonioterapia; quimioterapia; terapia anti-HER2
Oncoplastia e reconstrução :: técnicas; resultados
''', '''
2002 | New England Journal of Medicine | NSABP B-06: 20 anos de cirurgia conservadora | Fisher B
2011 | JAMA | ACOSOG Z0011: dispensar esvaziamento axilar | Giuliano AE
2005 | New England Journal of Medicine | Trastuzumabe adjuvante | Romond EH
''')

esp('emergencia', 'Medicina de Emergência', DIRETO, 3, 'Associação Brasileira de Medicina de Emergência (ABRAMEDE)',
 ['ACLS e diretrizes da AHA para ressuscitação', 'ATLS', 'Diretrizes da ABRAMEDE'],
 ["Tintinalli's Emergency Medicine", "Rosen's Emergency Medicine"], '''
Ressuscitação :: parada cardiorrespiratória; via aérea na emergência; choque
Trauma :: atendimento inicial; imagem; controle de danos
Emergências cardiovasculares e neurológicas :: síndrome coronariana; AVC agudo e trombólise
Toxicologia :: intoxicações comuns; antídotos
Ultrassom à beira do leito :: FAST; POCUS
Gestão do pronto-socorro :: classificação de risco; fluxo; desastres
''', '''
1995 | New England Journal of Medicine | NINDS: alteplase no AVC isquêmico | NINDS rt-PA Stroke Study Group
2015 | New England Journal of Medicine | MR CLEAN: trombectomia no AVC | Berkhemer OA
''')

esp('mfc', 'Medicina de Família e Comunidade', DIRETO, 2, 'Sociedade Brasileira de Medicina de Família e Comunidade (SBMFC)',
 ['Cadernos de Atenção Básica do Ministério da Saúde', 'Política Nacional de Atenção Básica', 'Guia de Prevenção Quaternária'],
 ['Gusso e Lopes, Tratado de Medicina de Família e Comunidade', 'McWhinney, Manual de Medicina de Família'], '''
Princípios da atenção primária :: atributos de Starfield; longitudinalidade; coordenação
Abordagem centrada na pessoa :: método clínico centrado na pessoa; comunicação
Problemas comuns na atenção primária :: hipertensão; diabetes; saúde mental
Saúde da família e da comunidade :: abordagem familiar; territorialização
Prevenção e rastreamento :: prevenção quaternária; rastreio baseado em evidência
Gestão da clínica :: indicadores; equipe de saúde da família
''', '''
2005 | Milbank Quarterly | Contribuição da atenção primária aos sistemas de saúde | Starfield B
''')

esp('trabalho', 'Medicina do Trabalho', DIRETO, 2, 'Associação Nacional de Medicina do Trabalho (ANAMT)',
 ['Normas Regulamentadoras do MTE (NR-7, NR-9, NR-15, NR-17)', 'Lista de Doenças Relacionadas ao Trabalho (Ministério da Saúde)', 'Diretrizes da ANAMT'],
 ['Mendes, Patologia do Trabalho', 'LaDou, Current Occupational and Environmental Medicine'], '''
Saúde do trabalhador e legislação :: NR-7 e PCMSO; CAT; nexo técnico epidemiológico
Toxicologia ocupacional :: metais; solventes; agrotóxicos
Doenças ocupacionais :: LER/DORT; pneumoconioses; perda auditiva induzida por ruído
Ergonomia e saúde mental no trabalho :: NR-17; burnout; assédio
Perícia e capacidade laborativa :: aptidão; afastamento; reabilitação
Vigilância em saúde do trabalhador :: notificação; indicadores
''')

esp('trafego', 'Medicina do Tráfego', DIRETO, 2, 'Associação Brasileira de Medicina de Tráfego (Abramet)',
 ['Código de Trânsito Brasileiro (Lei 9.503/1997)', 'Resoluções do Contran sobre exame de aptidão física e mental', 'Diretrizes da Abramet'],
 ['Diretrizes da Abramet', 'Organização Mundial da Saúde, Global Status Report on Road Safety'], '''
Exame de aptidão física e mental :: critérios do Contran; doenças que restringem a direção
Epidemiologia da violência no trânsito :: mortalidade; fatores de risco
Álcool, drogas e direção :: fisiologia; legislação
Ergonomia e fatores humanos do condutor :: sono; visão; envelhecimento
Atendimento e prevenção de lesões no trânsito :: segurança veicular; políticas públicas
''')

esp('esporte', 'Medicina Esportiva', DIRETO, 3, 'Sociedade Brasileira de Medicina do Exercício e do Esporte (SBMEE)',
 ['Diretrizes da SBMEE', 'ACSM Guidelines for Exercise Testing and Prescription', 'Código Mundial Antidopagem (WADA)'],
 ["Brukner & Khan's Clinical Sports Medicine", 'ACSM, Guidelines for Exercise Testing and Prescription'], '''
Fisiologia do exercício :: metabolismo energético; adaptações cardiovasculares
Avaliação pré-participação :: triagem cardiológica; ergoespirometria
Lesões esportivas :: musculares; ligamentares; por sobrecarga
Prescrição de exercício :: doenças crônicas; populações especiais
Nutrição e dopagem :: suplementos; lista proibida da WADA
Concussão no esporte :: protocolo de retorno gradual
''', '''
2018 | British Journal of Sports Medicine | Consenso de Berlim sobre concussão no esporte | McCrory P
''')

esp('fisiatria', 'Medicina Física e Reabilitação', DIRETO, 3, 'Associação Brasileira de Medicina Física e Reabilitação (ABMFR)',
 ['CIF (Classificação Internacional de Funcionalidade)', 'Diretrizes da ABMFR'],
 ["DeLisa's Physical Medicine and Rehabilitation", "Braddom's Physical Medicine and Rehabilitation"], '''
Avaliação funcional :: CIF; escalas de funcionalidade
Reabilitação neurológica :: AVC; lesão medular; traumatismo cranioencefálico
Espasticidade :: toxina botulínica; bloqueios
Dor musculoesquelética :: lombalgia; infiltrações
Órteses, próteses e tecnologia assistiva :: prescrição; amputados
Eletrodiagnóstico :: eletroneuromiografia
''')

esp('intensiva', 'Medicina Intensiva', DIRETO, 3, 'Associação de Medicina Intensiva Brasileira (AMIB)',
 ['Surviving Sepsis Campaign', 'Diretrizes da AMIB', 'Resolução CFM 2.271/2020 (UTI)'],
 ["Irwin and Rippe's Intensive Care Medicine", 'Marino, The ICU Book'], '''
Sepse e choque :: ressuscitação volêmica; vasopressores; corticoide
Ventilação mecânica :: ventilação protetora; SDRA; desmame
Suporte orgânico :: terapia renal substitutiva; ECMO
Neurointensivismo :: hipertensão intracraniana; morte encefálica
Sedação, analgesia e delirium :: protocolos; ABCDEF bundle
Cuidados de fim de vida na UTI :: comunicação; limitação de suporte
''', '''
2000 | New England Journal of Medicine | ARDSNet: baixo volume corrente na SDRA | Acute Respiratory Distress Syndrome Network
2013 | New England Journal of Medicine | PROSEVA: posição prona na SDRA | Guérin C
2009 | New England Journal of Medicine | NICE-SUGAR: controle glicêmico na UTI | NICE-SUGAR Study Investigators
''')

esp('legal', 'Medicina Legal e Perícia Médica', DIRETO, 2, 'Associação Brasileira de Medicina Legal e Perícias Médicas (ABMLPM)',
 ['Código de Processo Penal (perícia, arts. 158 a 184)', 'Código de Processo Civil (prova pericial, arts. 464 a 480)', 'Resoluções do CFM sobre perícia médica'],
 ['França, Medicina Legal', 'Croce, Manual de Medicina Legal', 'Saukko e Knight, Knight’s Forensic Pathology'], '''
Tanatologia forense :: diagnóstico de morte; cronotanatognose; necropsia
Traumatologia forense :: lesões por instrumentos; lesão corporal e sua gravidade
Sexologia forense :: violência sexual; atendimento e cadeia de custódia
Psicopatologia e imputabilidade :: perícia psiquiátrica
Perícia cível, trabalhista e previdenciária :: dano corporal; incapacidade; nexo causal
Identificação humana e genética forense :: DNA; odontologia legal
''')

esp('nuclear', 'Medicina Nuclear', DIRETO, 3, 'Sociedade Brasileira de Medicina Nuclear (SBMN)',
 ['Normas da CNEN (radioproteção)', 'SNMMI Procedure Standards', 'EANM Guidelines'],
 ['Mettler, Essentials of Nuclear Medicine and Molecular Imaging', 'Ziessman, Nuclear Medicine: The Requisites'], '''
Física e radioproteção :: radiofármacos; dosimetria; normas da CNEN
PET-CT oncológico :: FDG; PSMA; critérios de resposta
Cintilografia geral :: perfusão miocárdica; óssea; renal; tireoide
Terapia com radionuclídeos :: iodoterapia; lutécio-177; teranóstica
Medicina nuclear em neurologia :: demências; epilepsia
''', '''
2021 | New England Journal of Medicine | VISION: lutécio-177-PSMA no câncer de próstata | Sartor O
''')

esp('preventiva', 'Medicina Preventiva e Social', DIRETO, 2, 'Associação Brasileira de Saúde Coletiva (Abrasco)',
 ['Lei 8.080/1990 (SUS)', 'Política Nacional de Vigilância em Saúde', 'Recomendações da USPSTF (rastreamento)'],
 ['Rouquayrol, Epidemiologia e Saúde', 'Rothman, Modern Epidemiology', 'Paim, O que é o SUS'], '''
Epidemiologia :: medidas de frequência e associação; desenhos de estudo; vieses
Vigilância em saúde :: notificação compulsória; investigação de surtos
Planejamento e gestão em saúde :: financiamento do SUS; regionalização
Avaliação de tecnologias em saúde :: custo-efetividade; Conitec
Saúde baseada em evidências :: leitura crítica; GRADE
Determinantes sociais e políticas públicas :: equidade; promoção da saúde
''', '''
1954 | BMJ | Mortalidade de médicos e tabagismo | Doll R
2008 | BMJ | GRADE: consenso sobre qualidade da evidência | Guyatt GH
''')

esp('nefro', 'Nefrologia', CM, 2, 'Sociedade Brasileira de Nefrologia (SBN)',
 ['KDIGO Guidelines', 'Diretrizes da SBN', 'Resolução Anvisa RDC 11/2014 (diálise)'],
 ["Brenner and Rector's The Kidney", 'Comprehensive Clinical Nephrology'], '''
Doença renal crônica :: estadiamento KDIGO; nefroproteção; anemia e osso
Lesão renal aguda :: diagnóstico; indicações de diálise
Distúrbios hidroeletrolíticos e ácido-base :: hiponatremia; hipercalemia; gasometria
Glomerulopatias :: síndrome nefrótica e nefrítica; biópsia renal
Diálise :: hemodiálise; diálise peritoneal; acesso vascular
Transplante renal :: imunossupressão; rejeição
''', '''
2020 | New England Journal of Medicine | DAPA-CKD: dapagliflozina na doença renal crônica | Heerspink HJL
2019 | New England Journal of Medicine | CREDENCE: canagliflozina na nefropatia diabética | Perkovic V
''')

esp('neurocirurgia', 'Neurocirurgia', DIRETO, 5, 'Sociedade Brasileira de Neurocirurgia (SBN)',
 ['Brain Trauma Foundation Guidelines', 'Diretrizes da Sociedade Brasileira de Neurocirurgia'],
 ['Youmans and Winn Neurological Surgery', 'Greenberg, Handbook of Neurosurgery'], '''
Neurotrauma :: traumatismo cranioencefálico; hipertensão intracraniana; trauma raquimedular
Neuro-oncologia :: gliomas; meningiomas; metástases
Neurocirurgia vascular :: aneurismas; malformações arteriovenosas; hemorragia subaracnóidea
Coluna :: hérnia discal; estenose; instrumentação
Neurocirurgia funcional :: estimulação cerebral profunda; epilepsia
Neurocirurgia pediátrica :: hidrocefalia; disrafismos
''', '''
2002 | The Lancet | ISAT: clipagem versus embolização de aneurismas | Molyneux A
2016 | New England Journal of Medicine | RESCUEicp: craniectomia descompressiva | Hutchinson PJ
''')

esp('neuro', 'Neurologia', DIRETO, 3, 'Academia Brasileira de Neurologia (ABN)',
 ['Diretrizes da ABN', 'AAN Guidelines', 'Diretrizes brasileiras de AVC'],
 ["Adams and Victor's Principles of Neurology", "Bradley's Neurology in Clinical Practice"], '''
Doenças cerebrovasculares :: AVC isquêmico e hemorrágico; prevenção secundária
Epilepsias :: classificação ILAE; fármacos anticrises; estado de mal
Doenças neurodegenerativas :: Parkinson; demências; esclerose lateral amiotrófica
Doenças desmielinizantes :: esclerose múltipla; neuromielite óptica
Cefaleias :: enxaqueca; anticorpos anti-CGRP
Doenças neuromusculares :: neuropatias; miastenia gravis
''', '''
2008 | New England Journal of Medicine | ECASS III: alteplase até 4,5 horas | Hacke W
2018 | New England Journal of Medicine | DAWN: trombectomia de 6 a 24 horas | Nogueira RG
''')

esp('nutrologia', 'Nutrologia', CM, 2, 'Associação Brasileira de Nutrologia (ABRAN)',
 ['Diretrizes BRASPEN (terapia nutricional)', 'ESPEN Guidelines', 'Diretrizes da ABRAN'],
 ['Shils, Modern Nutrition in Health and Disease', 'Waitzberg, Nutrição Oral, Enteral e Parenteral'], '''
Avaliação nutricional :: antropometria; composição corporal; triagem de risco
Terapia nutricional enteral e parenteral :: indicações; complicações
Obesidade e síndrome metabólica :: abordagem clínica; farmacoterapia
Micronutrientes :: deficiências; suplementação baseada em evidência
Nutrição em doenças crônicas :: renal; hepática; oncológica
Nutrição no ciclo da vida :: gestação; infância; idoso
''')

esp('oftalmo', 'Oftalmologia', DIRETO, 3, 'Conselho Brasileiro de Oftalmologia (CBO)',
 ['Diretrizes do CBO', 'AAO Preferred Practice Patterns'],
 ["Kanski's Clinical Ophthalmology", 'Basic and Clinical Science Course da AAO'], '''
Refração e lentes :: erros refrativos; cirurgia refrativa
Catarata :: facoemulsificação; lentes intraoculares
Glaucoma :: diagnóstico; tratamento clínico e cirúrgico
Retina :: retinopatia diabética; degeneração macular; injeções antiangiogênicas
Córnea e superfície ocular :: ceratocone; transplante de córnea
Oftalmopediatria e estrabismo :: ambliopia; retinopatia da prematuridade
''', '''
2016 | JAMA | Rede neural detecta retinopatia diabética em fotografias | Gulshan V
2006 | New England Journal of Medicine | MARINA: ranibizumabe na degeneração macular | Rosenfeld PJ
''')

esp('onco', 'Oncologia Clínica', CM, 3, 'Sociedade Brasileira de Oncologia Clínica (SBOC)',
 ['Diretrizes da SBOC', 'NCCN Guidelines', 'ESMO Clinical Practice Guidelines'],
 ['DeVita, Cancer: Principles and Practice of Oncology', 'Abeloff, Clinical Oncology'], '''
Biologia do câncer :: marcadores; oncogenes; heterogeneidade tumoral
Tratamento sistêmico :: quimioterapia; terapia-alvo; imunoterapia
Tumores sólidos mais frequentes :: mama; pulmão; colorretal; próstata
Emergências oncológicas :: neutropenia febril; síndrome de lise; compressão medular
Medicina de precisão :: sequenciamento tumoral; biomarcadores preditivos
Cuidados de suporte e paliativos :: controle de sintomas; toxicidades
''', '''
2018 | New England Journal of Medicine | KEYNOTE-189: pembrolizumabe no câncer de pulmão | Gandhi L
2010 | New England Journal of Medicine | Ipilimumabe no melanoma metastático | Hodi FS
2018 | New England Journal of Medicine | TAILORx: assinatura gênica e quimioterapia | Sparano JA
''')

esp('orto', 'Ortopedia e Traumatologia', DIRETO, 3, 'Sociedade Brasileira de Ortopedia e Traumatologia (SBOT)',
 ['Diretrizes da SBOT', 'AAOS Clinical Practice Guidelines', 'Princípios AO de tratamento de fraturas'],
 ["Rockwood and Green's Fractures in Adults", "Campbell's Operative Orthopaedics"], '''
Traumatologia :: fraturas de membros; fixação interna; fraturas expostas
Coluna :: lombalgia; deformidades; fraturas vertebrais
Ombro e cotovelo :: manguito rotador; instabilidade
Quadril e joelho :: artroplastias; lesões ligamentares e meniscais
Ortopedia pediátrica :: displasia do quadril; pé torto congênito
Oncologia ortopédica e infecção :: tumores ósseos; osteomielite
''', '''
2002 | New England Journal of Medicine | Artroscopia de joelho versus placebo na osteoartrite | Moseley JB
''')

esp('otorrino', 'Otorrinolaringologia', DIRETO, 3, 'Associação Brasileira de Otorrinolaringologia e Cirurgia Cérvico-Facial (ABORL-CCF)',
 ['Diretrizes da ABORL-CCF', 'AAO-HNS Clinical Practice Guidelines'],
 ['Cummings, Otolaryngology: Head and Neck Surgery', 'Tratado de Otorrinolaringologia da ABORL-CCF'], '''
Otologia e audiologia :: otites; perda auditiva; implante coclear
Rinologia :: rinossinusite; cirurgia endoscópica nasal
Laringologia e voz :: lesões de pregas vocais; disfagia
Otoneurologia :: vertigem posicional; doença de Ménière
Distúrbios do sono :: apneia obstrutiva; polissonografia
Otorrinolaringologia pediátrica :: amigdalectomia; tubos de ventilação
''')

esp('patologia', 'Patologia', DIRETO, 3, 'Sociedade Brasileira de Patologia (SBP)',
 ['Classificações da OMS de tumores (livros azuis)', 'Protocolos do College of American Pathologists (CAP)', 'Normas da SBP'],
 ['Robbins & Cotran, Patologia: Bases Patológicas das Doenças', "Rosai and Ackerman's Surgical Pathology"], '''
Patologia geral :: inflamação; neoplasia; lesão celular
Patologia cirúrgica :: macroscopia; margens; laudos sinópticos
Citopatologia :: citologia cervical e de punção
Imuno-histoquímica e patologia molecular :: painéis; biomarcadores
Necropsia clínica :: técnica; correlação clínico-patológica
Patologia digital e IA :: lâminas digitais; algoritmos de apoio
''', '''
2017 | JAMA | CAMELYON16: algoritmos detectam metástase em linfonodo | Ehteshami Bejnordi B
''')

esp('lab', 'Patologia Clínica/Medicina Laboratorial', DIRETO, 3, 'Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)',
 ['RDC Anvisa 786/2023 (laboratórios clínicos)', 'Recomendações da SBPC/ML', 'Normas CLSI'],
 ['Henry, Diagnósticos Clínicos e Tratamento por Métodos Laboratoriais', 'Tietz, Textbook of Clinical Chemistry'], '''
Bioquímica clínica :: interpretação; interferências; valores de referência
Hematologia laboratorial :: hemograma; coagulação; citometria de fluxo
Microbiologia clínica :: cultura; antibiograma; métodos moleculares
Imunologia e sorologia :: autoanticorpos; doenças infecciosas
Gestão da qualidade laboratorial :: controle interno e externo; acreditação
Medicina laboratorial baseada em evidência :: acurácia diagnóstica; uso racional de exames
''')

esp('pediatria', 'Pediatria', DIRETO, 3, 'Sociedade Brasileira de Pediatria (SBP)',
 ['Documentos científicos da SBP', 'Calendário Nacional de Vacinação (PNI)', 'Caderneta da Criança do Ministério da Saúde'],
 ['Nelson, Tratado de Pediatria', 'Tratado de Pediatria da Sociedade Brasileira de Pediatria'], '''
Puericultura :: crescimento e desenvolvimento; aleitamento materno; vacinação
Neonatologia :: reanimação neonatal; icterícia; prematuridade
Emergências pediátricas :: bronquiolite; desidratação; convulsão febril
Doenças infecciosas da infância :: pneumonia; meningite; doenças exantemáticas
Adolescência :: saúde mental; sexualidade; uso de substâncias
Doenças crônicas na infância :: asma; obesidade; diabetes tipo 1
''', '''
2012 | Pediatrics | AAP: aleitamento materno e uso de leite humano | American Academy of Pediatrics Section on Breastfeeding
2016 | The Lancet | Aleitamento materno no século XXI | Victora CG
''')

esp('pneumo', 'Pneumologia', CM, 2, 'Sociedade Brasileira de Pneumologia e Tisiologia (SBPT)',
 ['GOLD (DPOC)', 'GINA (asma)', 'Diretrizes da SBPT', 'Manual de Recomendações para o Controle da Tuberculose (MS)'],
 ["Murray & Nadel's Textbook of Respiratory Medicine", "Fishman's Pulmonary Diseases and Disorders"], '''
Função pulmonar :: espirometria; difusão; gasometria
DPOC e asma :: classificação GOLD; tratamento escalonado; exacerbações
Doenças intersticiais :: fibrose pulmonar idiopática; antifibróticos
Tuberculose e infecções respiratórias :: pneumonia comunitária; tuberculose
Circulação pulmonar :: tromboembolismo; hipertensão pulmonar
Câncer de pulmão e nódulo pulmonar :: abordagem do nódulo; rastreamento
''', '''
2014 | New England Journal of Medicine | INPULSIS: nintedanibe na fibrose pulmonar | Richeldi L
''')

esp('psiquiatria', 'Psiquiatria', DIRETO, 3, 'Associação Brasileira de Psiquiatria (ABP)',
 ['DSM-5-TR e CID-11', 'Diretrizes da ABP', 'Lei 10.216/2001 (direitos da pessoa com transtorno mental)'],
 ['Kaplan & Sadock, Compêndio de Psiquiatria', 'Stahl, Psicofarmacologia'], '''
Psicopatologia e diagnóstico :: exame do estado mental; classificações
Transtornos do humor :: depressão; transtorno bipolar; risco de suicídio
Transtornos psicóticos :: esquizofrenia; antipsicóticos
Transtornos de ansiedade e relacionados :: pânico; TOC; estresse pós-traumático
Dependência química :: álcool; crack e outras substâncias; redução de danos
Psicoterapias e psiquiatria da infância :: terapia cognitivo-comportamental; TDAH; autismo
''', '''
2006 | American Journal of Psychiatry | STAR*D: tratamento sequencial da depressão | Rush AJ
2018 | The Lancet | Eficácia comparada de 21 antidepressivos: metanálise em rede | Cipriani A
2005 | New England Journal of Medicine | CATIE: antipsicóticos na esquizofrenia | Lieberman JA
''')

esp('radiologia', 'Radiologia e Diagnóstico por Imagem', DIRETO, 3, 'Colégio Brasileiro de Radiologia e Diagnóstico por Imagem (CBR)',
 ['ACR Appropriateness Criteria', 'Sistemas de laudo estruturado (BI-RADS, TI-RADS, LI-RADS, PI-RADS)', 'Normas de radioproteção (Anvisa RDC 611/2022)'],
 ["Brant and Helms' Fundamentals of Diagnostic Radiology", 'Webb, Fundamentals of Body CT'], '''
Física das imagens e radioproteção :: raio X; tomografia; ressonância; dose
Neurorradiologia :: AVC; tumores; trauma
Imagem do tórax e do abdome :: nódulos; abdome agudo; oncologia
Musculoesquelético :: ressonância articular; tumores ósseos
Ultrassonografia :: abdominal; obstétrica; Doppler
Radiologia intervencionista e IA em imagem :: biópsias guiadas; algoritmos de detecção
''', '''
2020 | Nature | Avaliação internacional de IA no rastreamento de câncer de mama | McKinney SM
''')

esp('radioterapia', 'Radioterapia', DIRETO, 3, 'Sociedade Brasileira de Radioterapia (SBRT)',
 ['Normas da CNEN', 'ASTRO Clinical Practice Guidelines', 'ESTRO Guidelines'],
 ["Perez and Brady's Principles and Practice of Radiation Oncology", 'Khan, The Physics of Radiation Therapy'], '''
Física médica e radiobiologia :: dose; fracionamento; modelo linear-quadrático
Planejamento e técnicas :: IMRT; radiocirurgia; braquiterapia
Radioterapia nos tumores mais frequentes :: mama; próstata; cabeça e pescoço
Hipofracionamento :: evidências; indicações
Toxicidades e cuidados :: agudas e tardias
Garantia da qualidade e radioproteção :: controle de qualidade; CNEN
''', '''
2013 | The Lancet Oncology | START: hipofracionamento no câncer de mama | Haviland JS
''')

esp('reumato', 'Reumatologia', CM, 2, 'Sociedade Brasileira de Reumatologia (SBR)',
 ['Recomendações da SBR', 'ACR/EULAR Classification Criteria', 'PCDT do Ministério da Saúde para artrite reumatoide'],
 ["Kelley and Firestein's Textbook of Rheumatology", 'Hochberg, Rheumatology'], '''
Artrite reumatoide e espondiloartrites :: critérios ACR/EULAR; tratamento até o alvo; biológicos
Lúpus e colagenoses :: lúpus eritematoso sistêmico; esclerose sistêmica; Sjögren
Vasculites :: arterite de células gigantes; vasculites ANCA
Doenças microcristalinas :: gota; metas de ácido úrico
Osteoartrite e fibromialgia :: abordagem multimodal
Imunobiológicos e segurança :: rastreio de tuberculose; vacinação
''', '''
2010 | Annals of the Rheumatic Diseases | Critérios ACR/EULAR 2010 para artrite reumatoide | Aletaha D
''')

esp('uro', 'Urologia', CG, 3, 'Sociedade Brasileira de Urologia (SBU)',
 ['Diretrizes da SBU', 'EAU Guidelines', 'AUA Guidelines'],
 ['Campbell-Walsh-Wein Urology', "Smith and Tanagho's General Urology"], '''
Uro-oncologia :: câncer de próstata; bexiga; rim
Hiperplasia prostática e sintomas urinários :: tratamento clínico e cirúrgico
Litíase urinária :: ureteroscopia; nefrolitotripsia percutânea
Urologia feminina e funcional :: incontinência; bexiga hiperativa
Andrologia :: disfunção erétil; infertilidade masculina
Endourologia e cirurgia robótica :: prostatectomia radical
''', '''
2016 | New England Journal of Medicine | ProtecT: vigilância, cirurgia ou radioterapia no câncer de próstata | Hamdy FC
2009 | New England Journal of Medicine | ERSPC: rastreamento por PSA | Schröder FH
''')
