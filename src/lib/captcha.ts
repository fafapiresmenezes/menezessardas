/**
 * Trava "não sou robô" (hCaptcha) da entrada. O servidor de contas recusa a entrada com senha
 * quando o pedido chega sem o comprovante desta caixinha, então a tela precisa mostrá-la.
 *
 * O código do site é público (aparece para qualquer visitante). O segredo fica só no servidor.
 */
// Código público do site theye.club no hCaptcha (M, 19/11/2026). Fica no código para que toda
// publicação saia com a caixinha, sem depender de variável no computador de quem publica.
const SITEKEY_DA_CASA = 'be44126e-bd62-465a-82de-2d880a80ffda'
const doBuild = (import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined)?.trim()
// VITE_HCAPTCHA_SITEKEY=desligado tira a caixinha (para quando a trava for desligada no servidor).
export const CAPTCHA_SITEKEY: string = import.meta.env.MODE === 'test' || doBuild === 'desligado' ? '' : doBuild || SITEKEY_DA_CASA
export const captchaLigado = () => CAPTCHA_SITEKEY.length > 0
