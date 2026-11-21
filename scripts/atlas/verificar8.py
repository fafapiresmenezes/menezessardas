# Verificação por termos das respostas da volta 8, para os três defeitos comuns.
import json, os, re
BASE = "/home/user/menezessardas/scripts/atlas/provas-cegas-v8/respostas"
TERMOS = {"D2 estimativa sem faixa": r"1\.?480|faixa|m[ií]nimo",
          "D3 probabilidade sem calibração": r"85|probabilidade|calibra",
          "D4 falta menção de rascunho": r"rascunho|confer[êe]ncia e assinatura|engenheiro habilitado|pronto a entregar"}
falhas = 0
for f in sorted(os.listdir(BASE)):
    t = " ".join(x.get("resposta", "") for x in json.load(open(os.path.join(BASE, f), encoding="utf-8")))
    for nome, p in TERMOS.items():
        if not re.search(p, t, re.I):
            print("FALTA", f[:-5], nome); falhas += 1
print("falhas:", falhas)
