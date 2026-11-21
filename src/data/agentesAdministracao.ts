/**
 * Fase F3 do plano v2 (passos F3-01 a F3-20): os 20 agentes da área administrativa.
 *
 * Cada agente é uma ficha JSON versionada em src/data/agentes/, uma por passo da corrente.
 * A ficha diz o que o agente sabe, que fontes ele consulta, três perguntas-tipo que ele
 * resolve e — o campo que mais importa — o que ele NÃO faz, para ele não extrapolar.
 *
 * A ficha do Garantidor (garantidor.json, passo FG-01) fica de fora desta lista: ela é do
 * maquinista do plano, não é um consultor que se abre em cartão. Por isso a lista é explícita
 * em vez de varrer a pasta: assim uma ficha nova só entra aqui de propósito, por PR.
 */
import juridicoSenior from './agentes/consultor-juridico-senior.json'
import contratosPublicos from './agentes/consultora-de-contratos-publicos.json'
import aguas from './agentes/consultor-de-aguas-e-saneamento.json'
import engenharia from './agentes/consultor-de-engenharia.json'
import agronegocio from './agentes/consultor-de-agronegocio.json'
import saudePublica from './agentes/consultor-de-saude-publica.json'
import geolocalizacao from './agentes/consultor-de-geolocalizacao.json'
import ciberseguranca from './agentes/consultor-de-ciberseguranca.json'
import blockchain from './agentes/consultor-de-blockchain.json'
import ia from './agentes/consultor-de-ia.json'
import energia from './agentes/consultora-de-energia.json'
import carbono from './agentes/consultora-de-meio-ambiente-carbono.json'
import pmo from './agentes/consultora-de-pmo.json'
import marketing from './agentes/consultor-de-marketing-e-marca.json'
import uxLeigos from './agentes/consultora-de-ux-para-leigos-ceo.json'
import devSenior from './agentes/consultor-tecnico-dev-senior.json'
import revisorAdversario from './agentes/revisor-adversario.json'
import bibliotecario from './agentes/bibliotecario-do-repositorio.json'
import cobertura from './agentes/avaliador-de-cobertura.json'
import maestro from './agentes/maestro.json'

export type AgenteAdministracao = {
  id: string
  nome: string
  area: string
  descricao: string
  skills: string[]
  plugins_mcp: string[]
  ferramentas_gratis: string[]
  bancos_de_dados: string[]
  fontes_de_leitura: string[]
  perguntas_tipo: string[]
  o_que_nao_faz: string[]
  prompt_base: string
  passo_da_corrente: string
  elo: string
}

export const AGENTES_ADMINISTRACAO: AgenteAdministracao[] = [
  juridicoSenior, contratosPublicos, aguas, engenharia, agronegocio,
  saudePublica, geolocalizacao, ciberseguranca, blockchain, ia,
  energia, carbono, pmo, marketing, uxLeigos,
  devSenior, revisorAdversario, bibliotecario, cobertura, maestro,
]

/** As áreas presentes, em ordem alfabética, para o filtro da tela. */
export const AREAS_ADMINISTRACAO: string[] = [
  ...new Set(AGENTES_ADMINISTRACAO.map(a => a.area)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'))
