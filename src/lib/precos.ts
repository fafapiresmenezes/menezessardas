// Preço da plataforma para escritórios parceiros (definido por M em 10/11/2026).
// Vale para a tela de parceiros, para a fatura e para o contrato de adesão (versão 2.0).
// O banco aplica os mesmos valores em gerar_faturas_escritorios (migração 110): mude nos dois lugares.
export const PRECO_USUARIO_MES = 200
export const PRECO_INSTALACAO = 15000
export const PARCELAS_INSTALACAO = 3
export const PARCELA_INSTALACAO = PRECO_INSTALACAO / PARCELAS_INSTALACAO

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
/** "instalação de R$ 15.000,00 em 3 vezes sem juros e R$ 200,00 por usuário ao mês" */
export const resumoPreco = () => `instalação de ${brl(PRECO_INSTALACAO)} em ${PARCELAS_INSTALACAO} vezes sem juros e ${brl(PRECO_USUARIO_MES)} por usuário ao mês`
