// Provas da porta do aplicativo (elo R8). O que mais importa: no NAVEGADOR nada muda.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dentroDoApp, portaDoApp } from './nativo'

const comCapacitor = (nativo: boolean) => { window.Capacitor = { isNativePlatform: () => nativo } }

beforeEach(() => { window.location.hash = '' })
afterEach(() => { delete window.Capacitor })

describe('Porta do aplicativo', () => {
  it('no navegador comum, não é app e nada é mexido', () => {
    expect(dentroDoApp()).toBe(false)
    window.location.hash = '#/inicio'
    portaDoApp()
    expect(window.location.hash).toBe('#/inicio')
  })

  it('num navegador que só tem o objeto, mas não é plataforma nativa, também não mexe', () => {
    comCapacitor(false)
    expect(dentroDoApp()).toBe(false)
    portaDoApp()
    expect(window.location.hash).toBe('')
  })

  it('no app, sem rota nenhuma, abre na casa do geomapeamento', () => {
    comCapacitor(true)
    expect(dentroDoApp()).toBe(true)
    portaDoApp()
    expect(window.location.hash).toBe('#/geo')
  })

  it('no app, vindo da tela inicial do site, também abre na casa do geomapeamento', () => {
    comCapacitor(true)
    window.location.hash = '#/inicio'
    portaDoApp()
    expect(window.location.hash).toBe('#/geo')
  })

  it('no app, se o titular já está em outra tela, a escolha dele manda', () => {
    comCapacitor(true)
    window.location.hash = '#/geo/biblioteca'
    portaDoApp()
    expect(window.location.hash).toBe('#/geo/biblioteca')
  })

  it('se o Capacitor estiver quebrado, não derruba o app', () => {
    window.Capacitor = { isNativePlatform: () => { throw new Error('boom') } }
    expect(dentroDoApp()).toBe(false)
    expect(() => portaDoApp()).not.toThrow()
  })
})

// --- Controles do MASVS escritos no manifesto do Android -----------------------------------
// Estas provas leem o AndroidManifest.xml de verdade. Existem porque o padrão do Capacitor é
// allowBackup="true", e nesse estado o Android copia os dados do app para a nuvem do Google e
// para o adb backup. O cofre é cifrado, então o conteúdo em claro não vazaria, mas o bloco
// cifrado SAIR do aparelho contradiz a única promessa deste app. Se alguém regenerar o projeto
// Android com `cap add`, o padrão volta e estas provas caem.
describe('o manifesto do Android não deixa os dados saírem do aparelho', () => {
  const manifesto = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')

  it('a cópia automática do Android está desligada', () => {
    expect(manifesto).toContain('android:allowBackup="false"')
    expect(manifesto).not.toContain('android:allowBackup="true"')
  })

  it('no Android 12 e acima, nem a troca de celular leva os dados', () => {
    expect(manifesto).toContain('android:dataExtractionRules="@xml/regras_sem_copia"')
    const regras = readFileSync('android/app/src/main/res/xml/regras_sem_copia.xml', 'utf8')
    expect(regras).toContain('<cloud-backup>')
    expect(regras).toContain('<device-transfer>')
    expect((regras.match(/<exclude domain="root" \/>/g) ?? []).length).toBe(2)
  })

  it('nenhuma conexão em texto claro, de endereço nenhum', () => {
    expect(manifesto).toContain('android:networkSecurityConfig="@xml/rede_segura"')
    expect(readFileSync('android/app/src/main/res/xml/rede_segura.xml', 'utf8'))
      .toContain('cleartextTrafficPermitted="false"')
  })

  it('pede só localização e câmera, e nada de contatos, microfone ou identificador', () => {
    const pedidas = [...manifesto.matchAll(/uses-permission android:name="android\.permission\.([A-Z_]+)"/g)].map(m => m[1])
    expect(new Set(pedidas)).toEqual(new Set(['INTERNET', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA']))
  })

  it('não pede a localização "sempre", que daria ao app mais poder do que ele precisa', () => {
    // Decisão do R9: o serviço em primeiro plano, com aviso à vista, basta para gravar com a
    // tela apagada. ACCESS_BACKGROUND_LOCATION continua fora de propósito.
    expect(manifesto).not.toContain('ACCESS_BACKGROUND_LOCATION')
  })

  it('só a tela de abrir é alcançável de fora do app', () => {
    expect((manifesto.match(/android:exported="true"/g) ?? []).length).toBe(1)
  })

  it('o app não se instala em Android onde a nossa proteção de rede é ignorada', () => {
    // Achado pelo MobSF na primeira análise de verdade (nota 57): com minSdk 23 o app se
    // instalava no Android 6, e o android:networkSecurityConfig do nosso manifesto SÓ existe a
    // partir da API 24. Ou seja, a promessa de "nenhuma conexão em texto claro" não valia nos
    // aparelhos mais antigos que o próprio app aceitava. Esta prova existe para a versão
    // mínima não voltar atrás sem ninguém notar, e para o motivo não se perder.
    const variaveis = readFileSync('android/variables.gradle', 'utf-8')
    const min = /minSdkVersion\s*=\s*(\d+)/.exec(variaveis)
    expect(min).toBeTruthy()
    expect(Number(min![1])).toBeGreaterThanOrEqual(24)
  })

  it('o serviço de gravação do plugin é fechado para os outros aplicativos', () => {
    // O plugin declara esse serviço alcançável de fora, e a junção de manifestos do Gradle
    // mantinha isso: qualquer outro app instalado podia iniciar ou parar a gravação da posição.
    // Foi achado conferindo o APK montado (scripts/geo/conferir-apk.mjs), não este arquivo.
    const bloco = /<service[^>]*BackgroundGeolocationService[\s\S]*?\/>/.exec(manifesto)?.[0]
    expect(bloco).toBeTruthy()
    expect(bloco).toContain('android:exported="false"')
    // Sem o tools:replace a linha do plugin vence a nossa e o fecho não acontece.
    expect(bloco).toContain('tools:replace="android:exported"')
    expect(manifesto).toContain('xmlns:tools="http://schemas.android.com/tools"')
  })
})
