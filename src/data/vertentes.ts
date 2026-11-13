/**
 * Todas as vertentes do Instituto, para aparecerem na porta de entrada em qualquer língua.
 *
 * Pedido de M em 13/11/2026 20:53 UTC: *"na página do Instituto, quando você clica em português,
 * em chinês, tem que ter tudo lá traduzido… mas só está aparecendo a parte jurídica. Tem que
 * aparecer tudo que tem, todas as vertentes, mesmo que esteja ainda em desenvolvimento. Claro que
 * tudo precisa de senha."*
 *
 * Por isso aqui está a lista inteira, inclusive o que ainda é estudo, e cada linha diz em que pé
 * está. O nome e o resumo de cada vertente moram no dicionário de quatro línguas
 * (`src/lib/i18n.ts`), não neste arquivo: assim uma vertente sem tradução é erro de TypeScript, e
 * não um texto em português aparecendo na tela em chinês.
 *
 * Nada aqui abre sem senha. Esta lista é vitrine, não porta destrancada: quem clica vai para a
 * tela de entrada.
 */
export type EstadoVertente = 'no-ar' | 'em-teste' | 'em-desenvolvimento' | 'em-estudo'

export const VERTENTES = [
  { id: 'direito', estado: 'no-ar' },
  { id: 'predicao', estado: 'em-desenvolvimento' },
  { id: 'geolocalizacao', estado: 'em-desenvolvimento' },
  { id: 'engenharia', estado: 'em-desenvolvimento' },
  { id: 'saude', estado: 'em-desenvolvimento' },
  { id: 'educacao', estado: 'no-ar' },
  { id: 'ciberseguranca', estado: 'em-teste' },
  { id: 'geomapeamento', estado: 'em-estudo' },
  { id: 'governo', estado: 'em-estudo' },
  { id: 'civico', estado: 'em-estudo' },
  { id: 'quantum', estado: 'em-estudo' },
  { id: 'ia', estado: 'em-teste' },
] as const satisfies readonly { id: string; estado: EstadoVertente }[]

export type IdVertente = (typeof VERTENTES)[number]['id']
