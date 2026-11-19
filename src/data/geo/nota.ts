// Rubrica THEYE-GEO: as 10 dimensões de avaliação do app de geomapeamento (elo R1).
// Nota 10 = critério objetivo e medível, nunca adjetivo. O painel /geo/nota lê daqui.
// R11 vai ligar as notas medíveis ao CI; por ora são o boletim de partida (19/11/2026).
export type EstadoNota = 'medida' | 'a_medir'
export interface Dimensao {
  n: number
  nome: string
  norma: string
  criterio10: string
  nota: number | null // null = ainda não medida
  estado: EstadoNota
  evidencia: string
  ate10: string
}

export const EMITIDO_EM = '2026-11-19'

export const RUBRICA: Dimensao[] = [
  { n: 1, nome: 'Adequação funcional', norma: 'ISO/IEC 25010:2023', criterio10: '100% das funções declaradas com teste passando',
    nota: 7, estado: 'medida', evidencia: 'G1–G7 no ar e com teste; G4 (câmera) completo; G5 (grafo) agora é desenho na tela, com cada ponto apertável e a origem de cada ligação escrita junto; G8 (app) ainda não existe', ate10: 'R8/R9 trazem o app e a gravação de fundo' },
  { n: 2, nome: 'Desempenho', norma: 'Core Web Vitals', criterio10: 'LCP ≤2,5s · INP ≤200ms · Lighthouse ≥90',
    nota: 6, estado: 'medida', evidencia: 'mapa e PDF carregam sob demanda; o esqueleto do mapa reserva a altura e evita salto de layout (CLS). Entrada ainda pesada (~755 KB, é o esqueleto comum a todo o site)', ate10: 'enxugar o esqueleto comum e medir o Lighthouse com rede' },
  { n: 3, nome: 'Acessibilidade', norma: 'WCAG 2.2 AA', criterio10: '0 violações axe · nota 100',
    nota: 9, estado: 'medida', evidencia: '0 violações axe nas 11 telas do geo (porta, termo, as 7 abas por dentro, a régua de nota e a biblioteca); foco sempre visível, alvos de toque ≥44 px, listas e tabelas roláveis pelo teclado, links do mapa sublinhados; no grafo desenhado, cada tipo de ponto tem formato próprio além da cor e é alcançável pelo teclado', ate10: 'medir o índice de acessibilidade do Lighthouse quando houver rede' },
  { n: 4, nome: 'Segurança', norma: 'OWASP MASVS v2.1', criterio10: '100% dos controles L1; cofre em L2',
    nota: 8, estado: 'medida', evidencia: 'chave do cofre com PBKDF2-SHA256 de 310 mil voltas e sal de 32 bytes, AES-GCM-256 com IV novo a cada gravação, chave não extraível e nenhuma chave no código; no aparelho fica só o bloco cifrado; senha errada não decifra (teste automático). STORAGE e CRYPTO em L2', ate10: 'os controles de app nativo (e o MobSF) só podem ser medidos quando o app existir, no R8' },
  { n: 5, nome: 'Privacidade', norma: 'LGPD + MASVS-PRIVACY', criterio10: 'nenhuma posição sai sem ação; direitos funcionam',
    nota: 9, estado: 'medida', evidencia: 'dados cifrados só no aparelho; exportar/apagar/revogar; registro de acesso; posição arredondada a ~1 km nas consultas', ate10: 'R3 formaliza na norma' },
  { n: 6, nome: 'Confiabilidade', norma: 'ISO/IEC 25010', criterio10: '0 quebras de corrente em 30 dias; retoma sem perda',
    nota: 8, estado: 'medida', evidencia: 'corrente de hash SHA-256 com conferência na própria tela', ate10: 'R9: provar retomada após matar o app' },
  { n: 7, nome: 'Interoperabilidade', norma: 'OGC + FAIR', criterio10: 'GeoJSON válido · KML abre · STAC',
    nota: 8, estado: 'medida', evidencia: 'exporta GeoJSON, CSV e grafo; STAC nas cenas de satélite', ate10: 'validar GeoJSON no padrão RFC 7946' },
  { n: 8, nome: 'Precisão geoespacial', norma: 'Geodésia (GNSS)', criterio10: 'erro mediano ≤10 m; margem sempre à vista',
    nota: null, estado: 'a_medir', evidencia: 'o app mostra a margem de erro, mas nunca foi testada em campo', ate10: 'R10: medir contra ponto de referência' },
  { n: 9, nome: 'Manutenção', norma: 'ISO/IEC 25010', criterio10: 'CI verde · cobertura ≥80% nas libs geo',
    nota: 7, estado: 'medida', evidencia: '68 testes automatizados no geo, cobrindo o cofre, as métricas de mobilidade, o modo de transporte, a leitura de cena, o desenho do grafo e a biblioteca científica; ainda sem teste: calculo.ts, fontes.ts e grafo.ts', ate10: 'cobrir também calculo, fontes e grafo, e prender a nota ao CI (R11)' },
  { n: 10, nome: 'Honestidade científica', norma: 'FAIR + regra da casa', criterio10: '0 números sem fonte; predição só calibrada',
    nota: 10, estado: 'medida', evidencia: 'cada métrica de mobilidade (raio de giração, previsibilidade, perfil) traz o estudo de origem com link; o painel mostra o teto de previsibilidade e avisa quando há poucos dados; predição municipal bloqueada até calibração (Brier ≤0,20); a biblioteca em /geo/biblioteca mostra as 62 obras que sustentam o app e qual parte cada uma sustenta, sem redistribuir PDF de terceiro', ate10: 'mantido: nenhum número novo entra sem fonte' },
]

export const META = 10
