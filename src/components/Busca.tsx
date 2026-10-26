import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repositorio, type Imovel, type Contrato } from '@/lib/repositorio'
import { listarFornecedores, type Fornecedor } from '@/lib/fornecedores'
import { Search, Building2, FileText, Truck, LayoutGrid, CalendarDays, Bell, Gauge, FileBarChart, ShieldCheck, Scale, Users, Settings, HelpCircle, X } from 'lucide-react'

interface Resultado {
  grupo: 'Páginas' | 'Imóveis' | 'Contratos' | 'Fornecedores'
  rotulo: string
  detalhe?: string
  href: string
  icone: typeof Search
}

const PAGINAS: Resultado[] = [
  { grupo: 'Páginas', rotulo: 'Painel', href: '/dashboard', icone: LayoutGrid },
  { grupo: 'Páginas', rotulo: 'Imóveis', href: '/imoveis', icone: Building2 },
  { grupo: 'Páginas', rotulo: 'Novo imóvel', href: '/imoveis/novo', icone: Building2 },
  { grupo: 'Páginas', rotulo: 'Novo contrato', href: '/contrato/novo', icone: FileText },
  { grupo: 'Páginas', rotulo: 'Agenda', href: '/agenda', icone: CalendarDays },
  { grupo: 'Páginas', rotulo: 'Alertas', href: '/alertas', icone: Bell },
  { grupo: 'Páginas', rotulo: 'Fornecedores', href: '/fornecedores', icone: Truck },
  { grupo: 'Páginas', rotulo: 'Legislação', href: '/legislacao', icone: Scale },
  { grupo: 'Páginas', rotulo: 'Indicadores', href: '/indicadores', icone: Gauge },
  { grupo: 'Páginas', rotulo: 'Relatórios', href: '/relatorios', icone: FileBarChart },
  { grupo: 'Páginas', rotulo: 'Trilha de auditoria', href: '/trilha', icone: ShieldCheck },
  { grupo: 'Páginas', rotulo: 'Equipe', href: '/equipe', icone: Users },
  { grupo: 'Páginas', rotulo: 'Configurações', href: '/settings', icone: Settings },
  { grupo: 'Páginas', rotulo: 'Ajuda', href: '/ajuda', icone: HelpCircle },
]

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Busca global (Ctrl/⌘ + K): páginas, imóveis, contratos e fornecedores num só lugar.
 * Os dados vêm do repositório atual (demo ou Supabase), carregados ao abrir.
 */
export default function Busca({ aberta, fechar }: { aberta: boolean; fechar: () => void }) {
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const campo = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!aberta) return
    setTermo('')
    setAtivo(0)
    setTimeout(() => campo.current?.focus(), 30)
    Promise.all([repositorio.listarImoveis(), repositorio.listarContratos(), listarFornecedores()])
      .then(([i, c, f]) => {
        setImoveis(i)
        setContratos(c)
        setFornecedores(f)
      })
      .catch(() => {
        /* a busca por páginas continua funcionando sem os dados */
      })
  }, [aberta])

  const resultados = useMemo<Resultado[]>(() => {
    const t = normalizar(termo.trim())
    const bate = (...campos: (string | undefined)[]) => !t || campos.some(c => c && normalizar(c).includes(t))
    const porImovel = new Map(imoveis.map(i => [i.id, i.endereco]))
    const lista: Resultado[] = [
      ...PAGINAS.filter(p => bate(p.rotulo)),
      ...imoveis
        .filter(i => bate(i.endereco, i.proprietario))
        .map<Resultado>(i => ({ grupo: 'Imóveis', rotulo: i.endereco, detalhe: i.proprietario, href: `/contrato/${i.id}`, icone: Building2 })),
      ...contratos
        .filter(c => bate(c.parte, porImovel.get(c.imovelId)))
        .map<Resultado>(c => ({ grupo: 'Contratos', rotulo: c.parte, detalhe: porImovel.get(c.imovelId), href: `/contrato/${c.imovelId}`, icone: FileText })),
      ...fornecedores
        .filter(f => bate(f.nome, f.cnpj))
        .map<Resultado>(f => ({ grupo: 'Fornecedores', rotulo: f.nome, detalhe: f.cnpj, href: `/fornecedor/${f.id}`, icone: Truck })),
    ]
    return lista.slice(0, t ? 12 : 8)
  }, [termo, imoveis, contratos, fornecedores])

  useEffect(() => setAtivo(0), [resultados.length])

  if (!aberta) return null

  const ir = (r: Resultado) => {
    fechar()
    navigate(r.href)
  }

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo(a => Math.min(a + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && resultados[ativo]) {
      e.preventDefault()
      ir(resultados[ativo])
    } else if (e.key === 'Escape') {
      fechar()
    }
  }

  let grupoAnterior = ''
  return (
    <div
      className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-[2px] flex items-start justify-center p-4 pt-[12vh]"
      onClick={fechar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="w-full max-w-xl bg-white shadow-2xl border-t-2 border-dourado"
        onClick={e => e.stopPropagation()}
        onKeyDown={teclado}
      >
        <div className="flex items-center gap-3 px-4 border-b border-navy/10">
          <Search size={18} className="text-grafite-claro flex-shrink-0" aria-hidden="true" />
          <input
            ref={campo}
            type="search"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Buscar imóvel, contrato, fornecedor ou página…"
            aria-label="Buscar na plataforma"
            aria-controls="resultados-busca"
            className="flex-1 py-4 bg-transparent outline-none text-grafite"
          />
          <kbd className="hidden sm:inline text-[10px] uppercase tracking-wider text-grafite-claro border border-grafite-claro/30 rounded px-1.5 py-0.5">Esc</kbd>
          <button onClick={fechar} className="p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center sm:hidden" aria-label="Fechar busca">
            <X size={18} />
          </button>
        </div>
        <ul id="resultados-busca" role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
          {resultados.length === 0 && (
            <li className="px-4 py-6 text-sm text-grafite-claro text-center">Nada encontrado para “{termo}”.</li>
          )}
          {resultados.map((r, i) => {
            const cabecalho = r.grupo !== grupoAnterior
            grupoAnterior = r.grupo
            return (
              <li key={`${r.grupo}-${r.href}-${r.rotulo}`} role="presentation">
                {cabecalho && (
                  <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.16em] text-dourado-escuro">{r.grupo}</p>
                )}
                <button
                  role="option"
                  aria-selected={i === ativo}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => ir(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                    i === ativo ? 'bg-pergaminho border-l-2 border-dourado' : 'border-l-2 border-transparent hover:bg-pergaminho'
                  }`}
                >
                  <r.icone size={16} className="text-grafite-claro flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm text-navy truncate">{r.rotulo}</span>
                    {r.detalhe && <span className="block text-xs text-grafite-claro truncate">{r.detalhe}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="px-4 py-2 border-t border-navy/10 text-[11px] text-grafite-claro">
          ↑↓ navegar · Enter abrir · Esc fechar
        </p>
      </div>
    </div>
  )
}
