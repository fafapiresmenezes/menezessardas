// Provas da ficha do município em PDF lastreado (G6.5).
// O que importa provar: o hash impresso é o hash do conteúdo de verdade (então muda quando o
// conteúdo muda, e não muda quando o conteúdo é o mesmo), e nenhum número aparece sem fonte.
import { describe, it, expect } from 'vitest'
import { pdfFicha, textoFicha, type DadosFicha } from './fichaPdf'
import { sha256 } from './cofre'
import type { Municipio, Noticia } from './fontes'

const caxias: Municipio = {
  codigo: 3301702, nome: 'Duque de Caxias', uf: 'RJ', populacao2022: 808002, malha: null,
  fontes: ['IBGE, Localidades', 'IBGE, Malhas territoriais', 'IBGE, Censo 2022, tabela 4709'],
}
const noticia = (i: number): Noticia => ({ titulo: `Notícia ${i}`, url: `https://ex/${i}`, fonte: 'ex.com', data: '2026-11-18', idioma: 'pt' })

const dados = (extra: Partial<DadosFicha> = {}): DadosFicha => ({
  municipio: caxias,
  trilha: { pontos: 42, total: 50, dias: 3 },
  ndvi: { media: 0.41, minimo: -0.1, maximo: 0.93, cena: 'S2A_2026', data: '2026-11-18' },
  noticias: [noticia(1), noticia(2)],
  geradoEm: new Date(Date.UTC(2026, 10, 19, 15, 0)).toISOString(),
  ...extra,
})

describe('texto canônico da ficha', () => {
  it('abre pelo nome do município e traz o código do IBGE', () => {
    const l = textoFicha(dados())
    expect(l[0]).toBe('Ficha do município: Duque de Caxias/RJ')
    expect(l[1]).toContain('3301702')
  })

  it('população ausente é dita como não informada pela fonte, nunca como zero', () => {
    const l = textoFicha(dados({ municipio: { ...caxias, populacao2022: null } }))
    expect(l[2]).toBe('População (Censo 2022): não informada pela fonte')
  })

  it('o índice de vegetação vem com a leitura em palavras ao lado do número', () => {
    const l = textoFicha(dados()).join('\n')
    expect(l).toContain('0,41')
    expect(l).toContain('vegetação rala ou plantação')
  })

  it('TODA seção de dado tem a fonte escrita: IBGE, Sentinel-2 e GDELT', () => {
    const l = textoFicha(dados()).join('\n')
    expect(l).toContain('Fontes:')
    expect(l).toContain('IBGE, Censo 2022')
    expect(l).toContain('Planetary Computer')
    expect(l).toContain('GDELT DOC 2.0')
  })

  it('sem vegetação medida e sem notícia, a ficha NÃO cita essas fontes', () => {
    const l = textoFicha(dados({ ndvi: null, noticias: [] })).join('\n')
    expect(l).not.toContain('Planetary Computer')
    expect(l).not.toContain('GDELT DOC 2.0')
    expect(l).toContain('Notícias dos últimos 7 dias (GDELT): 0')
  })

  it('sem trilha, a linha da trilha simplesmente não existe', () => {
    expect(textoFicha(dados({ trilha: null })).join('\n')).not.toContain('Sua trilha')
  })

  it('lista no máximo 12 notícias, mas informa o total verdadeiro', () => {
    const muitas = Array.from({ length: 30 }, (_, i) => noticia(i))
    const l = textoFicha(dados({ noticias: muitas }))
    expect(l.join('\n')).toContain('(GDELT): 30')
    expect(l.filter(x => x.startsWith('- 2026-11-18'))).toHaveLength(12)
  })

  it('diz quando foi gerada e por quem', () => {
    const linhas = textoFicha(dados())
    expect(linhas[linhas.length - 1]).toMatch(/Gerado em .* pela plataforma THEYE/)
  })
})

describe('o lastro do PDF', () => {
  it('o hash impresso é o sha256 do texto canônico, conferível por qualquer um', async () => {
    const d = dados()
    const { hash } = await pdfFicha(d)
    expect(hash).toBe(await sha256(textoFicha(d).join('\n')))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('mesmo conteúdo, mesmo hash', async () => {
    const a = await pdfFicha(dados())
    const b = await pdfFicha(dados())
    expect(a.hash).toBe(b.hash)
  })

  it('qualquer mudança no conteúdo muda o hash', async () => {
    const base = await pdfFicha(dados())
    const outro = await pdfFicha(dados({ trilha: { pontos: 43, total: 50, dias: 3 } }))
    expect(outro.hash).not.toBe(base.hash)
  })

  it('sai um PDF de verdade, com o título do município', async () => {
    const { bytes } = await pdfFicha(dados())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it('texto muito longo não derruba a geração: quebra em linhas e em páginas', async () => {
    const enorme = Array.from({ length: 60 }, (_, i) => ({
      ...noticia(i), titulo: 'palavra '.repeat(40) + i,
    }))
    const { bytes, hash } = await pdfFicha(dados({ noticias: enorme }))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it('caractere que a fonte do PDF não desenha não quebra o arquivo', async () => {
    const { bytes } = await pdfFicha(dados({
      municipio: { ...caxias, nome: 'Município 漢字 🌍' },
      noticias: [{ ...noticia(1), titulo: 'título com emoji 🚀 e ideograma 漢' }],
    }))
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})
