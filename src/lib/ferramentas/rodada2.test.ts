import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { rescisao, avos13, avosFerias, somarPeriodos, aposentadoria } from './trabalho'
import { linkWhatsapp, verificarPublicidade, indiceDocumentos } from './comunicacao'
import { juntarPdfs, extrairPaginas, interpretarPaginas, contarPaginas, tamanhoLegivel } from './pdf'
import { SITES_OFICIAIS } from './oficiais'
import { FERRAMENTAS, rodar, valoresPadrao } from './catalogo'

async function pdfCom(n: number, largura = 500) { const d = await PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage([largura + i, 700]); return d.save() }

describe('rescisão trabalhista', () => {
  it('dispensa sem justa causa com aviso indenizado (exemplo conferido à mão)', () => {
    const r = rescisao(3000, '2024-03-01', '2026-11-09', 'sem-justa-causa', true, 0, 8000)
    const v = Object.fromEntries(r.linhas.map(l => [l.verba.split(' (')[0], l.valor]))
    expect(v['Saldo de salário']).toBe(900)
    expect(v['Aviso prévio indenizado']).toBe(3600)
    expect(v['13º salário proporcional']).toBe(3000)
    expect(v['Férias proporcionais']).toBe(3333.33)
    expect(v['Multa do FGTS']).toBe(3200)
    expect(r.total).toBe(14033.33)
    expect(r.projecao).toBe('2026-12-15')
  })
  it('justa causa não tem 13º nem férias proporcionais; acordo tem metade do aviso e 20% do FGTS', () => {
    const j = rescisao(3000, '2024-03-01', '2026-11-09', 'justa-causa', true, 1, 8000)
    expect(j.linhas.map(l => l.verba).join()).not.toMatch(/13º|proporcionais|Multa|Aviso/)
    expect(j.linhas.find(l => /vencidas/.test(l.verba))?.valor).toBe(4000)
    const a = rescisao(3000, '2024-03-01', '2026-11-09', 'acordo', true, 0, 8000)
    expect(a.linhas.find(l => /Aviso/.test(l.verba))?.valor).toBe(1800)
    expect(a.linhas.find(l => /FGTS/.test(l.verba))?.valor).toBe(1600)
    expect(() => rescisao(3000, '2026-01-01', '2025-01-01', 'pedido', false, 0, 0)).toThrow()
  })
  it('avos de 13º e de férias pela regra dos 15 dias', () => {
    expect(avos13('2026-01-01', '2026-03-14')).toBe(2)
    expect(avos13('2026-01-01', '2026-03-15')).toBe(3)
    expect(avos13('2026-06-20', '2026-12-31')).toBe(6)
    expect(avosFerias('2025-05-10', '2026-02-09')).toBe(9)
    expect(avosFerias('2025-05-10', '2026-02-23')).toBe(9)
    expect(avosFerias('2025-05-10', '2026-02-24')).toBe(10)
  })
})

describe('tempo de contribuição', () => {
  it('conta períodos concomitantes uma vez só', () => {
    const t = somarPeriodos([{ de: '2020-01-01', ate: '2020-12-31' }, { de: '2020-06-01', ate: '2021-05-31' }])
    expect(t.dias).toBe(517); expect(t.concomitancias).toBe(1); expect(t.anos).toBe(1)
  })
  it('regras de transição de 2026', () => {
    const r = aposentadoria('1968-05-20', 'F', [{ de: '1990-02-01', ate: '1999-12-31' }, { de: '2000-03-01', ate: '2026-10-31' }], '2026-11-09')
    expect(r.idadeAnos).toBe(58)
    expect(r.regras[0].nome).toMatch(/93 pontos e 30 anos/)
    expect(r.regras[0].ok).toBe(true)
    expect(r.regras[1].nome).toMatch(/59,5 anos/)
    expect(r.regras[1].ok).toBe(false)
    const h = aposentadoria('1970-01-01', 'M', [{ de: '2000-01-01', ate: '2026-01-01' }], '2026-11-09')
    expect(h.regras[0].nome).toMatch(/103 pontos e 35 anos/); expect(h.regras.every(g => !g.ok)).toBe(true)
  })
})

