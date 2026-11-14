/**
 * Pedir entrada (porta pública). Problema #1 do planejamento: quem não é membro não tinha como
 * falar com o Instituto — os botões da porta terminavam todos na senha. Esta tela é o caminho.
 *
 * O pedido vai pela função do servidor `pedir-entrada` (confere, segura spam, grava). Nada escreve
 * direto no banco. Campo-armadilha escondido + tempo mínimo na tela cuidam de robô simples.
 *
 * Prefill: ?motivo=proposta&frente=engenharia deixa o motivo e a frente já escolhidos, para o
 * botão "Pedir proposta" de cada tela cair aqui com o assunto certo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Marca from '@/components/Marca'
import { pedirEntrada, type MotivoEntrada, type ReciboEntrada } from '@/lib/admissao'
import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'

const MOTIVOS: { valor: MotivoEntrada; rotulo: string; dica: string }[] = [
  { valor: 'entrada', rotulo: 'Entrar no Instituto', dica: 'Quero conhecer a plataforma e virar membro.' },
  { valor: 'proposta', rotulo: 'Pedir uma proposta', dica: 'Tenho um escritório ou órgão e quero preço e condições.' },
  { valor: 'aviso', rotulo: 'Ser avisado quando abrir', dica: 'A frente que me interessa ainda está em preparação; me avisem.' },
  { valor: 'apoio', rotulo: 'Apoiar o Instituto', dica: 'Quero doar ou apoiar a pesquisa.' },
]

const ROTULO = 'block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2'
const CAMPO = 'w-full bg-transparent border border-white/25 focus:border-white px-3 py-2.5 text-white placeholder-white/30 outline-none'

function motivoValido(v: string | null): MotivoEntrada {
  return (MOTIVOS.find(m => m.valor === v)?.valor) ?? 'entrada'
}

export default function AdmissaoPage() {
  const t = useTexto()
  const [params] = useSearchParams()
  const montadoEm = useRef(Date.now())
  const [nome, setNome] = useState('')
  const [escritorio, setEscritorio] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [motivo, setMotivo] = useState<MotivoEntrada>(motivoValido(params.get('motivo')))
  const [frente, setFrente] = useState(params.get('frente') ?? '')
  const [mensagem, setMensagem] = useState('')
  const [armadilha, setArmadilha] = useState('') // campo escondido
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [recibo, setRecibo] = useState<ReciboEntrada | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { montadoEm.current = Date.now() }, [])

  const reciboTexto = useMemo(() => recibo
    ? `Pedido de entrada no Instituto THEYE\nProtocolo: ${recibo.protocolo}\nEnviado em: ${new Date(recibo.criado_em).toLocaleString('pt-BR')}`
    : '', [recibo])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const r = await pedirEntrada({
      nome, escritorio, email, telefone, motivo, frente, mensagem,
      ms: Date.now() - montadoEm.current, site: armadilha,
    })
    setEnviando(false)
    if (r.erro) { setErro(r.erro); return }
    if (r.recibo) setRecibo(r.recibo)
  }

  async function copiarRecibo() {
    try { await navigator.clipboard.writeText(reciboTexto); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sem área de transferência */ }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center mb-10"><Marca tipo="instituto" /></div>

        {recibo ? (
          <div data-testid="recibo-entrada">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Admissão</p>
            <h1 className="text-3xl font-serif text-white mt-2 mb-4">Pedido registrado.</h1>
            <p className="text-base text-white/80">Uma pessoa do Instituto lê cada pedido e responde pelo contato que você informou, em até cinco dias úteis.</p>
            <div className="mt-6 border border-white/20 p-5">
              <p className="text-sm text-white/60">Seu protocolo</p>
              <p className="text-2xl font-serif mt-1" data-testid="protocolo">{recibo.protocolo}</p>
              <p className="mt-3 text-sm text-white/60">Enviado em {new Date(recibo.criado_em).toLocaleString('pt-BR')}</p>
            </div>
            <button
              type="button"
              onClick={copiarRecibo}
              title="Copia o número do pedido e a hora, para você guardar"
              className="mt-5 min-h-[44px] px-5 border border-white/40 hover:border-white text-xs uppercase tracking-[0.2em]"
            >
              {copiado ? 'Copiado' : 'Copiar o recibo'}
            </button>
            <p className="mt-10 pt-6 border-t border-white/10 text-sm">
              <Link to="/boas-vindas" title="Volta para a entrada do Instituto" className="text-white/60 hover:text-white underline decoration-white/20">Voltar para a porta</Link>
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Admissão</p>
            <h1 className="text-3xl font-serif text-white mt-2 mb-3">Pedir entrada no Instituto THEYE.</h1>
            <p className="text-base text-white/80 mb-8">A entrada é por admissão: uma pessoa lê o seu pedido e responde. Seis campos, dois minutos.</p>

            <form onSubmit={enviar} className="space-y-5" noValidate>
              {/* Campo-armadilha: fica fora da vista; só robô preenche. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
                <label>Site<input tabIndex={-1} autoComplete="off" aria-label="Deixe este campo em branco" value={armadilha} onChange={e => setArmadilha(e.target.value)} /></label>
              </div>

              <div>
                <label htmlFor="pe-motivo" className={ROTULO} title="Diga o que você quer; a resposta vai no caminho certo">Para quê</label>
                <select id="pe-motivo" className={CAMPO} value={motivo} onChange={e => setMotivo(e.target.value as MotivoEntrada)}>
                  {MOTIVOS.map(m => <option key={m.valor} value={m.valor} className="bg-black">{m.rotulo}</option>)}
                </select>
                <p className="text-xs text-white/40 mt-1">{MOTIVOS.find(m => m.valor === motivo)?.dica}</p>
              </div>

              <div>
                <label htmlFor="pe-nome" className={ROTULO}>Seu nome</label>
                <input id="pe-nome" className={CAMPO} value={nome} onChange={e => setNome(e.target.value)} required title="Como você quer ser chamado" />
              </div>

              <div>
                <label htmlFor="pe-escritorio" className={ROTULO}>Escritório ou órgão <span className="text-white/30">(se tiver)</span></label>
                <input id="pe-escritorio" className={CAMPO} value={escritorio} onChange={e => setEscritorio(e.target.value)} title="O nome do seu escritório, empresa ou órgão" />
              </div>

              <div>
                <label htmlFor="pe-email" className={ROTULO}>E-mail</label>
                <input id="pe-email" type="email" className={CAMPO} value={email} onChange={e => setEmail(e.target.value)} required title="Para onde enviamos a resposta" />
              </div>

              <div>
                <label htmlFor="pe-telefone" className={ROTULO}>Telefone ou WhatsApp <span className="text-white/30">(se quiser)</span></label>
                <input id="pe-telefone" className={CAMPO} value={telefone} onChange={e => setTelefone(e.target.value)} title="Se preferir que a gente ligue ou mande mensagem" />
              </div>

              <div>
                <label htmlFor="pe-frente" className={ROTULO}>Frente de interesse <span className="text-white/30">(se já souber)</span></label>
                <select id="pe-frente" className={CAMPO} value={frente} onChange={e => setFrente(e.target.value)}>
                  <option value="" className="bg-black">Qualquer / ainda não sei</option>
                  {VERTENTES.map(v => <option key={v.id} value={v.id} className="bg-black">{t(`vertente.${v.id}.nome` as Chave)}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="pe-mensagem" className={ROTULO}>Mensagem <span className="text-white/30">(opcional)</span></label>
                <textarea id="pe-mensagem" className={`${CAMPO} min-h-[96px]`} value={mensagem} onChange={e => setMensagem(e.target.value)} title="Conte em poucas linhas o que você precisa" />
              </div>

              {erro && <p role="alert" className="border border-white/40 p-3 text-sm text-white/90" data-testid="erro-entrada">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                title="Envia o seu pedido para o Instituto"
                className="min-h-[48px] w-full px-5 border border-white bg-white text-black font-medium hover:bg-white/90 disabled:opacity-40 uppercase tracking-[0.15em] text-sm"
              >
                {enviando ? 'Enviando…' : 'Enviar pedido'}
              </button>

              <p className="text-xs text-white/40 pt-2">
                Já é membro? <Link to="/login" title="Entrar na plataforma com a sua senha" className="underline decoration-white/30 hover:text-white">Entrar</Link>.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
