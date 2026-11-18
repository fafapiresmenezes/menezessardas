/**
 * Biblioteca interna da casa de fundos — repositórios de teses e cursos abertos (fontes reais, ligações oficiais).
 * Regra da casa: catalogar e citar, nunca copiar texto protegido; a licença de cada fonte manda.
 * A colheita automática (OAI-PMH/API) é da versão real; aqui está o catálogo e as ligações.
 */
export interface RepositorioTeses { id: string; nome: string; url: string; oQueDa: string; protocolo: string; licenca: string }
export const REPOSITORIOS_TESES: RepositorioTeses[] = [
  { id: 'dspace-mit', nome: 'DSpace@MIT (Massachusetts Institute of Technology)', url: 'https://dspace.mit.edu', oQueDa: 'Teses de doutoramento e mestrado do MIT, incluindo engenharia e gestão.', protocolo: 'OAI-PMH', licenca: 'varia por tese; muitas Creative Commons' },
  { id: 'caltech', nome: 'CaltechTHESIS (California Institute of Technology)', url: 'https://thesis.library.caltech.edu', oQueDa: 'Teses do Caltech.', protocolo: 'OAI-PMH', licenca: 'varia por tese' },
  { id: 'tudelft', nome: 'TU Delft Repository', url: 'https://repository.tudelft.nl', oQueDa: 'Teses abertas da TU Delft: obras, água, geotecnia, portos.', protocolo: 'OAI-PMH', licenca: 'varia; muitas abertas' },
  { id: 'eth', nome: 'ETH Research Collection (ETH Zürich)', url: 'https://www.research-collection.ethz.ch', oQueDa: 'Teses e artigos da ETH Zürich.', protocolo: 'OAI-PMH', licenca: 'varia' },
  { id: 'apollo', nome: 'Apollo (University of Cambridge)', url: 'https://www.repository.cam.ac.uk', oQueDa: 'Repositório institucional de Cambridge.', protocolo: 'OAI-PMH', licenca: 'varia' },
  { id: 'escholarship', nome: 'eScholarship (University of California)', url: 'https://escholarship.org', oQueDa: 'Teses e artigos da Universidade da Califórnia (Berkeley incluída).', protocolo: 'OAI-PMH', licenca: 'varia' },
  { id: 'bdtd', nome: 'BDTD/IBICT (Brasil)', url: 'https://bdtd.ibict.br', oQueDa: 'Teses e dissertações brasileiras: gestão de obras, medição, PPPs, em português.', protocolo: 'OAI-PMH', licenca: 'varia por instituição' },
  { id: 'oatd', nome: 'OATD — Open Access Theses and Dissertations', url: 'https://oatd.org', oQueDa: 'Busca federada de teses abertas do mundo inteiro.', protocolo: 'busca e colheita', licenca: 'varia por registo' },
  { id: 'ndltd', nome: 'NDLTD', url: 'https://ndltd.org', oQueDa: 'Rede mundial de bibliotecas digitais de teses.', protocolo: 'OAI-PMH', licenca: 'varia' },
  { id: 'openalex', nome: 'OpenAlex', url: 'https://openalex.org', oQueDa: 'Metadados, citações e ligações entre trabalhos académicos, por API aberta.', protocolo: 'API', licenca: 'aberta (CC0)' },
  { id: 'wb-okr', nome: 'World Bank Open Knowledge Repository', url: 'https://openknowledge.worldbank.org', oQueDa: 'Relatórios de infra-estruturas, PPPs e governação, com atenção a África.', protocolo: 'sítio e API', licenca: 'CC BY' },
]

export interface CursoAberto { id: string; nome: string; escola: string; url: string; licenca: string }
export const CURSOS_ABERTOS: CursoAberto[] = [
  { id: 'ocw-1040', nome: '1.040 Project Management', escola: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', licenca: 'CC BY-NC-SA' },
  { id: 'ocw-15401', nome: '15.401 Finance Theory I', escola: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', licenca: 'CC BY-NC-SA' },
  { id: 'yale-econ252', nome: 'ECON 252 Financial Markets', escola: 'Open Yale Courses', url: 'https://oyc.yale.edu', licenca: 'CC BY-NC-SA' },
]
