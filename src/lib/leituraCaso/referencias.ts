// Base científica da Leitura do caso: as 50 referências que sustentam (ou limitam) cada ferramenta.
// "uso" diz onde a referência entra na plataforma; "limite" quando ela proíbe ou desaconselha algo.

export type TemaRef = 'fundamentos' | 'predicao' | 'julgador' | 'acordo' | 'calibracao' | 'vieses' | 'depoimentos' | 'ia-generativa' | 'etica-lei' | 'brasil'

export interface Referencia {
  autores: string
  ano: number
  titulo: string
  veiculo: string
  tipo: 'artigo' | 'livro' | 'tese' | 'relatório' | 'norma'
  tema: TemaRef
  uso: string
}

export const ROTULO_TEMA: Record<TemaRef, string> = {
  fundamentos: 'Fundamentos da jurimetria',
  predicao: 'Predição de decisões',
  julgador: 'Comportamento do julgador',
  acordo: 'Acordo e teoria do litígio',
  calibracao: 'Probabilidade e calibração',
  vieses: 'Vieses de decisão',
  depoimentos: 'Depoimentos e credibilidade',
  'ia-generativa': 'IA generativa no direito',
  'etica-lei': 'Ética, LGPD e regulação',
  brasil: 'Brasil',
}

export const REFERENCIAS: Referencia[] = [
  // Fundamentos
  { autores: 'Lee Loevinger', ano: 1949, titulo: 'Jurimetrics: The Next Step Forward', veiculo: 'Minnesota Law Review, v. 33', tipo: 'artigo', tema: 'fundamentos', uso: 'Origem do termo jurimetria: direito tratado com método quantitativo.' },
  { autores: 'Reed C. Lawlor', ano: 1963, titulo: 'What Computers Can Do: Analysis and Prediction of Judicial Decisions', veiculo: 'American Bar Association Journal, v. 49', tipo: 'artigo', tema: 'fundamentos', uso: 'Primeira proposta de prever decisões por computador.' },
  { autores: 'Harry Surden', ano: 2014, titulo: 'Machine Learning and Law', veiculo: 'Washington Law Review, v. 89', tipo: 'artigo', tema: 'fundamentos', uso: 'O que o aprendizado de máquina faz bem e mal em tarefas jurídicas.' },
  { autores: 'Kevin D. Ashley', ano: 2017, titulo: 'Artificial Intelligence and Legal Analytics', veiculo: 'Cambridge University Press', tipo: 'livro', tema: 'fundamentos', uso: 'Referência de método para análise de texto jurídico e predição explicável.' },
  { autores: 'Daniel Martin Katz', ano: 2013, titulo: 'Quantitative Legal Prediction', veiculo: 'Emory Law Journal, v. 62', tipo: 'artigo', tema: 'fundamentos', uso: 'Previsão jurídica como combinação de especialista, dados e algoritmo.' },
  { autores: 'Richard Susskind', ano: 2023, titulo: 'Tomorrow\'s Lawyers (3. ed.)', veiculo: 'Oxford University Press', tipo: 'livro', tema: 'fundamentos', uso: 'Formador de opinião: como a tecnologia muda o serviço jurídico.' },
  { autores: 'Benjamin Alarie, Anthony Niblett, Albert H. Yoon', ano: 2018, titulo: 'How Artificial Intelligence Will Affect the Practice of Law', veiculo: 'University of Toronto Law Journal, v. 68 (supl. 1)', tipo: 'artigo', tema: 'fundamentos', uso: 'Predição como apoio ao advogado, não substituto.' },
  // Predição
  { autores: 'Daniel M. Katz, Michael J. Bommarito II, Josh Blackman', ano: 2017, titulo: 'A General Approach for Predicting the Behavior of the Supreme Court of the United States', veiculo: 'PLOS ONE, v. 12', tipo: 'artigo', tema: 'predicao', uso: 'Mostra que acertar ~70% exige comparar com a taxa base; a tela sempre mostra a taxa base.' },
  { autores: 'Theodore W. Ruger, Pauline T. Kim, Andrew D. Martin, Kevin M. Quinn', ano: 2004, titulo: 'The Supreme Court Forecasting Project', veiculo: 'Columbia Law Review, v. 104', tipo: 'artigo', tema: 'predicao', uso: 'Modelo simples bateu especialistas: motivo de partir da estatística antes da opinião.' },
  { autores: 'Nikolaos Aletras, Dimitrios Tsarapatsanis, Daniel Preoţiuc-Pietro, Vasileios Lampos', ano: 2016, titulo: 'Predicting Judicial Decisions of the European Court of Human Rights: an NLP Perspective', veiculo: 'PeerJ Computer Science, v. 2', tipo: 'artigo', tema: 'predicao', uso: 'Os fatos narrados pesam mais que o direito citado: por isso a etapa de contexto organiza os fatos.' },
  { autores: 'Masha Medvedeva, Michel Vols, Martijn Wieling', ano: 2020, titulo: 'Using Machine Learning to Predict Decisions of the European Court of Human Rights', veiculo: 'Artificial Intelligence and Law, v. 28', tipo: 'artigo', tema: 'predicao', uso: 'Alerta: prever com texto da própria decisão infla o acerto; a plataforma só usa dados anteriores.' },
  { autores: 'Ilias Chalkidis, Ion Androutsopoulos, Nikolaos Aletras', ano: 2019, titulo: 'Neural Legal Judgment Prediction in English', veiculo: 'ACL 2019', tipo: 'artigo', tema: 'predicao', uso: 'Estado da arte neural e seus vieses.' },
  { autores: 'Haoxi Zhong et al.', ano: 2018, titulo: 'Legal Judgment Prediction via Topological Multi-Task Learning (TopJudge)', veiculo: 'EMNLP 2018', tipo: 'artigo', tema: 'predicao', uso: 'Predição em cadeia (dispositivo, pena, prazo) com base chinesa CAIL.' },
  { autores: 'Daniel L. Chen', ano: 2019, titulo: 'Judicial Analytics and the Great Transformation of American Law', veiculo: 'Artificial Intelligence and Law, v. 27', tipo: 'artigo', tema: 'predicao', uso: 'Predição para detectar fatores extrajurídicos, não para escolher juiz.' },
  { autores: 'Jon Kleinberg, Himabindu Lakkaraju, Jure Leskovec, Jens Ludwig, Sendhil Mullainathan', ano: 2018, titulo: 'Human Decisions and Machine Predictions', veiculo: 'Quarterly Journal of Economics, v. 133', tipo: 'artigo', tema: 'predicao', uso: 'Algoritmo ajuda quando o humano vê o número e mantém a decisão.' },
  // Julgador
  { autores: 'Jeffrey A. Segal, Harold J. Spaeth', ano: 2002, titulo: 'The Supreme Court and the Attitudinal Model Revisited', veiculo: 'Cambridge University Press', tipo: 'livro', tema: 'julgador', uso: 'Modelo atitudinal: padrões do julgador são mensuráveis.' },
  { autores: 'Andrew D. Martin, Kevin M. Quinn', ano: 2002, titulo: 'Dynamic Ideal Point Estimation via Markov Chain Monte Carlo for the U.S. Supreme Court', veiculo: 'Political Analysis, v. 10', tipo: 'artigo', tema: 'julgador', uso: 'Posição do julgador muda no tempo: o perfil mostra série por ano.' },
  { autores: 'Lee Epstein, William M. Landes, Richard A. Posner', ano: 2013, titulo: 'The Behavior of Federal Judges', veiculo: 'Harvard University Press', tipo: 'livro', tema: 'julgador', uso: 'Julgador como agente econômico racional; base do perfil do órgão.' },
  { autores: 'Shai Danziger, Jonathan Levav, Liora Avnaim-Pesso', ano: 2011, titulo: 'Extraneous Factors in Judicial Decisions', veiculo: 'PNAS, v. 108', tipo: 'artigo', tema: 'julgador', uso: 'Estudo famoso ("juízes famintos") citado com cautela.' },
  { autores: 'Keren Weinshall-Margel, John Shapard', ano: 2011, titulo: 'Overlooked Factors in the Analysis of Parole Decisions', veiculo: 'PNAS, v. 108', tipo: 'artigo', tema: 'julgador', uso: 'Contraponto: a ordem dos casos explicava o efeito. Lição: correlação não é perfil.' },
  { autores: 'Bradley Efron, Carl Morris', ano: 1975, titulo: 'Data Analysis Using Stein\'s Estimator and its Generalizations', veiculo: 'Journal of the American Statistical Association, v. 70', tipo: 'artigo', tema: 'julgador', uso: 'Encolhimento empírico: a taxa da vara com pouca amostra é puxada para a do tribunal.' },
  // Acordo
  { autores: 'George L. Priest, Benjamin Klein', ano: 1984, titulo: 'The Selection of Disputes for Litigation', veiculo: 'Journal of Legal Studies, v. 13', tipo: 'artigo', tema: 'acordo', uso: 'Casos que chegam à sentença são os duvidosos: taxa de sentenças tende a 50% e não é a de todos os conflitos.' },
  { autores: 'Steven Shavell', ano: 1982, titulo: 'Suit, Settlement, and Trial: A Theoretical Analysis under Alternative Methods for the Allocation of Legal Costs', veiculo: 'Journal of Legal Studies, v. 11', tipo: 'artigo', tema: 'acordo', uso: 'Valor esperado e custos: base da conta acordo x seguir.' },
  { autores: 'Lucian A. Bebchuk', ano: 1984, titulo: 'Litigation and Settlement under Imperfect Information', veiculo: 'RAND Journal of Economics, v. 15', tipo: 'artigo', tema: 'acordo', uso: 'Quando há informação assimétrica o acordo falha; a zona de acordo mostra isso.' },
  { autores: 'Robert D. Cooter, Daniel L. Rubinfeld', ano: 1989, titulo: 'Economic Analysis of Legal Disputes and Their Resolution', veiculo: 'Journal of Economic Literature, v. 27', tipo: 'artigo', tema: 'acordo', uso: 'Zona de acordo: existe quando o autor espera menos do que o réu espera pagar.' },
  // Calibração
  { autores: 'Edwin B. Wilson', ano: 1927, titulo: 'Probable Inference, the Law of Succession, and Statistical Inference', veiculo: 'Journal of the American Statistical Association, v. 22', tipo: 'artigo', tema: 'calibracao', uso: 'Intervalo de Wilson usado na margem de erro da chance de êxito.' },
  { autores: 'Glenn W. Brier', ano: 1950, titulo: 'Verification of Forecasts Expressed in Terms of Probability', veiculo: 'Monthly Weather Review, v. 78', tipo: 'artigo', tema: 'calibracao', uso: 'Nota de Brier: mede se as previsões registradas acertaram.' },
  { autores: 'Tilmann Gneiting, Adrian E. Raftery', ano: 2007, titulo: 'Strictly Proper Scoring Rules, Prediction, and Estimation', veiculo: 'Journal of the American Statistical Association, v. 102', tipo: 'artigo', tema: 'calibracao', uso: 'Por que medir previsão com regra própria e não só por acerto.' },
  { autores: 'Alexandru Niculescu-Mizil, Rich Caruana', ano: 2005, titulo: 'Predicting Good Probabilities with Supervised Learning', veiculo: 'ICML 2005', tipo: 'artigo', tema: 'calibracao', uso: 'Calibrar probabilidades com desfechos reais (tela de calibração).' },
  { autores: 'Philip E. Tetlock, Dan Gardner', ano: 2015, titulo: 'Superforecasting: The Art and Science of Prediction', veiculo: 'Crown', tipo: 'livro', tema: 'calibracao', uso: 'Começar pela taxa base e ajustar aos poucos pelo caso: é o ajuste da etapa 2.' },
  // Vieses
  { autores: 'Chris Guthrie, Jeffrey J. Rachlinski, Andrew J. Wistrich', ano: 2001, titulo: 'Inside the Judicial Mind', veiculo: 'Cornell Law Review, v. 86', tipo: 'artigo', tema: 'vieses', uso: 'Juízes sofrem ancoragem e viés retrospectivo como qualquer pessoa.' },
  { autores: 'Birte Englich, Thomas Mussweiler, Fritz Strack', ano: 2006, titulo: 'Playing Dice with Criminal Sentences: The Influence of Irrelevant Anchors on Experts\' Judicial Decision Making', veiculo: 'Personality and Social Psychology Bulletin, v. 32', tipo: 'artigo', tema: 'vieses', uso: 'Âncora irrelevante move até especialista: a tela mostra as duas pontas da margem.' },
  { autores: 'Daniel Kahneman, Olivier Sibony, Cass R. Sunstein', ano: 2021, titulo: 'Noise: A Flaw in Human Judgment', veiculo: 'Little, Brown Spark', tipo: 'livro', tema: 'vieses', uso: 'Ruído entre julgadores: por que a vara importa e por que listas de checagem ajudam.' },
  // Depoimentos
  { autores: 'Charles F. Bond Jr., Bella M. DePaulo', ano: 2006, titulo: 'Accuracy of Deception Judgments', veiculo: 'Personality and Social Psychology Review, v. 10', tipo: 'artigo', tema: 'depoimentos', uso: 'Meta-análise: pessoas acertam ~54% ao julgar mentira. Por isso não há "detector".' },
  { autores: 'Lisa Feldman Barrett, Ralph Adolphs, Stacy Marsella, Aleix M. Martinez, Seth D. Pollak', ano: 2019, titulo: 'Emotional Expressions Reconsidered: Challenges to Inferring Emotion From Human Facial Movements', veiculo: 'Psychological Science in the Public Interest, v. 20', tipo: 'artigo', tema: 'depoimentos', uso: 'Rosto não revela emoção de forma confiável: motivo de não ler microexpressão.' },
  { autores: 'Aldert Vrij', ano: 2008, titulo: 'Detecting Lies and Deceit: Pitfalls and Opportunities (2. ed.)', veiculo: 'Wiley', tipo: 'livro', tema: 'depoimentos', uso: 'O que funciona é confrontar o conteúdo com fatos verificáveis: base do confronto de depoimentos.' },
  { autores: 'Elizabeth F. Loftus', ano: 2005, titulo: 'Planting Misinformation in the Human Mind: A 30-Year Investigation of the Malleability of Memory', veiculo: 'Learning & Memory, v. 12', tipo: 'artigo', tema: 'depoimentos', uso: 'Memória se altera: divergência não é mentira, como a tela avisa.' },
  // IA generativa
  { autores: 'Neel Guha et al.', ano: 2023, titulo: 'LegalBench: A Collaboratively Built Benchmark for Measuring Legal Reasoning in Large Language Models', veiculo: 'NeurIPS 2023 (Datasets and Benchmarks)', tipo: 'artigo', tema: 'ia-generativa', uso: 'Mede onde a IA raciocina bem e onde erra em tarefas jurídicas.' },
  { autores: 'Matthew Dahl, Varun Magesh, Mirac Suzgun, Daniel E. Ho', ano: 2024, titulo: 'Large Legal Fictions: Profiling Legal Hallucinations in Large Language Models', veiculo: 'Journal of Legal Analysis, v. 16', tipo: 'artigo', tema: 'ia-generativa', uso: 'IA inventa precedentes: a predição desta tela não usa IA generativa.' },
  { autores: 'Varun Magesh, Faiz Surani, Matthew Dahl, Mirac Suzgun, Christopher D. Manning, Daniel E. Ho', ano: 2025, titulo: 'Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools', veiculo: 'Journal of Empirical Legal Studies, v. 22', tipo: 'artigo', tema: 'ia-generativa', uso: 'Mesmo ferramentas comerciais com busca erram em 17% a 33% das respostas.' },
  // Ética, LGPD e regulação
  { autores: 'Julia Angwin, Jeff Larson, Surya Mattu, Lauren Kirchner', ano: 2016, titulo: 'Machine Bias', veiculo: 'ProPublica', tipo: 'relatório', tema: 'etica-lei', uso: 'Caso COMPAS: risco de algoritmo opaco decidir sobre pessoas.' },
  { autores: 'Julia Dressel, Hany Farid', ano: 2018, titulo: 'The Accuracy, Fairness, and Limits of Predicting Recidivism', veiculo: 'Science Advances, v. 4', tipo: 'artigo', tema: 'etica-lei', uso: 'Modelo simples igualou o comercial: transparência vale mais que complexidade.' },
  { autores: 'União Europeia', ano: 2024, titulo: 'Regulamento (UE) 2024/1689 (AI Act), art. 5º e Anexo III', veiculo: 'Jornal Oficial da UE', tipo: 'norma', tema: 'etica-lei', uso: 'Proíbe reconhecimento de emoções no trabalho e no ensino e trata IA na Justiça como alto risco.' },
  { autores: 'França', ano: 2019, titulo: 'Lei nº 2019-222, art. 33', veiculo: 'Journal Officiel', tipo: 'norma', tema: 'etica-lei', uso: 'Proíbe perfilar magistrados identificados: o perfil aqui é do órgão, com dados agregados.' },
  { autores: 'Brasil', ano: 2018, titulo: 'Lei Geral de Proteção de Dados (Lei 13.709/2018), arts. 6º, 11 e 20', veiculo: 'Diário Oficial da União', tipo: 'norma', tema: 'etica-lei', uso: 'Biometria é dado sensível (art. 11); decisão automatizada pode ser revista (art. 20). Dados ficam no aparelho.' },
  { autores: 'Conselho Nacional de Justiça', ano: 2020, titulo: 'Resolução CNJ nº 332/2020 (ética e transparência da IA no Judiciário)', veiculo: 'CNJ', tipo: 'norma', tema: 'etica-lei', uso: 'Transparência, explicabilidade e supervisão humana: cada número mostra a conta.' },
  // Brasil
  { autores: 'Brasil', ano: 2015, titulo: 'Código de Processo Civil (Lei 13.105/2015), arts. 85, 90, 334 e 487, III, b', veiculo: 'Diário Oficial da União', tipo: 'norma', tema: 'brasil', uso: 'Honorários de sucumbência de 10% a 20% (art. 85, §2º), custas pela metade e remanescentes dispensadas no acordo antes da sentença (art. 90, §§ 2º e 3º), audiência de conciliação (art. 334).' },
  { autores: 'Brasil', ano: 2015, titulo: 'Lei da Mediação (Lei 13.140/2015)', veiculo: 'Diário Oficial da União', tipo: 'norma', tema: 'brasil', uso: 'Base da mediação e da autocomposição; o acordo mediado tem força de título executivo.' },
  { autores: 'Brasil', ano: 2024, titulo: 'Lei 14.905/2024 (altera o Código Civil, art. 406, sobre juros e atualização)', veiculo: 'Diário Oficial da União', tipo: 'norma', tema: 'brasil', uso: 'Taxa legal de juros de mora hoje ligada à Selic: o custo do dinheiro da conta deve seguir o índice vigente. Conferir o texto antes de usar.' },
  { autores: 'Conselho Nacional de Justiça', ano: 2010, titulo: 'Resolução CNJ nº 125/2010 (Política Judiciária Nacional de tratamento adequado dos conflitos)', veiculo: 'CNJ', tipo: 'norma', tema: 'brasil', uso: 'Institui conciliação e mediação como política do Judiciário: a zona de acordo é o caminho incentivado.' },
  { autores: 'Mauro Cappelletti, Bryant Garth', ano: 1988, titulo: 'Acesso à Justiça (trad. Ellen Gracie Northfleet)', veiculo: 'Sergio Antonio Fabris Editor', tipo: 'livro', tema: 'brasil', uso: 'Custo e demora como barreiras de acesso: base para pôr custos e meses na decisão.' },
  { autores: 'Constituição Federal', ano: 1988, titulo: 'Art. 5º, LXXVIII (duração razoável do processo) e art. 93, IX (publicidade e fundamentação)', veiculo: 'Diário Oficial da União', tipo: 'norma', tema: 'brasil', uso: 'Fundamenta o tempo como variável da decisão e a leitura de decisões públicas.' },
  { autores: 'Marcelo Guedes Nunes', ano: 2016, titulo: 'Jurimetria: como a estatística pode reinventar o Direito', veiculo: 'Revista dos Tribunais', tipo: 'livro', tema: 'brasil', uso: 'Principal obra brasileira; base da Associação Brasileira de Jurimetria.' },
  { autores: 'Joaquim Falcão, Pablo de Camargo Cerdeira, Diego Werneck Arguelhes', ano: 2011, titulo: 'I Relatório Supremo em Números: o Múltiplo Supremo', veiculo: 'FGV Direito Rio', tipo: 'relatório', tema: 'brasil', uso: 'Modelo de estatística pública de tribunal brasileiro.' },
  { autores: 'Conselho Nacional de Justiça', ano: 2025, titulo: 'Justiça em Números 2025', veiculo: 'CNJ', tipo: 'relatório', tema: 'brasil', uso: 'Tempo médio e congestionamento por tribunal: referência para "meses até o fim".' },
  { autores: 'Conselho Nacional de Justiça', ano: 2020, titulo: 'Resolução CNJ nº 331/2020 (DataJud)', veiculo: 'CNJ', tipo: 'norma', tema: 'brasil', uso: 'Institui o DataJud, fonte pública das estatísticas da tela.' },
]
