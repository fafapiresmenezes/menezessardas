import { Link, useLocation } from 'react-router-dom'
import Marca from '@/components/Marca'
import { PORTAIS_INSTITUTO } from '@/data/portais-instituto'
import { PORTAIS_I18N, ROTULO_ESTADO_I18N, EXPLICACAO_ESTADO_I18N, type RotaPortal } from '@/data/portais-instituto-i18n'
import { useIdioma } from '@/lib/i18n'
import SeletorIdioma from '@/components/SeletorIdioma'

/**
 * Passo B7: uma página por porta do Instituto que ainda está em desenvolvimento.
 *
 * A mesma página serve as oito portas: ela descobre qual é pelo endereço, o que evita oito
 * arquivos quase iguais. O ESCOPO de cada porta (rota, estado) vive em
 * src/data/portais-instituto.ts; o TEXTO em quatro línguas (V6, 13/11/2026) vive em
 * src/data/portais-instituto-i18n.ts. Idioma vem do seletor da porta, não do navegador.
 *
 * Duas decisões ditas por escrito, para quem mexer depois:
 *  - Nenhuma página promete prazo, por decisão de M. Diz o escopo e o estado, e para aí.
 *  - O botão "Avise-me" ainda NÃO existe aqui. Ele depende do e-mail contato@theye.club, que é o
 *    passo A13 e espera três cliques de M na Squarespace. Em vez de um botão que não leva a lugar
 *    nenhum, a página diz onde falar com o Instituto hoje.
 */
