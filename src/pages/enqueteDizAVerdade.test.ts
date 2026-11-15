// A plataforma esta vendida, e a regra que M deu e' clara: filtro no navegador nao e' privacidade,
// e rotulo que promete privacidade que o banco nao da e' pior do que rotulo nenhum.
//
// A caixa "Publica no site do Instituto" dizia, na dica: "Marcado, qualquer pessoa do escritorio ve
// o resultado. Desmarcado, so a administracao." Medido no banco em 13/11/2026, isso era falso nas
// duas pontas:
//   - enquetes_select  (RLS): escritorio_id = escritorio_atual() AND perfil_atual() is not null
//   - enquete_resultado (SECURITY DEFINER): responde a qualquer pessoa do mesmo escritorio
// Ou seja, a enquete e o total NUNCA foram so' da administracao: quem e' do escritorio e votou ve
// o total, marcada ou nao. O que a marca faz de verdade e' outra coisa: instituto_enquetes() devolve
// so' as enquetes com publica = true, sem filtro de escritorio e com contagem a partir de 10 votos,
// isto e', manda o agregado PARA FORA do escritorio, para o site do Instituto.
//
// Este teste tranca as duas pontas do texto: a promessa falsa nao volta, e a dica continua dizendo
// que marcar manda o total para fora. Ele le o arquivo da tela, e nao o banco: nenhum teste daqui
// alcanca o Postgres, e por isso a medicao esta escrita acima, com o nome das politicas e funcoes,
// em vez de ser afirmada sem prova.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const tela = () => readFileSync('src/pages/EnquetesPage.tsx', 'utf8')

describe('a enquete nao promete privacidade que o banco nao da', () => {
  it('nenhuma dica diz que o resultado e so da administracao', () => {
    expect(tela()).not.toMatch(/Desmarcado,\s*s[oó]\s*a\s*administra/i)
  })

  it('a dica diz que marcar manda o total para fora do escritorio, sem nome e a partir de 10 votos', () => {
    const t = tela()
    expect(t).toMatch(/sai do escrit[oó]rio/i)
    expect(t).toMatch(/sem nome de ningu[eé]m/i)
    expect(t).toMatch(/10 votos/)
  })

  it('a dica avisa que quem votou ve o total de qualquer jeito', () => {
    expect(tela()).toMatch(/quem j[aá] votou v[eê] o total/i)
  })
})
