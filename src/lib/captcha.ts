/**
 * Trava "não sou robô" (hCaptcha) da entrada. O servidor de contas recusa a entrada com senha
 * quando o pedido chega sem o comprovante desta caixinha, então a tela precisa mostrá-la.
 *
 * O código do site é público (aparece para qualquer visitante). O segredo fica só no servidor.
 * Vazio = a tela não mostra a caixinha (serve para quando a trava estiver desligada no servidor).
 */
export const CAPTCHA_SITEKEY: string = (import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined)?.trim() || ''
export const captchaLigado = () => CAPTCHA_SITEKEY.length > 0
