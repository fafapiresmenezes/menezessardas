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
