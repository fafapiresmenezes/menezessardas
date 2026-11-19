import { useEffect, useRef } from 'react'
import { CAPTCHA_SITEKEY } from '@/lib/captcha'

type Hc = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string | number
  reset: (id?: string | number) => void
  remove?: (id?: string | number) => void
}
declare global { interface Window { hcaptcha?: Hc } }

const ENDERECO = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off'
let carregando: Promise<Hc> | null = null

/** Carrega o programa do hCaptcha uma vez só, na primeira tela que precisar dele. */
function carregar(): Promise<Hc> {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha)
  if (!carregando) {
    carregando = new Promise<Hc>((ok, falha) => {
      const s = document.createElement('script')
      s.src = ENDERECO
      s.async = true
      s.onload = () => (window.hcaptcha ? ok(window.hcaptcha) : falha(new Error('hcaptcha')))
      s.onerror = () => { carregando = null; falha(new Error('hcaptcha')) }
      document.head.appendChild(s)
    })
  }
  return carregando
}

/**
 * A caixinha "não sou robô". Entrega o comprovante por `aoMudar` (vazio quando vence ou falha).
 * Cada comprovante vale para um pedido só: troque `rodada` depois de cada tentativa para pedir outro.
 */
export default function CaptchaRobo({ aoMudar, rodada = 0, idioma = 'pt-BR' }: { aoMudar: (comprovante: string) => void; rodada?: number; idioma?: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const id = useRef<string | number | null>(null)
  const avisar = useRef(aoMudar)
  avisar.current = aoMudar

  useEffect(() => {
    if (!CAPTCHA_SITEKEY) return
    let vivo = true
    carregar().then(hc => {
      if (!vivo || !caixa.current || id.current !== null) return
      id.current = hc.render(caixa.current, {
        sitekey: CAPTCHA_SITEKEY,
        hl: idioma,
        callback: (c: string) => avisar.current(c),
        'expired-callback': () => avisar.current(''),
        'error-callback': () => avisar.current(''),
      })
    }).catch(() => avisar.current(''))
    return () => {
      vivo = false
      if (id.current !== null) { try { window.hcaptcha?.remove?.(id.current) } catch { /* já saiu da tela */ } id.current = null }
    }
  }, [idioma])

  useEffect(() => {
    if (rodada > 0 && id.current !== null) { try { window.hcaptcha?.reset(id.current) } catch { /* nada a refazer */ } avisar.current('') }
  }, [rodada])

  if (!CAPTCHA_SITEKEY) return null
  return <div ref={caixa} data-testid="captcha-robo" className="flex min-h-[78px] justify-center" aria-label="Conferência: não sou robô" />
}
