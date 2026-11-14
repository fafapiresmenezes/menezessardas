import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { perfilAtual } from '@/lib/equipe'
import { registrarEvento } from '@/lib/trilha'
import { FlaskConical, Lock, Video, VideoOff } from 'lucide-react'

// Bloco B13 (decisão de M, 06/11/2026 04:02Z): laboratório de autoavaliação por câmera SÓ para administradores que
// assinem o aviso LGPD. Tudo roda no navegador: nenhum quadro, imagem ou número sai desta tela nem é gravado.
// Não mede emoções nem "lê" microexpressões: mostra ao próprio administrador a sua agitação e a sua fala, para treino.
// Nunca pode ser usado para avaliar clientes, partes ou terceiros.

export const AVISO_VERSAO = 'B13-2026-11-06'
export const AVISO = `Aviso LGPD do laboratório (versão ${AVISO_VERSAO}). Eu, administrador(a), declaro que: (1) usarei a câmera só para me observar, nunca para avaliar cliente, parte, colega ou qualquer terceiro; (2) sei que o processamento é local, no meu navegador, e que nenhuma imagem, quadro ou medida é gravada ou enviada; (3) sei que a ferramenta é experimental, não mede emoções nem intenções e não tem valor probatório; (4) a leitura de microexpressões de terceiros é dado biométrico sensível (LGPD, art. 5º, II e art. 11) e não é oferecida por esta plataforma; (5) posso encerrar a qualquer momento, e encerrar apaga tudo.`
const CHAVE = 'lab-admin-aviso'

/** Índice de agitação entre dois quadros em escala de cinza (0 a 100): média da diferença absoluta por pixel. */
export function agitacao(antes: Uint8ClampedArray, depois: Uint8ClampedArray): number {
  if (!antes.length || antes.length !== depois.length) return 0
  let soma = 0, n = 0
  for (let i = 0; i < antes.length; i += 4) {
    const a = (antes[i] + antes[i + 1] + antes[i + 2]) / 3, b = (depois[i] + depois[i + 1] + depois[i + 2]) / 3
    soma += Math.abs(a - b); n++
  }
  return Math.round((soma / n) / 255 * 1000) / 10
}

export function lerAssinaturaLocal(): { versao: string; em: string } | null {
  try { const b = localStorage.getItem(CHAVE); return b ? JSON.parse(b) : null } catch { return null }
}

