// Passo 421: ações da semana extraídas do diagnóstico do Consultor (lista numerada ou tabela).
import { describe, it, expect } from 'vitest'
import { extrairAcoes } from './acoesConsultor'

describe('extrairAcoes', () => {
  it('lê lista numerada após o título "Ações da semana", limpa negrito e ponto final', () => {
    const md = `# Diagnóstico\n\nTexto.\n\n## Ações da semana\n1. **Cobrar o reajuste.** Contrato X.\n2) Renovar a certidão\n\n## Outra seção\n3. não entra`
    expect(extrairAcoes(md)).toEqual(['Cobrar o reajuste. Contrato X', 'Renovar a certidão'])
  })
  it('lê tabela com número na primeira coluna', () => {
    const md = `## Ações da semana\n| # | Ação | Dono |\n|---|---|---|\n| 1 | Revisar o SLA da limpeza | Fátima |\n| 2 | Enviar notificação | Letícia |`
    expect(extrairAcoes(md)).toEqual(['Revisar o SLA da limpeza', 'Enviar notificação'])
  })
  it('sem título usa o texto inteiro; limita a 8 ações; vazio devolve []', () => {
    const md = Array.from({ length: 12 }, (_, i) => `${i + 1}. Ação ${i + 1}`).join('\n')
    expect(extrairAcoes(md)).toHaveLength(8)
    expect(extrairAcoes('')).toEqual([])
    expect(extrairAcoes('Só prosa, sem lista.')).toEqual([])
  })
})

import { secoesDoDiagnostico, detalhesDasAcoes } from './acoesConsultor'

describe('diagnóstico em blocos', () => {
  const lista = `**Resposta direta**\n\nContenha o risco de prazo.\n\n**Diagnóstico**\n\nForças:\n- Carteira quantificada.\n\n**As 5 ações da semana**\n\n1. **Triagem das intimações.**\n   - Dono: advogado pleno.\n   - Indicador: 100% até sexta.\n   - Risco: perda de prazo.\n\n2. **Reclassificar tarefas.**\n   - Dono: sócio.\n\n**Próximos passos**\n\n- Segunda: iniciar.\n\nFontes consultadas: CPC, arts. 231 e 272.`
  it('separa as seções pelo título em negrito e tira a linha de fontes', () => {
    const { secoes, fontes } = secoesDoDiagnostico(lista)
    expect(secoes.map(s => s.titulo)).toEqual(['Resposta direta', 'Diagnóstico', 'As 5 ações da semana', 'Próximos passos'])
    expect(secoes[0].corpo).toBe('Contenha o risco de prazo.')
    expect(fontes).toBe('CPC, arts. 231 e 272.')
  })
  it('lê os detalhes de cada ação na lista numerada, com rótulos em linguagem simples', () => {
    expect(detalhesDasAcoes(lista)).toEqual([
      [{ rotulo: 'Quem faz', texto: 'advogado pleno.' }, { rotulo: 'Como saber que deu certo', texto: '100% até sexta.' }, { rotulo: 'Cuidado', texto: 'perda de prazo.' }],
      [{ rotulo: 'Quem faz', texto: 'sócio.' }],
    ])
    expect(detalhesDasAcoes(lista)).toHaveLength(extrairAcoes(lista).length)
  })
  it('lê os detalhes de cada ação na tabela, pelas colunas do cabeçalho', () => {
    const tabela = `**Cinco ações da semana**\n\n| # | Ação | Dono | Indicador | Risco |\n|---|------|------|-----------|-------|\n| 1 | Triar as intimações | Coordenador | % classificadas | Prazo vencido |\n| 2 | Renovar o contrato | Sócio | Contrato assinado | Perda do cliente |\n\n**Próximos passos**\n\n- Segunda.`
    expect(detalhesDasAcoes(tabela)[1]).toEqual([{ rotulo: 'Quem faz', texto: 'Sócio' }, { rotulo: 'Como saber que deu certo', texto: 'Contrato assinado' }, { rotulo: 'Cuidado', texto: 'Perda do cliente' }])
    expect(extrairAcoes(tabela)).toEqual(['Triar as intimações', 'Renovar o contrato'])
  })
})
