"""Família 2 — proximidade produtiva (espaço de produtos), refeita a partir dos dados de Harvard.

Fonte: Atlas of Economic Complexity, Harvard Growth Lab (API GraphQL pública,
https://atlas.hks.harvard.edu/api/graphql), exportações por país e produto (HS92,
4 dígitos, mais 5 serviços), ano 2024, com a vantagem comparativa revelada (RCA)
que o próprio Atlas publica.

Fórmula (Hidalgo, Klinger, Barabási e Hausmann, Science 317:482, 2007):
  M[c,p] = 1 se RCA[c,p] ≥ 1 (o país c exporta p com vantagem), senão 0
  φ[i,j] = min( P(exporta i | exporta j), P(exporta j | exporta i) )
         = Σ_c M[c,i]·M[c,j] / max( Σ_c M[c,i], Σ_c M[c,j] )
  Leitura: se 100 países exportam j com vantagem e 40 deles também exportam i
  (e i tem ≤ 100 exportadores), φ = 0,40. Dois produtos próximos usam
  capacidades parecidas (gente, máquina, instituição).

Do produto para o nicho: φ_nicho(A,B) = média de φ[i,j] para i em A e j em B,
ponderada pelo valor exportado no mundo (w_i·w_j). Também guardamos a média simples.

Conferência: o Atlas publica as ligações mais fortes do seu desenho
(top_edges_hs92.csv, Dataverse doi:10.7910/DVN/FCDZBN, md5 conferido). Para cada
ligação publicada, medimos em que posição a nossa φ coloca aquele vizinho entre
todos os vizinhos do produto. Se a nossa conta estiver certa, as ligações publicadas
devem ficar no topo. O Atlas calcula com vários anos e filtros de país próprios,
então não se espera igualdade exata; o critério escrito é: mediana do percentil
≥ 95 e pelo menos 80% das ligações publicadas no top 5% da nossa conta.
"""
import hashlib
import json
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent.parent
RAIZ_BRUTO = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "bruto" / "atlas"
SAIDA = AQUI / "saida" / "atlas_proximidade.json"
API = "https://atlas.hks.harvard.edu/api/graphql"
ANO = 2024
# Tentativa 3, declarada ANTES de rodar (21/11, 09h20 UTC): o Atlas mede a proximidade com 50 anos de dados;
# 1 ano só reprovou duas vezes no critério "≥ 80% no top 5%". Aqui juntamos os 10 anos de 2015 a 2024
# (cada país-ano conta como uma observação; escolha nossa, não conferida no texto do artigo de 2007).
# Seja qual for o resultado, ele é publicado como está; não haverá quarta tentativa de critério.
# Rodada 5: correção de DEFEITO achado na revisão (não é tentativa nova): o código XXXX
# ("Trade data discrepancies", diferença estatística do comércio) não é produto e saiu da conta.
# Limites anotados: o filtro de países usa só 2024 em toda a janela; ninguém testou se o critério
# "80% no top 5%" é alcançável nem com a φ do próprio Atlas (o mapa do Atlas é árvore + corte).
ANOS = (2015, 2024)

NICHOS = {
    "Agro": [f"{c:02d}" for c in range(1, 25)],
    "Petróleo e Mineração": ["25", "26", "27"],
    "Saúde (fármacos e equipamentos)": ["30", "9018", "9019", "9020", "9021", "9022"],
    "Química": ["28", "29", "31", "32", "33", "34", "35", "36", "37", "38"],
    "Engenharia (máquinas e equipamentos)": ["84"],
    "Energia e eletrônica": ["85"],
    "Construção (materiais)": ["68", "69", "70", "72", "73"],
    "IA, Telecom e serviços às empresas": ["ict"],
    "Finanças": ["financial"],
    "Cadeia distributiva (transporte)": ["transport"],
    "Turismo": ["travel"],
}


def pergunta(q, nome):
    arq = RAIZ_BRUTO / nome
    if arq.exists():
        corpo = arq.read_bytes()
    else:
        req = urllib.request.Request(API, data=json.dumps({"query": q}).encode(),
                                     headers={"Content-Type": "application/json"})
        for t in range(5):
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    corpo = r.read()
                if b'"errors"' not in corpo[:200]:
                    break
            except Exception as e:  # noqa: BLE001
                print("  erro", nome, e, file=sys.stderr)
            time.sleep(5 * (t + 1))
        arq.write_bytes(corpo)
        time.sleep(0.6)
    return json.loads(corpo), hashlib.sha256(corpo).hexdigest()