const AVISO_SEM_PRAZO: Record<string, string> = {
  pt: 'Esta página diz o escopo e o estado, e não promete data. Quando houver o que usar, ela deixa de ser esta página.',
  en: 'This page states the scope and the state, and promises no date. When there is something to use, it stops being this page.',
  zh: '本页说明范围与进展,不承诺日期。等到可用之时,它就不再是这样一页。',
  es: 'Esta página dice el alcance y el estado, y no promete fecha. Cuando haya algo para usar, dejará de ser esta página.',
}
const TITULO_ESCOPO: Record<string, string> = {
  pt: 'O que esta porta vai fazer',
  en: 'What this door will do',
  zh: '这扇门将会做什么',
  es: 'Lo que esta puerta hará',
}
const TITULO_CONTATO: Record<string, string> = {
  pt: 'Quer acompanhar?',
  en: 'Want to follow along?',
  zh: '想持续关注吗?',
  es: '¿Quiere seguir de cerca?',
}
const TEXTO_CONTATO: Record<string, (entrada: string) => JSX.Element> = {
  pt: entrada => <>O endereço de contato do Instituto está sendo ligado. Até ele responder, quem já usa a plataforma de direito fala pela própria plataforma, e quem ainda não usa pode começar pela <Link to="/login" title="Abre a entrada da plataforma de direito, que já está no ar" className="underline decoration-white/40">{entrada}</Link>.</>,
  en: entrada => <>The Institute's contact address is being set up. Until it answers, those already using the law platform speak through the platform itself, and those who are not yet can begin at the <Link to="/login" title="Opens the entrance to the law platform, which is already live" className="underline decoration-white/40">{entrada}</Link>.</>,
  zh: entrada => <>学院的联系地址正在搭建。开通之前,已在使用法律平台的用户在平台内沟通,尚未使用的可从<Link to="/login" title="打开已上线的法律平台入口" className="underline decoration-white/40">{entrada}</Link>开始。</>,
  es: entrada => <>La dirección de contacto del Instituto se está conectando. Hasta que responda, quienes ya usan la plataforma de derecho hablan por la propia plataforma, y quienes aún no pueden comenzar por la <Link to="/login" title="Abre la entrada de la plataforma de derecho, que ya está en el aire" className="underline decoration-white/40">{entrada}</Link>.</>,
}
const NOME_ENTRADA: Record<string, string> = { pt: 'entrada', en: 'entrance', zh: '入口', es: 'entrada' }
const TODAS_AS_PORTAS: Record<string, string> = { pt: 'Todas as portas', en: 'All doors', zh: '所有门', es: 'Todas las puertas' }
const PORTA_NAO_EXISTE: Record<string, string> = { pt: 'Esta porta não existe', en: 'This door does not exist', zh: '此门不存在', es: 'Esta puerta no existe' }
// Tradução por máquina erra termo jurídico e de engenharia. Até um revisor humano ler, a versão
// de referência é a portuguesa, e a página diz isso (restrição do passo V6).
const REFERENCIA_PT: Record<string, string> = {
  pt: 'Versão de referência: português. As traduções ainda não passaram por revisor humano.',
  en: 'Reference version: Portuguese. The translations have not yet been reviewed by a human.',
  zh: '基准版本:葡萄牙语。译文尚未经过人工审校。',
  es: 'Versión de referencia: portugués. Las traducciones aún no las revisó una persona.',
}
const MVP_GEO_TITULO: Record<string, string> = {
  pt: 'O MVP já está no ar',
  en: 'The MVP is already live',
  zh: 'MVP 已经上线',
  es: 'El MVP ya está en el aire',
}
const MVP_GEO_TEXTO: Record<string, string> = {
  pt: 'Geolocalização no próprio titular: posição, mapa, câmera como sensor de lugar, satélites e município. Tudo cifrado, só no seu aparelho; a porta é a senha do cofre que você cria.',
  en: 'Geolocation on the data subject themself: position, map, camera as a place sensor, satellites and municipality. All encrypted, only on your device; the door is the vault password you create.',
  zh: '在数据主体本人身上做地理定位:位置、地图、作为地点传感器的相机、卫星与市级数据。全部加密,只存于您的设备;入口是您自己创建的保险柜密码。',
  es: 'Geolocalización en el propio titular: posición, mapa, cámara como sensor de lugar, satélites y municipio. Todo cifrado, solo en su aparato; la puerta es la contraseña del cofre que usted crea.',
}
const MVP_GEO_BOTAO: Record<string, string> = {
  pt: 'Abrir o MVP de geomapeamento',
  en: 'Open the geomapping MVP',
  zh: '打开地理图谱 MVP',
  es: 'Abrir el MVP de geomapeo',
}
const DEMO_FUNDOS_TITULO: Record<string, string> = {
  pt: 'A demonstração já funciona',
  en: 'The demonstration already works',
  zh: '演示已经可用',
  es: 'La demostración ya funciona',
}
const DEMO_FUNDOS_TEXTO: Record<string, string> = {
  pt: 'Catorze telas a funcionar: carteira por país e cor, medição de obra, pagamentos, riscos, garantias, documentos e prestação de contas — com dados de exemplo citados e as regras da literatura dentro de cada tela. Quem tem acesso entra direto; quem ainda não tem passa pela entrada.',
  en: 'Fourteen working screens: portfolio by country and colour, works measurement, payments, risks, guarantees, documents and reporting — with cited sample data and the literature’s rules inside each screen. Those with access go straight in; those without pass through the entrance.',
  zh: '十四个可用页面：按国家和状态分类的项目组合、工程计量、付款、风险、担保、文件与报告——示例数据均注明出处，每个页面内都有文献规则。有权限者直接进入；尚无权限者经由入口。',
  es: 'Catorce pantallas funcionando: cartera por país y color, medición de obra, pagos, riesgos, garantías, documentos y rendición de cuentas — con datos de ejemplo citados y las reglas de la literatura dentro de cada pantalla. Quien tiene acceso entra directo; quien aún no, pasa por la entrada.',
}
const DEMO_FUNDOS_BOTAO: Record<string, string> = {
  pt: 'Abrir a demonstração',
  en: 'Open the demonstration',
  zh: '打开演示',
  es: 'Abrir la demostración',
}
const VEJA_PORTAS: Record<string, (link: JSX.Element) => JSX.Element> = {
  pt: link => <>Veja as portas do Instituto em {link}.</>,
  en: link => <>See the Institute's doors at {link}.</>,
  zh: link => <>请在 {link} 查看学院的门。</>,
  es: link => <>Vea las puertas del Instituto en {link}.</>,
}

