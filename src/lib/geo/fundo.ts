// R9 (G8, etapa 2): gravar a posição com a tela apagada e o app no bolso.
//
// POR QUE ISTO EXISTE: o navegador do celular para de dar a posição quando a tela apaga.
// Dentro do aplicativo, o plugin @capacitor-community/background-geolocation sobe um
// "serviço em primeiro plano" do Android, que mantém a gravação viva — e, por exigência da
// plataforma E da LGPD, obriga uma notificação permanente dizendo que a posição está sendo usada.
// Essa notificação é uma garantia para o titular, não um estorvo: nunca gravamos escondido.
//
// O QUE NÃO MUDA: o ponto vindo do fundo entra pelo MESMO cofre cifrado e pela MESMA corrente
// de hash dos pontos do primeiro plano (Cofre.gravarPonto). Nenhuma posição vai para servidor.
//
// PERMISSÃO QUE DE PROPÓSITO NÃO PEDIMOS: ACCESS_BACKGROUND_LOCATION. Com o serviço em primeiro
// plano, iniciado com o app aberto, a localização fina basta. Pedir a permissão de "sempre"
// daria ao app mais poder do que ele precisa.
import { registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation'
import type { Ponto } from './calculo'
import { dentroDoApp } from './nativo'

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

/** O texto que o titular vê na notificação permanente enquanto a gravação do fundo está ligada. */
export const AVISO_TITULO = 'THEYE Geo está gravando sua posição'
export const AVISO_TEXTO = 'Toque para abrir e desligar. Os dados ficam cifrados só neste aparelho.'

/** Só dentro do aplicativo: no navegador o plugin não existe, e a função diz isso em vez de quebrar. */
export function fundoDisponivel(): boolean {
  return dentroDoApp()
}

/**
 * Decide se este ponto deve ser gravado, respeitando o intervalo escolhido pelo titular.
 * Função pura, para poder ser provada sem GPS nenhum.
 * - o primeiro ponto (ultimoT = 0) sempre entra;
 * - um ponto com horário igual ou anterior ao último gravado nunca entra (evita repetido);
 * - um relógio que pula para trás não tranca a gravação para sempre.
 */
export function deveGravar(ultimoT: number, agoraT: number, intervaloSeg: number): boolean {
  if (!Number.isFinite(agoraT) || agoraT <= 0) return false
  if (ultimoT <= 0) return true
  if (agoraT <= ultimoT) return false
  const intervalo = Math.max(1, intervaloSeg || 60) * 1000
  return agoraT - ultimoT >= intervalo
}

/**
 * Converte o que o plugin entrega no Ponto que o cofre guarda. Devolve null quando a leitura
 * não serve (sem horário, sem coordenada, ou posição simulada por software — que entraria na
 * corrente como se fosse real).
 */
export function paraPonto(l: Location, bateria: number | null): Ponto | null {
  if (!l || l.simulated) return null
  if (!Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) return null
  const t = typeof l.time === 'number' && l.time > 0 ? l.time : 0
  if (!t) return null
  return {
    t,
    lat: l.latitude,
    lon: l.longitude,
    precisao: Number.isFinite(l.accuracy) ? l.accuracy : 0,
    velocidade: typeof l.speed === 'number' ? l.speed : null,
    bateria,
  }
}

/** Traduz os erros do plugin para o que o titular precisa fazer, sem jargão. */
export function recado(erro: { code?: string; message?: string }): string {
  if (erro?.code === 'NOT_AUTHORIZED') return 'O aparelho não liberou a localização para o app. Abra os ajustes do THEYE Geo e escolha "Permitir ao usar o app".'
  if (erro?.code === 'NOT_AVAILABLE') return 'A localização do aparelho está desligada. Ligue o GPS e tente de novo.'
  return erro?.message ? `O aparelho não deu a posição: ${erro.message}` : 'O aparelho não deu a posição.'
}

export interface OpcoesFundo {
  /** metros que o aparelho precisa andar para valer um ponto novo; 0 grava a cada leitura. */
  metros?: number
}

/**
 * Liga a gravação em segundo plano e devolve o identificador do vigia (para desligar depois).
 * `aoPonto` é chamado a cada leitura; `aoErro`, quando o aparelho recusa.
 */
export async function ligarFundo(
  opcoes: OpcoesFundo,
  aoPonto: (l: Location) => void,
  aoErro: (recadoEmPortugues: string) => void,
): Promise<string> {
  return BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: AVISO_TITULO,
      backgroundMessage: AVISO_TEXTO,
      requestPermissions: true,
      stale: false,
      distanceFilter: Math.max(0, opcoes.metros ?? 0),
    },
    (position, error) => {
      if (error) return aoErro(recado(error))
      if (position) aoPonto(position)
    },
  )
}

export async function desligarFundo(id: string): Promise<void> {
  try { await BackgroundGeolocation.removeWatcher({ id }) } catch { /* já estava desligado */ }
}

/** Abre a tela de ajustes do próprio app, para o titular liberar a localização com as próprias mãos. */
export async function abrirAjustesDoApp(): Promise<void> {
  try { await BackgroundGeolocation.openSettings() } catch { /* nada a fazer daqui */ }
}
