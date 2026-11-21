// Rubrica THEYE-GEO: as 10 dimensões de avaliação do app de geomapeamento (elo R1).
// Nota 10 = critério objetivo e medível, nunca adjetivo. O painel /geo/nota lê daqui.
// R11 ligou ao CI as dimensões que a máquina sabe medir (2, 3 e 9): scripts/geo/medir-nota.mjs
// mede, aplica as regras de src/lib/geo/medicao.ts e quebra a obra se o número aqui divergir.
// As outras sete seguem escritas à mão, com a evidência ao lado, e o painel diz isso na cara.
//
// 21/11/2026: a medição de desempenho e de acessibilidade voltou a funcionar. Desde 19/11 as
// telas do Instituto pedem senha, e a medição, que entrava como visitante, passou a medir a
// porta do site em vez da casa do geo. A tranca está certa e ficou como está; o que mudou foi
// o alvo: agora mede a bancada auditoria/geo, que monta as MESMAS telas, com o MESMO CSS, sem
// a tranca. O caminho do visitante até a casa depende do login e está dito na dimensão 3.
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

export const EMITIDO_EM = '2026-11-21'

export const RUBRICA: Dimensao[] = [
  { n: 1, nome: 'Adequação funcional', norma: 'ISO/IEC 25010:2023', criterio10: '100% das funções declaradas com teste passando',
    nota: 7, estado: 'medida', evidencia: 'G1–G7 no ar e com teste; G4 (câmera) completo; G5 (grafo) agora é desenho na tela, com cada ponto apertável e a origem de cada ligação escrita junto; G8 (app) tem o arquivo do aplicativo Android montado pela obra "THEYE Geo: montar o APK" a cada mudança no geo (a última rodada passou hoje, 21/11), e sai como artefato "theye-geo-apk" na página da rodada no GitHub, pronto para instalar direto no celular, sem loja; a gravação com a tela apagada está escrita e provada em teste. Mas nada disso foi ainda instalado e andado num aparelho de verdade, e é só isso que falta', ate10: 'baixar o artefato theye-geo-apk da última rodada da obra no GitHub, instalar no celular, andar com ele no bolso um dia e conferir o que foi gravado' , fonte: 'manual' },
  { n: 2, nome: 'Desempenho', norma: 'Core Web Vitals', criterio10: 'LCP ≤2,5s · INP ≤200ms · Lighthouse ≥90',
    nota: 10, estado: 'medida', evidencia: 'medido pelo Lighthouse com rede de celular simulada (4G lento, processador 4x mais devagar): nota 100, LCP 0,8 s, tempo de travamento 60 ms, salto de layout 0,000, 350 KB trafegados. O mapa e o PDF carregam sob demanda e o esqueleto do mapa reserva a altura, que é o que mantém o salto em zero. Duas ressalvas ditas na cara: isto é rede simulada sobre o servidor local, não um celular de verdade numa rede de verdade; e mede a casa do geo, não a volta inteira do visitante, que passa antes pela porta do site', ate10: 'mantido: a máquina mede a cada rodada e a obra quebra se piorar' , fonte: 'ci' },
  { n: 3, nome: 'Acessibilidade', norma: 'WCAG 2.2 AA', criterio10: '0 violações axe · nota 100',
    nota: 10, estado: 'medida', evidencia: '0 violações axe nas 12 telas do geo (porta, termo, as 7 abas por dentro, a régua de nota, a biblioteca e a medição de precisão) e índice 100 de acessibilidade no Lighthouse; foco sempre visível, alvos de toque ≥44 px, listas e tabelas roláveis pelo teclado, links do mapa sublinhados; no grafo desenhado, cada tipo de ponto tem formato próprio além da cor e é alcançável pelo teclado. O que esta nota NÃO cobre: o caminho do visitante até aqui passa pela página de boas-vindas do site, que mede 94 e tem três problemas de contraste e de marcação — são da porta do site, de outra frente, e não da casa do geo', ate10: 'mantido: uma violação nova em qualquer das 12 telas derruba a nota no CI' , fonte: 'ci' },
  { n: 4, nome: 'Segurança', norma: 'OWASP MASVS v2.1', criterio10: '100% dos controles L1; cofre em L2',
    nota: 9, estado: 'medida', evidencia: 'chave do cofre com PBKDF2-SHA256 de 310 mil voltas e sal de 32 bytes, AES-GCM-256 com IV novo a cada gravação, chave não extraível e nenhuma chave no código; no aparelho fica só o bloco cifrado; senha errada não decifra (teste automático). STORAGE e CRYPTO em L2. No aplicativo Android, três controles passaram a estar escritos no manifesto e conferidos por teste que lê o próprio arquivo: a cópia automática do Android está DESLIGADA (estava ligada, que é o padrão do Capacitor, e nesse estado o Android mandava os dados do app para a nuvem do Google e para o adb backup — o cofre é cifrado, então nada em claro vazaria, mas o bloco cifrado sair do aparelho contradizia a única promessa deste app), a troca de celular também não leva nada (Android 12 e acima), e nenhuma conexão em texto claro é aceita, de endereço nenhum. Mais: pede só localização e câmera, não pede a localização \'sempre\', e só a tela de abrir é alcançável de fora do app', ate10: 'o arquivo que se instala hoje é uma versão de depuração, assinada com a chave de depuração do Android e depurável — isso sozinho reprova um item do nível 1 do MASVS, e só sai com uma versão de publicação assinada (R12, que custa dinheiro). O MobSF também nunca foi rodado sobre o arquivo' , fonte: 'manual' },
  { n: 5, nome: 'Privacidade', norma: 'LGPD + MASVS-PRIVACY', criterio10: 'nenhuma posição sai sem ação; direitos funcionam',
    nota: 9, estado: 'medida', evidencia: 'dados cifrados só no aparelho; exportar/apagar/revogar; registro de acesso; posição arredondada a ~1 km nas consultas; no app, gravar com a tela apagada obriga uma notificação permanente à vista e NÃO pede a permissão de localização "sempre" (o serviço em primeiro plano basta)', ate10: 'R3 formaliza na norma' , fonte: 'manual' },
  { n: 6, nome: 'Confiabilidade', norma: 'ISO/IEC 25010', criterio10: '0 quebras de corrente em 30 dias; retoma sem perda',
    nota: 9, estado: 'medida', evidencia: 'corrente de hash SHA-256 com conferência na própria tela; teste automático fecha o cofre e o reabre do zero no meio da gravação e prova que nenhum ponto se perdeu e a corrente segue íntegra, com pontos de primeiro plano e de segundo plano na MESMA corrente', ate10: 'repetir a prova num aparelho de verdade, um dia inteiro seguido' , fonte: 'manual' },
  { n: 7, nome: 'Interoperabilidade', norma: 'OGC + FAIR', criterio10: 'GeoJSON válido · KML abre · STAC',
    nota: 10, estado: 'medida', evidencia: 'o GeoJSON exportado é conferido contra a RFC 7946 por um conferidor próprio (src/lib/geo/geojsonRfc.ts), que lista a seção violada em cada caso: ordem longitude-latitude, limites do planeta, linha com menos de dois pontos, anel que não fecha, campo crs proibido e precisão falsa além de seis casas. As quatro formas em que a exportação sai na vida real passam com zero violação, e o teste quebra a obra se isso mudar. Conferir achou dois defeitos de verdade, os dois consertados: quem tinha gravado um ponto só levava um arquivo que a norma recusa, e as coordenadas saíam com dez casas decimais, que é exatidão que nenhum GPS de celular tem. Agora exporta também KML 2.2 da OGC, que abre no Google Earth, com a ordem de coordenada e o escape de XML provados em teste (o nome de um lugar com & ou < não quebra mais o arquivo). Mais CSV, grafo com a fonte de cada ligação, e STAC nas cenas de satélite', ate10: 'mantido: formato novo entra com conferidor ao lado, ou não entra' , fonte: 'manual' },
  { n: 8, nome: 'Precisão geoespacial', norma: 'Geodésia (GNSS)', criterio10: 'erro mediano ≤10 m; margem sempre à vista',
    nota: null, estado: 'a_medir', evidencia: 'o app mostra a margem de erro, mas ela vem do próprio aparelho e nunca foi conferida em campo. O instrumento de medir já existe, em /geo/precisao, dentro da parte do Instituto (entrando com a sua conta, como o resto das telas do geo desde 19/11): ele compara as leituras com um ponto de coordenada conhecida, dá o erro mediano, o percentil 90 e quanto da margem declarada se sustentou, e se recusa a dar nota com menos de 30 leituras. Nenhuma medição foi feita ainda, então aqui não entra número nenhum', ate10: 'ficar cinco minutos parado em cima de um marco geodésico do IBGE, com a tela /geo/precisao aberta, e me mandar o resultado' , fonte: 'externo' },
  { n: 9, nome: 'Manutenção', norma: 'ISO/IEC 25010', criterio10: 'CI verde · cobertura ≥80% nas libs geo',
    nota: 10, estado: 'medida', evidencia: 'os 15 arquivos de lib do geo têm teste ao lado — cofre, cálculo, câmera, modo de transporte, fontes abertas, grafo e exportação, ficha em PDF, gravação em segundo plano, precisão em campo, IA local, medição da régua, conferidor da RFC 7946 e layout. É essa fração que a máquina mede a cada rodada, e a obra geo-nota.yml quebra se esta nota divergir da medição', ate10: 'mantido: arquivo de lib novo sem teste ao lado derruba a nota de volta, no CI', fonte: 'ci' },
  { n: 10, nome: 'Honestidade científica', norma: 'FAIR + regra da casa', criterio10: '0 números sem fonte; predição só calibrada',
    nota: 10, estado: 'medida', evidencia: 'cada métrica de mobilidade (raio de giração, previsibilidade, perfil) traz o estudo de origem com link; o painel mostra o teto de previsibilidade e avisa quando há poucos dados; predição municipal bloqueada até calibração (Brier ≤0,20); a biblioteca em /geo/biblioteca mostra as 62 obras que sustentam o app e qual parte cada uma sustenta, sem redistribuir PDF de terceiro', ate10: 'mantido: nenhum número novo entra sem fonte' , fonte: 'manual' },
]

export const META = 10