export default function PortalInstitutoPage() {
  const { pathname } = useLocation()
  const idioma = useIdioma()
  const rota = pathname.replace(/\/$/, '')
  const portal = PORTAIS_INSTITUTO.find(p => p.rota === rota)
  const traduzido = portal ? PORTAIS_I18N[portal.rota as RotaPortal]?.[idioma] ?? PORTAIS_I18N[portal.rota as RotaPortal]?.pt : null
  const nome = traduzido?.nome ?? portal?.nome ?? ''
  const resumo = traduzido?.resumo ?? portal?.resumo ?? ''
  const escopo = traduzido?.escopo ?? portal?.escopo ?? []
  const comoEsta = traduzido?.comoEsta ?? portal?.comoEsta ?? ''

  if (!portal) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-8"><Marca /></div>
          <h1 className="text-2xl font-serif text-white mb-3">{PORTA_NAO_EXISTE[idioma]}</h1>
          <p className="text-sm text-neutral-300">
            {VEJA_PORTAS[idioma](
              <Link to="/portais" title={TODAS_AS_PORTAS[idioma]} className="underline decoration-white/40">{TODAS_AS_PORTAS[idioma]}</Link>,
            )}
          </p>
          <SeletorIdioma />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-10"><Marca /></div>

        <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">Instituto THEYE</p>
        <h1 className="text-3xl font-serif text-white mt-2 mb-3">{nome}</h1>
        <p className="text-base text-white/80">{resumo}</p>

        <p
          className="inline-flex items-center gap-2 mt-6 border border-neutral-400 px-3 py-1.5 text-xs uppercase tracking-wider"
          title={EXPLICACAO_ESTADO_I18N[idioma][portal.estado]}
          data-testid="estado-portal"
        >
          {ROTULO_ESTADO_I18N[idioma][portal.estado]}
        </p>
        <p className="text-sm text-neutral-400 mt-3">{comoEsta}</p>

        <h2 className="text-lg font-serif text-white mt-10 mb-3">{TITULO_ESCOPO[idioma]}</h2>
        <ul className="space-y-3" data-testid="escopo-portal">
          {escopo.map(item => (
            <li key={item} className="text-sm text-white/80 flex gap-3">
              <span aria-hidden="true" className="text-neutral-400">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {portal.rota === '/geomapeamento' && (
          <div className="mt-8 border border-dourado/60 p-4" data-testid="mvp-geo">
            <h2 className="text-lg font-serif text-white mb-2">{MVP_GEO_TITULO[idioma]}</h2>
            <p className="text-sm text-white/80 mb-3">{MVP_GEO_TEXTO[idioma]}</p>
            <Link to="/geo" title={MVP_GEO_TEXTO[idioma]} className="inline-block min-h-[44px] leading-[44px] px-5 bg-white text-black text-sm">{MVP_GEO_BOTAO[idioma]}</Link>
          </div>
        )}

        {portal.rota === '/fundos-internacionais' && (
          <div className="mt-8 border border-dourado/60 p-4" data-testid="demo-fundos">
            <h2 className="text-lg font-serif text-white mb-2">{DEMO_FUNDOS_TITULO[idioma]}</h2>
            <p className="text-sm text-white/80 mb-3">{DEMO_FUNDOS_TEXTO[idioma]}</p>
            <Link to="/visao-presidente" title={DEMO_FUNDOS_TEXTO[idioma]} className="inline-block min-h-[44px] leading-[44px] px-5 bg-white text-black text-sm">{DEMO_FUNDOS_BOTAO[idioma]}</Link>
          </div>
        )}

        {/* Sem prazo, de propósito: é regra do plano, e fica dito na própria página. */}
        <p className="text-xs text-neutral-300 mt-6">
          {AVISO_SEM_PRAZO[idioma]}
        </p>

        <h2 className="text-lg font-serif text-white mt-10 mb-3">{TITULO_CONTATO[idioma]}</h2>
        <p className="text-sm text-white/70">
          {TEXTO_CONTATO[idioma](NOME_ENTRADA[idioma])}
        </p>

        <nav className="mt-12 pt-6 border-t border-neutral-500 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/portais" title={TODAS_AS_PORTAS[idioma]} className="text-neutral-400 hover:text-white underline decoration-white/20">{TODAS_AS_PORTAS[idioma]}</Link>
          {PORTAIS_INSTITUTO.filter(p => p.rota !== portal.rota).map(p => {
            const outro = PORTAIS_I18N[p.rota as RotaPortal]?.[idioma] ?? PORTAIS_I18N[p.rota as RotaPortal]?.pt
            const nomeOutro = outro?.nome ?? p.nome
            const resumoOutro = outro?.resumo ?? p.resumo
            return (
              <Link key={p.rota} to={p.rota} title={resumoOutro} className="text-neutral-400 hover:text-white underline decoration-white/20">{nomeOutro}</Link>
            )
          })}
        </nav>

        {idioma !== 'pt' && (
          <p className="text-xs text-neutral-400 mt-6" data-testid="referencia-pt">{REFERENCIA_PT[idioma]}</p>
        )}

        <SeletorIdioma />
      </div>
    </div>
  )
}
