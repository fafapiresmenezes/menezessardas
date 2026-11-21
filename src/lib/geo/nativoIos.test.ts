// Prova sobre o PROJETO DO IPHONE (ios/App/App/Info.plist e ios/App/Podfile).
//
// POR QUE ESTA PROVA EXISTE: a régua afirma, há dias, que "o projeto iOS está pronto, com as
// três frases de permissão em português e o modo de localização em segundo plano". Era uma
// afirmação ESCRITA, sem nada conferindo. Esta semana a mesma forma de afirmação escondeu dois
// defeitos de verdade do lado Android — a cópia automática ligada e o serviço de gravação
// alcançável de fora —, e os dois só apareceram quando alguma coisa passou a LER o arquivo.
// Então o lado iPhone passa a ser lido também.
//
// O QUE ESTA PROVA NÃO COBRE, e precisa ficar dito: ela lê o arquivo-fonte do projeto, não um
// aplicativo montado. Montar a versão iPhone exige um Mac, que não existe aqui. É exatamente a
// diferença que o lado Android nos ensinou: `cap sync`, o merge de manifesto e os plugins mudam
// o que vai para o aparelho, e a prova sobre o arquivo-fonte nunca teria acusado isso. Enquanto
// não houver um .ipa montado para ler, esta prova vale pelo que é: o projeto promete certo.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const plist = readFileSync('ios/App/App/Info.plist', 'utf-8')
const podfile = readFileSync('ios/App/Podfile', 'utf-8')

/** Lê o <string> que vem depois de uma <key> do plist. */
const frase = (chave: string) => {
  const m = new RegExp(`<key>${chave}</key>\\s*<string>([^<]*)</string>`).exec(plist)
  return m ? m[1] : null
}

describe('o projeto do iPhone promete o mesmo que o do Android', () => {
  it('tem as três frases que o titular lê, em português e dizendo onde o dado fica', () => {
    const chaves = [
      'NSLocationWhenInUseUsageDescription',
      'NSLocationAlwaysAndWhenInUseUsageDescription',
      'NSCameraUsageDescription',
    ]
    for (const chave of chaves) {
      const texto = frase(chave)
      expect(texto, `${chave} não existe no Info.plist`).toBeTruthy()
      // A Apple rejeita texto genérico, e o titular merece saber para onde vai o dado. As três
      // frases dizem que a informação fica NESTE aparelho; se alguém encurtar a frase e tirar
      // essa parte, a promessa do app deixa de estar escrita onde o titular a lê.
      expect(texto!.toLowerCase(), `${chave} não diz que o dado fica no aparelho`).toContain('aparelho')
      expect(texto!.length, `${chave} está genérica demais`).toBeGreaterThan(60)
    }
    // A frase da câmera é a que carrega a promessa de não identificar ninguém.
    expect(frase('NSCameraUsageDescription')!.toLowerCase()).toContain('não reconhece rostos')
  })

  it('declara o modo de localização em segundo plano, sem o qual o iOS corta a gravação', () => {
    const m = /<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(plist)
    expect(m, 'UIBackgroundModes não existe').toBeTruthy()
    expect(m![1]).toContain('<string>location</string>')
  })

  it('NÃO abre exceção para conexão em texto claro (o equivalente iPhone do que consertamos no Android)', () => {
    // No iOS o App Transport Security vem LIGADO por padrão e já recusa http://. Então o certo
    // aqui é a AUSÊNCIA de exceção, e é isso que esta prova tranca: o lado Android nos custou
    // uma rodada justamente porque a promessa de "nenhuma conexão em texto claro" estava
    // escrita mas era ignorada. Aqui ninguém pode escrever a exceção sem a obra parar.
    expect(plist).not.toContain('NSAllowsArbitraryLoads')
    expect(plist).not.toContain('NSAllowsArbitraryLoadsInWebContent')
    expect(plist).not.toContain('NSExceptionAllowsInsecureHTTPLoads')
  })

  it('não pede nenhuma permissão além das três, nem rastreamento de propaganda', () => {
    const pedidas = [...plist.matchAll(/<key>(NS\w*UsageDescription)<\/key>/g)].map(m => m[1])
    expect(pedidas.sort()).toEqual([
      'NSCameraUsageDescription',
      'NSLocationAlwaysAndWhenInUseUsageDescription',
      'NSLocationWhenInUseUsageDescription',
    ])
    // Identificador de propaganda: este app não tem propaganda e não mede ninguém de fora.
    expect(plist).not.toContain('NSUserTrackingUsageDescription')
    expect(plist).not.toContain('NSContactsUsageDescription')
    expect(plist).not.toContain('NSMicrophoneUsageDescription')
  })

  it('traz o mesmo plugin de gravação em segundo plano que o Android usa', () => {
    // Se o lado iPhone não tiver o plugin, a gravação com a tela apagada existe num aparelho e
    // não no outro — e a régua fala dos dois como se fossem a mesma coisa.
    expect(podfile).toContain('CapacitorCommunityBackgroundGeolocation')
  })
})
