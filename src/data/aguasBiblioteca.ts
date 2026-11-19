// Biblioteca de Águas (19/11/2026): 50 estudos e 10 teses de doutorado abertas, cada um conferido
// numa página ou PDF aberto. Gerado de /mnt/project-files/aguas/leituras-conferidas.json.
// Regra: só entra o que tem link aberto conferido; autor só quando a página mostra.

export interface EstudoAguas { n: number; autores: string; ano: string; titulo: string; link: string; uso: string }
export interface TeseAguas { n: number; autor: string; ano: string; universidade: string; titulo: string; link: string; viraFerramenta: string }

export const ESTUDOS_AGUAS: EstudoAguas[] = [
  {
    "n": 1,
    "autores": "UN-Water/UNESCO",
    "ano": "2025",
    "titulo": "Relatório Mundial de Desenvolvimento da Água 2025 (montanhas e geleiras)",
    "link": "https://unesco.org.uk/resources/the-united-nations-world-water-development-report-2025-executive-summary",
    "uso": "padrão global de indicadores"
  },
  {
    "n": 2,
    "autores": "OCDE",
    "ano": "2015",
    "titulo": "Princípios de Governança da Água",
    "link": "https://one.oecd.org/document/C/MIN(2015)12/en/pdf",
    "uso": "régua de governança de bacia"
  },
  {
    "n": 3,
    "autores": "Banco Mundial",
    "ano": "2016",
    "titulo": "High and Dry: Climate Change, Water, and the Economy",
    "link": "https://openknowledge.worldbank.org/handle/10986/23665",
    "uso": "custo econômico da falta de água"
  },
  {
    "n": 4,
    "autores": "IPCC AR6 Grupo II (Caretta e outros)",
    "ano": "2022",
    "titulo": "Capítulo 4: Água",
    "link": "https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-4",
    "uso": "clima e água com faixa de incerteza"
  },
  {
    "n": 5,
    "autores": "ANA",
    "ano": "2024",
    "titulo": "Conjuntura dos Recursos Hídricos no Brasil 2024",
    "link": "https://www.snirh.gov.br/portal/centrais-de-conteudos/conjuntura-dos-recursos-hidricos/conjuntura2024_04122024.pdf",
    "uso": "números oficiais do país"
  },
  {
    "n": 6,
    "autores": "WRI (Kuzma e outros)",
    "ano": "2023",
    "titulo": "Aqueduct 4.0: indicadores globais de risco hídrico",
    "link": "https://doi.org/10.46830/writn.23.00061",
    "uso": "padrão internacional de risco hídrico"
  },
  {
    "n": 7,
    "autores": "Ostrom",
    "ano": "1990",
    "titulo": "Governing the Commons (livro, Cambridge University Press)",
    "link": "https://search.worldcat.org/title/21409003",
    "uso": "comitês de bacia e recurso comum"
  },
  {
    "n": 8,
    "autores": "Vörösmarty e outros",
    "ano": "2010",
    "titulo": "Global threats to human water security and river biodiversity (Nature)",
    "link": "https://ideas.repec.org/a/nat/nature/v467y2010i7315d10.1038_nature09440.html",
    "uso": "ameaças à segurança hídrica"
  },
  {
    "n": 9,
    "autores": "Mekonnen e Hoekstra",
    "ano": "2016",
    "titulo": "Four billion people facing severe water scarcity (Science Advances)",
    "link": "https://pmc.ncbi.nlm.nih.gov/articles/4758739/",
    "uso": "escassez mês a mês"
  },
  {
    "n": 10,
    "autores": "Falkenmark, Lundqvist e Widstrand",
    "ano": "1989",
    "titulo": "Macro-scale water scarcity requires micro-scale approaches (Natural Resources Forum)",
    "link": "https://econpapers.repec.org/RePEc:wly:natres:v:13:y:1989:i:4:p:258-267",
    "uso": "índice clássico de estresse hídrico"
  },
  {
    "n": 11,
    "autores": "Wolf, Yoffe e Giordano",
    "ano": "2003",
    "titulo": "International waters: indicators for identifying basins at risk (UNESCO)",
    "link": "https://unesdoc.unesco.org/ark:/48223/pf0000133306",
    "uso": "rios entre países"
  },
  {
    "n": 12,
    "autores": "Gleick",
    "ano": "1993",
    "titulo": "Water and Conflict (International Security)",
    "link": "https://pacinst.org/publication/international-security-water-conflict/",
    "uso": "água e conflito"
  },
  {
    "n": 13,
    "autores": "Milly e outros",
    "ano": "2008",
    "titulo": "Stationarity is dead: whither water management? (Science)",
    "link": "https://www.pubmed.gov/18239110/",
    "uso": "por que séries antigas não bastam"
  },
  {
    "n": 14,
    "autores": "Grey e Sadoff",
    "ano": "2007",
    "titulo": "Sink or swim? Water security for growth and development (Water Policy)",
    "link": "https://documents1.worldbank.org/curated/en/560281468138573494/pdf/447270BRI0Box31ter0PNOTE071Sink1Swm.pdf",
    "uso": "segurança hídrica e economia"
  },
  {
    "n": 15,
    "autores": "Rodell e outros",
    "ano": "2018",
    "titulo": "Emerging trends in global freshwater availability (Nature)",
    "link": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6077847",
    "uso": "água vista por satélite (GRACE)"
  },
  {
    "n": 16,
    "autores": "Grill e outros",
    "ano": "2019",
    "titulo": "Mapping the world's free-flowing rivers (Nature)",
    "link": "https://ideas.repec.org/a/nat/nature/v569y2019i7755d10.1038_s41586-019-1111-9.html",
    "uso": "rios e barragens"
  },
  {
    "n": 17,
    "autores": "Pekel e outros",
    "ano": "2016",
    "titulo": "High-resolution mapping of global surface water and its long-term changes (Nature)",
    "link": "https://research.google/pubs/high-resolution-mapping-of-global-surface-water-and-its-long-term-changes/",
    "uso": "mapa de água superficial"
  },
  {
    "n": 18,
    "autores": "Gleeson e outros",
    "ano": "2012",
    "titulo": "Water balance of global aquifers revealed by groundwater footprint (Nature)",
    "link": "https://ideas.repec.org/a/nat/nature/v488y2012i7410d10.1038_nature11295.html",
    "uso": "água subterrânea"
  },
  {
    "n": 19,
    "autores": "Di Baldassarre e outros",
    "ano": "2018",
    "titulo": "Water shortages worsened by reservoir effects (Nature Sustainability)",
    "link": "https://research-portal.uu.nl/en/publications/water-shortages-worsened-by-reservoir-effects/",
    "uso": "efeito reservatório na falta de água"
  },
  {
    "n": 20,
    "autores": "Kreibich e outros",
    "ano": "2022",
    "titulo": "The challenge of unprecedented floods and droughts in risk management (Nature)",
    "link": "https://lup.lub.lu.se/record/a6a9b4e5-0910-4d1d-803f-0e353caea896",
    "uso": "gestão de cheias e secas"
  },
  {
    "n": 21,
    "autores": "ANA",
    "ano": "2019",
    "titulo": "Plano Nacional de Segurança Hídrica",
    "link": "https://pnsh.ana.gov.br/pdf/boletim-1.pdf",
    "uso": "obras e risco de abastecimento"
  },
  {
    "n": 22,
    "autores": "ANA",
    "ano": "2021",
    "titulo": "Atlas Águas: segurança hídrica do abastecimento urbano",
    "link": "https://metadados.snirh.gov.br/geonetwork/srv/api/records/d77a2d01-0578-4c71-a57e-87f5c565aacf",
    "uso": "abastecimento por município"
  },
  {
    "n": 23,
    "autores": "MDR/CNRH",
    "ano": "2022",
    "titulo": "Plano Nacional de Recursos Hídricos 2022-2040 (documento base)",
    "link": "https://www.gov.br/mdr/pt-br/assuntos/seguranca-hidrica/plano-nacional-de-recursos-hidricos-1/doc_base_elab_pnrh_2022_2040.pdf",
    "uso": "metas nacionais"
  },
  {
    "n": 24,
    "autores": "Getirana",
    "ano": "2016",
    "titulo": "Extreme water deficit in Brazil detected from space (Journal of Hydrometeorology)",
    "link": "https://zendy.io/title/10.1175/jhm-d-15-0096.1",
    "uso": "crise do Sudeste vista por satélite"
  },
  {
    "n": 25,
    "autores": "Comissão Global de Economia da Água",
    "ano": "2023",
    "titulo": "Turning the Tide: a call to collective action",
    "link": "https://watercommission.org/wp-content/uploads/2023/03/Turning-the-Tide-Report-Web.pdf",
    "uso": "economia da água"
  },
  {
    "n": 26,
    "autores": "OMS/UNICEF (JMP)",
    "ano": "2023",
    "titulo": "Progress on household drinking water, sanitation and hygiene 2000-2022",
    "link": "https://washdata.org/report/jmp-2023-wash-households",
    "uso": "saneamento comparado"
  },
  {
    "n": 27,
    "autores": "Global Water Partnership",
    "ano": "2000",
    "titulo": "Integrated Water Resources Management (TAC Background Paper 4)",
    "link": "https://pacificwater.org/userfiles/file/TAC%204%20IWRM.pdf",
    "uso": "gestão integrada"
  },
  {
    "n": 28,
    "autores": "Oki e Kanae",
    "ano": "2006",
    "titulo": "Global hydrological cycles and world water resources (Science)",
    "link": "https://research.byrd.osu.edu/hydro/publications/OkiKanae_GlobalHydro_Science.pdf",
    "uso": "ciclo da água"
  },
  {
    "n": 29,
    "autores": "Hoekstra e Mekonnen",
    "ano": "2012",
    "titulo": "The water footprint of humanity (PNAS)",
    "link": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3295316",
    "uso": "pegada hídrica"
  },
  {
    "n": 30,
    "autores": "Cook e Bakker",
    "ano": "2012",
    "titulo": "Water security: debating an emerging paradigm (Global Environmental Change)",
    "link": "https://stuff.mit.edu/afs/athena/course/12/12.000/www/m2017/pdfs/watsec.pdf",
    "uso": "conceito de segurança hídrica"
  },
  {
    "n": 31,
    "autores": "Sivapalan, Savenije e Blöschl",
    "ano": "2012",
    "titulo": "Socio-hydrology: a new science of people and water (Hydrological Processes)",
    "link": "https://space4water.org/bibcite/reference/15",
    "uso": "pessoas e água no mesmo modelo"
  },
  {
    "n": 32,
    "autores": "Pahl-Wostl",
    "ano": "2009",
    "titulo": "A conceptual framework for analysing adaptive capacity and multi-level learning processes in resource governance regimes (Global Environmental Change)",
    "link": "https://typeset.io/papers/a-conceptual-framework-for-analysing-adaptive-capacity-and-2r9kreu50z",
    "uso": "governança adaptativa"
  },
  {
    "n": 33,
    "autores": "Biswas",
    "ano": "2004",
    "titulo": "Integrated water resources management: a reassessment (Water International)",
    "link": "https://scilit.net/publications/3553ea7d79a8c41d4419c65008d6e4fb",
    "uso": "crítica à gestão integrada"
  },
  {
    "n": 34,
    "autores": "Wada e outros",
    "ano": "2010",
    "titulo": "Global depletion of groundwater resources (Geophysical Research Letters)",
    "link": "https://sealevel.colorado.edu/bibcite/reference/165",
    "uso": "esgotamento de aquíferos"
  },
  {
    "n": 35,
    "autores": "Famiglietti",
    "ano": "2014",
    "titulo": "The global groundwater crisis (Nature Climate Change)",
    "link": "https://ideas.repec.org/a/nat/natcli/v4y2014i11d10.1038_nclimate2425.html",
    "uso": "crise da água subterrânea"
  },
  {
    "n": 36,
    "autores": "World Weather Attribution",
    "ano": "2015",
    "titulo": "Main drivers of drought in south east Brazil, 2014-15",
    "link": "https://www.worldweatherattribution.org/southeast-brazil-drought-2014-2015/",
    "uso": "causas da seca do Sudeste"
  },
  {
    "n": 37,
    "autores": "Rotta e outros",
    "ano": "2020",
    "titulo": "The 2019 Brumadinho tailings dam collapse (Int. J. Applied Earth Observation)",
    "link": "https://doaj.org/article/0dffd69f08f2481ca5fcece77fc2b887",
    "uso": "segurança de barragens"
  },
  {
    "n": 38,
    "autores": "UN-Water",
    "ano": "2023",
    "titulo": "Blueprint for Acceleration: SDG 6 Synthesis Report",
    "link": "https://www.unwater.org/sites/default/files/2023-08/UN-Water_SDG6_SynthesisReport_2023.pdf",
    "uso": "metas do ODS 6"
  },
  {
    "n": 39,
    "autores": "OCDE",
    "ano": "2015",
    "titulo": "Water Resources Governance in Brazil",
    "link": "https://www.oecd.org/governance/water-resources-governance-in-brazil_9789264238121-en",
    "uso": "governança no Brasil"
  },
  {
    "n": 40,
    "autores": "OCDE",
    "ano": "2017",
    "titulo": "Water Charges in Brazil: The Ways Forward",
    "link": "https://www.oecd-ilibrary.org/content/publication/9789264285712-en",
    "uso": "cobrança pelo uso"
  },
  {
    "n": 41,
    "autores": "OCDE",
    "ano": "2022",
    "titulo": "Fostering Water Resilience in Brazil",
    "link": "https://www.oecd.org/environment/fostering-water-resilience-in-brazil_85a99a7c-en",
    "uso": "resiliência hídrica no Brasil"
  },
  {
    "n": 42,
    "autores": "Abers e Keck",
    "ano": "2013",
    "titulo": "Practical Authority: Agency and Institutional Change in Brazilian Water Politics (Oxford University Press)",
    "link": "https://academic.oup.com/book/26642",
    "uso": "comitês de bacia no Brasil"
  },
  {
    "n": 43,
    "autores": "Hall e Borgomeo",
    "ano": "2013",
    "titulo": "Risk-based principles for defining and managing water security (Phil. Trans. R. Soc. A)",
    "link": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3785948/",
    "uso": "risco e segurança hídrica"
  },
  {
    "n": 44,
    "autores": "Brown e Lall",
    "ano": "2006",
    "titulo": "Water and economic development: the role of variability (Natural Resources Forum)",
    "link": "https://econpapers.repec.org/RePEc:wly:natres:v:30:y:2006:i:4:p:306-317",
    "uso": "variabilidade e economia"
  },
  {
    "n": 45,
    "autores": "Nobre e outros",
    "ano": "2016",
    "titulo": "Some characteristics and impacts of the drought and water crisis in Southeastern Brazil during 2014 and 2015 (J. Water Resource and Protection)",
    "link": "https://typeset.io/pdf/some-characteristics-and-impacts-of-the-drought-and-water-2f00gfpgwk.pdf",
    "uso": "crise hídrica de 2014-2015"
  },
  {
    "n": 46,
    "autores": "Kummu e outros",
    "ano": "2016",
    "titulo": "The world's road to water scarcity (Scientific Reports)",
    "link": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5146931/",
    "uso": "escassez no século 20"
  },
  {
    "n": 47,
    "autores": "De Stefano e outros",
    "ano": "2017",
    "titulo": "Assessment of transboundary river basins for potential hydro-political tensions (Global Environmental Change)",
    "link": "https://produccioncientifica.ucm.es/documentos/5df8a9ab2999525886b71199?lang=en",
    "uso": "tensões em rios entre países"
  },
  {
    "n": 48,
    "autores": "Garrick e Hall",
    "ano": "2014",
    "titulo": "Water security and society: risks, metrics, and pathways (Annual Review of Environment and Resources)",
    "link": "https://opsis.eci.ox.ac.uk/publication/garrick-1",
    "uso": "métricas de segurança hídrica"
  },
  {
    "n": 49,
    "autores": "Revista USP",
    "ano": "2016",
    "titulo": "A seca e a crise hídrica de 2014-2015 em São Paulo",
    "link": "https://revistas.usp.br/revusp/en/article/view/110101",
    "uso": "crise de São Paulo, visão brasileira"
  },
  {
    "n": 50,
    "autores": "Revista Ambiente & Água",
    "ano": "s.d.",
    "titulo": "Potentialities of water charge in the management of Brazilian water resources",
    "link": "https://www.scielo.br/j/ambiagua/a/736XSpd3SYJqhDKTJqY5bQt/abstract/?lang=en",
    "uso": "cobrança no Brasil"
  }
]

