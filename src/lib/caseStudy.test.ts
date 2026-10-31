import { describe, expect, it } from 'vitest'
import { linhasCaseStudy } from '@/pages/InstitutoPage'
import { MEDICOES } from '@/data/medicoes'

describe('linhasCaseStudy', () => {
  it('inclui todas as medições com SHA-256 e a nota de método', () => {
    const t = linhasCaseStudy().map(l => l.texto).join('\n')
    for (const m of MEDICOES) expect(t).toContain(m.sha256)
    expect(t).toContain('3. Nota de método')
    expect(t).toContain('OpenTimestamps')
  })
})
