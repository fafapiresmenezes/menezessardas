/**
 * Casa própria dos fundos (pedido de M, 19/11/2026: «não quero voltar para a plataforma de
 * direito; cria a plataforma nova, com o direito só de esqueleto»). Este ficheiro é o mapa da
 * casa: os ecrãs, o nome de cada um e o grupo do menu. Quem decide quem vê o quê continua a ser
 * ECRAS_POR_NIVEL em visaoFundos.ts — aqui é só o menu e o início.
 */
import { Landmark, Briefcase, FileSignature, Ruler, Wallet, Truck, ShieldCheck, Scale, FolderOpen, GraduationCap, BookOpen, Hammer, Bot, MessageSquare, type LucideIcon } from 'lucide-react'

export interface EcraFundos {
  rota: string
  nome: string
  resumo: string
  grupo: 'Direcção' | 'Projectos' | 'Governo' | 'Assistente'
  icone: LucideIcon
}

export const ECRAS_FUNDOS: EcraFundos[] = [
  { rota: '/visao-presidente', nome: 'Visão do presidente', resumo: 'A casa inteira numa página: carteira, cores, pagamentos e riscos.', grupo: 'Direcção', icone: Landmark },
  { rota: '/carteira-projectos', nome: 'Carteira de projectos', resumo: 'Os projectos por país e cor, com avanço e o que há a pagar.', grupo: 'Projectos', icone: Briefcase },
  { rota: '/contratos-obrigacoes', nome: 'Contratos e obrigações', resumo: 'Cada contrato com as suas obrigações e datas.', grupo: 'Projectos', icone: FileSignature },
  { rota: '/demonstracao-obra', nome: 'Medição de obra', resumo: 'O boletim de medição: o que foi feito, conferido conta a conta.', grupo: 'Projectos', icone: Ruler },
  { rota: '/pagamentos-fundos', nome: 'Pagamentos', resumo: 'O que há a pagar, a quem, e com que suporte.', grupo: 'Projectos', icone: Wallet },
  { rota: '/fornecedores-fundos', nome: 'Fornecedores', resumo: 'Quem fornece à casa, com contrato e avaliação.', grupo: 'Projectos', icone: Truck },
  { rota: '/garantias-licencas', nome: 'Garantias e licenças', resumo: 'Garantias, seguros e licenças, com validade à vista.', grupo: 'Projectos', icone: ShieldCheck },
  { rota: '/riscos-litigios', nome: 'Riscos e litígios', resumo: 'Os riscos da carteira e os litígios abertos.', grupo: 'Projectos', icone: Scale },
  { rota: '/documentos-fundos', nome: 'Documentos e auditoria', resumo: 'Os documentos da casa e a trilha de quem fez o quê.', grupo: 'Projectos', icone: FolderOpen },
  { rota: '/estudos-governo', nome: 'Estudos para o governo', resumo: 'Estudos técnicos com método aberto e fonte oficial.', grupo: 'Governo', icone: GraduationCap },
  { rota: '/biblioteca-teses', nome: 'Biblioteca de teses', resumo: 'Repositórios abertos e especialistas, com a fonte de cada um.', grupo: 'Governo', icone: BookOpen },
  { rota: '/criador-projectos', nome: 'Criador de projectos', resumo: 'Montar uma proposta de projecto passo a passo.', grupo: 'Governo', icone: Hammer },
  { rota: '/robos-governo', nome: 'Robôs para governo', resumo: 'As fichas de automação: o que cada uma faria e com que dado.', grupo: 'Governo', icone: Bot },
  { rota: '/assistente-fundos', nome: 'Assistente', resumo: 'Perguntar à casa, com a resposta sempre citando a fonte.', grupo: 'Assistente', icone: MessageSquare },
]

export const GRUPOS_FUNDOS: EcraFundos['grupo'][] = ['Direcção', 'Projectos', 'Governo', 'Assistente']
