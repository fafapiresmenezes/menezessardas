// O que a pessoa logada pode ver no menu: junta o cargo (hierarquia), a função de administrador e o Instituto.
import { meuAlcance } from './hierarquia'
import { meuEscritorio, ehSede } from './equipe'
import type { Visao } from '@/components/menuTelas'

export async function minhaVisao(): Promise<Visao> {
  const [alcance, escritorio, sede] = await Promise.all([
    meuAlcance().catch(() => ({ veTudo: false, admin: false })),
    meuEscritorio().catch(() => null),
    ehSede().catch(() => true),
  ])
  return { veTudo: alcance.veTudo, admin: alcance.admin, instituto: escritorio?.instituto === true, sede }
}