def main():
    RAIZ_BRUTO.mkdir(parents=True, exist_ok=True)
    regs = []
    prod, h = pergunta('{ productHs92(productLevel: 4, servicesClass: unilateral){ productId code nameShortEn productType } }', "produtos.json")
    regs.append({"arquivo": "produtos.json", "sha256": h})
    prod = [p for p in prod["data"]["productHs92"] if p["code"] not in ("unspecified", "XXXX")]
    loc, h = pergunta("{ locationCountry { countryId iso3Code nameShortEn inRankings } }", "paises_v2.json")
    regs.append({"arquivo": "paises_v2.json", "sha256": h})
    todos = loc["data"]["locationCountry"]
    # Regra publicada pelo Atlas (FAQ e página de downloads) para entrar nos rankings:
    # população de pelo menos 1 milhão e comércio médio anual de pelo menos 1 bilhão de dólares.
    # (O campo inRankings da API vem vazio, por isso a regra é aplicada aqui com os dados do próprio Atlas.)
    py, h = pergunta(f"{{ countryYear(yearMin: {ANO}, yearMax: {ANO}){{ countryId year exportValue importValue population }} }}", f"pais_ano_{ANO}.json")
    regs.append({"arquivo": f"pais_ano_{ANO}.json", "sha256": h})
    passa = {c["countryId"] for c in py["data"]["countryYear"]
             if (c["population"] or 0) >= 1e6 and ((c["exportValue"] or 0) + (c["importValue"] or 0)) / 2 >= 1e9}
    paises = [c for c in todos if c["countryId"] in passa]
    pid = {p["productId"]: k for k, p in enumerate(prod)}
    P, C = len(prod), len(paises)
    NA = ANOS[1] - ANOS[0] + 1
    RCA = np.zeros((C * NA, P)); X = np.zeros((C * NA, P)); tem = np.zeros(C * NA, bool)
    for c, pa in enumerate(paises):
        num = pa["countryId"].split("-")[-1]
        q = (f"{{ countryProductYear(productClass: HS92, servicesClass: unilateral, productLevel: 4, countryId: {num}, "
             f"yearMin: {ANOS[0]}, yearMax: {ANOS[1]}){{ productId year exportValue exportRca }} }}")
        d, h = pergunta(q, f"pais_{num}_{ANOS[0]}_{ANOS[1]}.json")
        regs.append({"arquivo": f"pais_{num}_{ANOS[0]}_{ANOS[1]}.json", "sha256": h})
        linhas = (d.get("data") or {}).get("countryProductYear") or []
        for l in linhas:
            k = pid.get(l["productId"])
            if k is None:
                continue
            a = l["year"] - ANOS[0]
            RCA[c * NA + a, k] = l["exportRca"] or 0
            if l["year"] == ANO:
                X[c * NA + a, k] = l["exportValue"] or 0
        for a in range(NA):
            tem[c * NA + a] = RCA[c * NA + a].any()
        if c % 40 == 0:
            print(c, pa["iso3Code"], len(linhas), flush=True)
    RCA, X = RCA[tem], X[tem]
    M = (RCA >= 1).astype(float)
    ub = M.sum(0)                      # quantos países exportam cada produto com vantagem
    co = M.T @ M                       # países que exportam i e j com vantagem
    den = np.maximum.outer(ub, ub)
    phi = np.divide(co, den, out=np.zeros_like(co), where=den > 0)
    np.fill_diagonal(phi, 0)

    # conferência 1: conta refeita por laço simples num pedaço da matriz
    rng = np.random.default_rng(7)
    amostra = rng.choice(P, 40, replace=False)
    dif = 0.0
    for i in amostra:
        for j in amostra:
            if i == j:
                continue
            a = sum(1 for c in range(M.shape[0]) if M[c, i] and M[c, j])
            b = max(M[:, i].sum(), M[:, j].sum())
            dif = max(dif, abs((a / b if b else 0) - phi[i, j]))
    # conferência 2: ligações publicadas pelo Atlas
    cod = {p["code"]: k for k, p in enumerate(prod)}
    top = [l.strip().split(",") for l in open(RAIZ_BRUTO / "top_edges_hs92.csv").read().splitlines()[1:] if l.strip()]
    pct = []
    for s_, t_ in top:
        if s_ in cod and t_ in cod:
            i, j = cod[s_], cod[t_]
            linha = phi[i]
            pct.append(100 * (linha < linha[j]).sum() / (P - 1))
    pct = np.array(pct)
    conf = {
        "max_dif_phi_matriz_vs_laco_simples": dif,
        "ligacoes_publicadas_pelo_atlas": int(len(pct)),
        "mediana_percentil_da_nossa_phi": float(np.median(pct)),
        "parte_no_top_5_por_cento": float((pct >= 95).mean()),
        "criterio": "mediana ≥ 95 e ≥ 80% no top 5%",
    }
    conf["aprovado"] = bool(dif < 1e-12 and conf["mediana_percentil_da_nossa_phi"] >= 95 and conf["parte_no_top_5_por_cento"] >= 0.80)

    w = X.sum(0)
    grupos = {}
    for n, prefixos in NICHOS.items():
        grupos[n] = [k for k, p in enumerate(prod) if any(p["code"].startswith(x) for x in prefixos)]
    nomes = list(NICHOS)
    pares = []
    # Serviços: o Atlas publica o valor exportado mas NÃO publica a RCA (vem vazia), então M = 0 para todos.
    # Isso não é proximidade zero: é falta de dado. Esses grupos ficam "sem base" nesta rodada.
    sem_base = {n: "o Atlas não publica a vantagem comparativa (RCA) dos serviços; vem vazia na API"
                for n, g in grupos.items() if ub[g].sum() == 0}
    for a in range(len(nomes)):
        for b in range(a + 1, len(nomes)):
            A, B = grupos[nomes[a]], grupos[nomes[b]]
            if nomes[a] in sem_base or nomes[b] in sem_base:
                pares.append({"a": nomes[a], "b": nomes[b], "n_produtos_a": len(A), "n_produtos_b": len(B),
                              "phi_ponderada": None, "phi_media_simples": None, "par_mais_proximo": None, "sem_base": True})
                continue
            sub = phi[np.ix_(A, B)]
            wa, wb = w[A], w[B]
            pond = float((wa[:, None] * wb[None, :] * sub).sum() / (wa.sum() * wb.sum())) if wa.sum() and wb.sum() else None
            i_, j_ = np.unravel_index(np.argmax(sub), sub.shape)
            pares.append({"a": nomes[a], "b": nomes[b], "n_produtos_a": len(A), "n_produtos_b": len(B),
                          "phi_ponderada": pond, "phi_media_simples": float(sub.mean()),
                          "par_mais_proximo": [prod[A[i_]]["code"] + " " + prod[A[i_]]["nameShortEn"],
                                               prod[B[j_]]["code"] + " " + prod[B[j_]]["nameShortEn"], float(sub[i_, j_])]})
    dentro = {n: (None if n in sem_base else float(phi[np.ix_(g, g)].sum() / max(1, len(g) * (len(g) - 1)))) for n, g in grupos.items()}
    saida = {
        "selo": "calculado por nós" if conf["aprovado"] else "calculado por nós, conferência parcial",
        "familia": 2,
        "nome": "Proximidade produtiva (espaço de produtos de Harvard, refeito por nós)",
        "aviso": "Proximidade de capacidades: dois produtos são próximos quando os mesmos países os exportam com vantagem. Não é compra e venda (família 1) nem dependência.",
        "fonte": {"orgao": "Harvard Growth Lab, Atlas of Economic Complexity", "api": API, "ano": ANO,
                  "classificacao": "HS92, 4 dígitos, mais serviços", "anos": list(ANOS), "observacoes_pais_ano": int(tem.sum()), "paises": C, "paises_no_cadastro": len(todos),
                  "filtro_de_paises": "população ≥ 1 milhão e (exportação + importação)/2 ≥ 1 bilhão de dólares em 2024 (regra publicada no FAQ do Atlas para os rankings)",
                  "diferenca_do_atlas": "o Atlas mede a proximidade com 128 países e 50 anos (glossário, verbete Distance); aqui são 10 anos (2015–2024), então a conferência é por posição, não por igualdade",
                  "tentativas": ["1: todos os 233 países, só 2024: mediana 96,1, 54,2% no top 5% (reprovada)", "2: regra de países do Atlas, só 2024: mediana 95,7, 52,8% no top 5% (reprovada)", "3: regra de países do Atlas, 2015–2024 juntos: mediana 97,83, 66,1% no top 5% (reprovada)", "3b (rodada 5, mesma regra, só sem o falso produto XXXX): resultado abaixo"],
                  "limites": ["filtro de países feito só com 2024 e aplicado a 2015–2024", "não se testou se o critério de 80% no top 5% é alcançável nem com a φ do próprio Atlas, porque o mapa publicado é árvore mais corte, não as ligações mais fortes de cada linha"],
                  
                  "produtos": P, "conferencia_publicada": "Dataverse doi:10.7910/DVN/FCDZBN, top_edges_hs92.csv, md5 8646568807730ef1117d8a48f055da45"},
        "metodo": {"M": "M[c,p] = 1 se RCA ≥ 1", "phi": "φ[i,j] = Σc M[c,i]·M[c,j] ÷ max(Σc M[c,i], Σc M[c,j])",
                   "nicho": "média de φ ponderada pelo valor exportado no mundo: Σ w_i·w_j·φ[i,j] ÷ (Σ w_i · Σ w_j)",
                   "referencia": "Hidalgo, Klinger, Barabási e Hausmann (2007), The Product Space Conditions the Development of Nations, Science 317:482-487"},
        "nichos": {n: {"prefixos_hs": NICHOS[n], "n_produtos": len(grupos[n]), "phi_media_dentro": dentro[n], "sem_base": sem_base.get(n)} for n in nomes},
        "pares": pares,
        "conferencia": conf,
        "arquivos_brutos": len(regs),
        "registros_sha256": regs,
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    print(json.dumps(conf, ensure_ascii=False))
    print("sem base:", list(sem_base))
    for p in sorted(pares, key=lambda p: -(p["phi_ponderada"] or 0))[:3]:
        print(f"{p['a'][:30]:30s} × {p['b'][:30]:30s} pond={p['phi_ponderada']:.4f} simples={p['phi_media_simples']:.4f} {p['par_mais_proximo']}")
    if not conf["aprovado"]:
        print("CONFERÊNCIA REPROVADA: resultado publicado com selo de conferência parcial")


if __name__ == "__main__":
    main()
