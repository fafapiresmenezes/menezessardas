import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { CAMINHOS_PROCESSOS_ANTIGOS } from './AbasProcessosAntigos'
import { nomeDaTela } from './menuTelas'
import { ROTAS_TELAS } from '@/data/rotas'

// Pedido do M (12/11/2026): a aba de processos antigos mais organizada.
// O que este teste impede de voltar: uma quarta porta escondida para o mesmo trabalho, uma das três
// deixando de mostrar a faixa, ou a faixa chamando uma tela por um nome que a tela não usa.

const TELAS = {
  '/processos/importar': 'src/pages/ImportarProcessosPage.tsx',
  '/processos-antigos': 'src/pages/AssumirProcessosPage.tsx',
  '/migracao': 'src/pages/MigracaoPage.tsx',
} as const

describe('trazer os processos que o escritório já tinha', () => {
  it('a faixa cobre as três maneiras, e só essas três', () => {
    expect(CAMINHOS_PROCESSOS_ANTIGOS.map(c => c.href)).toEqual(Object.keys(TELAS))
  })

  it('cada uma das três telas mostra a faixa, marcando o endereço dela', () => {
    for (const [rota, arquivo] of Object.entries(TELAS)) {
      const fonte = readFileSync(arquivo, 'utf8')
      expect(fonte, `${arquivo} não mostra a faixa`).toContain(`<AbasProcessosAntigos aqui="${rota}" />`)
      expect(fonte, `${arquivo} não importa a faixa`).toContain("from '@/components/AbasProcessosAntigos'")
    }
  })

  it('a faixa chama cada tela pelo nome que a própria tela e a lista de telas usam', () => {
    for (const c of CAMINHOS_PROCESSOS_ANTIGOS) {
      const daLista = ROTAS_TELAS.find(r => r.rota === c.href)
      expect(daLista, `${c.href} não está na lista de telas`).toBeTruthy()
      expect(c.nome, c.href).toBe(daLista!.nome)
      // e, quando a tela está no menu, o menu dá o mesmo nome
      const doMenu = nomeDaTela(c.href)
      if (doMenu) expect(c.nome, `${c.href} no menu`).toBe(doMenu)
      expect(readFileSync(TELAS[c.href], 'utf8')).toContain(`<Layout title="${c.nome}">`)
    }
  })

  it('cada maneira diz, em uma frase, quando usar aquela e não as outras', () => {
    for (const c of CAMINHOS_PROCESSOS_ANTIGOS) {
      expect(c.quando.length, c.href).toBeGreaterThan(30)
      expect(c.quando.endsWith('.'), c.href).toBe(true)
    }
    expect(new Set(CAMINHOS_PROCESSOS_ANTIGOS.map(c => c.quando)).size).toBe(3)
  })
})