export const TESES_AGUAS: TeseAguas[] = [
  {
    "n": 1,
    "autor": "Allam, Mariam M.",
    "ano": "2017",
    "universidade": "MIT (EUA)",
    "titulo": "Optimal land and water allocation to agriculture and hydropower in the Upper Blue Nile basin",
    "link": "https://dspace.mit.edu/bitstreams/e0e594fb-8872-4410-9c24-313b7182b4b7/download",
    "viraFerramenta": "divisão de água entre irrigação e energia numa bacia entre países"
  },
  {
    "n": 2,
    "autor": "Sahu, Reetik Kumar",
    "ano": "2018",
    "universidade": "MIT (EUA)",
    "titulo": "Multi-agent real-time decision making in water resources systems",
    "link": "https://dspace.mit.edu/bitstreams/32d431a1-795d-437a-bcec-8ad6d4df8a66/download",
    "viraFerramenta": "operação de reservatórios com vários usuários"
  },
  {
    "n": 3,
    "autor": "Doeffinger, T.",
    "ano": "2020",
    "universidade": "Universidade de Oxford (Reino Unido)",
    "titulo": "Evaluating water security across scales: diagnostics and trends",
    "link": "https://ora.ox.ac.uk/objects/uuid:5bd7ac4e-859c-415f-b403-5a784a6f33f9/files/dth83kz572",
    "viraFerramenta": "índice de segurança hídrica por escala"
  },
  {
    "n": 4,
    "autor": "Borgomeo, E.",
    "ano": "2015",
    "universidade": "Universidade de Oxford (Reino Unido)",
    "titulo": "Climate change and water resources: risk-based approaches for decision-making",
    "link": "https://ora.ox.ac.uk/objects/uuid:a57a491f-96fb-4579-bd8a-ba7e86722dea/files/m4e8a38d633f54a7d55281e127b68efa5",
    "viraFerramenta": "decisão por risco de falta de água"
  },
  {
    "n": 5,
    "autor": "Giuliani, Matteo",
    "ano": "2013",
    "universidade": "Politecnico di Milano (Itália)",
    "titulo": "Agent-based water resources management in complex decision-making contexts",
    "link": "https://www.politesi.polimi.it/retrieve/a81cb05a-c0b4-616b-e053-1605fe0a889a/TesiPhD.pdf",
    "viraFerramenta": "simular usuários de uma bacia"
  },
  {
    "n": 6,
    "autor": "Hayat, S.",
    "ano": "2020",
    "universidade": "Universidade de Amsterdã (Holanda)",
    "titulo": "Inclusive development and multilevel transboundary water governance: the Kabul River",
    "link": "https://pure.uva.nl/ws/files/45148468/Thesis_complete_.pdf",
    "viraFerramenta": "governança de rio entre países"
  },
  {
    "n": 7,
    "autor": "Suykens, Cathy",
    "ano": "2017",
    "universidade": "KU Leuven e Universidade de Utrecht (Bélgica/Holanda)",
    "titulo": "The Law of the River: the institutional challenge for transboundary river basin management",
    "link": "https://dspace.library.uu.nl/bitstream/handle/1874/355659/PhD_full_text_0410_.pdf?sequence=1",
    "viraFerramenta": "direito de rios entre países"
  },
  {
    "n": 8,
    "autor": "Deliberador, Giuliano Savioli",
    "ano": "2016",
    "universidade": "USP, Faculdade de Direito (Brasil)",
    "titulo": "Fundamentos jurídicos da cooperação federativa em matéria de recursos hídricos",
    "link": "https://www.teses.usp.br/teses/disponiveis/2/2134/tde-19022021-184643/publico/3736667_Tese_Original.pdf",
    "viraFerramenta": "quem manda em cada rio: União e estados"
  },
  {
    "n": 9,
    "autor": "Campos, Jander Duarte",
    "ano": "2005",
    "universidade": "COPPE/UFRJ (Brasil)",
    "titulo": "Desafios do gerenciamento dos recursos hídricos nas transferências naturais e artificiais envolvendo mudança de domínio",
    "link": "https://www.ana.gov.br/arquivos/institucional/sag/CobrancaUso/BaciaPBS/Textos/Tese_Jander_doutorado-Desafios_do_gerenciamento.pdf",
    "viraFerramenta": "transposições e outorga entre domínios"
  },
  {
    "n": 10,
    "autor": "Maia, Paulo Cesar Chagas",
    "ano": "2023",
    "universidade": "UFPA (Brasil)",
    "titulo": "Governança da água em hidroterritórios conflituosos: outorga coletiva",
    "link": "https://repositorio.ufpa.br/bitstream/2011/16068/1/Tese_GovernancasAguaHidroterritorios.pdf",
    "viraFerramenta": "outorga coletiva em conflito por água"
  }
]

export const LACUNAS_BIBLIOTECA: string[] = [
  "Nenhuma tese aberta de universidade da Ivy League confirmada (Columbia bloqueou a leitura); MIT e Oxford entram no lugar.",
  "Nenhuma tese aberta da Ásia confirmada: a de Kyoto (Hendy Setiawan, 2017) não tem PDF livre.",
  "Escobar 2015 (Science) saiu: sem página aberta; entrou World Weather Attribution."
]
