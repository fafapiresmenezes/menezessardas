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
 *
 * `rota` (pedido de M em 13/11/2026 22:45): cada quadradinho leva à SUA tela. Antes todos caíam na
 * mesma entrada e, depois da senha, na plataforma jurídica — por isso a pessoa via só o jurídico.
 * Agora o quadradinho manda para a entrada lembrando o destino, e a entrada entrega a pessoa lá.
 */
export type EstadoVertente = 'no-ar' | 'em-teste' | 'em-desenvolvimento' | 'em-estudo'

export const VERTENTES = [
  { id: 'direito', estado: 'no-ar', rota: '/inicio' },
  { id: 'predicao', estado: 'em-desenvolvimento', rota: '/preditiva' },
  { id: 'geolocalizacao', estado: 'em-desenvolvimento', rota: '/geolocalizacao' },
  { id: 'engenharia', estado: 'em-desenvolvimento', rota: '/engenharia' },
  { id: 'saude', estado: 'em-desenvolvimento', rota: '/saude' },
  { id: 'educacao', estado: 'em-estudo', rota: '/educacao' },
  { id: 'ciberseguranca', estado: 'em-teste', rota: '/ciberseguranca' },
  { id: 'geomapeamento', estado: 'em-estudo', rota: '/geomapeamento' },
  { id: 'governo', estado: 'em-estudo', rota: '/governo' },
  { id: 'civico', estado: 'em-estudo', rota: '/civico' },
  { id: 'quantum', estado: 'em-estudo', rota: '/quantum' },
  { id: 'ia', estado: 'em-teste', rota: '/ia' },
] as const satisfies readonly { id: string; estado: EstadoVertente; rota: string }[]

export type IdVertente = (typeof VERTENTES)[number]['id']
