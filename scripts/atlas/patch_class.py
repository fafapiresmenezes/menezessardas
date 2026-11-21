import json
C = json.load(open("/mnt/project-files/engenharia/plano-agentes/atlas/atlas-classificacao-v1.json", encoding="utf-8"))
TS = "/home/user/menezessardas/src/data/agentesEngenharia.ts"
src = open(TS, encoding="utf-8").read()
novo = {
  "medidoEm": C["medido_em"],
  "classificados": C["itens_classificados"],
  "comContextoAfricano": C["com_contexto_africano"],
  "tipos": [{"nome": k, "n": v} for k, v in C["tipos"].items()],
  "porDecada": [{"nome": k, "n": v} for k, v in C["por_decada"].items() if k != "sem ano"][:7],
  "estantes": [{"agente": a, "itens": v["itens"], "guardaveis": v["guardaveis"]} for a, v in C["por_agente"].items()],
}
bloco = (
 "\n/** Classificação do corpus Atlas: que peça serve a que agente, por regra escrita (nada de palpite). */\n"
 "export interface EstanteAgente { agente: string; itens: number; guardaveis: number }\n"
 "export interface ClassificacaoAtlas {\n"
 "  medidoEm: string\n  classificados: number\n  comContextoAfricano: number\n"
 "  tipos: ContagemAtlas[]\n  porDecada: ContagemAtlas[]\n  estantes: EstanteAgente[]\n}\n"
 "export const CLASSIFICACAO_ATLAS: ClassificacaoAtlas = " + json.dumps(novo, ensure_ascii=False, indent=1) + "\n"
)
marca = "\n/** Fontes do corpus Atlas:"
assert marca in src
src = src.replace(marca, bloco + marca, 1)
open(TS, "w", encoding="utf-8").write(src)
print("ok", novo["classificados"], len(novo["estantes"]))