export default function LaboratorioAdminPage() {
  const [perfil, setPerfil] = useState<'carregando' | 'admin' | 'outro'>('carregando')
  const [assinado, setAssinado] = useState<{ versao: string; em: string } | null>(null)
  const [marcado, setMarcado] = useState(false)
  const [camera, setCamera] = useState<'desligada' | 'ligando' | 'ligada' | 'negada'>('desligada')
  const [indice, setIndice] = useState<number | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [nota, setNota] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    perfilAtual().then(f => setPerfil(f === 'admin' ? 'admin' : 'outro')).catch(() => setPerfil('outro'))
    const a = lerAssinaturaLocal(); if (a?.versao === AVISO_VERSAO) setAssinado(a)
    return () => desligar()
  }, [])

  const assinar = async () => {
    const a = { versao: AVISO_VERSAO, em: new Date().toISOString() }
    try { localStorage.setItem(CHAVE, JSON.stringify(a)) } catch { /* sem armazenamento: vale só nesta sessão */ }
    setAssinado(a)
    // Só o fato de ter assinado vai para a trilha de auditoria; nenhuma medida do laboratório sai desta tela.
    await registrarEvento({ tipo: 'laboratorio_admin_aviso_assinado', entidade: 'laboratorio-admin', resumo: `Aviso LGPD do laboratório assinado (versão ${AVISO_VERSAO})` })
  }

  const ligar = async () => {
    setCamera('ligando')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      fluxo.current = s
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => undefined) }
      setCamera('ligada')
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      let anterior: Uint8ClampedArray | null = null
      timer.current = window.setInterval(() => {
        setSegundos(x => x + 1)
        if (!ctx || !video.current) return
        ctx.drawImage(video.current, 0, 0, 64, 48)
        const atual = ctx.getImageData(0, 0, 64, 48).data
        if (anterior) setIndice(agitacao(anterior, atual))
        anterior = new Uint8ClampedArray(atual)
      }, 1000)
    } catch { setCamera('negada') }
  }

  const desligar = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    fluxo.current?.getTracks().forEach(t => t.stop()); fluxo.current = null
    if (video.current) video.current.srcObject = null
    setCamera('desligada'); setIndice(null); setSegundos(0); setNota('')
  }

  if (perfil === 'carregando') return <Layout title="Laboratório"><p className="text-sm text-grafite-claro" role="status">Conferindo o seu perfil…</p></Layout>
  if (perfil !== 'admin') {
    return <Layout title="Laboratório"><Vazio testid="lab-bloqueado" icone={<Lock size={28} />} titulo="Só administradores entram aqui" texto="Por decisão da direção, o laboratório de autoavaliação é restrito a administradores que assinaram o aviso LGPD. Ele não serve para avaliar clientes ou partes." acao={{ rotulo: 'Voltar ao início', para: '/inicio' }} /></Layout>
  }

  return (
    <Layout title="Laboratório de autoavaliação (administradores)">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-dourado-escuro font-semibold"><FlaskConical className="w-4 h-4" aria-hidden />Experimental · processamento local · nada é gravado</p>
          <p className="text-sm text-grafite-claro">Este laboratório existe para você se observar antes de uma audiência ou reunião: quanto se mexe, quanto tempo fala, como se sente. Ele <b>não lê microexpressões, não mede emoções e nunca avalia outra pessoa</b>. Tudo acontece no seu navegador; ao encerrar, nada fica.</p>
          {!assinado ? (
            <div className="space-y-3" data-testid="lab-aviso">
              <p className="text-sm border border-navy/20 p-4 bg-marfim/40">{AVISO}</p>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" title="Marque para dizer que leu o aviso e concorda. Sem isso o laboratório não abre." checked={marcado} onChange={e => setMarcado(e.target.checked)} className="mt-1 w-5 h-5 shrink-0" /><span>Li e assino este aviso como administrador(a).</span></label>
              <button type="button" disabled={!marcado} onClick={assinar} title="Registra a sua assinatura do aviso LGPD neste navegador e libera o laboratório de autoavaliação" className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-40">Assinar e liberar o laboratório</button>
            </div>
          ) : (
            <p className="text-sm text-grafite-claro" data-testid="lab-assinado">Aviso assinado em {new Date(assinado.em).toLocaleString('pt-BR')} (versão {assinado.versao}). A assinatura fica só neste navegador; a trilha de auditoria registra apenas o fato.</p>
          )}
        </section>

        {assinado && (
          <section className="bg-white shadow-sm p-6 space-y-4" data-testid="lab-camera">
            <h2 className="font-serif text-xl">Sessão</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/90 aspect-video flex items-center justify-center text-white/70 text-sm">
                <video ref={video} muted playsInline className={`w-full h-full object-cover ${camera === 'ligada' ? '' : 'hidden'}`} aria-label="Sua câmera, só para você" />
                {camera !== 'ligada' && <span>{camera === 'negada' ? 'A câmera não foi liberada pelo navegador.' : camera === 'ligando' ? 'Pedindo a câmera…' : 'Câmera desligada'}</span>}
              </div>
              <div className="space-y-3 text-sm">
                <p><b>Tempo de sessão:</b> <span data-testid="lab-segundos">{segundos}</span> s</p>
                <p><b>Agitação (0 a 100):</b> <span data-testid="lab-indice">{indice == null ? '—' : indice.toFixed(1)}</span> <span className="text-grafite-claro">· quanto a imagem muda de um segundo para o outro; não é emoção</span></p>
                <label className="block"><span className="font-medium">Como me sinto agora (só para mim, apaga ao encerrar)</span><textarea title="Anotação só sua, guardada neste navegador e apagada quando a sessão encerra. Ninguém mais lê." value={nota} onChange={e => setNota(e.target.value)} rows={3} className="border w-full px-3 py-2 mt-1" /></label>
                <div className="flex gap-2">
                  {camera === 'ligada'
                    ? <button type="button" onClick={desligar} title="Desliga a câmera e apaga todas as medidas e a nota desta sessão" className="min-h-[44px] px-4 border border-navy text-sm uppercase tracking-wider inline-flex items-center gap-2"><VideoOff className="w-4 h-4" aria-hidden />Encerrar e apagar</button>
                    : <button type="button" onClick={ligar} disabled={camera === 'ligando'} title="Pede a câmera ao navegador e inicia a sessão de autoavaliação; nada é gravado ou enviado" className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-40"><Video className="w-4 h-4" aria-hidden />Ligar câmera</button>}
                </div>
              </div>
            </div>
            <p className="text-xs text-grafite-claro">Nenhum quadro é enviado a servidor, nenhuma medida é guardada, e não há botão de salvar de propósito. Usar esta tela com outra pessoa na frente da câmera viola o aviso assinado.</p>
          </section>
        )}
      </div>
    </Layout>
  )
}
