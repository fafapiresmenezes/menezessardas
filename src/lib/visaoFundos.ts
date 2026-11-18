/**
 * Fase R do plano v5 — separação por nível na casa de fundos.
 * Quem está a ver (pessoa da demonstração), que ecrã cada nível abre, e que dados vê dentro dele.
 * O motor da decisão é o podeVerItem de hierarquiaCorporativa: nada aqui inventa regra nova.
 */
import { podeVerItem, type Item, type Pessoa, type Nivel, descricaoNivel } from '@/lib/hierarquiaCorporativa'
import { PESSOAS_DEMO, type PessoaDemo } from '@/data/demoObraAngola'

const CHAVE = 'gm-fundos-ver-como'
const EVENTO = 'fundos-ver-como'

/** Na demonstração, vê-se a casa pelos olhos de uma pessoa N1 a N5 (externos ficam de fora). */
export const VISTAS: PessoaDemo[] = PESSOAS_DEMO.filter(p => p.nivel && p.nivel !== 'N6')

export function pessoaActual(): PessoaDemo {
  try {
    const id = localStorage.getItem(CHAVE)
    const p = VISTAS.find(v => v.id === id)
    if (p) return p
  } catch { /* sem localStorage: segue o padrão */ }
  return VISTAS.find(v => v.id === 'ceo') ?? VISTAS[0]
}

export function escolherPessoa(id: string) {
  try { localStorage.setItem(CHAVE, id) } catch { /* sem localStorage */ }
  window.dispatchEvent(new Event(EVENTO))
}

export function aoMudarPessoa(f: () => void): () => void {
  window.addEventListener(EVENTO, f)
  return () => window.removeEventListener(EVENTO, f)
}

/** Que níveis abrem cada ecrã da casa de fundos. Fora da lista: sem acesso, mesmo pelo endereço. */
export const ECRAS_POR_NIVEL: Record<string, Nivel[]> = {
  '/visao-presidente': ['N1', 'N2'],
  '/carteira-projectos': ['N1', 'N2', 'N3', 'N4'],
  '/contratos-obrigacoes': ['N1', 'N2', 'N3', 'N4'],
  '/pagamentos-fundos': ['N1', 'N2', 'N3', 'N4'],
  '/fornecedores-fundos': ['N1', 'N2', 'N3', 'N4'],
  '/garantias-licencas': ['N1', 'N2', 'N3', 'N4'],
  '/riscos-litigios': ['N1', 'N2', 'N3', 'N4'],
  '/documentos-fundos': ['N1', 'N2', 'N3', 'N4'],
  '/estudos-governo': ['N1', 'N2', 'N3'],
  '/assistente-fundos': ['N1', 'N2', 'N3', 'N4', 'N5'],
  '/demonstracao-obra': ['N1', 'N2', 'N3', 'N4', 'N5'],
}

export function veEcra(p: Pessoa, rota: string): boolean {
  const niveis = ECRAS_POR_NIVEL[rota]
  if (!niveis) return true // ecrã fora da casa de fundos: não é daqui que se decide
  return !!p.nivel && niveis.includes(p.nivel)
}

/** Recorte de registos: cada registo etiquetado (país, sector, projecto) passa pelo podeVerItem. */
export function recorte<T extends { item: Item }>(p: Pessoa, xs: T[]): T[] {
  return xs.filter(x => podeVerItem(p, x.item))
}

/** Projectos (carteira): a direcção toda vê a carteira do seu país; a gerência vê os seus projectos. */
export function veProjecto(p: Pessoa, proj: { pais: string; id: string }): boolean {
  switch (p.nivel) {
    case 'N1': return true
    case 'N2': case 'N3': return p.paises.includes(proj.pais)
    case 'N4': case 'N5': return p.projetos.includes(proj.id)
    default: return false
  }
}

/** A frase do recorte, visível no topo de cada ecrã. */
export function fraseDoRecorte(p: PessoaDemo): string {
  return `A ver como ${p.nome} (${p.cargo}). ${p.nivel ? descricaoNivel[p.nivel] : ''}`
}
