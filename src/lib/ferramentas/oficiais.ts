// Theye Suporte Jurídico — atalhos para os sites oficiais que o advogado usa todo dia (endereços conferidos em 10/11/2026).
export type SiteOficial = { nome: string; url: string; para: string }
export const SITES_OFICIAIS: Record<string, { titulo: string; sites: SiteOficial[] }> = {
  certidoes: { titulo: 'Certidões', sites: [
    { nome: 'Certidão de débitos federais (Receita/PGFN)', url: 'https://servicos.receitafederal.gov.br/servico/certidoes/', para: 'Regularidade fiscal federal de pessoa física ou jurídica' },
    { nome: 'CNDT — débitos trabalhistas (TST)', url: 'https://cndt-certidao.tst.jus.br/inicio.faces', para: 'Licitações, due diligence e compra de imóvel' },
    { nome: 'CRF — regularidade do FGTS (Caixa)', url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf', para: 'Regularidade do empregador com o FGTS' },
    { nome: 'Quitação eleitoral e outras certidões (TSE)', url: 'https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral', para: 'Certidões eleitorais e situação do título' },
  ] },
  empresas: { titulo: 'Empresas, imóveis e advogados', sites: [
    { nome: 'Comprovante de CNPJ (Receita)', url: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', para: 'Cartão CNPJ, situação cadastral e CNAE' },
    { nome: 'RI Digital — registro de imóveis', url: 'https://www.ridigital.org.br/', para: 'Matrícula, certidões e pesquisa de bens em cartórios de imóveis' },
    { nome: 'Cadastro Nacional dos Advogados (OAB)', url: 'https://cna.oab.org.br/', para: 'Conferir a inscrição do advogado da outra parte ou do correspondente' },
  ] },
  processo: { titulo: 'Processo eletrônico e intimações', sites: [
    { nome: 'DJEN — Diário de Justiça Eletrônico Nacional', url: 'https://comunica.pje.jus.br/', para: 'Comunicações processuais por nome, OAB ou processo' },
    { nome: 'Domicílio Judicial Eletrônico', url: 'https://domicilio-eletronico.pdpj.jus.br/', para: 'Citações e intimações de empresas e órgãos' },
    { nome: 'Validador de assinaturas digitais (ITI)', url: 'https://validar.iti.gov.br/', para: 'Conferir assinatura ICP-Brasil ou gov.br num PDF' },
    { nome: 'Meu INSS', url: 'https://meu.inss.gov.br/', para: 'CNIS, requerimentos e andamento de benefícios' },
  ] },
  pesquisa: { titulo: 'Legislação e jurisprudência', sites: [
    { nome: 'Legislação federal (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/', para: 'Texto compilado das leis e códigos' },
    { nome: 'LexML', url: 'https://www.lexml.gov.br/', para: 'Busca unificada de leis, projetos e jurisprudência' },
    { nome: 'Jurisprudência do STF', url: 'https://jurisprudencia.stf.jus.br/', para: 'Acórdãos, súmulas e temas de repercussão geral' },
    { nome: 'Jurisprudência do TST', url: 'https://jurisprudencia.tst.jus.br/', para: 'Acórdãos e súmulas trabalhistas' },
    { nome: 'Projetos de lei na Câmara', url: 'https://www.camara.leg.br/busca-portal/proposicoes/pesquisa-simplificada', para: 'Acompanhar PLs do tema do cliente ou do Instituto' },
    { nome: 'Matérias no Senado', url: 'https://www25.senado.leg.br/web/atividade/materias', para: 'Projetos e tramitação no Senado' },
  ] },
  calculos: { titulo: 'Cálculos oficiais', sites: [
    { nome: 'Calculadora do Cidadão (Banco Central)', url: 'https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores', para: 'Correção monetária por IPCA, INPC, IGP-M, Selic e outros índices' },
  ] },
}
