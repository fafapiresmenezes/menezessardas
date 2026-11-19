// R7: o acervo que sustenta o MVP de geomapeamento, dentro da própria casa /geo.
//
// Regra da casa, e ela é rígida: NENHUM PDF de terceiro é hospedado ou redistribuído aqui.
// Cada obra aparece com o link para a página OFICIAL, e é lá que vale a licença. O campo
// `acesso` diz apenas o que encontramos ao montar o acervo — "texto aberto" quando a própria
// página oficial oferece o PDF sem paywall, "página oficial" quando o texto fica atrás do
// editor. Não é parecer jurídico, e a tela diz isso com todas as letras.
//
// Fontes do acervo: geo-replano/pesquisa-1-materias-papers.md (50 papers) e
// geo-replano/pesquisa-2-teses-phd.md (10 teses).

export type Materia = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10'
export type Regiao = 'EUA' | 'Europa' | 'Ásia' | 'Brasil' | 'Global'
export type Acesso = 'texto aberto' | 'página oficial'

export interface Obra {
  id: string
  tipo: 'paper' | 'tese'
  titulo: string
  autores: string
  ano: number
  veiculo: string
  materias: Materia[]
  /** O que, dentro do app, esta obra sustenta. Vazio = ainda não usada, só estudo. */
  elos: string[]
  regiao: Regiao
  url: string
  acesso: Acesso
  /** Uma linha: por que importa para ESTE app. */
  porque: string
}

export const MATERIAS: Record<Materia, string> = {
  M1: 'GIScience e análise espacial',
  M2: 'Ciência urbana',
  M3: 'Sensoriamento remoto',
  M4: 'Geodésia e GNSS',
  M5: 'Mobilidade humana',
  M6: 'Estatística espacial',
  M7: 'GeoAI',
  M8: 'Cartografia e visualização',
  M9: 'Privacidade de localização',
  M10: 'Computação móvel e sensores',
}

/** O que cada sigla de elo quer dizer, em português do dia a dia. */
export const ELOS: Record<string, string> = {
  G1: 'G1 · cofre e consentimento',
  G2: 'G2 · gravar a posição',
  G3: 'G3 · lugares, paradas e previsão',
  G4: 'G4 · câmera como sensor de lugar',
  G5: 'G5 · satélite e município',
  G6: 'G6 · camadas públicas',
  G7: 'G7 · exportar, apagar, revogar',
  G8: 'G8 · app no celular (a fazer)',
  R4: 'R4 · ciência do movimento no painel',
  R5: 'R5 · modo de transporte',
  R6: 'R6 · grafo desenhado',
  R10: 'R10 · precisão em campo (a fazer)',
  C10: 'C10 · previsão calibrada (travada)',
}

