// R8: o mesmo código que serve theye.club vira também um aplicativo Android.
// O site NÃO muda: o Capacitor só embrulha o que o `npm run build` já produz em dist/.
// Nada de credencial de assinatura aqui nem em lugar nenhum do repositório.
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'club.theye.geo',
  appName: 'THEYE Geo',
  webDir: 'dist',
  android: {
    // O app roda os arquivos do próprio aparelho, não um site remoto:
    // é isso que permite, no R9, gravar com a tela apagada.
    allowMixedContent: false,
    // R9, exigência do plugin de localização em segundo plano: sem a ponte antiga, o Android
    // corta as leituras depois de cinco minutos com o app no fundo
    // (capacitor-community/background-geolocation, issue 89).
    useLegacyBridge: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0B0B0C',
      showSpinner: false,
    },
  },
}

export default config
