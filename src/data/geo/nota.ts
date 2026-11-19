// Rubrica THEYE-GEO: as 10 dimensões de avaliação do app de geomapeamento (elo R1).
// Nota 10 = critério objetivo e medível, nunca adjetivo. O painel /geo/nota lê daqui.
// R11 ligou ao CI as duas dimensões que a máquina sabe medir (3 e 9): scripts/geo/medir-nota.mjs
// mede, aplica as regras de src/lib/geo/medicao.ts e quebra a obra se o número aqui divergir.
// As outras oito seguem escritas à mão, com a evidência ao lado, e o painel diz isso na cara.
export type EstadoNota = 'medida' | 'a_medir'
export type { FonteDaNota } from '@/lib/geo/medicao'
export interface Dimensao {
  n: number
  nome: string
  norma: string
  criterio10: string
  nota: number | null // null = ainda não medida
  estado: EstadoNota
  evidencia: string
  ate10: string
  /** de onde vem este número: medido pela máquina no CI, à mão, ou fora do nosso alcance */
  fonte: import('@/lib/geo/medicao').FonteDaNota
}

export const EMITIDO_EM = '2026-11-19'

export const RUBRICA: Dimensao[] = [
  { n: 1, nome: 'Adequação funcional', norma: 'ISO/IEC 25010:2023', criterio10: '100% das funções declaradas com teste passando',
    nota: 7, estado: 'medida', evidencia: 'G1–G7 no ar e com teste; G4 (câmera) completo; G5 (grafo) agora é desenho na tela, com cada ponto apertável e a origem de cada ligação escrita junto; G8 (app) tem o APK pronto para baixar e a gravação com a tela apagada escrita e provada em teste, mas nada disso foi ainda instalado e andado num aparelho de verdade', ate10: 'instalar o APK, andar com o celular no bolso e conferir o que foi gravado' , fonte: 'manual' },
  { n: 2, nome: 'Desempenho', norma: 'Core Web Vitals', criterio10: 'LCP ≤2,5s · INP ≤200ms · Lighthouse ≥90',
    nota: 6, estado: 'medida', evidencia: 'mapa e PDF carregam sob demanda; o esqueleto do mapa reserva a altura e evita salto de layout (CLS). Entrada ainda pesada (~755 KB, é o esqueleto comum a todo o site)', ate10: 'enxugar o esqueleto comum e medir o Lighthouse com rede' , fonte: 'manual' },
  { n: 3, nome: 'Acessibilidade', norma: 'WCAG 2.2 AA', criterio10: '0 violações axe · nota 100',
    nota: 9, estado: 'medida', evidencia: '0 violações axe nas 12 telas do geo (porta, termo, as 7 abas por dentro, a régua de nota, a biblioteca e a medição de precisão); foco sempre visível, alvos de toque ≥44 px, listas e tabelas roláveis pelo teclado, links do mapa sublinhados; no grafo desenhado, cada tipo de ponto tem formato próprio além da cor e é alcançável pelo teclado', ate10: 'medir o índice de acessibilidade do Lighthouse quando houver rede' , fonte: 'ci' },
  { n: 4, nome: 'Segurança', norma: 'OWASP MASVS v2.1', criterio10: '100% dos controles L1; cofre em L2',
    nota: 8, estado: 'medida', evidencia: 'chave do cofre com PBKDF2-SHA256 de 310 mil voltas e sal de 32 bytes, AES-GCM-256 com IV novo a cada gravação, chave não extraível e nenhuma chave no código; no aparelho fica só o bloco cifrado; senha errada não decifra (teste automático). STORAGE e CRYPTO em L2', ate10: 'os controles de app nativo (e o MobSF) só podem ser medidos quando o app existir, no R8' , fonte: 'manual' },
  { n: 5, nome: 'Privacidade', norma: 'LGPD + MASVS-PRIVACY', criterio10: 'nenhuma posição sai sem ação; direitos funcionam',
    nota: 9, estado: 'medida', evidencia: 'dados cifrados só no aparelho; exportar/apagar/revogar; registro de acesso; posição arredondada a ~1 km nas consultas; no app, gravar com a tela apagada obriga uma notificação permanente à vista e NÃO pede a permissão de localização "sempre" (o serviço em primeiro plano basta)', ate10: 'R3 formaliza na norma' , fonte: 'manual' },
  { n: 6, nome: 'Confiabilidade', norma: 'ISO/IEC 25010', criterio10: '0 quebras de corrente em 30 dias; retoma sem perda',
    nota: 9, estado: 'medida', evidencia: 'corrente de hash SHA-256 com conferência na própria tela; teste automático fecha o cofre e o reabre do zero no meio da gravação e prova que nenhum ponto se perdeu e a corrente segue íntegra, com pontos de primeiro plano e de segundo plano na MESMA corrente', ate10: 'repetir a prova num aparelho de verdade, um dia inteiro seguido' , fonte: 'manual' },
  { n: 7, nome: 'Interoperabilidade', norma: 'OGC + FAIR', criterio10: 'GeoJSON válido · KML abre · STAC',
    nota: 8, estado: 'medida', evidencia: 'exporta GeoJSON, CSV e grafo; STAC nas cenas de satélite', ate10: 'validar GeoJSON no padrão RFC 7946' , fonte: 'manual' },
  { n: 8, nome: 'Precisão geoespacial', norma: 'Geodésia (GNSS)', criterio10: 'erro mediano ≤10 m; margem sempre à vista',
    nota: null, estado: 'a_medir', evidencia: 'o app mostra a margem de erro, mas ela vem do próprio aparelho e nunca foi conferida em campo. O instrumento de medir já existe e está aberto em /geo/precisao: ele compara as leituras com um ponto de coordenada conhecida, dá o erro mediano, o percentil 90 e quanto da margem declarada se sustentou, e se recusa a dar nota com menos de 30 leituras. Nenhuma medição foi feita ainda, então aqui não entra número nenhum', ate10: 'ficar cinco minutos parado em cima de um marco geodésico do IBGE, com a tela /geo/precisao aberta, e me mandar o resultado' , fonte: 'externo' },
  { n: 9, nome: 'Manutenção', norma: 'ISO/IEC 25010', criterio10: 'CI verde · cobertura ≥80% nas libs geo',
    nota: 7, estado: 'medida', evidencia: '146 testes automatizados no geo; 9 dos 14 arquivos de lib do geo têm teste ao lado, e é essa fração que a máquina mede a cada rodada (ainda sem teste: calculo.ts, fichaPdf.ts, fontes.ts, grafo.ts e ollama.ts). A obra geo-nota.yml quebra se esta nota divergir da medição', ate10: 'escrever teste para os cinco arquivos que faltam: acima de 95% a regra dá 10' , fonte: 'ci' },
  { n: 10, nome: 'Honestidade científica', norma: 'FAIR + regra da casa', criterio10: '0 números sem fonte; predição só calibrada',
    nota: 10, estado: 'medida', evidencia: 'cada métrica de mobilidade (raio de giração, previsibilidade, perfil) traz o estudo de origem com link; o painel mostra o teto de previsibilidade e avisa quando há poucos dados; predição municipal bloqueada até calibração (Brier ≤0,20); a biblioteca em /geo/biblioteca mostra as 62 obras que sustentam o app e qual parte cada uma sustenta, sem redistribuir PDF de terceiro', ate10: 'mantido: nenhum número novo entra sem fonte' , fonte: 'manual' },
]

export const META = 10
