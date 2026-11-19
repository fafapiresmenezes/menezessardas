// G4: a câmera como sensor de LUGAR. Roda no próprio aparelho (TensorFlow.js + COCO-SSD, modelo aberto
// que conhece 80 tipos de objeto). Da imagem só sai o resultado: tipo de ambiente, quantas pessoas
// (sem saber quem são) e os objetos de referência. Não há modelo de rosto, emoção ou identidade aqui.

export interface Deteccao { classe: string; confianca: number }
export interface LeituraCena { ambiente: string; pessoas: number; objetos: string[]; codigos: string[]; confianca: number }

const PT: Record<string, string> = {
  person: 'pessoa', car: 'carro', bus: 'ônibus', truck: 'caminhão', motorcycle: 'moto', bicycle: 'bicicleta', 'traffic light': 'semáforo',
  'stop sign': 'placa de pare', 'fire hydrant': 'hidrante', 'parking meter': 'parquímetro', bench: 'banco', chair: 'cadeira', couch: 'sofá',
  bed: 'cama', 'dining table': 'mesa', tv: 'televisão', laptop: 'notebook', keyboard: 'teclado', mouse: 'mouse', 'cell phone': 'celular',
  book: 'livro', refrigerator: 'geladeira', oven: 'forno', microwave: 'micro-ondas', sink: 'pia', toilet: 'vaso sanitário', 'potted plant': 'planta',
  clock: 'relógio', cup: 'xícara', bottle: 'garrafa', train: 'trem', airplane: 'avião', boat: 'barco', umbrella: 'guarda-chuva', backpack: 'mochila',
  handbag: 'bolsa', suitcase: 'mala', dog: 'cachorro', cat: 'gato',
}

const SINAIS: { ambiente: string; classes: string[] }[] = [
  { ambiente: 'Rua', classes: ['car', 'bus', 'truck', 'motorcycle', 'bicycle', 'traffic light', 'stop sign', 'fire hydrant', 'parking meter'] },
  { ambiente: 'Escritório', classes: ['laptop', 'keyboard', 'mouse', 'tv', 'book', 'clock'] },
  { ambiente: 'Casa (sala)', classes: ['couch', 'tv', 'potted plant', 'dining table'] },
  { ambiente: 'Casa (quarto)', classes: ['bed'] },
  { ambiente: 'Cozinha', classes: ['refrigerator', 'oven', 'microwave', 'sink'] },
  { ambiente: 'Banheiro', classes: ['toilet', 'sink'] },
  { ambiente: 'Transporte', classes: ['train', 'airplane', 'boat', 'suitcase'] },
  { ambiente: 'Refeição', classes: ['wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'pizza', 'sandwich', 'cake', 'donut'] },
  { ambiente: 'Natureza / área aberta', classes: ['bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'kite'] },
  { ambiente: 'Esporte / lazer', classes: ['sports ball', 'tennis racket', 'baseball bat', 'skateboard', 'surfboard', 'skis', 'snowboard', 'frisbee'] },
]

/**
 * Classifica o ambiente pelos objetos vistos (regra transparente, sem caixa-preta). Função pura, testada.
 *
 * Também devolve uma `confianca` de 0 a 1, que é uma ESTIMATIVA honesta: quanto o modelo
 * confiou nos objetos que sustentaram a escolha, descontado o quanto o segundo lugar chegou
 * perto. Dois sinais empatados dão confiança baixa, e é isso que a tela mostra.
 *
 * Pessoas são CONTADAS, nunca identificadas: não há modelo de rosto, emoção ou perfil aqui.
 */
export function classificarAmbiente(dets: Deteccao[], minimo = 0.5): LeituraCena {
  const v = dets.filter(d => d.confianca >= minimo)
  const pessoas = v.filter(d => d.classe === 'person').length
  const naoPessoas = v.filter(d => d.classe !== 'person')
  const classes = naoPessoas.map(d => d.classe)
  let melhor = { ambiente: 'Indefinido', pontos: 0 }
  let segundo = 0
  for (const s of SINAIS) {
    const pontos = classes.filter(c => s.classes.includes(c)).length
    if (pontos > melhor.pontos) { segundo = melhor.pontos; melhor = { ambiente: s.ambiente, pontos } }
    else if (pontos > segundo) segundo = pontos
  }
  let confianca = 0
  if (melhor.pontos > 0) {
    const apoio = SINAIS.find(s => s.ambiente === melhor.ambiente)!.classes
    const sustentam = naoPessoas.filter(d => apoio.includes(d.classe))
    const media = sustentam.reduce((s, d) => s + d.confianca, 0) / sustentam.length
    confianca = media * (melhor.pontos / (melhor.pontos + segundo))
  }
  return { ambiente: melhor.ambiente, pessoas, objetos: [...new Set(classes.map(c => PT[c] ?? c))], codigos: [], confianca }
}

declare global {
  interface Window {
    cocoSsd?: { load: (o?: { base?: string }) => Promise<{ detect: (el: HTMLVideoElement | HTMLCanvasElement) => Promise<{ class: string; score: number }[]> }> }
    BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (el: HTMLVideoElement | HTMLCanvasElement) => Promise<{ rawValue: string }[]> }
  }
}

const carregarScript = (src: string) => new Promise<void>((ok, falha) => {
  if (document.querySelector(`script[src="${src}"]`)) return ok()
  const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous'
  s.onload = () => ok(); s.onerror = () => falha(new Error('Não consegui baixar o modelo da câmera'))
  document.head.appendChild(s)
})

let modelo: Awaited<ReturnType<NonNullable<Window['cocoSsd']>['load']>> | null = null

/** Baixa o modelo uma vez (≈ 5 MB). Só quando o titular liga a câmera. */
export async function prepararModelo() {
  if (modelo) return modelo
  await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js')
  await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js')
  if (!window.cocoSsd) throw new Error('Modelo da câmera não carregou')
  modelo = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' })
  return modelo
}

/** Lê UM quadro do vídeo e devolve só o resultado. O quadro não é guardado nem enviado. */
export async function lerQuadro(video: HTMLVideoElement): Promise<LeituraCena> {
  const m = await prepararModelo()
  const brutas = await m.detect(video)
  const leitura = classificarAmbiente(brutas.map(b => ({ classe: b.class, confianca: b.score })))
  if (window.BarcodeDetector) {
    try {
      const bd = new window.BarcodeDetector()
      leitura.codigos = (await bd.detect(video)).map(c => c.rawValue).slice(0, 5)
    } catch { /* aparelho sem leitor de código: segue sem */ }
  }
  return leitura
}