export const ACERVO: Obra[] = [
  // ---------- Mobilidade humana (M5) ----------
  { id: 'gonzalez2008', tipo: 'paper', titulo: 'Understanding individual human mobility patterns', autores: 'González, Hidalgo & Barabási', ano: 2008, veiculo: 'Nature 453', materias: ['M5'], elos: ['R4'], regiao: 'EUA', url: 'https://arxiv.org/pdf/0806.1256', acesso: 'texto aberto', porque: 'De onde vem o raio de giração que o painel mostra: a medida de quão longe do seu centro você costuma andar.' },
  { id: 'song2010limits', tipo: 'paper', titulo: 'Limits of Predictability in Human Mobility', autores: 'Song, Qu, Blumm & Barabási', ano: 2010, veiculo: 'Science 327', materias: ['M5'], elos: ['R4', 'C10'], regiao: 'EUA', url: 'https://barabasi.com/media/2010-Song_et_al-Limits_of_Predctiability-Science.pdf', acesso: 'texto aberto', porque: 'O teto de ~93% de previsibilidade que o app mostra, e a razão de nunca prometermos mais que isso.' },
  { id: 'song2010scaling', tipo: 'paper', titulo: 'Modelling the scaling properties of human mobility', autores: 'Song et al.', ano: 2010, veiculo: 'Nature Physics 6', materias: ['M5'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1038/nphys1760', acesso: 'página oficial', porque: 'Explica por que o número de lugares de uma pessoa cresce devagar: o app não espera lugares novos todo dia.' },
  { id: 'pappalardo2015', tipo: 'paper', titulo: 'Returners and explorers dichotomy in human mobility', autores: 'Pappalardo et al.', ano: 2015, veiculo: 'Nature Communications 6:8166', materias: ['M5'], elos: ['R4'], regiao: 'Europa', url: 'https://doi.org/10.1038/ncomms9166', acesso: 'texto aberto', porque: 'O perfil "retornante ou explorador" que aparece no painel sai daqui.' },
  { id: 'alessandretti2018', tipo: 'paper', titulo: 'Evidence for a conserved quantity in human mobility', autores: 'Alessandretti et al.', ano: 2018, veiculo: 'Nature Human Behaviour 2:485', materias: ['M5'], elos: [], regiao: 'Europa', url: 'https://doi.org/10.1038/s41562-018-0364-x', acesso: 'página oficial', porque: 'Mostra que cada pessoa mantém um número quase fixo de lugares ativos; serve de teste de sanidade do app.' },
  { id: 'luca2021', tipo: 'paper', titulo: 'A Survey on Deep Learning for Human Mobility', autores: 'Luca, Barlacchi, Lepri & Pappalardo', ano: 2021, veiculo: 'ACM Computing Surveys', materias: ['M5', 'M7'], elos: [], regiao: 'Europa', url: 'https://arxiv.org/pdf/2012.02825', acesso: 'texto aberto', porque: 'Mapa do que existe em aprendizado profundo para mobilidade: o caminho se um dia a previsão sair do Markov.' },
  { id: 'blondel2015', tipo: 'paper', titulo: 'A survey of results on mobile phone datasets analysis', autores: 'Blondel, Decuyper & Krings', ano: 2015, veiculo: 'EPJ Data Science 4:10', materias: ['M5'], elos: [], regiao: 'Europa', url: 'https://doi.org/10.1140/epjds/s13688-015-0046-0', acesso: 'texto aberto', porque: 'Panorama do que dá e do que não dá para concluir de dados de celular.' },
  { id: 'barbosa2018', tipo: 'paper', titulo: 'Human mobility: Models and applications', autores: 'Barbosa et al.', ano: 2018, veiculo: 'Physics Reports 734', materias: ['M5'], elos: [], regiao: 'Global', url: 'https://doi.org/10.1016/j.physrep.2018.01.001', acesso: 'página oficial', porque: 'Revisão de referência dos modelos de mobilidade; é o índice do assunto.' },
  { id: 'pappalardo2022', tipo: 'paper', titulo: 'scikit-mobility: A Python Library for the Analysis of Human Mobility', autores: 'Pappalardo et al.', ano: 2022, veiculo: 'Journal of Statistical Software 103', materias: ['M5'], elos: ['R4'], regiao: 'Europa', url: 'https://doi.org/10.18637/jss.v103.i04', acesso: 'texto aberto', porque: 'Conferimos nossas fórmulas de mobilidade contra esta biblioteca antes de pôr qualquer número na tela.' },
  { id: 'zheng2010geolife', tipo: 'paper', titulo: 'GeoLife: A Collaborative Social Networking Service among User, Location and Trajectory', autores: 'Zheng, Xie & Ma', ano: 2010, veiculo: 'IEEE Data Engineering Bulletin', materias: ['M5'], elos: ['R10'], regiao: 'Ásia', url: 'https://www.microsoft.com/en-us/research/publication/geolife-a-collaborative-social-networking-service-among-user-location-and-trajectory/', acesso: 'texto aberto', porque: 'Conjunto de trajetórias que serve de referência para medir o app contra algo externo.' },
  { id: 'zheng2015', tipo: 'paper', titulo: 'Trajectory Data Mining: An Overview', autores: 'Zheng', ano: 2015, veiculo: 'ACM TIST 6(3):29', materias: ['M5'], elos: ['G3'], regiao: 'Ásia', url: 'https://doi.org/10.1145/2743025', acesso: 'página oficial', porque: 'Receita clássica de virar pontos soltos em paradas e trajetos, que é o que o app faz.' },
  { id: 'jiang2023', tipo: 'paper', titulo: 'Self-supervised Trajectory Representation Learning', autores: 'Jiang, Yin & Zhao', ano: 2023, veiculo: 'arXiv', materias: ['M5', 'M7'], elos: [], regiao: 'Ásia', url: 'https://arxiv.org/abs/2210.00592', acesso: 'texto aberto', porque: 'Linha atual de representar trajetos sem rótulo; guardado para quando houver dado suficiente.' },

  // ---------- GIScience e estatística espacial (M1, M6) ----------
  { id: 'tobler1970', tipo: 'paper', titulo: 'A Computer Movie Simulating Urban Growth in the Detroit Region', autores: 'Tobler', ano: 1970, veiculo: 'Economic Geography 46', materias: ['M1'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.2307/143141', acesso: 'página oficial', porque: 'A primeira lei da geografia: o que está perto se parece mais. É a premissa de agrupar pontos em lugares.' },
  { id: 'anselin1995', tipo: 'paper', titulo: 'Local Indicators of Spatial Association — LISA', autores: 'Anselin', ano: 1995, veiculo: 'Geographical Analysis 27', materias: ['M6'], elos: ['C10'], regiao: 'EUA', url: 'https://doi.org/10.1111/j.1538-4632.1995.tb00338.x', acesso: 'página oficial', porque: 'Como achar aglomerados de verdade e não manchas de acaso; pré-requisito de qualquer mapa municipal.' },
  { id: 'getis1992', tipo: 'paper', titulo: 'The Analysis of Spatial Association by Use of Distance Statistics', autores: 'Getis & Ord', ano: 1992, veiculo: 'Geographical Analysis 24', materias: ['M6'], elos: ['C10'], regiao: 'EUA', url: 'https://doi.org/10.1111/j.1538-4632.1992.tb00261.x', acesso: 'página oficial', porque: 'Teste estatístico de ponto quente, para não chamar de padrão o que é ruído.' },
  { id: 'ester1996', tipo: 'paper', titulo: 'A Density-Based Algorithm for Discovering Clusters (DBSCAN)', autores: 'Ester, Kriegel, Sander & Xu', ano: 1996, veiculo: 'KDD-96', materias: ['M1'], elos: ['G3'], regiao: 'Europa', url: 'https://cdn.aaai.org/KDD/1996/KDD96-037.pdf', acesso: 'texto aberto', porque: 'O algoritmo por trás dos "seus lugares": junta pontos por densidade, sem você dizer quantos lugares existem.' },
  { id: 'goodchild2007', tipo: 'paper', titulo: 'Citizens as sensors: the world of volunteered geography', autores: 'Goodchild', ano: 2007, veiculo: 'GeoJournal 69', materias: ['M1', 'M2'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1007/s10708-007-9111-y', acesso: 'página oficial', porque: 'Fundamenta usar o próprio aparelho do titular como fonte de dado geográfico.' },
  { id: 'openshaw1984', tipo: 'paper', titulo: 'The Modifiable Areal Unit Problem (MAUP)', autores: 'Openshaw', ano: 1984, veiculo: 'CATMOG 38', materias: ['M6'], elos: ['C10'], regiao: 'Europa', url: 'https://alexsingleton.wordpress.com/wp-content/uploads/2014/09/38-maup-openshaw.pdf', acesso: 'texto aberto', porque: 'Mostra que mudar o recorte do mapa muda o resultado. É por isso que previsão municipal está travada aqui.' },
  { id: 'fotheringham2002', tipo: 'paper', titulo: 'Geographically Weighted Regression', autores: 'Fotheringham, Brunsdon & Charlton', ano: 2002, veiculo: 'Wiley', materias: ['M6'], elos: [], regiao: 'Europa', url: 'https://www.wiley.com/en-us/Geographically+Weighted+Regression-p-9780471496168', acesso: 'página oficial', porque: 'Regressão que varia no espaço: o caminho se um dia o app explicar, e não só descrever.' },
  { id: 'rey2007', tipo: 'paper', titulo: 'PySAL: A Python Library of Spatial Analytical Methods', autores: 'Rey & Anselin', ano: 2007, veiculo: 'Review of Regional Studies 37', materias: ['M6'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.52324/001c.8285', acesso: 'texto aberto', porque: 'Implementação de referência: serve para conferir conta de estatística espacial.' },

  // ---------- Sensoriamento remoto (M3) ----------
  { id: 'drusch2012', tipo: 'paper', titulo: 'Sentinel-2: ESA’s Optical High-Resolution Mission', autores: 'Drusch et al.', ano: 2012, veiculo: 'Remote Sensing of Environment 120', materias: ['M3'], elos: ['G5'], regiao: 'Europa', url: 'https://doi.org/10.1016/j.rse.2011.11.026', acesso: 'página oficial', porque: 'O satélite cujas cenas o app busca na aba de satélite.' },
  { id: 'wulder2019', tipo: 'paper', titulo: 'Current status of Landsat program, science, and applications', autores: 'Wulder et al.', ano: 2019, veiculo: 'Remote Sensing of Environment 225', materias: ['M3'], elos: ['G5'], regiao: 'EUA', url: 'https://doi.org/10.1016/j.rse.2019.02.015', acesso: 'texto aberto', porque: 'A outra família de satélites que o app pode consultar, e seus limites de resolução e revisita.' },
  { id: 'tucker1979', tipo: 'paper', titulo: 'Red and photographic infrared linear combinations for monitoring vegetation', autores: 'Tucker', ano: 1979, veiculo: 'Remote Sensing of Environment 8', materias: ['M3'], elos: ['G5'], regiao: 'EUA', url: 'https://doi.org/10.1016/0034-4257(79)90013-0', acesso: 'página oficial', porque: 'Define o NDVI, o índice de vegetação que o app já calcula e mostra.' },
  { id: 'gorelick2017', tipo: 'paper', titulo: 'Google Earth Engine: Planetary-scale geospatial analysis for everyone', autores: 'Gorelick et al.', ano: 2017, veiculo: 'Remote Sensing of Environment 202', materias: ['M3'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1016/j.rse.2017.06.031', acesso: 'texto aberto', porque: 'Mostra o que seria possível com processamento em nuvem — hoje o app faz tudo no aparelho, de propósito.' },
  { id: 'jean2016', tipo: 'paper', titulo: 'Combining satellite imagery and machine learning to predict poverty', autores: 'Jean, Burke et al.', ano: 2016, veiculo: 'Science 353', materias: ['M3', 'M7'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1126/science.aaf7894', acesso: 'página oficial', porque: 'Prova que imagem de satélite carrega sinal socioeconômico; também mostra como isso pode errar feio.' },
  { id: 'burke2021', tipo: 'paper', titulo: 'Using satellite imagery to understand and promote sustainable development', autores: 'Burke, Driscoll, Lobell & Ermon', ano: 2021, veiculo: 'Science 371', materias: ['M3'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1126/science.abe8628', acesso: 'página oficial', porque: 'Revisão honesta sobre onde satélite ajuda de verdade em política pública.' },
  { id: 'zhu2017', tipo: 'paper', titulo: 'Deep Learning in Remote Sensing: A Comprehensive Review', autores: 'Zhu et al.', ano: 2017, veiculo: 'IEEE GRSM 5(4)', materias: ['M3', 'M7'], elos: [], regiao: 'Europa', url: 'https://arxiv.org/abs/1710.03959', acesso: 'texto aberto', porque: 'Estado da arte de aprendizado profundo sobre imagem de satélite.' },
  { id: 'gong2013', tipo: 'paper', titulo: 'Finer resolution observation and monitoring of global land cover (FROM-GLC)', autores: 'Gong et al.', ano: 2013, veiculo: 'International Journal of Remote Sensing 34', materias: ['M3'], elos: [], regiao: 'Ásia', url: 'https://doi.org/10.1080/01431161.2012.748992', acesso: 'página oficial', porque: 'Mapeamento global de cobertura do solo: referência de comparação para camadas de uso do solo.' },
  { id: 'souza2020', tipo: 'paper', titulo: 'Reconstructing Three Decades of Land Use and Land Cover Changes in Brazilian Biomes (MapBiomas)', autores: 'Souza et al.', ano: 2020, veiculo: 'Remote Sensing 12:2735', materias: ['M3'], elos: ['G6'], regiao: 'Brasil', url: 'https://doi.org/10.3390/rs12172735', acesso: 'texto aberto', porque: 'A base brasileira de uso do solo que o app pode cruzar com o município do titular.' },

  // ---------- GeoAI (M7) ----------
  { id: 'geoai2024', tipo: 'paper', titulo: 'A Comprehensive Review of GeoAI', autores: 'vários', ano: 2024, veiculo: 'arXiv:2412.11643', materias: ['M7'], elos: [], regiao: 'Global', url: 'https://arxiv.org/abs/2412.11643v1', acesso: 'texto aberto', porque: 'Revisão recente do campo; serve de índice para o que ainda falta no app.' },
  { id: 'janowicz2020', tipo: 'paper', titulo: 'GeoAI: spatially explicit artificial intelligence', autores: 'Janowicz, Gao, McKenzie, Hu & Bhaduri', ano: 2020, veiculo: 'IJGIS 34', materias: ['M7'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1080/13658816.2019.1684500', acesso: 'página oficial', porque: 'Define o campo e defende que modelo espacial tem de ser espacialmente explícito, não genérico.' },
  { id: 'mai2024', tipo: 'paper', titulo: 'On the Opportunities and Challenges of Foundation Models for Geospatial AI', autores: 'Mai et al.', ano: 2024, veiculo: 'arXiv:2304.06798', materias: ['M7'], elos: [], regiao: 'EUA', url: 'https://arxiv.org/abs/2304.06798', acesso: 'texto aberto', porque: 'Avalia modelos de fundação para geoespacial, com as limitações ditas abertamente.' },
  { id: 'howard2019', tipo: 'paper', titulo: 'Searching for MobileNetV3', autores: 'Howard et al.', ano: 2019, veiculo: 'ICCV', materias: ['M7', 'M10'], elos: ['G4'], regiao: 'EUA', url: 'https://arxiv.org/abs/1905.02244', acesso: 'texto aberto', porque: 'A família de modelos leves que roda no celular; é a base do detector que a câmera usa.' },
  { id: 'sandler2018', tipo: 'paper', titulo: 'MobileNetV2: Inverted Residuals and Linear Bottlenecks', autores: 'Sandler et al.', ano: 2018, veiculo: 'CVPR', materias: ['M7'], elos: ['G4'], regiao: 'EUA', url: 'https://arxiv.org/abs/1801.04381', acesso: 'texto aberto', porque: 'A espinha exata do modelo que o app baixa para a câmera (lite_mobilenet_v2).' },
  { id: 'li2022', tipo: 'paper', titulo: 'GeoAI for Large-Scale Image Analysis and Machine Vision', autores: 'Li & Hsu', ano: 2022, veiculo: 'ISPRS IJGI', materias: ['M7', 'M3'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.3390/ijgi11070385', acesso: 'texto aberto', porque: 'Visão computacional aplicada a dado geográfico em escala.' },
  { id: 'guo2016', tipo: 'paper', titulo: 'Deep learning for visual understanding: A review', autores: 'Guo et al.', ano: 2016, veiculo: 'Neurocomputing 187', materias: ['M7'], elos: ['G4'], regiao: 'Ásia', url: 'https://doi.org/10.1016/j.neucom.2015.09.116', acesso: 'página oficial', porque: 'Base de como uma máquina "enxerga" objetos, que é o que a câmera do app faz.' },

  // ---------- Ontologias e grafos ----------
  { id: 'kuhn2012', tipo: 'paper', titulo: 'Core concepts of spatial information for transdisciplinary research', autores: 'Kuhn', ano: 2012, veiculo: 'IJGIS 26', materias: ['M1'], elos: ['R6'], regiao: 'Europa', url: 'https://doi.org/10.1080/13658816.2012.722637', acesso: 'página oficial', porque: 'A espinha conceitual do grafo: quais são, afinal, as coisas que um sistema espacial representa.' },
  { id: 'janowicz2022', tipo: 'paper', titulo: 'KnowWhereGraph: A Large-Scale Geo-Knowledge Graph', autores: 'Janowicz et al.', ano: 2022, veiculo: 'AI Magazine 43', materias: ['M1', 'M7'], elos: ['R6'], regiao: 'EUA', url: 'https://doi.org/10.1002/aaai.12072', acesso: 'texto aberto', porque: 'Grafo geográfico de larga escala: o modelo do que o grafo do app pode virar.' },
  { id: 'battle2012', tipo: 'paper', titulo: 'Enabling the geospatial Semantic Web with Parliament and GeoSPARQL', autores: 'Battle & Kolas', ano: 2012, veiculo: 'Semantic Web Journal 3', materias: ['M1'], elos: ['R6', 'G7'], regiao: 'EUA', url: 'https://content.iospress.com/articles/semantic-web/sw056', acesso: 'texto aberto', porque: 'O padrão de consulta a grafo geográfico; é para onde a exportação do grafo deve convergir.' },
  { id: 'hogan2021', tipo: 'paper', titulo: 'Knowledge Graphs', autores: 'Hogan et al.', ano: 2021, veiculo: 'ACM Computing Surveys 54', materias: ['M1'], elos: ['R6'], regiao: 'Global', url: 'https://arxiv.org/abs/2003.02320', acesso: 'texto aberto', porque: 'Manual de referência de grafos de conhecimento, do modelo à consulta.' },

  // ---------- Privacidade (M9) ----------
  { id: 'andres2013', tipo: 'paper', titulo: 'Geo-Indistinguishability: Differential Privacy for Location-Based Systems', autores: 'Andrés, Bordenabe, Chatzikokolakis & Palamidessi', ano: 2013, veiculo: 'ACM CCS', materias: ['M9'], elos: ['G1', 'G7'], regiao: 'Europa', url: 'https://arxiv.org/pdf/1212.1984', acesso: 'texto aberto', porque: 'A teoria por trás de embaralhar a posição antes de consultar qualquer serviço de fora.' },
  { id: 'dwork2006', tipo: 'paper', titulo: 'Differential Privacy', autores: 'Dwork', ano: 2006, veiculo: 'ICALP', materias: ['M9'], elos: [], regiao: 'EUA', url: 'https://www.microsoft.com/en-us/research/publication/differential-privacy/', acesso: 'texto aberto', porque: 'A definição de privacidade que permite medir, e não só prometer.' },
  { id: 'montjoye2013', tipo: 'paper', titulo: 'Unique in the Crowd: The privacy bounds of human mobility', autores: 'de Montjoye, Hidalgo, Verleysen & Blondel', ano: 2013, veiculo: 'Scientific Reports 3:1376', materias: ['M9', 'M5'], elos: ['G1'], regiao: 'Europa', url: 'https://doi.org/10.1038/srep01376', acesso: 'texto aberto', porque: 'Quatro pontos no tempo e espaço já identificam uma pessoa. É a razão de os dados ficarem só no aparelho.' },
  { id: 'gruteser2003', tipo: 'paper', titulo: 'Anonymous Usage of Location-Based Services Through Spatial and Temporal Cloaking', autores: 'Gruteser & Grunwald', ano: 2003, veiculo: 'MobiSys', materias: ['M9'], elos: ['G7'], regiao: 'EUA', url: 'https://doi.org/10.1145/1066116.1189037', acesso: 'página oficial', porque: 'Origem do truque de arredondar posição e tempo, que o app usa ao consultar serviços externos.' },
  { id: 'primault2019', tipo: 'paper', titulo: 'The Long Road to Computational Location Privacy: A Survey', autores: 'Primault et al.', ano: 2019, veiculo: 'IEEE Communications Surveys & Tutorials 21', materias: ['M9'], elos: [], regiao: 'Europa', url: 'https://doi.org/10.1109/COMST.2018.2873950', acesso: 'página oficial', porque: 'Revisão do que funciona e do que só parece funcionar em privacidade de localização.' },
  { id: 'fiore2020', tipo: 'paper', titulo: 'Privacy in trajectory micro-data publishing: a survey', autores: 'Fiore et al.', ano: 2020, veiculo: 'Transactions on Data Privacy 13', materias: ['M9'], elos: ['G7'], regiao: 'Europa', url: 'https://arxiv.org/abs/1903.12211', acesso: 'texto aberto', porque: 'O que considerar antes de publicar qualquer trajeto, mesmo anonimizado.' },

  // ---------- Computação móvel (M10) ----------
  { id: 'lane2010', tipo: 'paper', titulo: 'A Survey of Mobile Phone Sensing', autores: 'Lane, Miluzzo, Lu, Peebles, Choudhury & Campbell', ano: 2010, veiculo: 'IEEE Communications Magazine 48', materias: ['M10'], elos: ['G2', 'G8'], regiao: 'EUA', url: 'https://doi.org/10.1109/MCOM.2010.5560598', acesso: 'página oficial', porque: 'O mapa do que um celular consegue sentir, e a que custo de bateria.' },
  { id: 'reddy2010', tipo: 'paper', titulo: 'Using Mobile Phones to Determine Transportation Modes', autores: 'Reddy, Mun, Burke, Estrin, Hansen & Srivastava', ano: 2010, veiculo: 'ACM TOSN 6', materias: ['M10', 'M5'], elos: ['R5'], regiao: 'EUA', url: 'https://doi.org/10.1145/1689239.1689243', acesso: 'página oficial', porque: 'Os limiares de velocidade e a suavização por maioria que o app usa para dizer se você foi a pé, de bicicleta ou de carro.' },
  { id: 'liu2020', tipo: 'paper', titulo: 'Survey on CSI-based indoor positioning systems and recent advances', autores: 'Liu et al.', ano: 2020, veiculo: 'IEEE Communications Surveys & Tutorials', materias: ['M10', 'M4'], elos: ['R10'], regiao: 'Ásia', url: 'https://doi.org/10.1109/COMST.2019.2958459', acesso: 'página oficial', porque: 'Posicionamento dentro de prédio, onde o GPS falha: o limite honesto do app hoje.' },

  // ---------- Ciência urbana (M2) ----------
  { id: 'batty2013', tipo: 'paper', titulo: 'The New Science of Cities', autores: 'Batty', ano: 2013, veiculo: 'MIT Press', materias: ['M2'], elos: [], regiao: 'Europa', url: 'https://mitpress.mit.edu/9780262534567/the-new-science-of-cities/', acesso: 'página oficial', porque: 'A cidade como rede de fluxos, não como desenho: a leitura de fundo do grafo.' },
  { id: 'bettencourt2007', tipo: 'paper', titulo: 'Growth, innovation, scaling, and the pace of life in cities', autores: 'Bettencourt, Lobo, Helbing, Kühnert & West', ano: 2007, veiculo: 'PNAS 104', materias: ['M2'], elos: [], regiao: 'EUA', url: 'https://doi.org/10.1073/pnas.0610172104', acesso: 'texto aberto', porque: 'Leis de escala urbana: por que comparar municípios sem normalizar engana.' },
  { id: 'fruchterman1991', tipo: 'paper', titulo: 'Graph Drawing by Force-Directed Placement', autores: 'Fruchterman & Reingold', ano: 1991, veiculo: 'Software: Practice and Experience 21(11)', materias: ['M8'], elos: ['R6'], regiao: 'EUA', url: 'https://doi.org/10.1002/spe.4380211102', acesso: 'página oficial', porque: 'O método que organiza sozinho o desenho do grafo na aba Grafo e previsão.' },

  // ---------- Teses de doutorado ----------
  { id: 'tese-mit-cdr', tipo: 'tese', titulo: 'Understanding and modeling human movement in cities using phone data', autores: 'MIT (DSpace@MIT)', ano: 2016, veiculo: 'Tese de doutorado, MIT', materias: ['M5', 'M2'], elos: ['G3'], regiao: 'EUA', url: 'https://dspace.mit.edu/handle/1721.1/107058?show=full', acesso: 'texto aberto', porque: 'Como transformar pontos brutos em viagens e atividades, que é o passo das paradas no app.' },
  { id: 'tese-yang-mit', tipo: 'tese', titulo: 'Understanding Human Mobility Patterns from Digital Traces', autores: 'Yingxiang Yang', ano: 2013, veiculo: 'Tese de doutorado, MIT', materias: ['M5'], elos: ['R4'], regiao: 'EUA', url: 'https://dspace.mit.edu/handle/1721.1/82863', acesso: 'texto aberto', porque: 'Métricas de regularidade e entropia; sustenta a honestidade dos números de previsibilidade.' },
  { id: 'tese-miluzzo', tipo: 'tese', titulo: 'Smartphone Sensing', autores: 'Emiliano Miluzzo (orient. Andrew Campbell)', ano: 2011, veiculo: 'Tese de doutorado, Dartmouth', materias: ['M10'], elos: ['G2', 'G8'], regiao: 'EUA', url: 'http://sensorlab.cs.dartmouth.edu/pubs/miluzzo-phd-dissertation.pdf', acesso: 'texto aberto', porque: 'Tese fundadora do sensoriamento por smartphone: coletar no aparelho sem acabar com a bateria.' },
  { id: 'tese-harvard', tipo: 'tese', titulo: 'High-resolution data on mobility, the built environment, and physical activity', autores: 'Harvard (DASH)', ano: 2019, veiculo: 'Tese de doutorado, Harvard', materias: ['M5', 'M2'], elos: ['G1'], regiao: 'EUA', url: 'https://dash.harvard.edu/entities/publication/70877b71-5dcf-4c6a-ade0-4d37f6019d52', acesso: 'texto aberto', porque: 'GPS pessoal com rigor de pesquisa com seres humanos; inspira o desenho do consentimento.' },
  { id: 'tese-hong-eth', tipo: 'tese', titulo: 'How do you go where? Improving next location prediction by learning', autores: 'Ye Hong (grupo Martin Raubal)', ano: 2024, veiculo: 'Tese de doutorado, ETH Zürich', materias: ['M5', 'M7'], elos: ['G3', 'C10'], regiao: 'Europa', url: 'https://www.research-collection.ethz.ch/handle/20.500.11850/667431', acesso: 'texto aberto', porque: 'Estado da arte em prever o próximo lugar; o caminho para sair da cadeia de Markov simples.' },
  { id: 'tese-shokri-epfl', tipo: 'tese', titulo: 'Quantifying and Protecting Location Privacy', autores: 'Reza Shokri (orient. Jean-Pierre Hubaux)', ano: 2012, veiculo: 'Tese de doutorado, EPFL', materias: ['M9'], elos: ['G1', 'G7'], regiao: 'Europa', url: 'https://infoscience.epfl.ch/entities/publication/31835444-afd0-4bb8-b2c9-b8f6711d8094', acesso: 'texto aberto', porque: 'Referência mundial em MEDIR privacidade de localização; fundamenta o arredondamento de ~1 km.' },
  { id: 'tese-chalmers', tipo: 'tese', titulo: 'Robust location privacy', autores: 'Chalmers University of Technology', ano: 2017, veiculo: 'Tese de doutorado, Chalmers', materias: ['M9'], elos: ['G8'], regiao: 'Europa', url: 'https://www.cse.chalmers.se/research/group/security/pages/publications/perh-phd/phd-thesis.pdf', acesso: 'texto aberto', porque: 'Provar "estive aqui" sem entregar o trajeto inteiro — exatamente o que o app vai precisar.' },
  { id: 'tese-tudelft', tipo: 'tese', titulo: 'Exploiting the Test-time Reference Map for Visual Place Recognition', autores: 'TU Delft', ano: 2023, veiculo: 'Tese de doutorado, TU Delft', materias: ['M7'], elos: ['G4'], regiao: 'Europa', url: 'https://repository.tudelft.nl/record/uuid:23100238-1ab6-40a6-8012-ccca0473d230', acesso: 'texto aberto', porque: 'A ciência de reconhecer o lugar pela foto, robusta a luz e estação — e sem rosto nenhum.' },
  { id: 'tese-oyama-tokyo', tipo: 'tese', titulo: 'A Markovian route choice analysis', autores: 'Yuki Oyama', ano: 2019, veiculo: 'Tese de doutorado, University of Tokyo', materias: ['M5'], elos: ['G3'], regiao: 'Ásia', url: 'https://yuki-oyama.github.io/document/thesis.pdf', acesso: 'texto aberto', porque: 'Formaliza previsão de rota com pouco dado, que é o caso aqui: um titular só.' },
  { id: 'tese-nus', tipo: 'tese', titulo: 'Inferring semantic trajectories from Wi-Fi tracking data', autores: 'National University of Singapore (ScholarBank)', ano: 2019, veiculo: 'Tese de doutorado, NUS', materias: ['M5', 'M10'], elos: ['G3'], regiao: 'Ásia', url: 'https://scholarbank.nus.edu.sg/handle/10635/159469', acesso: 'texto aberto', porque: 'Dar nome e significado aos lugares automaticamente, em vez de deixar tudo por conta do titular.' },
]

export const TOTAL_PAPERS = ACERVO.filter(o => o.tipo === 'paper').length
export const TOTAL_TESES = ACERVO.filter(o => o.tipo === 'tese').length
