import json, re
BASE = "/mnt/project-files/engenharia/plano-agentes/atlas/atlas-resumo-v1.json"
TS = "/home/user/menezessardas/src/data/agentesEngenharia.ts"
r = json.load(open(BASE, encoding="utf-8"))
pe = []
for slug, v in r["por_especialidade"].items():
    pe.append({
        "id": slug, "nome": v["nome"],
        "itens": v["externos"] + v["internos"],
        "guardaveis": v["guardaveis"], "soReferencia": v["so_referencia"],
        "internos": v["internos"],
        "universidades": v["universidades_com_programa"],
        "programasVerificados": v["programas_verificados"],
    })
novo = {
    "medidoEm": r["medido_em"], "total": r["total"], "externos": r["itens_externos"],
    "internos": r["itens_internos"], "guardaveis": r["guardaveis"], "soReferencia": r["so_referencia"],
    "universidades": r["universidades"], "programasMapeados": r["programas_mapeados"],
    "programasVerificados": r["programas_verificados"], "repositoriosOai": r["repositorios_oai_confirmados"],
    "fontes": [{"nome": k, "n": v} for k, v in r["fontes"].items()],
    "licencas": [{"nome": k, "n": v} for k, v in r["licencas"].items()],
    "porEspecialidade": pe,
}
corpo = json.dumps(novo, ensure_ascii=False, indent=1)
src = open(TS, encoding="utf-8").read()
i = src.index("export const ATLAS_RESUMO: ResumoAtlas = {")
j = src.index("\n}\n", i) + 3
src = src[:i] + "export const ATLAS_RESUMO: ResumoAtlas = " + corpo + "\n" + src[j:]
src = src.replace(
    "{ nome: 'arXiv / engrXiv', tipo: 'Artigos', acesso: 'API Atom gratuita', estado: 'inventariado', itens: 618, url: 'https://export.arxiv.org/api/query' },",
    "{ nome: 'arXiv / engrXiv', tipo: 'Artigos', acesso: 'API Atom gratuita', estado: 'inventariado', itens: %d, url: 'https://export.arxiv.org/api/query' },\n  { nome: 'OpenAlex', tipo: 'Artigos, teses e dados de acesso aberto', acesso: 'API REST aberta (sem chave)', estado: 'inventariado', itens: %d, url: 'https://api.openalex.org/works' }," % (r["fontes"]["arxiv"], r["fontes"]["openalex"]))
src = src.replace("acesso: 'API REST aberta, metadados CC0', estado: 'inventariado', itens: 4890,",
                  "acesso: 'API REST aberta, metadados CC0', estado: 'inventariado', itens: %d," % r["fontes"]["zenodo"])
src = src.replace("levantamento de 19/11/2026", "levantamento de 20/11/2026")
open(TS, "w", encoding="utf-8").write(src)
print("ok", novo["total"], novo["externos"], novo["guardaveis"], novo["soReferencia"])