describe('comunicação e publicidade', () => {
  it('link do WhatsApp com DDI e texto codificado', () => {
    const r = linkWhatsapp('(21) 99999-0000', 'audiencia', 'Maria', 'Dra. Ana', 'dia 15/12 às 14h')
    expect(r.url).toBe(`https://wa.me/5521999990000?text=${encodeURIComponent(r.mensagem)}`)
    expect(r.mensagem).toMatch(/^Olá, Maria! Lembrete da audiência: dia 15\/12 às 14h\./)
    expect(() => linkWhatsapp('123', 'andamento', '', '', '')).toThrow(/DDD/)
  })
  it('publicidade: aponta vedações e libera texto informativo', () => {
    const r = verificarPublicidade('Somos o melhor escritório! Indenização garantida. Consulta grátis, ligue já!')
    expect(r.achados.map(a => a.motivo)).toEqual(expect.arrayContaining(['Promessa ou garantia de resultado', 'Autoengrandecimento ou comparação com colegas', 'Menção a preço, gratuidade, desconto ou forma de pagamento como captação', 'Apelo de urgência ou mercantilização']))
    expect(verificarPublicidade('Últimas vagas para revisão!').achados[0].motivo).toBe('Apelo de urgência ou mercantilização')
    expect(verificarPublicidade('Entenda seus direitos na locação: o inquilino pode pedir a revisão do aluguel após três anos.').ok).toBe(true)
  })
  it('índice de documentos com nomes de arquivo seguros', () => {
    const r = indiceDocumentos('Procuração\nContrato de locação')
    expect(r).toEqual([{ rotulo: 'Doc. 01 – Procuração', arquivo: 'Doc01_Procuracao.pdf' }, { rotulo: 'Doc. 02 – Contrato de locação', arquivo: 'Doc02_Contrato_de_locacao.pdf' }])
  })
})

describe('PDF', () => {
  it('junta PDFs mantendo a ordem e o total de páginas', async () => {
    const out = await juntarPdfs([await pdfCom(2, 500), await pdfCom(3, 600)])
    const d = await PDFDocument.load(out)
    expect(d.getPageCount()).toBe(5)
    expect(d.getPage(0).getWidth()).toBe(500); expect(d.getPage(2).getWidth()).toBe(600)
    await expect(juntarPdfs([])).rejects.toThrow()
  })
  it('extrai intervalo, inclusive em ordem inversa, e gira', async () => {
    const r = await extrairPaginas(await pdfCom(5, 500), '4-2, 5', 90)
    const d = await PDFDocument.load(r.pdf)
    expect(r.paginas).toBe(4)
    expect([0, 1, 2, 3].map(i => d.getPage(i).getWidth())).toEqual([503, 502, 501, 504])
    expect(d.getPage(0).getRotation().angle).toBe(90)
    expect(interpretarPaginas('1-3,5', 5)).toEqual([0, 1, 2, 4])
    expect(() => interpretarPaginas('1-9', 5)).toThrow(/5 página/)
    expect(() => interpretarPaginas('a', 5)).toThrow(/inválido/)
    await expect(contarPaginas(new Uint8Array([1, 2, 3]))).rejects.toBeTruthy()
    expect(tamanhoLegivel(2 * 1048576)).toBe('2 MB')
  })
})

describe('sites oficiais e catálogo', () => {
  it('todo atalho é https em domínio oficial ou de entidade conhecida', () => {
    const sites = Object.values(SITES_OFICIAIS).flatMap(g => g.sites)
    expect(sites.length).toBeGreaterThanOrEqual(18)
    for (const s of sites) expect(s.url).toMatch(/^https:\/\/[^/]*(\.gov\.br|\.jus\.br|\.leg\.br|oab\.org\.br|ridigital\.org\.br)\//)
  })
  it('ferramentas novas funcionam pelo catálogo', () => {
    for (const id of ['rescisao', 'tempo-contribuicao', 'prazo-agenda', 'whatsapp', 'publicidade-oab', 'indice-documentos', 'sites-oficiais']) {
      const f = FERRAMENTAS.find(x => x.id === id)!
      const r = rodar(f, valoresPadrao(f, new Date('2026-11-09T12:00:00')))
      expect(r.ok, id).toBe(true)
    }
    const ag = rodar(FERRAMENTAS.find(x => x.id === 'prazo-agenda')!, { titulo: 'Apelação', data: '2026-12-01', detalhe: '' })
    expect(ag.ok && ag.resultado.arquivo?.conteudo).toMatch(/BEGIN:VCALENDAR[\s\S]*DTSTART;VALUE=DATE:20261201[\s\S]*SUMMARY:Apelação[\s\S]*TRIGGER:-P7D/)
    const so = rodar(FERRAMENTAS.find(x => x.id === 'sites-oficiais')!, { grupo: 'calculos' })
    expect(so.ok && so.resultado.links?.[0][1]).toMatch(/bcb\.gov\.br/)
  })
})
