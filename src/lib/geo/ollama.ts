// G7: análise offline via Ollama local — os dados nunca saem do aparelho; o modelo roda no próprio computador.
// Usuário precisa ter Ollama em http://localhost:11434 com CORS aberto:
//   OLLAMA_ORIGINS=https://theye.club ollama serve

const CHAVE = 'theye-ollama-v1'

export interface OllamaConfig {
  url: string
  modelo: string
}

export function carregarConfigOllama(): OllamaConfig {
  try {
    const s = localStorage.getItem(CHAVE)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return { url: 'http://localhost:11434', modelo: 'qwen2.5:3b' }
}

export function salvarConfigOllama(c: OllamaConfig): void {
  localStorage.setItem(CHAVE, JSON.stringify(c))
}

export async function listarModelos(url: string): Promise<string[]> {
  const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) })
  if (!r.ok) throw new Error(`Ollama não respondeu (${r.status})`)
  const d: { models?: Array<{ name: string }> } = await r.json()
  return (d.models ?? []).map(m => m.name)
}

export async function* gerarTexto(url: string, modelo: string, prompt: string): AsyncGenerator<string> {
  const r = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelo, prompt, stream: true }),
    signal: AbortSignal.timeout(180000),
  })
  if (!r.ok) throw new Error(`Erro ao gerar: ${r.status}`)
  const reader = r.body!.getReader()
  const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const linha of dec.decode(value, { stream: true }).split('\n').filter(Boolean)) {
      try {
        const d = JSON.parse(linha) as { response?: string; done?: boolean }
        if (d.response) yield d.response
        if (d.done) return
      } catch { /* linha parcial */ }
    }
  }
}

export function promptSemana(resumo: {
  lugares: Array<{ nome?: string; minutos: number }>
  km: number
  dias: number
}): string {
  const lugs = resumo.lugares.map(l => `"${l.nome ?? 'lugar sem nome'}": ${l.minutos} min`).join(', ')
  return `Você é um assistente pessoal local offline (sem internet, sem nuvem).

Resumo dos últimos 7 dias:
- Lugares visitados: ${lugs || 'nenhum registrado'}
- Distância total: ${resumo.km.toFixed(1)} km
- Dias com dados: ${resumo.dias}

Em 2–3 parágrafos curtos em português: (1) descreva os padrões de movimento, (2) dê uma sugestão prática com base no que vê, (3) faça uma observação interessante ou curiosidade sobre o uso do espaço. Seja direto e útil.`
}

export function promptNoticias(municipio: string, noticias: Array<{ titulo: string; data: string; fonte: string }>): string {
  if (!noticias.length) return `Não há notícias recentes de ${municipio}. Diga isso em uma frase.`
  const lista = noticias.slice(0, 10).map(n => `• ${n.data}: ${n.titulo} (${n.fonte})`).join('\n')
  return `Você é um assistente local offline.

Notícias recentes de ${municipio}:
${lista}

Em 2–3 parágrafos em português: (1) liste os principais temas, (2) destaque algum padrão ou tendência, (3) dê uma dica prática ou de atenção para quem mora ou trabalha neste município. Seja conciso.`
}
