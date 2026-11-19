# O projeto iPhone do THEYE Geo

Gerado pelo Capacitor no elo R12 do replano de geomapeamento, em 19/11/2026. **Nenhum app
foi publicado em loja nenhuma**, e nenhuma conta de desenvolvedor existe: isto é só o
projeto, pronto para ser montado no dia em que houver um Mac e a decisão de publicar.

## O que já está configurado

- `App/App/Info.plist`: as três frases que o titular lê no aviso do iPhone, em português —
  localização durante o uso, localização sempre e câmera. A Apple rejeita texto genérico,
  então cada frase diz o que o app faz com aquilo e onde o dado fica.
- `UIBackgroundModes` com `location`. Sem isso o iOS encerra a gravação assim que a tela
  apaga, e a função principal do app morre em silêncio.
- `CFBundleDevelopmentRegion` em `pt-BR`.
- O plugin `@capacitor-community/background-geolocation` já aparece como plugin iOS.

## Como montar, num Mac com Xcode

```sh
npm ci
npm run build          # precisa de VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npx cap sync ios
cd ios/App && pod install
open App.xcworkspace
```

No Xcode: escolher o time de desenvolvedor, conferir **Signing & Capabilities → Background
Modes → Location updates**, e arquivar.

## O que NÃO vai para o repositório

A cópia do site dentro do app (`App/App/public/`), o `capacitor.config.json` gerado, os
`Pods/` e o `Podfile.lock`: tudo isso sai de `npx cap sync ios` e de `pod install`, não é
código-fonte. O resto fica versionado, igual à pasta `android/`.

## Material das lojas

Ficha, política de privacidade, justificativas e roteiro do vídeo estão em
`/mnt/project-files/geo-lojas/`.
